// Scans a stylesheet into its rules, with character offsets, so that a rule
// can be listed, targeted by the user and replaced in place without
// reformatting the rest of the text. Conditional group rules (@media,
// @supports…) are walked into: their inner rules are listed with a `context`.
//
// This is a light scanner, not a full parser: it only tracks braces, strings
// and comments, which is enough to delimit rules reliably.

const GROUP_AT_RULE = /^@(media|supports|container|layer|document|scope)\b/i;

const skipComment = (s, i) => {
  const end = s.indexOf("*/", i + 2);
  return end < 0 ? s.length : end + 2;
};

const skipString = (s, i) => {
  const quote = s[i];
  let j = i + 1;
  while (j < s.length) {
    if (s[j] === "\\") {
      j += 2;
      continue;
    }
    if (s[j] === quote || s[j] === "\n") return j + 1;
    j++;
  }
  return s.length;
};

/** Index of the "}" matching the "{" at `open`, or s.length if unbalanced. */
const findBlockEnd = (s, open) => {
  let depth = 0;
  let i = open;
  while (i < s.length) {
    const ch = s[i];
    if (ch === "/" && s[i + 1] === "*") {
      i = skipComment(s, i);
      continue;
    }
    if (ch === '"' || ch === "'") {
      i = skipString(s, i);
      continue;
    }
    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) return i;
    }
    i++;
  }
  return s.length;
};

const stripComments = (s) => (s || "").replace(/\/\*[\s\S]*?\*\//g, "");

/** Canonical form of a selector, used to compare addresses. */
export const normalizeSelector = (s) =>
  stripComments(s).replace(/\s+/g, " ").replace(/\s*([>+~,])\s*/g, "$1").trim().toLowerCase();

/**
 * @param {string} css
 * @returns {Array<{index:number, type:"rule"|"at-rule"|"statement", selector:string,
 *   declarations:string, text:string, start:number, end:number, context:string[]}>}
 * `text === css.slice(start, end)`; `text` includes a comment placed right
 * before the rule. `context` lists the enclosing group rules (e.g. "@media …").
 * `index` is the rule's position in document order (the address used in
 * patches).
 */
export function scanCssRules(css) {
  const items = [];
  const walk = (s, base, context) => {
    const n = s.length;
    let i = 0;
    let itemStart = 0;
    const firstContent = (from, to) => {
      let k = from;
      while (k < to && /\s/.test(s[k])) k++;
      return k;
    };
    while (i < n) {
      const ch = s[i];
      if (ch === "/" && s[i + 1] === "*") {
        i = skipComment(s, i);
        continue;
      }
      if (ch === '"' || ch === "'") {
        i = skipString(s, i);
        continue;
      }
      if (ch === ";") {
        const prelude = stripComments(s.slice(itemStart, i)).replace(/\s+/g, " ").trim();
        if (prelude) {
          const st = firstContent(itemStart, i);
          items.push({
            type: "statement",
            selector: prelude,
            declarations: "",
            text: s.slice(st, i + 1),
            start: base + st,
            end: base + i + 1,
            context,
          });
        }
        i++;
        itemStart = i;
        continue;
      }
      if (ch === "}") {
        i++;
        itemStart = i;
        continue;
      }
      if (ch === "{") {
        const close = findBlockEnd(s, i);
        const end = Math.min(close + 1, n);
        const prelude = stripComments(s.slice(itemStart, i)).replace(/\s+/g, " ").trim();
        if (GROUP_AT_RULE.test(prelude)) {
          walk(s.slice(i + 1, close), base + i + 1, [...context, prelude]);
        } else {
          const st = firstContent(itemStart, i);
          items.push({
            type: prelude.startsWith("@") ? "at-rule" : "rule",
            selector: prelude,
            declarations: s.slice(i + 1, close).trim(),
            text: s.slice(st, end),
            start: base + st,
            end: base + end,
            context,
          });
        }
        i = end;
        itemStart = i;
        continue;
      }
      i++;
    }
  };
  walk(css || "", 0, []);
  return items.map((item, index) => ({ ...item, index }));
}

/** Replaces one scanned rule by new text; the rest of the stylesheet is untouched. */
export const replaceCssRule = (css, rule, newText) =>
  css.slice(0, rule.start) + (newText || "").trim() + css.slice(rule.end);
