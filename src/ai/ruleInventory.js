// Inventory of the existing CSS rules the user can target: the rules of the
// active theme (per section) and the rules of the base blocks of [[roam/css]].
// Built client-side, without any model call, from the scanner of cssRules.js.
// Each rule is tagged with the catalog elements its selector touches, so that
// selecting a target element in the dialog surfaces the rules already
// styling it, and gets a stable address for the prompt.

import { normalizeSelector, scanCssRules } from "../utils/cssRules";
import { parseCssSections } from "../utils/cssSections";
import { ROAM_ELEMENTS } from "./roamElements";

const CATALOG = ROAM_ELEMENTS.flatMap((g) =>
  g.items.map((i) => ({
    ...i,
    group: g.label,
    re: new RegExp(
      normalizeSelector(i.selector).replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "(?![\\w-])"
    ),
  }))
);

const MAX_RULE_TEXT = 1600;

/** Catalog selectors present in a rule's selector. */
export const elementsOfSelector = (selector) => {
  const sel = normalizeSelector(selector);
  if (!sel || sel.startsWith("@")) return [];
  return CATALOG.filter((e) => e.re.test(sel)).map((e) => e.selector);
};

export const elementLabel = (selector) =>
  CATALOG.find((e) => e.selector === selector)?.label || selector;

export const displaySelector = (r) =>
  (r.context?.length ? r.context.join(" › ") + " › " : "") + r.selector;

/**
 * @param {object} p
 * @param {string} p.themeCss             the active theme stylesheet
 * @param {Array<{uid, css, path}>} p.baseBlocks  base blocks of [[roam/css]]
 */
export function buildRuleInventory({ themeCss, baseBlocks = [] }) {
  const rules = [];
  for (const section of parseCssSections(themeCss || "")) {
    for (const r of scanCssRules(section.css)) {
      rules.push({
        ...r,
        id: `theme:${section.title || ""}:${r.index}`,
        scope: "theme",
        section: section.title,
        source: section.title ? `Theme · ${section.title}` : "Theme · (no section)",
        elements: elementsOfSelector(r.selector),
      });
    }
  }
  for (const b of baseBlocks) {
    for (const r of scanCssRules(b.css)) {
      rules.push({
        ...r,
        id: `base:${b.uid}:${r.index}`,
        scope: "base",
        uid: b.uid,
        path: b.path,
        source: `Base · ${b.path}`,
        elements: elementsOfSelector(r.selector),
      });
    }
  }
  return rules;
}

/** Rules whose selector touches one of the given catalog selectors. */
export const rulesForElements = (rules, selectors) => {
  if (!selectors?.length) return [];
  const set = new Set(selectors);
  return rules.filter((r) => r.elements.some((e) => set.has(e)));
};

const norm = (s) => String(s || "").toLowerCase();

/** Free-text search over selector, declarations, section/block and element names. */
export function searchRules(rules, query, limit = 40) {
  const q = norm(query).trim();
  if (!q) return [];
  const words = q.split(/\s+/).filter(Boolean);
  const scored = [];
  for (const r of rules) {
    const selector = norm(displaySelector(r));
    const hay = `${selector} ${norm(r.declarations)} ${norm(r.source)} ${r.elements
      .map((e) => norm(elementLabel(e)))
      .join(" ")}`;
    let score = null;
    if (selector.includes(q)) score = 0;
    else if (norm(r.source).includes(q)) score = 1;
    else if (words.every((w) => hay.includes(w))) score = 2;
    if (score !== null) scored.push({ r, score });
  }
  scored.sort((a, b) => a.score - b.score);
  return scored.slice(0, limit).map((x) => x.r);
}

const clip = (text) =>
  text.length > MAX_RULE_TEXT ? text.slice(0, MAX_RULE_TEXT) + "\n/* … truncated … */" : text;

/** Human address of a rule, as used in the prompt. */
export const ruleAddress = (r) =>
  r.scope === "theme"
    ? `theme section "${r.section || "General"}", rule #${r.index}`
    : `base block ${r.uid} (location: ${r.path}), rule #${r.index}`;

/**
 * Text of the "Target rules" part of the user prompt.
 * @param {Array} rules            targeted rules (inventory entries)
 * @param {object} o
 * @param {boolean} o.restrict     modify only these rules
 * @param {boolean} o.editBaseInPlace  base rules are replaced in place (RULE patches)
 * @param {boolean} o.allowWholePageEdit
 */
export function formatTargetRules(rules, { restrict, editBaseInPlace, allowWholePageEdit }) {
  if (!rules.length) return "";
  const inPlace = editBaseInPlace && allowWholePageEdit;
  const lines = ["Target rules (existing rules to work on, identified by their location):"];
  rules.forEach((r, i) => {
    const ctx = r.context?.length ? ` (inside ${r.context.join(" › ")})` : "";
    let how;
    if (r.scope === "theme") {
      how = `edit it in place by returning SECTION "${r.section || "General"}" with this rule modified and the other rules of the section unchanged`;
    } else if (inPlace) {
      how = `replace it in place with a patch: RULE ${r.uid}#${r.index} ${r.selector}`;
    } else {
      how = `this base rule is NOT editable: override it from the theme with a rule using the same selector (at least the same specificity; add !important if the base rule uses it) that changes only the declarations to change`;
    }
    lines.push(`${i + 1}. ${ruleAddress(r)}${ctx} — ${how}:`);
    lines.push("```css");
    lines.push(clip(r.text));
    lines.push("```");
  });
  lines.push("");
  lines.push(
    restrict
      ? "SCOPE: modify ONLY the target rules above. Do not add, remove or change any other rule or section (the only allowed addition is a theme rule needed to override a base target rule)."
      : "Focus the changes on the target rules above; you may adjust other rules or add new ones only if the request requires it."
  );
  return lines.join("\n");
}
