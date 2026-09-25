// Everything that reads or writes the [[roam/css]] page.
//
// Layout managed by Live Themes on that page:
//   - Live Themes · Paper        <- top-level parent block (created if missing),
//                                   named after the theme it holds (see below)
//     - Typography               <- one block per section of the theme
//       - ```css ... ```            (title = section header of the stylesheet)
//     - Colors & dark mode
//       - ```css ... ```
//     - ```css ... ```           <- rules without a section header, if any
//
// The theme itself is still ONE stylesheet string (see cssSections.js); the
// sections are only its on-page representation, so that a long theme stays
// readable in Roam. Roam applies every css code block found on [[roam/css]],
// nested or not, so splitting changes nothing to the rendered result.
//
// "Disable" (emergency switch) keeps the blocks where they are and only turns
// their fence from ```css into ```text: Roam applies css code blocks only, so
// the theme stops applying while staying visible on the page, with no block
// created or deleted (fewer writes to sync, stable uids).
//
// The parent block is titled "Live Themes · <theme name>". The page is synced
// by Roam and is what every device renders, while the extension settings of
// another device may lag behind: this marker tells which theme the page
// really holds, so a device never saves it into the wrong theme.

import { DEFAULTS, getSetting, KEYS, setSetting } from "../storage";
import { joinCssSections, parseCssSections } from "./cssSections";
import { findUnbalancedBracket } from "./cssValidate";
import {
  createBlock,
  deleteBlock,
  getBlockString,
  getOrCreatePageUid,
  getOrderedChildren,
  getPageUidByTitle,
  getTreeByUid,
  isExistingBlock,
  moveBlock,
  updateBlockString,
} from "./roamAPI";

export const ROAM_CSS_PAGE = "roam/css";
export const LIVE_THEMES_BLOCK_TITLE = "Live Themes";

const CSS_FENCE_REGEX = /```css[ \t]*\r?\n([\s\S]*?)```/;
// Fence of the Live Themes blocks while the CSS is disabled (not applied by
// Roam). Roam's name for it is "plain text": a bare "text" is not a Roam
// language and Roam rewrites it as "javascript" (seen 2026-09-24).
export const DISABLED_LANG = "plain text";
// Inside the Live Themes block only, any of these fences marks a disabled
// section: "text" and "javascript" were left by the first version of the
// fence switch, so they are still read (and restored to css when re-enabled).
const DISABLED_FENCE_REGEX = /```(?:plain text|text|javascript)[ \t]*\r?\n([\s\S]*?)```/;

export const extractCssFromBlockString = (str) => {
  const m = CSS_FENCE_REGEX.exec(str || "");
  return m ? m[1].replace(/\r?\n$/, "") : null;
};

const extractDisabledCss = (str) => {
  const m = DISABLED_FENCE_REGEX.exec(str || "");
  return m ? m[1].replace(/\r?\n$/, "") : null;
};

// A ``` inside the CSS would close the code fence early and let the rest of
// the text render as Roam markup; it is never valid CSS, so it is dropped.
export const toCssBlockString = (css, disabled = false) =>
  "```" + (disabled ? DISABLED_LANG : "css") + "\n" + (css || "").replace(/`{3,}/g, "").trim() + "\n```";

const isCssDisabled = () => !!getSetting(KEYS.cssDisabled, false);

const MARKER_SEPARATOR = " · ";

const isLiveThemesParent = (block) => {
  const s = (block?.string || "").trim().toLowerCase();
  const title = LIVE_THEMES_BLOCK_TITLE.toLowerCase();
  return s === title || s.startsWith(title + MARKER_SEPARATOR);
};

/** Theme name carried by the parent block string, or null ("Live Themes" alone). */
const parseMarker = (str) => {
  const s = (str || "").trim();
  const prefix = LIVE_THEMES_BLOCK_TITLE + MARKER_SEPARATOR;
  return s.toLowerCase().startsWith(prefix.toLowerCase()) ? s.slice(prefix.length).trim() || null : null;
};

const parentStringFor = (themeName) =>
  themeName ? `${LIVE_THEMES_BLOCK_TITLE}${MARKER_SEPARATOR}${themeName}` : LIVE_THEMES_BLOCK_TITLE;

// Inside the Live Themes block, a ```text code block is a disabled section.
const readFence = (str) => {
  const css = extractCssFromBlockString(str);
  if (css !== null) return { css, disabled: false };
  const off = extractDisabledCss(str);
  return off !== null ? { css: off, disabled: true } : null;
};

// ---- Managed sections --------------------------------------------------------

/**
 * Classifies the children of the Live Themes parent:
 *   - "section": a title block with a css code block child
 *   - "code":    a bare css code block (untitled section)
 *   - "other":   anything else, never touched
 * `disabled` is true when the code block is fenced as ```text (CSS disabled).
 */
const readManagedBlocks = (parent) =>
  getOrderedChildren(parent).map((child) => {
    const own = readFence(child.string);
    if (own) {
      return { kind: "code", uid: child.uid, title: null, codeUid: child.uid, ...own };
    }
    for (const code of getOrderedChildren(child)) {
      const fence = readFence(code.string);
      if (fence) {
        return { kind: "section", uid: child.uid, title: (child.string || "").trim(), codeUid: code.uid, ...fence };
      }
    }
    return { kind: "other", uid: child.uid, title: null, codeUid: null, css: null, disabled: false };
  });

const managedOnly = (blocks) => blocks.filter((b) => b.kind !== "other");

/** Locates the Live Themes parent block and its managed sections. */
export function findLiveThemesParent() {
  const pageUid = getPageUidByTitle(ROAM_CSS_PAGE);
  if (!pageUid) return { pageUid: null, parentUid: null, blocks: [] };
  const tree = getTreeByUid(pageUid);
  const parent = getOrderedChildren(tree).find(isLiveThemesParent);
  if (!parent) return { pageUid, parentUid: null, blocks: [], marker: null };
  return { pageUid, parentUid: parent.uid, blocks: readManagedBlocks(parent), marker: parseMarker(parent.string) };
}

/**
 * Name of the theme the page holds, from the parent block title. null when
 * there is no Live Themes block or it carries no name (older versions).
 */
export const getLiveThemesMarker = () => findLiveThemesParent().marker;

/** Titles the parent block after the theme it holds (one write, only if it changes). */
export async function setLiveThemesMarker(themeName) {
  const { parentUid } = findLiveThemesParent();
  if (!parentUid) return;
  const wanted = parentStringFor(themeName);
  if (getBlockString(parentUid) !== wanted) await updateBlockString(parentUid, wanted);
}

/** The whole theme stylesheet, rebuilt from its section blocks (disabled or not). */
export function getLiveThemesCss() {
  const { blocks } = findLiveThemesParent();
  return joinCssSections(managedOnly(blocks));
}

/**
 * Every css code block of [[roam/css]] in page order (depth first), with the
 * first bracket problem of each. Roam merges all these blocks into ONE
 * <style>, so an unclosed "{" in any block (typically an "@media … {" left
 * open) captures every rule of the following blocks, the Live Themes ones
 * included: they then only apply when that condition holds.
 * @returns {{ blocks: Array<{ uid, label, liveThemes, problem }>, liveThemesIndex: number }}
 */
export function diagnoseRoamCssPage() {
  const pageUid = getPageUidByTitle(ROAM_CSS_PAGE);
  if (!pageUid) return { blocks: [], liveThemesIndex: -1 };
  const blocks = [];
  const walk = (node, inLiveThemes, parentLabel) => {
    for (const child of getOrderedChildren(node)) {
      const lt = inLiveThemes || isLiveThemesParent(child);
      const css = extractCssFromBlockString(child.string);
      if (css !== null) {
        blocks.push({
          uid: child.uid,
          label: parentLabel || css.replace(/\s+/g, " ").trim().slice(0, 60),
          liveThemes: lt,
          problem: findUnbalancedBracket(css),
        });
      }
      walk(child, lt, css === null ? (child.string || "").trim().slice(0, 60) : parentLabel);
    }
  };
  walk(getTreeByUid(pageUid), false, "");
  return { blocks, liveThemesIndex: blocks.findIndex((b) => b.liveThemes) };
}

/** Sections of the theme as they appear on the page: [{ title, css }]. */
export function getLiveThemesSections() {
  const { blocks } = findLiveThemesParent();
  return managedOnly(blocks).map(({ title, css }) => ({ title, css }));
}

const sameTitle = (a, b) =>
  (a || "").trim().toLowerCase() === (b || "").trim().toLowerCase();

/** Moves the given blocks to the first positions of the parent, in that order. */
async function reorderChildren(parentUid, orderedUids) {
  for (let i = 0; i < orderedUids.length; i++) {
    const current = getOrderedChildren(getTreeByUid(parentUid)).map((c) => c.uid);
    if (current[i] === orderedUids[i]) continue;
    await moveBlock(orderedUids[i], parentUid, i);
  }
}

/**
 * Makes the section blocks under the parent match the stylesheet with as few
 * writes as possible (every write is synced to Roam's server):
 *   1. a section keeps its blocks when a block has the same title; its code
 *      block is rewritten only if the css changed;
 *   2. the other sections RECYCLE the remaining blocks of the same kind, in
 *      page order: the title block is renamed and the code block rewritten
 *      (two updates) instead of deleting and recreating blocks. This is what
 *      keeps a theme switch cheap when the two themes name their sections
 *      differently;
 *   3. only the surplus is created or deleted, then the order follows the
 *      stylesheet (recycling in page order avoids most moves).
 * Every code block gets the css fence, or the text fence when `disabled`.
 * Blocks that are not css sections are left untouched.
 */
async function syncSections(parentUid, css, disabled = false) {
  const desired = parseCssSections(css);
  const pool = managedOnly(readManagedBlocks(getTreeByUid(parentUid)));
  const used = new Set();
  const take = (block) => {
    used.add(block.uid);
    return block;
  };

  // 1. Same title.
  const assigned = desired.map((section) => {
    const match = pool.find((b) => !used.has(b.uid) && sameTitle(b.title, section.title));
    return match ? take(match) : null;
  });
  // 2. Recycling: a titled section reuses a section block, an untitled one a bare code block.
  desired.forEach((section, i) => {
    if (assigned[i]) return;
    const kind = section.title ? "section" : "code";
    const spare = pool.find((b) => !used.has(b.uid) && b.kind === kind);
    if (spare) assigned[i] = take(spare);
  });

  const ordered = [];
  for (let i = 0; i < desired.length; i++) {
    const section = desired[i];
    const block = assigned[i];
    if (block) {
      if (section.title && block.title !== section.title) {
        await updateBlockString(block.uid, section.title);
      }
      if ((block.css || "").trim() !== section.css || block.disabled !== disabled) {
        await updateBlockString(block.codeUid, toCssBlockString(section.css, disabled));
      }
      ordered.push(block.uid);
    } else if (section.title) {
      const uid = await createBlock(parentUid, section.title, "last", { open: false });
      await createBlock(uid, toCssBlockString(section.css, disabled), "last");
      ordered.push(uid);
    } else {
      ordered.push(await createBlock(parentUid, toCssBlockString(section.css, disabled), "last"));
    }
  }
  for (const block of pool) {
    if (!used.has(block.uid)) await deleteBlock(block.uid);
  }
  await reorderChildren(parentUid, ordered);
}

/**
 * Ensures the page and the parent block exist.
 * Returns { pageUid, parentUid, parentCreated, previousCss }.
 */
export async function ensureLiveThemesParent() {
  const pageUid = await getOrCreatePageUid(ROAM_CSS_PAGE);
  let { parentUid, blocks } = findLiveThemesParent();
  let parentCreated = false;
  if (!parentUid) {
    parentUid = await createBlock(pageUid, LIVE_THEMES_BLOCK_TITLE, "last");
    parentCreated = true;
    blocks = [];
  }
  return { pageUid, parentUid, parentCreated, previousCss: joinCssSections(managedOnly(blocks)) };
}

/**
 * Writes the full theme stylesheet (one block per section). While the CSS is
 * disabled the blocks are written with the text fence, so they stay inactive.
 * Returns the snapshot needed to revert.
 */
export async function writeLiveThemesCss(css, { disabled = isCssDisabled() } = {}) {
  const info = await ensureLiveThemesParent();
  await syncSections(info.parentUid, css, disabled);
  return info;
}

/**
 * Disables or re-enables the Live Themes CSS by switching the fence of its
 * code blocks (css <-> text). Only the blocks whose fence differs are
 * written; nothing is created or deleted. Returns the number of blocks changed.
 */
export async function setLiveThemesFences(disabled) {
  const { parentUid, blocks } = findLiveThemesParent();
  if (!parentUid) return 0;
  let changed = 0;
  for (const block of managedOnly(blocks)) {
    if (block.disabled === disabled) continue;
    await updateBlockString(block.codeUid, toCssBlockString(block.css, disabled));
    changed++;
  }
  return changed;
}

/**
 * All other css code blocks on [[roam/css]] (outside the Live Themes block),
 * with their uid and a short path so the LLM can identify them.
 */
export function getOtherCssBlocks() {
  const pageUid = getPageUidByTitle(ROAM_CSS_PAGE);
  if (!pageUid) return [];
  const tree = getTreeByUid(pageUid);
  const result = [];
  const walk = (node, path) => {
    for (const child of getOrderedChildren(node)) {
      if (isLiveThemesParent(child)) continue;
      const css = extractCssFromBlockString(child.string);
      if (css !== null) {
        result.push({ uid: child.uid, css, path: path.join(" > ") || "(top level)" });
      } else {
        walk(child, [...path, (child.string || "").slice(0, 60)]);
      }
    }
  };
  walk(tree, []);
  return result;
}

// ---- Base CSS (the other blocks) --------------------------------------------
//
// Roam applies every css block of the page, so the blocks outside "Live
// Themes" form a "base" layer that is always active; the Live Themes block
// (last child of the page) is layered on top of it. The user may exclude some
// base blocks from the context sent to the model (to save tokens).

export const getExcludedContextBlocks = () => {
  const raw = getSetting(KEYS.excludedContextBlocks, DEFAULTS[KEYS.excludedContextBlocks]);
  return Array.isArray(raw) ? raw : [];
};

export const isBlockExcludedFromContext = (uid) => getExcludedContextBlocks().includes(uid);

export async function setBlockContextIncluded(uid, included) {
  const current = getExcludedContextBlocks().filter((u) => u !== uid);
  await setSetting(KEYS.excludedContextBlocks, included ? current : [...current, uid]);
}

/** Includes (or excludes) every current base block in the model context at once. */
export async function setAllBlocksContextIncluded(included) {
  const uids = getOtherCssBlocks().map((b) => b.uid);
  await setSetting(KEYS.excludedContextBlocks, included ? [] : uids);
}

/** Base css blocks, each flagged with `inContext` (sent to the model or not). */
export const getBaseCssBlocks = () => {
  const excluded = new Set(getExcludedContextBlocks());
  return getOtherCssBlocks().map((b) => ({ ...b, inContext: !excluded.has(b.uid) }));
};

/** Base css blocks the user allows as model context. */
export const getContextCssBlocks = () => getBaseCssBlocks().filter((b) => b.inContext);

/**
 * Applies a proposal: { liveThemesCss, otherBlocks: [{uid, css}] }.
 * Returns a serializable snapshot to restore the previous state.
 */
export async function applyProposal({ liveThemesCss, otherBlocks = [] }) {
  const info = await ensureLiveThemesParent();
  const snapshot = {
    at: new Date().toISOString(),
    liveThemes: {
      parentUid: info.parentUid,
      parentCreated: info.parentCreated,
      previousCss: info.previousCss,
    },
    others: [],
  };
  await syncSections(info.parentUid, liveThemesCss, isCssDisabled());

  for (const { uid, css } of otherBlocks) {
    if (!isExistingBlock(uid)) continue;
    const previousString = getBlockString(uid);
    if (extractCssFromBlockString(previousString) === null) continue; // never touch non-css blocks
    snapshot.others.push({ uid, previousString });
    await updateBlockString(uid, toCssBlockString(css));
  }
  return snapshot;
}

/** Restores the state captured by applyProposal(). */
export async function revertSnapshot(snapshot) {
  if (!snapshot) return;
  const lt = snapshot.liveThemes;
  if (lt && "previousString" in lt) {
    // Snapshot written by the single-block version of Live Themes.
    if (lt.codeUid && isExistingBlock(lt.codeUid)) {
      if (lt.codeCreated) {
        await deleteBlock(lt.codeUid);
        if (lt.parentCreated && lt.parentUid && isExistingBlock(lt.parentUid)) {
          await deleteBlock(lt.parentUid);
        }
      } else if (typeof lt.previousString === "string") {
        await updateBlockString(lt.codeUid, lt.previousString);
      }
    }
  } else if (lt) {
    if (lt.parentCreated && lt.parentUid && isExistingBlock(lt.parentUid)) {
      await deleteBlock(lt.parentUid);
    } else if (typeof lt.previousCss === "string") {
      await writeLiveThemesCss(lt.previousCss);
    }
  }
  for (const { uid, previousString } of snapshot.others || []) {
    if (isExistingBlock(uid) && typeof previousString === "string") {
      await updateBlockString(uid, previousString);
    }
  }
}
