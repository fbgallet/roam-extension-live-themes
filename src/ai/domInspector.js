// Inspects the live Roam DOM to ground the model in what is actually rendered:
//   - which catalog selectors match something right now (and how many),
//   - the effective computed colors / fonts of the main surfaces,
//   - the CSS custom properties defined on :root / html / body by Roam, by
//     [[roam/css]] and by other extensions,
//   - Roam's native theme attributes and dark-mode classes,
//   - rm-/roam- class names present in the DOM but unknown to the catalog
//     (learning material to extend the static catalog),
//   - the real anatomy (ancestor chain + subtree, classes and data-* names,
//     no text) of the key elements, to check the structural facts of
//     roamKnowledge.js (which class sits on which element),
//   - the data-* attributes carried by Roam elements,
//   - the classes of Roam's live stylesheet missing from roamClasses.js.
//
// Two uses: (1) an optional compact summary appended to the system prompt
// (setting "domSnapshot"), (2) a full JSON export for the learning phase
// (command "Live Themes: Export Roam DOM snapshot").

import { ROAM_ELEMENTS } from "./roamElements";
import { isKnownRoamClass, STYLESHEET_CLASSES, ROAM_CLASS_FAMILY, readRoamStylesheetClasses } from "./roamClasses";
import { DARK_CLASS, isDarkMode } from "../utils/darkMode";
import { getEffectiveBackground, parseColor, toHex } from "./contrast";
import { diagnoseRoamCssPage, getLiveThemesCss } from "../utils/roamCss";

// Selectors whose computed style is reported (surface = where text sits).
export const SURFACE_SELECTORS = [
  { selector: ".roam-body", label: "app body" },
  { selector: ".roam-article", label: "main content column" },
  { selector: ".rm-topbar", label: "top bar" },
  { selector: ".roam-sidebar-container", label: "left sidebar" },
  { selector: ".roam-sidebar-content .log-button", label: "left sidebar entry" },
  { selector: "#right-sidebar", label: "right sidebar" },
  { selector: ".rm-sidebar-outline .roam-block", label: "right sidebar block text" },
  { selector: ".rm-title-display", label: "page title" },
  { selector: ".roam-log-page .rm-title-display", label: "daily note title (log view)" },
  { selector: ".roam-log-container .roam-log-page:not(:first-child)", label: "daily note separator (log view)" },
  { selector: ".roam-log-preview", label: "daily note not yet rendered (log view)" },
  { selector: ".roam-block", label: "block text" },
  { selector: ".rm-block__input", label: "block content (view mode)" },
  { selector: "textarea.rm-block-input", label: "editing textarea" },
  { selector: ".rm-page-ref--link", label: "page link" },
  { selector: ".rm-page-ref--tag", label: "tag" },
  { selector: ".rm-block-ref", label: "block reference" },
  { selector: ".rm-alias", label: "alias link" },
  { selector: ".rm-highlight", label: "highlight" },
  { selector: ".rm-block-text code", label: "inline code" },
  { selector: ".rm-code-block", label: "code block" },
  { selector: ".rm-bq", label: "blockquote" },
  { selector: ".rm-bullet__inner", label: "bullet dot" },
  { selector: ".rm-multibar", label: "thread line" },
  { selector: ".rm-reference-wrapper > .rm-reference-main", label: "linked references" },
  { selector: ".rm-unlinked-reference-container", label: "unlinked references" },
  { selector: ".rm-table th", label: "native table header cell" },
  { selector: ".rm-table td", label: "native table body cell" },
  { selector: ".rm-data-table__table th", label: "datalog query table header" },
  { selector: ".rm-data-table__table td", label: "datalog query table cell" },
  { selector: ".rm-ref-page-view-title", label: "referencing page title" },
  { selector: ".rm-zoom-item", label: "breadcrumb item" },
  { selector: ".bp3-popover .bp3-popover-content", label: "popover" },
  { selector: ".bp3-menu", label: "menu" },
  { selector: ".bp3-dialog", label: "dialog" },
  { selector: ".rm-autocomplete__results", label: "autocomplete" },
  // Blueprint controls: light by default (blueprint.css), so a dark theme
  // must restyle them; their computed colors show whether it did.
  { selector: ".bp3-button:not(.bp3-minimal):not([class*='bp3-intent-'])", label: "button (default)" },
  { selector: ".bp3-button.bp3-minimal", label: "icon button (minimal)" },
  { selector: ".bp3-html-select select", label: "select dropdown" },
  { selector: ".bp3-input", label: "text input" },
  { selector: ".bp3-menu-item", label: "menu item" },
  { selector: ".bp3-control", label: "checkbox / switch label" },
  { selector: ".bp3-tab", label: "tab" },
];

const STYLE_PROPS = ["color", "font-family", "font-size", "font-weight", "line-height"];

const isVisible = (el) => {
  if (!el || !(el instanceof Element)) return false;
  const rect = el.getBoundingClientRect();
  if (!rect.width && !rect.height) return false;
  const cs = getComputedStyle(el);
  return cs.display !== "none" && cs.visibility !== "hidden";
};

/** First visible element matching the selector (avoids hidden templates). */
export const firstVisible = (selector) => {
  let list;
  try {
    list = document.querySelectorAll(selector);
  } catch (e) {
    return null;
  }
  for (const el of list) if (isVisible(el)) return el;
  return list[0] || null;
};

const countMatches = (selector) => {
  if (selector.startsWith("::") || selector === `.${DARK_CLASS}`) return null; // not matchable
  try {
    return document.querySelectorAll(selector).length;
  } catch (e) {
    return -1; // invalid selector
  }
};

const shortFont = (family) =>
  (family || "")
    .split(",")
    .slice(0, 2)
    .map((f) => f.trim().replace(/^["']|["']$/g, ""))
    .join(", ");

/** Computed style summary of one element: effective background, text color, font. */
export function describeElement(el) {
  if (!el) return null;
  const cs = getComputedStyle(el);
  const bg = getEffectiveBackground(el);
  const own = parseColor(cs.backgroundColor);
  return {
    bg: bg ? toHex(bg) : null,
    ownBg: own && own.a > 0 ? toHex(own) : null,
    color: toHex(parseColor(cs.color)),
    fontFamily: shortFont(cs.fontFamily),
    fontSize: cs.fontSize,
    fontWeight: cs.fontWeight,
    lineHeight: cs.lineHeight,
    borderColor: cs.borderColor && cs.borderWidth !== "0px" ? toHex(parseColor(cs.borderColor)) : null,
    // Separators are often a single side (daily notes, headers): the
    // shorthand above then holds 4 values and is not parsed.
    borderTop: cs.borderTopStyle !== "none" && cs.borderTopWidth !== "0px" ? `${cs.borderTopWidth} ${toHex(parseColor(cs.borderTopColor))}` : null,
  };
}

const ROOT_SELECTOR = /^(:root|html|body|\.roam-body|\.roam-app|:root\.[\w-]+|html\.[\w-]+|body\.[\w-]+|\.bp3-dark|\.rm-dark-theme|:root \.rm-dark-theme|:root\.rm-dark-theme)(\s*,\s*.+)?$/;

// Libraries bundled by Roam whose custom properties are irrelevant to theming:
// the PDF viewer (react-pdf-highlighter), the tldraw canvas (":root, .t-xxxx")
// and Font Awesome (":root, :host"). Snapshots of 2026-09-20 showed them
// outnumbering Roam's own variables 3 to 1.
const THIRD_PARTY_SHEET = /react-pdf-highlighter|katex|reactflow|codemirror/;
const THIRD_PARTY_SELECTOR = /:host|\.t-[A-Za-z0-9]+/;
const MAX_VALUE_LENGTH = 160; // data: URIs are cut, they never matter for a theme

const SECTION_HEADER = /\/\* === .+ === \*\//;

/**
 * Style elements carrying the [[roam/css]] page. Roam renders each css code
 * block of the page as an inline <style> without id; the Live Themes blocks
 * are recognised by their section headers. (The "roam-css" id and the
 * "rm-roam-css" class are checked too, in case Roam labels them.)
 */
const isRoamCssStyle = (el) =>
  !!el &&
  el.tagName === "STYLE" &&
  (el.id === "roam-css" ||
    !!el.classList?.contains("rm-roam-css") ||
    (!el.id && SECTION_HEADER.test(el.textContent || "")));

/** One line per stylesheet, enough to tell where a rule comes from. */
const describeStylesheets = () =>
  [...document.styleSheets].map((s) => {
    const o = s.ownerNode;
    let rules;
    let firstSelectors = null;
    try {
      rules = s.cssRules.length;
      // Anonymous inline sheets are only identifiable by what they style.
      if (!s.href) {
        firstSelectors = [...s.cssRules]
          .slice(0, 3)
          .map((r) => r.selectorText || r.cssText.split("{")[0].trim().slice(0, 80));
      }
    } catch (e) {
      rules = -1; // cross-origin
    }
    return {
      href: s.href || null,
      id: o?.id || null,
      class: (o?.className && String(o.className)) || null,
      media: s.media?.mediaText || null,
      disabled: !!s.disabled,
      rules,
      firstSelectors,
      roamCss: !s.href && isRoamCssStyle(o),
    };
  });

/**
 * Custom properties declared on root-ish selectors by every reachable
 * stylesheet, with their source and current computed value.
 */
export function collectCssVariables() {
  const vars = new Map(); // name -> { name, declared: [{value, selector, source}], computed }
  const sourceOf = (sheet) => {
    if (sheet.href) {
      const path = sheet.href.replace(/^https?:\/\/[^/]+/, "");
      return path.includes("roamresearch.com") || path.startsWith("/assets/") ? `roam:${path.split("/").pop()}` : path;
    }
    const owner = sheet.ownerNode;
    if (!owner) return "inline";
    if (isRoamCssStyle(owner)) return "[[roam/css]]";
    if (owner.id) return `#${owner.id}`;
    if (owner.getAttribute?.("data-extension")) return owner.getAttribute("data-extension");
    return "inline <style>";
  };
  // Enclosing @media / @supports conditions, and whether they hold now.
  const conditionHolds = (rule) => {
    try {
      if (rule.type === CSSRule.MEDIA_RULE) return window.matchMedia(rule.conditionText || rule.media.mediaText).matches;
      if (rule.type === CSSRule.SUPPORTS_RULE) return CSS.supports(rule.conditionText);
    } catch (e) {
      /* unknown condition syntax */
    }
    return true;
  };
  const walk = (rules, sheetSource, context = [], active = true) => {
    for (const rule of rules) {
      if (rule.type === CSSRule.MEDIA_RULE || rule.type === CSSRule.SUPPORTS_RULE) {
        const at = `${rule.type === CSSRule.MEDIA_RULE ? "@media" : "@supports"} ${rule.conditionText || rule.media?.mediaText || ""}`;
        walk(rule.cssRules, sheetSource, [...context, at], active && conditionHolds(rule));
        continue;
      }
      if (rule.type !== CSSRule.STYLE_RULE || !ROOT_SELECTOR.test(rule.selectorText || "")) continue;
      if (THIRD_PARTY_SELECTOR.test(rule.selectorText)) continue;
      const style = rule.style;
      for (let i = 0; i < style.length; i++) {
        const name = style[i];
        if (!name.startsWith("--")) continue;
        const entry = vars.get(name) || { name, declared: [], computed: "" };
        const raw = style.getPropertyValue(name).trim();
        entry.declared.push({
          value: raw.length > MAX_VALUE_LENGTH ? `${raw.slice(0, MAX_VALUE_LENGTH)}… (${raw.length} chars)` : raw,
          selector: rule.selectorText,
          source: sheetSource,
          ...(context.length ? { context: context.join(" > "), active } : {}),
        });
        vars.set(name, entry);
      }
    }
  };
  for (const sheet of document.styleSheets) {
    if (sheet.disabled) continue;
    if (sheet.href && THIRD_PARTY_SHEET.test(sheet.href)) continue;
    try {
      walk(sheet.cssRules, sourceOf(sheet));
    } catch (e) {
      /* cross-origin stylesheet: skipped */
    }
  }
  const rootStyle = getComputedStyle(document.documentElement);
  for (const entry of vars.values()) {
    entry.computed = rootStyle.getPropertyValue(entry.name).trim();
    // Declared on :root but not computed there: the rule does not apply now
    // (unmatched condition, dark-only selector while in light mode, overridden…).
    if (!entry.computed) entry.notApplied = true;
  }
  return [...vars.values()].sort((a, b) => a.name.localeCompare(b.name));
}

const catalogSelectors = () =>
  ROAM_ELEMENTS.flatMap((g) => g.items.map((i) => i.selector));

/** rm-/roam- classes present in the DOM, with element counts. */
export function collectDomClasses() {
  const counts = new Map();
  for (const el of document.querySelectorAll("[class]")) {
    for (const cls of el.classList) {
      if (ROAM_CLASS_FAMILY.test(cls)) {
        counts.set(cls, (counts.get(cls) || 0) + 1);
      }
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([cls, count]) => ({ cls, count }));
}

// ---- Anatomy ----------------------------------------------------------------

// Elements whose place in the DOM tree the static facts describe. The first
// visible match of each is reported with its ancestors and its subtree.
export const ANATOMY_PROBES = [
  { selector: ".roam-block-container", label: "block container" },
  { selector: "[class*='rm-heading-level-']", label: "heading block" },
  { selector: ".rm-block__input", label: "block content (view mode)" },
  { selector: "textarea.rm-block-input", label: "editing textarea" },
  { selector: ".rm-block-children", label: "children container" },
  { selector: ".rm-page-ref--link", label: "page link" },
  { selector: ".rm-page-ref--tag", label: "tag" },
  { selector: ".rm-block-ref", label: "block reference" },
  { selector: ".rm-alias", label: "alias link" },
  { selector: ".rm-attr-ref", label: "attribute" },
  { selector: ".check-container", label: "TODO checkbox" },
  { selector: ".rm-callout", label: "callout" },
  { selector: ".rm-embed-container", label: "embed" },
  { selector: ".rm-query", label: "query" },
  { selector: ".rm-table", label: "native table" },
  { selector: ".rm-code-block", label: "code block" },
  { selector: ".rm-title-display", label: "page title" },
  { selector: ".roam-log-container", label: "daily notes log" },
  { selector: ".roam-log-page", label: "daily note (log)" },
  { selector: ".roam-log-page .rm-title-display", label: "daily note title (log)" },
  { selector: ".roam-log-preview", label: "daily note not yet rendered (log)" },
  { selector: ".rm-bullet__inner", label: "bullet dot" },
  { selector: ".rm-strikethrough", label: "strikethrough" },
  { selector: ".rm-reference-main", label: "linked references" },
  { selector: ".rm-ref-page-view", label: "referencing page group" },
  { selector: ".roam-sidebar-content .log-button", label: "left sidebar entry" },
  { selector: ".starred-pages", label: "shortcuts" },
  { selector: ".rm-sidebar-outline", label: "right sidebar window" },
  { selector: ".rm-topbar", label: "top bar" },
  { selector: ".rm-zoom", label: "breadcrumbs" },
  // Overlays: only present while open (use the delayed snapshot command).
  { selector: ".bp3-portal", label: "overlay portal (menus, popovers, dialogs)" },
  { selector: ".bp3-popover", label: "popover" },
  { selector: ".bp3-menu", label: "menu" },
  { selector: ".rm-autocomplete__results", label: "autocomplete" },
  { selector: ".bp3-dialog", label: "dialog" },
  { selector: ".rm-ds-q", label: "datalog query" },
  { selector: ".rm-data-table", label: "data table (datalog query results)" },
];

// Attribute values may hold page names or block text: only the names are
// exported, except for these presentation attributes.
const SAFE_ATTR_VALUE = /^(data-roam-(color|layout)-theme|aria-(expanded|selected|checked|hidden)|role|type)$/;
// Id segments that look generated (block uids, window ids, the Firebase user
// id Roam puts in block input ids): 9+ chars holding a digit, an uppercase
// letter or an underscore. Plain words ("right", "sidebar") are kept.
const maskId = (id) =>
  id
    .split("-")
    .map((seg) => (seg.length >= 9 && /[0-9A-Z_]/.test(seg) ? "<uid>" : seg))
    .join("-");
const MAX_CLASSES = 12;
const STOP_AT = /^(roam-article|roam-body-main|roam-main|roam-app|roam-body|right-sidebar|roam-sidebar-container)$/;

/** Compact CSS-like description of one element: tag#id.class1.class2[data-x][role="…"]. */
export function describeNode(el) {
  const tag = el.tagName.toLowerCase();
  const id = el.id ? `#${maskId(el.id)}` : "";
  const cls = [...el.classList];
  const classes = cls.slice(0, MAX_CLASSES).map((c) => `.${c}`).join("") + (cls.length > MAX_CLASSES ? `(+${cls.length - MAX_CLASSES})` : "");
  const attrs = [...el.attributes]
    .filter((a) => a.name.startsWith("data-") || SAFE_ATTR_VALUE.test(a.name))
    .map((a) => (SAFE_ATTR_VALUE.test(a.name) ? `[${a.name}="${a.value}"]` : `[${a.name}]`))
    .join("");
  return `${tag}${id}${classes}${attrs}`;
}

/** Ancestors of el, outermost first, up to the app shell (or `max` levels). */
function ancestry(el, max = 8) {
  const chain = [];
  let cur = el.parentElement;
  while (cur && cur !== document.body && chain.length < max) {
    chain.unshift(describeNode(cur));
    if ((cur.id && STOP_AT.test(cur.id)) || [...cur.classList].some((c) => STOP_AT.test(c))) break;
    cur = cur.parentElement;
  }
  return chain;
}

/** Indented outline of el's subtree (depth- and width-limited, text omitted). */
function outline(el, depth = 4, width = 6, indent = "") {
  const lines = [`${indent}${describeNode(el)}`];
  if (depth === 0) return lines;
  const kids = [...el.children].filter((k) => !["SCRIPT", "STYLE", "PATH", "G"].includes(k.tagName.toUpperCase()));
  // Siblings described identically (a list of blocks, of shortcuts…) are
  // shown once with a count: their structure is the same.
  let shown = 0;
  for (let i = 0; i < kids.length && shown < width; ) {
    const d = describeNode(kids[i]);
    let j = i + 1;
    while (j < kids.length && describeNode(kids[j]) === d) j++;
    const sub = outline(kids[i], depth - 1, width, `${indent}  `);
    if (j - i > 1) sub[0] += `  (×${j - i})`;
    lines.push(...sub);
    shown++;
    i = j;
  }
  const groups = kids.filter((k, i) => i === 0 || describeNode(k) !== describeNode(kids[i - 1])).length;
  if (groups > shown) lines.push(`${indent}  … ${groups - shown} more`);
  return lines;
}

export function collectAnatomy() {
  return ANATOMY_PROBES.map(({ selector, label }) => {
    const el = firstVisible(selector);
    if (!el) return { selector, label, missing: true };
    return { selector, label, count: countMatches(selector), ancestors: ancestry(el), tree: outline(el) };
  });
}

/** data-* attribute names found on Roam elements, with counts and the classes carrying them. */
export function collectDataAttributes() {
  const byName = new Map();
  for (const el of (document.getElementById("app") || document.body).querySelectorAll("*")) {
    for (const a of el.attributes) {
      if (!a.name.startsWith("data-")) continue;
      const e = byName.get(a.name) || { name: a.name, count: 0, on: new Map() };
      e.count++;
      const host = [...el.classList].find((c) => ROAM_CLASS_FAMILY.test(c)) || el.tagName.toLowerCase();
      e.on.set(host, (e.on.get(host) || 0) + 1);
      byName.set(a.name, e);
    }
  }
  return [...byName.values()]
    .sort((a, b) => b.count - a.count)
    .map((e) => ({
      name: e.name,
      count: e.count,
      on: [...e.on.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([k, n]) => `${k} (${n})`),
    }));
}

/** Classes of Roam's live stylesheets vs the static LIST of roamClasses.js. */
function compareStylesheetClasses() {
  const { classes, sources } = readRoamStylesheetClasses();
  return {
    sources,
    count: classes.size,
    missingFromList: [...classes].filter((c) => !STYLESHEET_CLASSES.has(c)).sort(),
    goneFromStylesheet: classes.size ? [...STYLESHEET_CLASSES].filter((c) => !classes.has(c)).sort() : [],
  };
}

// ---- Health of the Live Themes CSS in the page --------------------------------

const normSelector = (sel) => sel.replace(/\s+/g, " ").replace(/\s*([>+~,])\s*/g, "$1").trim();

/** Selectors of the Live Themes stylesheet (style rules only, comments removed). */
function liveThemesSelectors(css) {
  const set = new Set();
  const src = (css || "").replace(/\/\*[\s\S]*?\*\//g, "");
  for (const m of src.matchAll(/([^{};]+)\{/g)) {
    const sel = m[1].trim();
    if (sel && !sel.startsWith("@")) set.add(normSelector(sel));
  }
  return set;
}

/**
 * Where the Live Themes rules really are in the CSSOM: how many are found,
 * and how many sit inside a group rule (@media, @supports) that does not
 * hold now, which silently disables them. Also reports the css blocks of
 * [[roam/css]] with an unbalanced bracket, the usual cause.
 */
export function diagnoseLiveThemesCss() {
  let css = "";
  let page = { blocks: [], liveThemesIndex: -1 };
  try {
    css = getLiveThemesCss();
    page = diagnoseRoamCssPage();
  } catch (e) {
    /* Roam API unavailable */
  }
  const wanted = liveThemesSelectors(css);
  const found = [];
  const conditionHolds = (rule) => {
    try {
      if (rule.type === CSSRule.MEDIA_RULE) return window.matchMedia(rule.conditionText || rule.media.mediaText).matches;
      if (rule.type === CSSRule.SUPPORTS_RULE) return CSS.supports(rule.conditionText);
    } catch (e) {
      /* unknown syntax */
    }
    return true;
  };
  const walk = (rules, sheetIndex, context, active) => {
    for (const rule of rules) {
      if (rule.type === CSSRule.STYLE_RULE) {
        const sel = normSelector(rule.selectorText);
        if (wanted.has(sel)) found.push({ sel, sheetIndex, context, active });
      } else if (rule.cssRules) {
        const at = rule.cssText.split("{")[0].trim().slice(0, 100);
        walk(rule.cssRules, sheetIndex, [...context, at], active && conditionHolds(rule));
      }
    }
  };
  // Only anonymous <style> elements: Roam renders [[roam/css]] without id,
  // whereas extensions label theirs (plugin-style-…, roamjs-style-…) and may
  // share common selectors with the theme.
  [...document.styleSheets].forEach((sheet, i) => {
    if (sheet.href || sheet.disabled || sheet.ownerNode?.id) return;
    try {
      walk(sheet.cssRules, i, [], true);
    } catch (e) {
      /* unreadable */
    }
  });
  // Per selector: disabled when none of its occurrences applies now.
  const activeSel = new Set(found.filter((f) => f.active).map((f) => f.sel));
  const foundSel = new Set(found.map((f) => f.sel));
  const disabled = found.filter((f) => !f.active && !activeSel.has(f.sel));
  const contexts = [...new Set(disabled.map((f) => f.context.join(" > ")))];
  const broken = page.blocks
    .map((b, index) => ({ ...b, index }))
    .filter((b) => b.problem)
    .map((b) => ({
      uid: b.uid,
      label: b.label,
      liveThemes: b.liveThemes,
      beforeLiveThemes: page.liveThemesIndex >= 0 && b.index < page.liveThemesIndex,
      problem: `${b.problem.kind} "${b.problem.char}" at line ${b.problem.line}`,
    }));
  return {
    selectors: wanted.size,
    found: foundSel.size,
    disabledByCondition: new Set(disabled.map((f) => f.sel)).size,
    disablingConditions: contexts,
    sheets: [...new Set(found.map((f) => f.sheetIndex))],
    roamCssBlocks: page.blocks.length,
    brokenBlocks: broken,
  };
}

/** Full snapshot (JSON-serializable). */
export function inspectRoamDom() {
  const html = document.documentElement;
  const catalog = catalogSelectors().map((selector) => ({
    selector,
    count: countMatches(selector),
  }));
  const catalogClasses = new Set(
    catalog.flatMap((c) => (c.selector.match(/\.[\w-]+/g) || []).map((s) => s.slice(1)))
  );
  const domClasses = collectDomClasses();
  const surfaces = SURFACE_SELECTORS.map(({ selector, label }) => ({
    selector,
    label,
    ...(describeElement(firstVisible(selector)) || { missing: true }),
  }));
  const health = diagnoseLiveThemesCss();
  const stylesheets = describeStylesheets().map((s, i) => (health.sheets.includes(i) ? { ...s, roamCss: true } : s));
  return {
    format: "live-themes/dom-snapshot/1",
    at: new Date().toISOString(),
    url: location.href.replace(/\/app\/[^/]+.*$/, "/app/<graph>"),
    userAgent: navigator.userAgent,
    viewport: { width: innerWidth, height: innerHeight },
    roam: {
      colorTheme: html.getAttribute("data-roam-color-theme"),
      layoutTheme: html.getAttribute("data-roam-layout-theme"),
      htmlClasses: [...html.classList],
      bodyClasses: [...document.body.classList],
      nativeDark: !!document.querySelector(".bp3-dark"),
      liveThemesDark: isDarkMode(),
      hasRoamCssStyle: [...document.querySelectorAll("style")].some(isRoamCssStyle) || health.sheets.length > 0,
      stylesheets,
    },
    catalog,
    surfaces,
    variables: collectCssVariables(),
    domClasses,
    unknownClasses: domClasses.filter(({ cls }) => !isKnownRoamClass(cls) && !catalogClasses.has(cls)),
    anatomy: collectAnatomy(),
    dataAttributes: collectDataAttributes(),
    stylesheetClasses: compareStylesheetClasses(),
    liveThemesHealth: health,
  };
}

// ---- Compact text for the prompt ------------------------------------------

const MAX_VARS_IN_PROMPT = 60;

/** Compact summary (a few dozen lines) appended to the system prompt. */
export function formatSnapshotForPrompt(snapshot) {
  const lines = [];
  const r = snapshot.roam;
  lines.push(
    `Mode now: ${snapshot.roam.liveThemesDark ? "DARK (rm-dark-theme)" : "LIGHT"}${
      r.nativeDark ? ", Roam native dark (.bp3-dark) is also active" : ""
    }. Roam color theme: ${r.colorTheme || "default"}, layout: ${r.layoutTheme || "default"}. <html> classes: ${
      r.htmlClasses.join(" ") || "(none)"
    }; <body> classes: ${r.bodyClasses.join(" ") || "(none)"}.`
  );

  const body = snapshot.surfaces.find((x) => x.selector === ".roam-article" && !x.missing);
  const bodyRgb = body?.bg && parseColor(body.bg);
  const light = bodyRgb && (0.299 * bodyRgb.r + 0.587 * bodyRgb.g + 0.114 * bodyRgb.b) / 255 > 0.6;
  if (r.liveThemesDark && light) {
    lines.push(
      "WARNING: the dark mode class is on but the main surfaces are still LIGHT: no dark rule applies right now (the theme has no dark section yet, or it is disabled). Write the dark rules from scratch."
    );
  } else if (!r.liveThemesDark && bodyRgb && !light) {
    lines.push("NOTE: light mode, but the main surfaces are DARK (a dark theme is applied without the dark mode class).");
  }
  const h = snapshot.liveThemesHealth;
  if (h?.disabledByCondition) {
    lines.push(
      `WARNING: ${h.disabledByCondition} of the ${h.found} Live Themes rules found in the page are trapped inside ${h.disablingConditions.join(" | ")}, which does not hold now, so they have NO effect. Cause: an unclosed "{" earlier in [[roam/css]]${
        h.brokenBlocks.length ? ` (block "${h.brokenBlocks[0].label}": ${h.brokenBlocks[0].problem})` : ""
      }. Tell the user; do not try to compensate with more specific rules.`
    );
  }
  lines.push("Effective computed styles right now (background = first non-transparent ancestor background):");
  for (const s of snapshot.surfaces) {
    if (s.missing) continue;
    lines.push(
      `- ${s.label} \`${s.selector}\`: bg ${s.bg || "?"}${s.ownBg && s.ownBg !== s.bg ? ` (own ${s.ownBg})` : ""}, text ${s.color}, ${s.fontSize} ${s.fontFamily}${
        s.borderColor ? `, border ${s.borderColor}` : ""
      }`
    );
  }
  const missingSurfaces = snapshot.surfaces.filter((s) => s.missing).map((s) => s.selector);
  if (missingSurfaces.length) lines.push(`- not on screen now: ${missingSurfaces.join(", ")}`);

  const absent = snapshot.catalog.filter((c) => c.count === 0).map((c) => c.selector);
  if (absent.length) {
    lines.push(
      `Catalog selectors with no match on the current screen (still valid, just not displayed now): ${absent.join(", ")}`
    );
  }

  const vars = snapshot.variables;
  if (vars.length) {
    const own = vars.filter((v) => !v.declared.every((d) => d.source.startsWith("roam:")));
    const roam = vars.filter((v) => v.declared.every((d) => d.source.startsWith("roam:")));
    const fmt = (v) => {
      const srcs = [...new Set(v.declared.map((d) => d.source))].join("+");
      const sels = [...new Set(v.declared.map((d) => d.selector))].slice(0, 2).join(" | ");
      return `${v.name}=${v.computed || v.declared[0].value}${v.notApplied ? " (declared, not applied now)" : ""} [${srcs}${sels !== ":root" ? `; ${sels}` : ""}]`;
    };
    if (own.length) {
      lines.push(
        `CSS variables defined by [[roam/css]] or other extensions (reuse them for consistency): ${own
          .slice(0, MAX_VARS_IN_PROMPT)
          .map(fmt)
          .join("; ")}`
      );
    }
    if (roam.length) {
      lines.push(`Roam's native variables currently computed: ${roam.slice(0, MAX_VARS_IN_PROMPT).map(fmt).join("; ")}`);
    }
  }
  return lines.join("\n");
}

/** Snapshot + prompt text in one call; never throws (returns null on failure). */
export function buildDomContext() {
  try {
    const snapshot = inspectRoamDom();
    return { snapshot, text: formatSnapshotForPrompt(snapshot) };
  } catch (e) {
    console.warn("[Live Themes] DOM snapshot failed", e);
    return null;
  }
}

/** Downloads the full snapshot as JSON and logs it (learning phase). */
export function exportDomSnapshot() {
  const snapshot = inspectRoamDom();
  const json = JSON.stringify(snapshot, null, 2);
  console.log("[Live Themes] DOM snapshot", snapshot);
  console.log(
    "[Live Themes] DOM anatomy\n\n" +
      snapshot.anatomy
        .filter((a) => !a.missing)
        .map((a) => `## ${a.label} (${a.selector}, ${a.count} on screen)\n${a.ancestors.join(" > ")}\n${a.tree.join("\n")}`)
        .join("\n\n")
  );
  try {
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `live-themes-dom-snapshot-${snapshot.at.slice(0, 19).replace(/[:T]/g, "-")}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch (e) {
    console.warn("[Live Themes] snapshot download failed", e);
  }
  return snapshot;
}
