// Calls the Live AI public API (window.LiveAI_API) and parses the answer.

import { buildSystemPrompt, buildUserPrompt } from "./prompts";
import { getContextCssBlocks, getLiveThemesCss, getOtherCssBlocks } from "../utils/roamCss";
import { describeChanges, parseProposal, resolveProposal } from "./patches";
import { isDarkMode } from "../utils/darkMode";
import { DEFAULTS, getSetting, KEYS } from "../storage";
import { buildDomContext } from "./domInspector";
import { findUntrustedUrls, untrustedUrlWarning, validateCss } from "../utils/cssValidate";
import { normalizeSelector, scanCssRules } from "../utils/cssRules";
import { isKnownRoamClass } from "./roamClasses";
import { ROAM_ELEMENTS } from "./roamElements";

export const CALLER_ID = "live-themes/1.0";
const MAX_CONVERSATION_MESSAGES = 6;

export const getLiveAI = () => {
  const api = window.LiveAI_API;
  return api && typeof api.generate === "function" ? api : null;
};

export const getLiveAIStatus = () => {
  const api = getLiveAI();
  if (!api) {
    return {
      ok: false,
      reason: "api-disabled",
      title: "Live AI public API not enabled",
      message:
        "window.LiveAI_API is not defined. Live Themes needs the Live AI extension (v29 or later) AND its setting “Enable Public API (window.LiveAI_API)”, which is OFF by default. Open Roam settings → Live AI, turn it on, then click “Check again”.",
    };
  }
  let available = false;
  try {
    available = api.isAvailable();
  } catch (e) {
    available = false;
  }
  if (!available) {
    return {
      ok: false,
      reason: "no-model",
      title: "No model available in Live AI",
      message:
        "Live AI is loaded and its public API is enabled, but no model is available: add at least one API key in Live AI settings, then click “Check again”.",
    };
  }
  return { ok: true, reason: "ok", title: "", message: "" };
};

export const listModels = () => {
  const api = getLiveAI();
  if (!api) return [];
  try {
    return api.listModels() || [];
  } catch (e) {
    return [];
  }
};

export const getDefaultModelId = () => {
  const api = getLiveAI();
  if (!api) return null;
  try {
    return api.getDefaultModel();
  } catch (e) {
    return null;
  }
};

/** Resolves the model id to use, or undefined to let Live AI pick its default. */
export const resolveModel = () => {
  const stored = getSetting(KEYS.model, DEFAULTS[KEYS.model]);
  if (!stored || stored === "default") return undefined;
  const exists = listModels().some((m) => m.id === stored);
  return exists ? stored : undefined;
};

// ---- Parsing ---------------------------------------------------------------
// See patches.js: the model answers with SECTION / RULE / BLOCK patches.

export { parseProposal };

// ---- Safety lint -----------------------------------------------------------

const ESSENTIAL_SELECTORS =
  "(html|body|\\.roam-app|\\.roam-body|\\.roam-main|\\.roam-article|\\.rm-topbar|\\.roam-block|\\.rm-block-text|\\.rm-block__input|\\.rm-block-input|\\.bp3-dialog|\\.bp3-overlay)";

export function lintCss(css) {
  const warnings = [];
  const rules = css.split("}");
  for (const rule of rules) {
    const [selectorPart, declPart] = rule.split("{");
    if (!declPart) continue;
    const selectors = selectorPart.replace(/\/\*[\s\S]*?\*\//g, "").trim();
    const decls = declPart.toLowerCase();
    const hides =
      /display\s*:\s*none/.test(decls) ||
      /visibility\s*:\s*hidden/.test(decls) ||
      /opacity\s*:\s*0(?![.\d])/.test(decls) ||
      /pointer-events\s*:\s*none/.test(decls);
    if (!hides) continue;
    const targets = selectors.split(",").map((s) => s.trim());
    for (const t of targets) {
      // Only the essential element itself (optionally with a pseudo-class or an
      // extra class), never its descendants (".roam-block .rm-page-ref" is fine).
      if (new RegExp(`^${ESSENTIAL_SELECTORS}([:.[#][^\\s>+~]*)?$`).test(t)) {
        warnings.push(`Rule hides an essential element: "${t}"`);
      }
      if (/^\*$/.test(t) || /^\*\s*[{,]/.test(t)) {
        warnings.push("Universal selector (*) hides content");
      }
    }
  }
  // Syntax: unbalanced brackets and rules the browser would drop, per section
  // (a single unclosed "(" in the Dark mode section silently disables the
  // whole dark mode: the user must see it before applying).
  warnings.push(...validateCss(css));
  return warnings;
}

/** External URLs the proposal adds (those already in the theme or base CSS were accepted before). */
function newUntrustedUrls(resolved, previousCss) {
  const known = new Set(previousCss.flatMap(findUntrustedUrls));
  const next = [resolved.liveThemesCss, ...resolved.otherBlocks.map((b) => b.css)];
  return [...new Set(next.flatMap(findUntrustedUrls))].filter((url) => !known.has(url));
}

// ---- Selector lint (non-blocking notes) -------------------------------------
//
// A Roam-looking class (rm-*, roam-*) that is neither in Roam's stylesheet,
// nor in the catalog, nor in the current DOM is probably invented by the
// model. This is reported as a note (the rule is harmless, it just matches
// nothing), not as a blocking warning.

const CATALOG_CLASSES = new Set(
  ROAM_ELEMENTS.flatMap((g) =>
    g.items.flatMap((i) => (i.selector.match(/\.[\w-]+/g) || []).map((s) => s.slice(1)))
  )
);

const inDom = (cls) => {
  try {
    return typeof document !== "undefined" && !!document.querySelector(`.${CSS.escape(cls)}`);
  } catch (e) {
    return false;
  }
};

// Blueprint paints buttons, selects and checkbox boxes with a white gradient
// (background-image) over their background-color: darkening only the color
// leaves them white, with the light text of a dark theme on top (unreadable).
const GRADIENT_CONTROL = /\.bp3-(button|control-indicator|html-select|select)\b/;

export function lintBlueprintControls(css) {
  const rules = scanCssRules(css).filter((r) => r.type === "rule");
  const clearsImage = (decls) => /(^|[;\s])background-image\s*:|(^|[;\s])background\s*:/i.test(decls);
  const cleared = new Set(rules.filter((r) => clearsImage(r.declarations)).flatMap((r) => r.selector.split(",").map(normalizeSelector)));
  const missing = [];
  for (const r of rules) {
    if (!/(^|[;\s])background-color\s*:/i.test(r.declarations) || clearsImage(r.declarations)) continue;
    for (const sel of r.selector.split(",")) {
      if (GRADIENT_CONTROL.test(sel) && !/:hover|:active|\.bp3-active|\.bp3-minimal/.test(sel) && !cleared.has(normalizeSelector(sel))) {
        missing.push(sel.trim());
      }
    }
  }
  return missing.length
    ? [
        `Blueprint controls given a background-color without "background-image: none" (their white gradient stays painted over it, the control still looks light): ${[
          ...new Set(missing),
        ].join(", ")}`,
      ]
    : [];
}

export function lintSelectors(css) {
  const source = css.replace(/\/\*[\s\S]*?\*\//g, "");
  const unknown = new Set();
  const selectorRe = /([^{}]+)\{/g;
  let m;
  while ((m = selectorRe.exec(source))) {
    if (m[1].trim().startsWith("@")) continue;
    for (const cls of m[1].match(/\.(rm-|roam-)[\w-]+/g) || []) {
      const name = cls.slice(1);
      if (!isKnownRoamClass(name) && !CATALOG_CLASSES.has(name) && !inDom(name)) unknown.add(cls);
    }
  }
  return unknown.size
    ? [
        `Selectors unknown to Roam's stylesheet, to the catalog and to the current page (probably invented, they will match nothing): ${[
          ...unknown,
        ].join(", ")}`,
      ]
    : [];
}

// ---- Generation ------------------------------------------------------------

/**
 * @param {object} p
 * @param {string} p.request              natural language request
 * @param {string[]} p.targetSelectors    optional selectors to focus on
 * @param {Array} p.targetRules            existing rules to work on (ruleInventory entries)
 * @param {boolean} p.restrictToTargets    modify only the target rules
 * @param {boolean} p.editBaseInPlace      replace targeted base rules in place (needs the whole-page setting)
 * @param {object} p.pickedElement          element picked on screen (screenPick.analyzePickedElement)
 * @param {Array<{role,content}>} p.conversation  previous turns (refinement)
 * @param {(chunk:string)=>void} p.onChunk
 * @param {AbortSignal} p.signal
 */
export async function generateTheme({
  request,
  targetSelectors = [],
  targetRules = [],
  restrictToTargets = false,
  editBaseInPlace = false,
  pickedElement = null,
  conversation = [],
  onChunk,
  signal,
}) {
  const api = getLiveAI();
  if (!api) throw new Error("Live AI public API is not available.");

  const includePageContext = getSetting(
    KEYS.includePageContext,
    DEFAULTS[KEYS.includePageContext]
  );
  const allowWholePageEdit = getSetting(
    KEYS.allowWholePageEdit,
    DEFAULTS[KEYS.allowWholePageEdit]
  );
  const liveThemesCss = getLiveThemesCss();
  const otherBlocks = includePageContext || allowWholePageEdit ? getContextCssBlocks() : [];
  const dom = getSetting(KEYS.domSnapshot, DEFAULTS[KEYS.domSnapshot]) ? buildDomContext() : null;

  const systemPrompt = buildSystemPrompt({
    liveThemesCss,
    otherBlocks,
    includePageContext: includePageContext || allowWholePageEdit,
    allowWholePageEdit,
    domContext: dom?.text || null,
  });
  const userPrompt = buildUserPrompt({
    request,
    targetSelectors,
    targetRules,
    restrictToTargets,
    editBaseInPlace,
    allowWholePageEdit,
    pickedElement,
    darkMode: isDarkMode(),
  });

  const history = conversation.slice(-MAX_CONVERSATION_MESSAGES);
  const prompt = history.length
    ? [...history, { role: "user", content: userPrompt }]
    : userPrompt;

  const result = await api.generate({
    prompt,
    model: resolveModel(),
    // Explicit on/off: left undefined, Live AI would apply each provider's own
    // default (on for recent Claude models, off for most others).
    thinking: !!getSetting(KEYS.thinking, DEFAULTS[KEYS.thinking]),
    systemPrompt,
    useDefaultSystemPrompt: false,
    responseFormat: "text",
    output: "raw",
    onChunk,
    streamTo: "none",
    signal,
    caller: CALLER_ID,
  });

  const text = typeof result?.text === "string" ? result.text : JSON.stringify(result?.text ?? "");
  const parsed = parseProposal(text);
  const nextConversation = [
    ...history,
    { role: "user", content: userPrompt },
    { role: "assistant", content: text },
  ];
  const common = {
    model: result?.model,
    provider: result?.provider,
    conversation: nextConversation,
    domSnapshotUsed: !!dom,
    raw: text,
  };
  if (!parsed.ok) return { ...common, ok: false, error: parsed.error, summary: "" };

  // Patches are resolved against the CSS as it is NOW (the theme may have
  // changed since the prompt was built, e.g. by a manual edit).
  const currentCss = getLiveThemesCss();
  const baseBlocks = getOtherCssBlocks();
  const resolved = resolveProposal(parsed, { currentCss, baseBlocks, allowWholePageEdit });
  if (!resolved.changed) {
    return {
      ...common,
      ok: false,
      summary: parsed.summary,
      error:
        "The answer contains no applicable change." +
        (resolved.errors.length ? " " + resolved.errors.join(" ") : ""),
    };
  }
  return {
    ...common,
    ok: true,
    summary: parsed.summary,
    liveThemesCss: resolved.liveThemesCss,
    otherBlocks: resolved.otherBlocks,
    changes: resolved.changes,
    changesText: describeChanges(resolved.changes),
    warnings: [
      ...resolved.errors,
      ...lintCss(resolved.liveThemesCss),
      ...newUntrustedUrls(resolved, [currentCss, ...baseBlocks.map((b) => b.css)]).map(untrustedUrlWarning),
    ],
    notes: [...lintSelectors(resolved.liveThemesCss), ...lintBlueprintControls(resolved.liveThemesCss)],
  };
}
