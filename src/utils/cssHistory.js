// Compact history entries. Instead of the whole stylesheet before a change, a
// history entry stores an "undo patch": only the sections the change touched,
// as they were before, plus the previous order of the sections. A typical
// change touches one or two sections of a theme that has fifteen, so the
// synced settings stay small.
//
//   undo = { order: [key, …], changed: { key: cssBefore | null } }
//
// key = section title ("" for the untitled section); null = the section did
// not exist before the change. Stylesheets with duplicate section titles
// cannot be keyed reliably: makeUndoPatch() then returns null and the caller
// stores the whole previous CSS, as older versions did.

import { joinCssSections, parseCssSections } from "./cssSections";

const keyOf = (section) => section.title || "";

const toMap = (css) => {
  const sections = parseCssSections(css);
  const map = new Map(sections.map((s) => [keyOf(s), s.css]));
  return map.size === sections.length ? { sections, map } : null; // null: duplicate titles
};

/** Undo patch turning `after` back into `before`, or null when it cannot be keyed. */
export function makeUndoPatch(before, after) {
  const b = toMap(before);
  const a = toMap(after);
  if (!b || !a) return null;
  const changed = {};
  for (const [key, css] of b.map) if (a.map.get(key) !== css) changed[key] = css;
  for (const key of a.map.keys()) if (!b.map.has(key)) changed[key] = null;
  return { order: b.sections.map(keyOf), changed };
}

/** Applies an undo patch to `css`. Sections the patch does not mention are kept as they are. */
export function applyUndoPatch(css, patch) {
  const current = toMap(css);
  if (!current) return css;
  const { map } = current;
  for (const [key, before] of Object.entries(patch.changed || {})) {
    if (before === null) map.delete(key);
    else map.set(key, before);
  }
  const order = (patch.order || []).filter((key) => map.has(key));
  const rest = [...map.keys()].filter((key) => !order.includes(key));
  return joinCssSections([...order, ...rest].map((key) => ({ title: key || null, css: map.get(key) })));
}

/**
 * The stylesheet as it was before history[index], rebuilt from `currentCss`
 * by undoing the entries from the last one down to `index`. Entries written
 * by older versions carry the whole `previousCss` and are used as is.
 */
export function cssBeforeEntry(currentCss, history, index) {
  let css = currentCss || "";
  for (let i = history.length - 1; i >= index; i--) {
    const entry = history[i];
    if (entry.undo) css = applyUndoPatch(css, entry.undo);
    else if (typeof entry.previousCss === "string") css = entry.previousCss;
  }
  return css;
}

/** History entry for a validated change from `previousCss` to `css`. */
export function makeHistoryEntry({ summary, previousCss, css }) {
  const entry = { at: new Date().toISOString(), summary };
  const undo = makeUndoPatch(previousCss || "", css || "");
  if (undo) entry.undo = undo;
  else entry.previousCss = previousCss || "";
  return entry;
}
