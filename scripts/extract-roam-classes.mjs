// Regenerates the LIST of src/ai/roamClasses.js from Roam's public stylesheet.
// Usage: node scripts/extract-roam-classes.mjs [path/to/site.css]
// Without argument the stylesheet is downloaded from roamresearch.com.

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const SITE_CSS = "https://roamresearch.com/assets/css/less-compiled/site.css";
const TARGET = fileURLToPath(new URL("../src/ai/roamClasses.js", import.meta.url));
// Same families as collectDomClasses() in domInspector.js.
const ROAM_CLASS_FAMILY =
  /^(rm-|roam-|kanban-|starred-|log-button|check-container|checkbox-header|checkmark|block-highlight|bp3-dark$)/;

const css = process.argv[2] ? readFileSync(process.argv[2], "utf8") : await (await fetch(SITE_CSS)).text();
const withoutComments = css.replace(/\/\*[\s\S]*?\*\//g, "");
// Class tokens in selectors only (declarations removed, so ".5px" or URLs never count).
const selectors = withoutComments.replace(/\{[^{}]*\}/g, "{}");
const classes = new Set();
for (const m of selectors.matchAll(/\.(-?[_a-zA-Z][\w-]*)/g)) {
  if (ROAM_CLASS_FAMILY.test(m[1])) classes.add(m[1]);
}
const list = [...classes].sort();
const today = new Date().toISOString().slice(0, 10);

let src = readFileSync(TARGET, "utf8");
const before = new Set(src.match(/const LIST =\s*"([^"]*)"/)[1].split(" "));
src = src
  .replace(/const LIST =\s*"[^"]*"/, `const LIST =\n  "${list.join(" ")}"`)
  .replace(/extracted on \d{4}-\d{2}-\d{2}/, `extracted on ${today}`)
  .replace(/ROAM_CLASSES_EXTRACTED_AT = "[^"]*"/, `ROAM_CLASSES_EXTRACTED_AT = "${today}"`);
writeFileSync(TARGET, src);

const added = list.filter((c) => !before.has(c));
const removed = [...before].filter((c) => !classes.has(c));
console.log(`${list.length} classes (${added.length} added, ${removed.length} removed)`);
if (removed.length) console.log("removed:", removed.join(" "));
