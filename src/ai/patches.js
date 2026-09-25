// The model answers with PATCHES, not with the whole stylesheet:
//   SECTION <name>            + css fence  -> replaces (or adds) a theme section
//   SECTION <name> DELETE                  -> removes a theme section
//   RULE <uid>#<n> <selector> + css fence  -> replaces rule n of base block uid
//   BLOCK <uid>               + css fence  -> rewrites a whole base block
// A bare css fence (no directive) is still accepted as the complete theme.
// This file parses the answer and resolves it against the current CSS into
// the { liveThemesCss, otherBlocks } shape that the review mechanism applies.

import { joinCssSections, parseCssSections, toSafeBlockText } from "../utils/cssSections";
import { normalizeSelector, replaceCssRule, scanCssRules } from "../utils/cssRules";

const UID_RE = /^([A-Za-z0-9_-]{6,})\s*#\s*(\d+)\s*(.*)$/;
const HEADER_LINE = /^[ \t]*\/\*[ \t]*={2,}[ \t]*.+?[ \t]*={2,}[ \t]*\*\/[ \t]*\r?\n?/;

const cleanName = (name) =>
  name
    .trim()
    .replace(/^["'“”«]+|["'“”»]+$/g, "")
    .replace(/^\/\*\s*=*\s*|\s*=*\s*\*\/$/g, "")
    .trim();

export function parseProposal(text) {
  if (typeof text !== "string") text = String(text ?? "");
  const summaryMatch = /SUMMARY\s*:\s*(.+)/i.exec(text);
  const summary = summaryMatch ? summaryMatch[1].trim() : "";

  const lines = text.split(/\r?\n/);
  const consumed = new Set();
  const sections = [];
  const rules = [];
  const blocks = [];

  let i = 0;
  while (i < lines.length) {
    const m = /^\s*(SECTION|RULE|BLOCK)\s+(.+?)\s*$/i.exec(lines[i]);
    if (!m) {
      i++;
      continue;
    }
    const kind = m[1].toUpperCase();
    const arg = m[2];
    consumed.add(i);
    // Optional fence right after the directive (blank lines allowed)
    let j = i + 1;
    while (j < lines.length && !lines[j].trim()) j++;
    let body = null;
    if (j < lines.length && /^\s*```/.test(lines[j])) {
      const buf = [];
      let k = j + 1;
      while (k < lines.length && !/^\s*```\s*$/.test(lines[k])) buf.push(lines[k++]);
      if (k >= lines.length) {
        // The closing fence never came: the model's output was cut (output
        // token limit). Applying the fragment would leave an unfinished
        // section (unclosed rule, missing dark rules…), so refuse it.
        return {
          ok: false,
          truncated: true,
          error: `The answer was cut before the end of the CSS of "${cleanName(arg)}" (output limit of the model reached). Ask for a smaller change, split the request (e.g. dark mode of the controls, then of the popups), or pick a model with a larger output.`,
          raw: text,
        };
      }
      body = buf.join("\n").replace(/\s+$/, "");
      for (let x = i; x <= k; x++) consumed.add(x);
      i = k + 1;
    } else {
      i++;
    }

    if (kind === "SECTION") {
      let name = arg;
      let del = false;
      if (/\s+DELETE\s*$/i.test(name)) {
        del = true;
        name = name.replace(/\s+DELETE\s*$/i, "");
      }
      name = cleanName(name);
      if (!name) continue;
      const css = (body || "").replace(HEADER_LINE, "").trim();
      sections.push({ name, css, delete: del || !css });
    } else if (kind === "RULE") {
      const r = UID_RE.exec(arg.trim());
      if (!r || body === null) continue;
      rules.push({ uid: r[1], index: parseInt(r[2], 10), selector: r[3].trim(), css: body.trim() });
    } else if (kind === "BLOCK") {
      const uid = /^([A-Za-z0-9_-]{6,})/.exec(arg.trim())?.[1];
      if (!uid || body === null) continue;
      blocks.push({ uid, css: body.trim() });
    }
  }

  let fullCss = null;
  if (!sections.length && !rules.length && !blocks.length) {
    const rest = lines.filter((_, idx) => !consumed.has(idx)).join("\n");
    const fence =
      /```css[ \t]*\r?\n([\s\S]*?)```/.exec(rest) || /```[a-z]*[ \t]*\r?\n([\s\S]*?)```/.exec(rest);
    if (fence) fullCss = fence[1].replace(/\s+$/, "");
  }

  if (fullCss === null && !sections.length && !rules.length && !blocks.length) {
    return { ok: false, error: "No CSS section or rule found in the answer.", raw: text };
  }
  return { ok: true, summary, sections, rules, blocks, fullCss, raw: text };
}

// ---- Resolution ----------------------------------------------------------------

const sameTitle = (a, b) => toSafeBlockText(a).toLowerCase() === toSafeBlockText(b).toLowerCase();

/** Applies SECTION patches to the current theme stylesheet. */
export function applySectionPatches(currentCss, patches) {
  const sections = parseCssSections(currentCss);
  const changes = { updated: [], added: [], deleted: [], dropped: [] };
  for (const p of patches) {
    let idx = sections.findIndex((s) => sameTitle(s.title, p.name));
    // Rules without a header are presented to the model as section "General"
    if (idx < 0 && /^general$/i.test(p.name)) idx = sections.findIndex((s) => s.title === null);
    if (p.delete) {
      if (idx >= 0) {
        sections.splice(idx, 1);
        changes.deleted.push(p.name);
      }
      continue;
    }
    if (idx >= 0) {
      if (sections[idx].css.trim() !== p.css.trim()) {
        // A SECTION replaces the whole section: rules the model forgot to
        // copy silently disappear (e.g. the dark variables when it was only
        // asked to fix the buttons). List them so the user can refuse.
        const selectorsOf = (css) =>
          new Set(
            scanCssRules(css)
              .filter((r) => r.type === "rule")
              .map((r) => normalizeSelector(r.selector))
          );
        const kept = selectorsOf(p.css);
        const dropped = [...selectorsOf(sections[idx].css)].filter((s) => !kept.has(s));
        sections[idx] = { title: sections[idx].title ?? p.name, css: p.css };
        changes.updated.push(sections[idx].title);
        if (dropped.length) changes.dropped.push({ section: sections[idx].title || p.name, selectors: dropped });
      }
    } else {
      sections.push({ title: toSafeBlockText(p.name) || null, css: p.css });
      changes.added.push(p.name);
    }
  }
  return { css: joinCssSections(sections), changes };
}

/**
 * Applies RULE patches (one rule replaced in place, validated by index and
 * selector) and BLOCK rewrites to the base blocks.
 * @returns {{ otherBlocks: Array<{uid, css}>, errors: string[], replaced: number }}
 */
export function applyBasePatches(baseBlocks, rulePatches, blockPatches) {
  const errors = [];
  const result = new Map(); // uid -> css
  let replaced = 0;

  const byUid = new Map();
  for (const p of rulePatches) {
    if (!byUid.has(p.uid)) byUid.set(p.uid, new Map());
    byUid.get(p.uid).set(p.index, p); // last patch for an index wins
  }
  for (const [uid, patches] of byUid) {
    const block = baseBlocks.find((b) => b.uid === uid);
    if (!block) {
      errors.push(`Patch ignored: no base css block "${uid}" on [[roam/css]].`);
      continue;
    }
    const scanned = scanCssRules(block.css);
    const valid = [];
    for (const p of patches.values()) {
      const rule = scanned[p.index];
      if (!rule) {
        errors.push(`Patch ignored: block ${uid} has no rule #${p.index}.`);
        continue;
      }
      if (p.selector && normalizeSelector(p.selector) !== normalizeSelector(rule.selector)) {
        errors.push(
          `Patch ignored: rule #${p.index} of block ${uid} is “${rule.selector}”, not “${p.selector}” (the block changed since the model read it).`
        );
        continue;
      }
      valid.push({ rule, css: p.css });
    }
    valid.sort((a, b) => b.rule.start - a.rule.start); // from the end: offsets stay valid
    let css = block.css;
    for (const v of valid) css = replaceCssRule(css, v.rule, v.css);
    if (valid.length && css !== block.css) {
      result.set(uid, css);
      replaced += valid.length;
    }
  }
  for (const p of blockPatches) {
    if (!baseBlocks.some((b) => b.uid === p.uid)) {
      errors.push(`Patch ignored: no base css block "${p.uid}" on [[roam/css]].`);
      continue;
    }
    result.set(p.uid, p.css); // a whole-block rewrite supersedes rule patches
  }
  return {
    otherBlocks: [...result].map(([uid, css]) => ({ uid, css })),
    errors,
    replaced,
  };
}

/**
 * Turns a parsed answer into what the review applies.
 * @returns {{ liveThemesCss, otherBlocks, errors, changes, changed }}
 */
export function resolveProposal(parsed, { currentCss, baseBlocks, allowWholePageEdit }) {
  let liveThemesCss = currentCss;
  let changes = { updated: [], added: [], deleted: [], dropped: [], replacedRules: 0, rewrittenBlocks: 0 };
  const errors = [];

  if (parsed.fullCss !== null && parsed.fullCss !== undefined) {
    liveThemesCss = parsed.fullCss;
  } else if (parsed.sections.length) {
    const r = applySectionPatches(currentCss, parsed.sections);
    liveThemesCss = r.css;
    changes = { ...changes, ...r.changes };
    for (const d of r.changes.dropped || []) {
      const shown = d.selectors.slice(0, 6).join(", ") + (d.selectors.length > 6 ? ", …" : "");
      errors.push(
        `Section "${d.section}": the rewrite drops ${d.selectors.length} rule${d.selectors.length > 1 ? "s" : ""} that existed before (${shown}). Refuse it unless you asked for their removal.`
      );
    }
  }

  let otherBlocks = [];
  if (parsed.rules.length || parsed.blocks.length) {
    if (!allowWholePageEdit) {
      errors.push(
        "The model proposed edits to the base CSS, which the setting “Allow editing the whole [[roam/css]] page” forbids: those edits were ignored."
      );
    } else {
      const r = applyBasePatches(baseBlocks, parsed.rules, parsed.blocks);
      otherBlocks = r.otherBlocks;
      errors.push(...r.errors);
      changes.replacedRules = r.replaced;
      changes.rewrittenBlocks = parsed.blocks.length;
    }
  }

  const changed = liveThemesCss.trim() !== currentCss.trim() || otherBlocks.length > 0;
  return { liveThemesCss, otherBlocks, errors, changes, changed };
}

/** Short human-readable description of what a resolved proposal touches. */
export function describeChanges(changes) {
  if (!changes) return "";
  const parts = [];
  if (changes.updated?.length) parts.push(`updated: ${changes.updated.join(", ")}`);
  if (changes.added?.length) parts.push(`added: ${changes.added.join(", ")}`);
  if (changes.deleted?.length) parts.push(`removed: ${changes.deleted.join(", ")}`);
  if (changes.replacedRules) parts.push(`${changes.replacedRules} base rule${changes.replacedRules > 1 ? "s" : ""} replaced`);
  if (changes.rewrittenBlocks) parts.push(`${changes.rewrittenBlocks} base block${changes.rewrittenBlocks > 1 ? "s" : ""} rewritten`);
  return parts.join(" · ");
}
