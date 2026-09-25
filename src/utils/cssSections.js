// A theme stylesheet is one CSS string, organized in sections introduced by a
// header comment line:
//
//   /* === Typography === */
//
// On [[roam/css]] each section becomes its own block (title + css code block
// child), so a long theme stays readable and collapsible in Roam. These two
// pure helpers convert between the string and the list of sections.

const HEADER_LINE = /^[ \t]*\/\*[ \t]*={2,}[ \t]*(.+?)[ \t]*={2,}[ \t]*\*\/[ \t]*$/;

export const sectionHeader = (title) => `/* === ${title} === */`;

/**
 * Section titles and theme names are written as plain block strings on
 * [[roam/css]]: strip what Roam would render as markup (embeds, images,
 * links, page refs, tags, block refs, :hiccup…) or what would end the
 * header comment, and cap the length. Model output and imported files
 * cannot then put live content on the page.
 */
export const toSafeBlockText = (text, max = 80) =>
  (text || "")
    .replace(/[{}[\]`#\r\n]|\(\(|\)\)|\*\/|\/\*|\^\^|:hiccup/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max)
    .trim();

/**
 * Splits a stylesheet into [{ title, css }]. Rules found before the first
 * header form an untitled section (title = null). Empty sections are dropped.
 */
export function parseCssSections(css) {
  const sections = [];
  let current = { title: null, lines: [] };
  for (const line of (css || "").split(/\r?\n/)) {
    const m = HEADER_LINE.exec(line);
    if (m) {
      sections.push(current);
      current = { title: toSafeBlockText(m[1]) || null, lines: [] };
    } else {
      current.lines.push(line);
    }
  }
  sections.push(current);
  return sections
    .map((s) => ({ title: s.title, css: s.lines.join("\n").trim() }))
    .filter((s) => s.css);
}

/** Inverse of parseCssSections(): rebuilds the single stylesheet string. */
export function joinCssSections(sections) {
  return (sections || [])
    .map((s) => ({ title: s.title, css: (s.css || "").trim() }))
    .filter((s) => s.css)
    .map((s) => (s.title ? `${sectionHeader(s.title)}\n${s.css}` : s.css))
    .join("\n\n");
}

export const countCssLines = (css) => ((css || "").trim() ? css.trim().split("\n").length : 0);
