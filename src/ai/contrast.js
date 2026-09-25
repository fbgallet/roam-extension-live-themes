// Contrast measurement (WCAG 2.x) on the live DOM, used after a proposal is
// applied to detect text that became hard to read (e.g. a dark sidebar whose
// entries stayed dark grey). Nothing is corrected automatically: the result is
// shown to the user, who can ask the model to fix it or keep the CSS as is.

import { hasDarkRules, isDarkMode, runInMode } from "../utils/darkMode";

// ---- Colors ---------------------------------------------------------------

export function parseColor(str) {
  if (!str) return null;
  const s = str.trim().toLowerCase();
  if (s === "transparent") return { r: 0, g: 0, b: 0, a: 0 };
  let m = /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+)\s*)?\)$/.exec(s);
  if (m) return { r: +m[1], g: +m[2], b: +m[3], a: m[4] === undefined ? 1 : +m[4] };
  m = /^rgba?\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*(?:\/\s*([\d.]+%?)\s*)?\)$/.exec(s);
  if (m) {
    const a = m[4] === undefined ? 1 : m[4].endsWith("%") ? parseFloat(m[4]) / 100 : +m[4];
    return { r: +m[1], g: +m[2], b: +m[3], a };
  }
  m = /^#([0-9a-f]{3,8})$/.exec(s);
  if (m) {
    let h = m[1];
    if (h.length === 3 || h.length === 4) h = [...h].map((c) => c + c).join("");
    const n = parseInt(h.slice(0, 6), 16);
    const a = h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1;
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255, a };
  }
  return null;
}

export const toHex = (c) => {
  if (!c) return null;
  const h = (v) => Math.round(v).toString(16).padStart(2, "0");
  return `#${h(c.r)}${h(c.g)}${h(c.b)}${c.a < 1 ? h(c.a * 255) : ""}`;
};

/** Alpha-composites `top` over `bottom` (both opaque-ish rgba objects). */
export const composite = (top, bottom) => {
  const a = top.a + bottom.a * (1 - top.a);
  if (a === 0) return { r: 0, g: 0, b: 0, a: 0 };
  const mix = (k) => (top[k] * top.a + bottom[k] * bottom.a * (1 - top.a)) / a;
  return { r: mix("r"), g: mix("g"), b: mix("b"), a };
};

const channel = (v) => {
  const c = v / 255;
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
};

export const luminance = (c) => 0.2126 * channel(c.r) + 0.7152 * channel(c.g) + 0.0722 * channel(c.b);

export function contrastRatio(fg, bg) {
  const l1 = luminance(fg);
  const l2 = luminance(bg);
  const [hi, lo] = l1 > l2 ? [l1, l2] : [l2, l1];
  return (hi + 0.05) / (lo + 0.05);
}

// ---- DOM ------------------------------------------------------------------

const WHITE = { r: 255, g: 255, b: 255, a: 1 };

/**
 * Effective background behind an element: walks up the ancestors, compositing
 * semi-transparent backgrounds, until an opaque one is found (white fallback).
 */
export function getEffectiveBackground(el) {
  let acc = { r: 0, g: 0, b: 0, a: 0 };
  let node = el;
  while (node && node instanceof Element) {
    const cs = getComputedStyle(node);
    const bg = parseColor(cs.backgroundColor);
    if (bg && bg.a > 0) {
      acc = composite(acc, bg);
      if (acc.a >= 0.999) return acc;
    }
    if (cs.backgroundImage && cs.backgroundImage !== "none") {
      // A gradient/image: unknown color, assume what we have so far is enough.
      if (acc.a > 0.5) return { ...acc, a: 1 };
    }
    node = node.parentElement;
  }
  return composite(acc, WHITE);
}

/**
 * Color stops of the gradient painted on the element or its closest ancestors
 * (3 levels). Blueprint paints buttons, selects and checkboxes with a white
 * gradient OVER their background-color: a theme that only darkens the
 * background-color leaves them looking white, which the plain background
 * walk above cannot see.
 */
export function getGradientStops(el) {
  let node = el;
  for (let depth = 0; node && node instanceof Element && depth < 4; depth++) {
    const img = getComputedStyle(node).backgroundImage || "";
    if (/gradient\(/.test(img)) {
      return (img.match(/rgba?\([^)]*\)|#[0-9a-f]{3,8}\b/gi) || []).map(parseColor).filter(Boolean);
    }
    node = node.parentElement;
  }
  return [];
}

/** Text color, blended over the background if it has alpha. */
export function getEffectiveTextColor(el, bg) {
  const fg = parseColor(getComputedStyle(el).color);
  if (!fg) return null;
  return fg.a < 1 ? composite(fg, bg) : fg;
}

const isLargeText = (cs) => {
  const size = parseFloat(cs.fontSize);
  const bold = parseInt(cs.fontWeight, 10) >= 700 || cs.fontWeight === "bold";
  return size >= 24 || (bold && size >= 18.66);
};

// Text elements checked after a proposal. `min` overrides the WCAG threshold
// for decorative or secondary text where AA would be too strict.
export const CONTRAST_TARGETS = [
  { selector: ".roam-block", label: "block text" },
  { selector: ".rm-title-display", label: "page title" },
  { selector: ".rm-heading-level-1", label: "H1 block" },
  { selector: ".rm-heading-level-2", label: "H2 block" },
  { selector: ".rm-heading-level-3", label: "H3 block" },
  { selector: "textarea.rm-block-input", label: "editing textarea" },
  { selector: ".rm-page-ref--link", label: "page links" },
  { selector: ".rm-page-ref--tag", label: "tags", min: 3 },
  { selector: ".rm-block-ref", label: "block references" },
  { selector: ".rm-alias", label: "alias links" },
  { selector: ".rm-highlight", label: "highlighted text" },
  { selector: ".rm-block-text code", label: "inline code" },
  { selector: ".rm-code-block .cm-line, .rm-code-block .CodeMirror-line, .rm-code-block", label: "code blocks" },
  { selector: ".rm-bq", label: "blockquotes" },
  { selector: ".rm-attr-ref", label: "attributes" },
  { selector: ".roam-sidebar-content .log-button", label: "left sidebar entries" },
  { selector: ".starred-pages .page", label: "left sidebar shortcuts" },
  { selector: ".rm-topbar .bp3-button", label: "top bar buttons", min: 3 },
  { selector: ".rm-find-or-create-wrapper input, .rm-find-or-create-wrapper .bp3-input", label: "search box", min: 3 },
  { selector: ".rm-sidebar-outline .roam-block", label: "right sidebar block text" },
  { selector: ".rm-sidebar-window .rm-sidebar-window-display-str, .rm-sidebar-window h2", label: "right sidebar window title" },
  { selector: ".rm-ref-page-view-title", label: "referencing page titles" },
  { selector: ".rm-reference-main .roam-block", label: "linked reference text" },
  { selector: ".rm-mentions .roam-block", label: "unlinked reference text" },
  { selector: ".rm-query-title", label: "query titles" },
  { selector: ".rm-zoom-item", label: "breadcrumbs", min: 3 },
  { selector: ".bp3-menu-item", label: "menu items", all: true },
  { selector: ".bp3-popover-content", label: "popover text" },
  { selector: ".bp3-dialog-body, .bp3-dialog", label: "dialog text" },
  { selector: ".bp3-dialog-header .bp3-heading, .bp3-dialog-header", label: "dialog header" },
  { selector: ".bp3-button:not(.bp3-minimal):not([class*='bp3-intent-'])", label: "buttons", all: true },
  { selector: ".bp3-button.bp3-minimal", label: "icon buttons", min: 3, all: true },
  { selector: ".bp3-html-select select", label: "select dropdowns", all: true },
  { selector: ".bp3-input", label: "text inputs", all: true },
  { selector: ".bp3-control", label: "checkbox and switch labels", all: true },
  { selector: ".bp3-tab", label: "tabs", all: true },
  { selector: ".rm-autocomplete__results .bp3-menu-item, .rm-autocomplete__results", label: "autocomplete" },
  { selector: ".roam-table td, .roam-table th", label: "table cells" },
  { selector: ".rm-table th", label: "native table headers" },
  { selector: ".rm-table td", label: "native table cells" },
  { selector: ".rm-data-table__table th", label: "datalog table headers", all: true },
  { selector: ".rm-data-table__table td", label: "datalog table cells", all: true },
  { selector: ".kanban-card", label: "kanban cards" },
  { selector: ".rm-callout__body", label: "callouts" },
];

const isVisible = (el) => {
  const rect = el.getBoundingClientRect();
  if (!rect.width && !rect.height) return false;
  const cs = getComputedStyle(el);
  return cs.display !== "none" && cs.visibility !== "hidden" && parseFloat(cs.opacity) > 0.05;
};

// The banner / dialog of Live Themes itself must not be measured.
const isOurs = (el) => !!el.closest("#live-themes-dialog-container, #live-themes-review-container, .lt-dialog");

const MAX_SAMPLES = 25;

/** Visible elements of the page matching the selector (the first one only, unless `all`). */
const sample = (selector, all = false) => {
  let list;
  try {
    list = document.querySelectorAll(selector);
  } catch (e) {
    return [];
  }
  const out = [];
  for (const el of list) {
    if (!isVisible(el) || isOurs(el)) continue;
    out.push(el);
    if (!all || out.length >= MAX_SAMPLES) break;
  }
  return out;
};

/** Lowest contrast of the element over its background and over each gradient stop. */
function measureElement(el) {
  const bg = getEffectiveBackground(el);
  const fg = getEffectiveTextColor(el, bg);
  if (!fg || !bg) return null;
  let worst = { ratio: contrastRatio(fg, bg), bg };
  for (const stop of getGradientStops(el)) {
    const painted = composite(stop, bg);
    const ratio = contrastRatio(fg.a < 1 ? composite(fg, painted) : fg, painted);
    if (ratio < worst.ratio) worst = { ratio, bg: painted };
  }
  return { ...worst, fg };
}

/** Measures the contrast of every visible target. */
export function measureContrast(targets = CONTRAST_TARGETS) {
  const results = [];
  for (const t of targets) {
    // Controls differ from one place to another (top bar, dialogs, popovers):
    // the worst visible one is reported, not the first.
    let el = null;
    let m = null;
    for (const candidate of sample(t.selector, !!t.all)) {
      const r = measureElement(candidate);
      if (r && (!m || r.ratio < m.ratio)) {
        m = r;
        el = candidate;
      }
    }
    if (!m) continue;
    const cs = getComputedStyle(el);
    const { ratio, bg, fg } = m;
    const large = isLargeText(cs);
    const min = t.min ?? (large ? 3 : 4.5);
    results.push({
      selector: t.selector,
      label: t.label,
      ratio: Math.round(ratio * 10) / 10,
      min,
      ok: ratio >= min,
      fg: toHex({ ...fg, a: 1 }),
      bg: toHex({ ...bg, a: 1 }),
      fontSize: cs.fontSize,
    });
  }
  return results;
}

/**
 * Measures the current mode and, when a dark mode exists, the other one too
 * (switched without any visible flash, see `runInMode`). With both modes,
 * each result carries its `mode` and a labelled suffix, e.g. "tags (dark)".
 */
export function measureContrastAllModes() {
  const tag = (results, mode) =>
    results.map((r) => ({ ...r, mode, key: `${mode}|${r.selector}`, label: `${r.label} (${mode})` }));
  const current = isDarkMode();
  const results = measureContrast();
  if (!hasDarkRules()) return results.map((r) => ({ ...r, key: r.selector }));
  const other = runInMode(!current, () => measureContrast());
  const name = (dark) => (dark ? "dark" : "light");
  return [...tag(results, name(current)), ...tag(other, name(!current))];
}

/**
 * Compares measurements taken before and after a proposal. Returns the
 * failing targets, each flagged `regressed` (was fine before) or
 * `preexisting` (was already too low).
 */
export function diffContrast(before, after) {
  const prev = new Map((before || []).map((r) => [r.key || r.selector, r]));
  return after
    .filter((r) => !r.ok)
    .map((r) => {
      const b = prev.get(r.key || r.selector);
      return {
        ...r,
        before: b ? b.ratio : null,
        regressed: !b || b.ok || b.ratio - r.ratio > 0.5,
      };
    })
    .sort((a, b) => (a.regressed === b.regressed ? a.ratio - b.ratio : a.regressed ? -1 : 1));
}

/** Human-readable line for one issue. */
export const describeIssue = (i) =>
  `${i.label}: ${i.ratio}:1 (text ${i.fg} on ${i.bg}, min ${i.min}:1)${
    i.regressed ? "" : ", already low before"
  }`;

/** Text for the model when the user asks to fix the contrast. */
export function buildContrastFixRequest(issues) {
  const lines = issues.map(
    (i) =>
      `- \`${i.selector}\` (${i.label}${i.mode === "dark" ? ", i.e. under \`.rm-dark-theme\`" : ""}): text ${i.fg} on background ${i.bg} = ${i.ratio}:1, needs at least ${i.min}:1`
  );
  return (
    `Keep the same design, but fix the readability of these elements, measured after applying your last stylesheet (WCAG contrast ratio, computed on the real page):\n${lines.join(
      "\n"
    )}\nAdjust the text colors (or the backgrounds if that fits the design better) of exactly these elements, and of the similar elements in the same surfaces, so each ratio reaches its minimum. Change nothing else.`
  );
}
