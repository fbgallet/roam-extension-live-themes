// "Pick on screen": the user clicks an element of the live Roam page to
// designate what they want to restyle. While picking, the hovered element is
// highlighted and described; clicks are swallowed (Roam must not enter edit
// mode). The picked element is then analyzed against the catalog and the
// rule inventory: which catalog elements it (or its ancestors) match, and
// which existing rules really apply to it (`el.matches(selector)`).

import { ROAM_ELEMENTS } from "../ai/roamElements";
import { describeElement } from "../ai/domInspector";

const CATALOG = ROAM_ELEMENTS.flatMap((g) => g.items.map((i) => ({ ...i, group: g.label })));
const MAX_DEPTH = 8;
// State/pseudo-element parts cannot be tested with matches(): dropped first.
const STATE_PSEUDO =
  /::?(hover|focus|focus-within|focus-visible|active|visited|before|after|placeholder|selection|first-line|first-letter|marker)\b|::-webkit-[\w-]+/g;
const PREFERRED_CLASS = /^(rm-|roam-|bp3-|log-|starred|sidebar|level)/;

const testable = (selector) => {
  const s = (selector || "")
    .replace(STATE_PSEUDO, "")
    .replace(/,\s*,/g, ",")
    .replace(/^\s*,|,\s*$/g, "")
    .trim();
  return s && !s.startsWith("@") ? s : null;
};

const safeMatches = (el, selector) => {
  try {
    return el.matches(selector);
  } catch (e) {
    return false;
  }
};

// Data attributes set by Roam's renderer that identify what a node refers to.
// data-link-title sits on the class-less span wrapping a page link, so without
// it the model cannot know how to target one page link or a family of them.
const DESCRIBED_ATTRS = ["data-link-title", "data-tag", "data-page-links"];

/** Compact description of a DOM node: tag#id.class.class (Roam classes first). */
export const shortDescriptor = (el) => {
  if (!el || el.nodeType !== 1) return "";
  const tag = el.tagName.toLowerCase();
  const id = el.id ? `#${el.id}` : "";
  const classes = [...el.classList]
    .filter((c) => !c.startsWith("lt-"))
    .sort((a, b) => Number(PREFERRED_CLASS.test(b)) - Number(PREFERRED_CLASS.test(a)));
  const shown = classes
    .slice(0, 4)
    .map((c) => `.${c}`)
    .join("");
  const attrs = DESCRIBED_ATTRS.filter((a) => el.hasAttribute(a))
    .map((a) => `[${a}="${el.getAttribute(a).slice(0, 40)}"]`)
    .join("");
  return `${tag}${id}${shown}${classes.length > 4 ? `(+${classes.length - 4})` : ""}${attrs}`;
};


/**
 * @param {Element} el       the picked element
 * @param {Array} rules      rule inventory (ruleInventory.buildRuleInventory)
 * @returns {{ descriptor, path, text, style, elements, nearestElements, rules, directRules }}
 *   elements: catalog entries matched by el or an ancestor ({selector,label,depth});
 *   nearestElements: selectors of the closest ones (what to select in the dialog);
 *   rules: inventory rules that apply to el or an ancestor ({id, depth});
 *   directRules: ids of the rules applying at the nearest level (what to target).
 */
export function analyzePickedElement(el, rules = []) {
  const chain = [];
  let node = el;
  while (node && node.nodeType === 1 && node !== document.documentElement && chain.length < MAX_DEPTH) {
    chain.push(node);
    node = node.parentElement;
  }
  const elements = [];
  for (const item of CATALOG) {
    const sel = testable(item.selector);
    if (!sel) continue;
    const depth = chain.findIndex((n) => safeMatches(n, sel));
    if (depth >= 0) elements.push({ selector: item.selector, label: item.label, depth });
  }
  elements.sort((a, b) => a.depth - b.depth);
  const nearest = elements.length ? elements[0].depth : 0;

  const matched = [];
  for (const r of rules) {
    if (r.type !== "rule") continue;
    const sel = testable(r.selector);
    if (!sel) continue;
    const depth = chain.findIndex((n) => safeMatches(n, sel));
    if (depth >= 0) matched.push({ id: r.id, depth });
  }
  matched.sort((a, b) => a.depth - b.depth);

  let style = null;
  try {
    style = describeElement(el);
  } catch (e) {
    style = null;
  }
  return {
    descriptor: shortDescriptor(el),
    path: chain
      .slice()
      .reverse()
      .map(shortDescriptor)
      .join(" > "),
    text: (el.textContent || "").trim().replace(/\s+/g, " ").slice(0, 60),
    style,
    elements,
    nearestElements: elements.filter((e) => e.depth === nearest).map((e) => e.selector),
    rules: matched,
    directRules: matched.filter((m) => m.depth <= nearest).map((m) => m.id),
  };
}

/** Lines describing a picked element for the model. */
export function formatPickedElement(p) {
  if (!p) return "";
  const lines = [
    `Element the user pointed at on screen (clicked in the live page): \`${p.descriptor}\``,
    `- DOM path: ${p.path}`,
  ];
  if (p.text) lines.push(`- Visible text: “${p.text}”`);
  if (p.style) {
    const s = p.style;
    lines.push(
      `- Computed style: text ${s.color} on background ${s.bg}${s.ownBg ? ` (own background ${s.ownBg})` : ""}, font ${s.fontFamily} ${s.fontSize} weight ${s.fontWeight}${s.borderColor ? `, border ${s.borderColor}` : ""}`
    );
  }
  if (p.elements.length) {
    lines.push(
      `- Catalog elements it belongs to: ${p.elements
        .slice(0, 6)
        .map((e) => `${e.label} (\`${e.selector}\`${e.depth ? `, ancestor level ${e.depth}` : ""})`)
        .join(", ")}`
    );
  }
  lines.push(
    "Style THIS element (and the other elements of the same kind), through the existing rule that applies to it when there is one, or with the most specific catalog selector that matches it."
  );
  return lines.join("\n");
}

// ---- Pick mode ------------------------------------------------------------------

let session = null;

export const isScreenPicking = () => !!session;

/**
 * Enters pick mode. Resolves through the callbacks: onPick(element) or onCancel().
 * Returns a function that stops the mode.
 */
export function startScreenPick({ onPick, onCancel } = {}) {
  if (session) return session.stop;
  const box = document.createElement("div");
  box.className = "lt-pick-box";
  const label = document.createElement("div");
  label.className = "lt-pick-label";
  const hint = document.createElement("div");
  hint.className = "lt-pick-hint";
  hint.innerHTML =
    "<b>Live Themes</b> · click the element you want to restyle · <kbd>Esc</kbd> to cancel";
  document.body.append(box, label, hint);
  document.documentElement.classList.add("lt-picking");

  let current = null;
  const own = (t) =>
    t instanceof Element &&
    (t === box ||
      t === label ||
      !!t.closest(
        ".lt-pick-hint, #live-themes-review-container, #live-themes-dialog-container, .bp3-overlay-backdrop, .bp3-toast-container"
      ));

  const place = (el) => {
    const r = el.getBoundingClientRect();
    Object.assign(box.style, {
      display: "block",
      left: `${r.left}px`,
      top: `${r.top}px`,
      width: `${r.width}px`,
      height: `${r.height}px`,
    });
    label.textContent = shortDescriptor(el);
    Object.assign(label.style, {
      display: "block",
      left: `${Math.max(4, r.left)}px`,
      top: `${r.top > 28 ? r.top - 24 : r.bottom + 4}px`,
    });
  };
  const onMove = (e) => {
    const el = document.elementFromPoint(e.clientX, e.clientY);
    if (!el || own(el) || el === current) return;
    current = el;
    place(el);
  };
  const swallow = (e) => {
    if (own(e.target)) return;
    e.preventDefault();
    e.stopPropagation();
  };
  const onClick = (e) => {
    if (own(e.target)) return;
    e.preventDefault();
    e.stopPropagation();
    const el = current || e.target;
    stop();
    onPick?.(el);
  };
  const onKey = (e) => {
    if (e.key !== "Escape") return;
    e.preventDefault();
    e.stopPropagation();
    stop();
    onCancel?.();
  };
  const onScroll = () => {
    if (current) place(current);
  };

  const opts = { capture: true };
  document.addEventListener("mousemove", onMove, opts);
  document.addEventListener("mousedown", swallow, opts);
  document.addEventListener("mouseup", swallow, opts);
  document.addEventListener("click", onClick, opts);
  document.addEventListener("keydown", onKey, opts);
  window.addEventListener("scroll", onScroll, true);

  const stop = () => {
    document.removeEventListener("mousemove", onMove, opts);
    document.removeEventListener("mousedown", swallow, opts);
    document.removeEventListener("mouseup", swallow, opts);
    document.removeEventListener("click", onClick, opts);
    document.removeEventListener("keydown", onKey, opts);
    window.removeEventListener("scroll", onScroll, true);
    box.remove();
    label.remove();
    hint.remove();
    document.documentElement.classList.remove("lt-picking");
    session = null;
  };
  session = { stop };
  return stop;
}

export const stopScreenPick = () => session?.stop();
