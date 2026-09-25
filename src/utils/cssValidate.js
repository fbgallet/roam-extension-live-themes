// Finds what the browser would silently drop in a theme stylesheet, so the
// user learns WHERE a theme breaks instead of wondering why a rule has no
// effect:
//   - an unbalanced "(", "[" or "{" (or a stray closing one): the CSS parser
//     swallows every rule after it, so one typo in the "Dark mode" section
//     can disable the whole dark mode;
//   - a rule the parser rejects (bad selector, stray backtick, markdown…),
//     dropped on its own.
// Reported per section. Nothing is corrected automatically.

import { parseCssSections } from "./cssSections";
import { scanCssRules } from "./cssRules";

const OPEN = { "(": ")", "[": "]", "{": "}" };
const CLOSE = { ")": "(", "]": "[", "}": "{" };

/**
 * First bracket problem of a CSS string, or null.
 * @returns {{ char: string, line: number, kind: "unclosed"|"stray" } | null}
 */
export function findUnbalancedBracket(css) {
  const s = css || "";
  const stack = [];
  let line = 1;
  let i = 0;
  while (i < s.length) {
    const ch = s[i];
    if (ch === "\n") {
      line++;
      i++;
      continue;
    }
    if (ch === "/" && s[i + 1] === "*") {
      const end = s.indexOf("*/", i + 2);
      const stop = end < 0 ? s.length : end + 2;
      line += (s.slice(i, stop).match(/\n/g) || []).length;
      i = stop;
      continue;
    }
    if (ch === '"' || ch === "'") {
      let j = i + 1;
      while (j < s.length && s[j] !== ch && s[j] !== "\n") {
        if (s[j] === "\\") j++;
        j++;
      }
      i = j + 1; // an unterminated string ends at the line break (browser behaviour)
      continue;
    }
    if (OPEN[ch]) stack.push({ char: ch, line });
    else if (CLOSE[ch]) {
      const top = stack[stack.length - 1];
      if (!top || top.char !== CLOSE[ch]) return { char: ch, line, kind: "stray" };
      stack.pop();
    }
    i++;
  }
  if (stack.length) return { ...stack[0], kind: "unclosed" };
  return null;
}

const canParse = () =>
  typeof CSSStyleSheet !== "undefined" && "replaceSync" in CSSStyleSheet.prototype;

/** True when the browser keeps at least one rule out of `css` (wrapped in `context` group rules). */
const browserKeeps = (css, context) => {
  const wrapped = context.reduceRight((inner, group) => `${group} { ${inner} }`, css);
  try {
    const sheet = new CSSStyleSheet();
    sheet.replaceSync(wrapped);
    let rules = sheet.cssRules;
    for (let depth = 0; depth < context.length; depth++) {
      if (!rules.length) return false;
      rules = rules[0].cssRules || [];
    }
    return rules.length > 0;
  } catch (e) {
    return false;
  }
};

const short = (text, max = 110) => {
  const one = (text || "").replace(/\s+/g, " ").trim();
  return one.length > max ? `${one.slice(0, max)}…` : one;
};

/**
 * Human-readable problems of a theme stylesheet, section by section.
 * @param {string} css whole theme (with /* === Section === *\/ headers)
 * @returns {string[]} warnings (empty when the browser keeps every rule)
 */
export function validateCss(css) {
  const warnings = [];
  const sections = parseCssSections(css);
  for (const section of sections) {
    const where = section.title ? `Section "${section.title}"` : "Untitled rules";
    const bracket = findUnbalancedBracket(section.css);
    if (bracket) {
      warnings.push(
        bracket.kind === "unclosed"
          ? `${where}: "${bracket.char}" opened at line ${bracket.line} is never closed. The browser ignores every rule after it (the rest of this section, and the following sections in the live preview).`
          : `${where}: stray "${bracket.char}" at line ${bracket.line}. The browser ignores the rules around it.`
      );
      continue; // rule-level checks would only repeat the same problem
    }
    if (!canParse()) continue;
    for (const rule of scanCssRules(section.css)) {
      if (rule.type === "statement") {
        // @import / @charset are legal at the top of a sheet but constructable
        // stylesheets refuse them, so they cannot be checked here.
        if (/^@(import|charset|layer|namespace)\b/i.test(rule.selector)) continue;
        warnings.push(`${where}: text outside any rule is ignored by the browser: "${short(rule.text)}"`);
        continue;
      }
      if (!browserKeeps(rule.text, rule.context)) {
        warnings.push(
          `${where}: rule rejected by the browser's CSS parser, so it has no effect: "${short(rule.selector)}"`
        );
      }
    }
  }
  return warnings;
}

// ---- External resources ------------------------------------------------------
//
// A url() / @import / @font-face src pointing to another site makes the
// browser call it as soon as the CSS is applied, including during the review.
// Combined with attribute selectors (`[data-link-title^="a"] { background:
// url(https://…/?a) }`) this can leak page titles, or track the user. The
// model is asked to use only Google Fonts; anything else (model output steered
// by an injected text, imported theme file) is reported before it is applied.

export const TRUSTED_RESOURCE_HOSTS = ["fonts.googleapis.com", "fonts.gstatic.com"];

const URL_REGEX = /url\(\s*(['"]?)([^'")]*)\1\s*\)|@import\s+(['"])([^'"]*)\3/gi;

/** True for a URL the browser would fetch from a site other than Roam or a trusted font host. */
export const isUntrustedUrl = (url) => {
  const u = (url || "").trim();
  if (!u || /^(data|blob):/i.test(u) || u.startsWith("#")) return false;
  if (!/^[a-z][a-z0-9+.-]*:|^\/\//i.test(u)) return false; // relative: same origin
  try {
    const parsed = new URL(u, "https://roamresearch.com");
    return !(parsed.protocol === "https:" && TRUSTED_RESOURCE_HOSTS.includes(parsed.hostname));
  } catch (e) {
    return true;
  }
};

/** Distinct untrusted URLs referenced by a stylesheet. */
export function findUntrustedUrls(css) {
  const found = new Set();
  const text = (css || "").replace(/\/\*[\s\S]*?\*\//g, "");
  for (const m of text.matchAll(URL_REGEX)) {
    const url = (m[2] ?? m[4] ?? "").trim();
    if (isUntrustedUrl(url)) found.add(url);
  }
  return [...found];
}

export const untrustedUrlWarning = (url) =>
  `External resource "${short(url, 90)}": the browser would load it from another site as soon as the CSS is applied (this can be used to track you or leak page titles). Apply only if you trust this site.`;
