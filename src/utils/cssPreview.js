// <style> elements mirroring the Live Themes CSS. They give immediate
// feedback when a proposal is applied and keep the theme visible until the
// next reload even if Roam's own [[roam/css]] watcher lags.
//
// One <style> per section, like Roam does with the code blocks of
// [[roam/css]]: a syntax error (an unclosed bracket, typically) then only
// disables its own section instead of everything after it in the theme.

import { parseCssSections, sectionHeader } from "./cssSections";
import { isUntrustedUrl } from "./cssValidate";

const STYLE_ID = "live-themes-style";
const ATTR = "data-live-themes-section";
const FONT_ATTR = "data-live-themes-font";

// ---- Web fonts ------------------------------------------------------------
//
// Roam merges every css block of [[roam/css]] into ONE <style>, and an
// @import is only valid at the very top of a stylesheet: once other blocks
// (the user's base CSS) come first, the theme's @import url(...) lines are
// ignored by the browser, and its Google Fonts never load after a reload.
// So the extension loads them itself with <link> elements, kept in sync with
// the active theme (on load, and whenever the theme CSS is applied).

const IMPORT_REGEX = /@import\s+(?:url\(\s*(['"]?)([^'")]+)\1\s*\)|(['"])([^'"]+)\3)[^;]*;/g;

// Only font stylesheets from trusted hosts (Google Fonts) are loaded: any
// other @import would let a theme pull arbitrary, unreviewable CSS from
// another site.
export const extractFontImports = (css) =>
  [...(css || "").matchAll(IMPORT_REGEX)]
    .map((m) => (m[2] || m[4] || "").trim())
    .filter((href) => /^https:\/\//i.test(href) && !isUntrustedUrl(href));

/** Makes the <link> elements of the page match the @import lines of `css`. */
export function syncFontLinks(css) {
  const wanted = new Set(extractFontImports(css));
  for (const el of document.querySelectorAll(`link[${FONT_ATTR}]`)) {
    if (wanted.has(el.getAttribute("href"))) wanted.delete(el.getAttribute("href"));
    else el.remove();
  }
  for (const href of wanted) {
    const el = document.createElement("link");
    el.rel = "stylesheet";
    el.href = href;
    el.setAttribute(FONT_ATTR, "");
    document.head.appendChild(el);
  }
}

export function injectStyle(css) {
  removeStyle();
  syncFontLinks(css);
  const sections = parseCssSections(css);
  if (!sections.length) return;
  sections.forEach((section, i) => {
    const el = document.createElement("style");
    el.id = i === 0 ? STYLE_ID : `${STYLE_ID}-${i}`;
    el.setAttribute(ATTR, section.title || "");
    el.textContent = section.title ? `${sectionHeader(section.title)}\n${section.css}` : section.css;
    document.head.appendChild(el);
  });
}

export function removeStyle() {
  for (const el of document.querySelectorAll(`style[${ATTR}], style#${STYLE_ID}`)) el.remove();
}

const PREVIEW_FONT_ATTR = "data-live-themes-preview-font";

/**
 * Loads font stylesheets for previews (the starter gallery), once. Separate
 * from the theme's own font links, which syncFontLinks() replaces.
 */
export function loadPreviewFonts(hrefs) {
  const present = new Set([...document.querySelectorAll(`link[${PREVIEW_FONT_ATTR}]`)].map((el) => el.getAttribute("href")));
  for (const href of hrefs) {
    if (!href || present.has(href) || !/^https:\/\//i.test(href) || isUntrustedUrl(href)) continue;
    const el = document.createElement("link");
    el.rel = "stylesheet";
    el.href = href;
    el.setAttribute(PREVIEW_FONT_ATTR, "");
    document.head.appendChild(el);
  }
}

/** Removes the style previews and the font links (CSS disabled, extension unloaded). */
export function removeAllStyles() {
  removeStyle();
  for (const el of document.querySelectorAll(`link[${FONT_ATTR}], link[${PREVIEW_FONT_ATTR}]`)) el.remove();
}
