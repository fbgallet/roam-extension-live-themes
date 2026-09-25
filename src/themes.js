// User themes: several named stylesheets, only one of them active at a time.
//
// The active theme's CSS is what lives in the "Live Themes" block of
// [[roam/css]]. Every other theme is kept in the extension settings only, so
// Roam never applies two themes at once. Each theme carries its own history
// (validated changes, for undo) and its own conversation with the model
// (so the user can keep refining a theme after switching back to it).
//
// Storage (synced with the graph, so shared by the user's devices): the
// ordered list `themeIndex` ([{ id, name, createdAt }]) plus one value per
// theme under themeKey(id) ({ css, updatedAt, history, conversation }). A
// change only rewrites the theme it concerns, and two devices editing two
// different themes do not overwrite each other.
//
// Multi-device safety: the page is what every device renders, while this
// device's view of the settings may lag. The Live Themes parent block is
// titled after the theme it holds ("Live Themes · Paper"); the page wins
// whenever the two disagree (see reconcileActiveTheme and captureActiveCss).

import { DEFAULTS, getSetting, KEYS, MAX_HISTORY, setSetting, themeKey } from "./storage";
import {
  getLiveThemesCss,
  getLiveThemesMarker,
  setLiveThemesMarker,
  writeLiveThemesCss,
} from "./utils/roamCss";
import { injectStyle } from "./utils/cssPreview";
import { cssBeforeEntry, makeHistoryEntry } from "./utils/cssHistory";
import { toSafeBlockText } from "./utils/cssSections";
import { findUntrustedUrls } from "./utils/cssValidate";

export const DEFAULT_THEME_NAME = "Default";
export const MAX_THEME_CONVERSATION = 12; // messages kept per theme
export const EXPORT_FORMAT = "live-themes/1";

const listeners = new Set();

/** Subscribe to any change of the theme list or of the active theme. */
export const subscribeThemes = (fn) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};

const notify = () => {
  listeners.forEach((fn) => {
    try {
      fn();
    } catch (e) {
      console.error("[Live Themes] themes listener error", e);
    }
  });
};

const newId = () =>
  `t_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

const normalize = (t) => ({
  id: t.id || newId(),
  name: (t.name || "").trim() || DEFAULT_THEME_NAME,
  css: typeof t.css === "string" ? t.css : "",
  createdAt: t.createdAt || new Date().toISOString(),
  updatedAt: t.updatedAt || t.createdAt || new Date().toISOString(),
  history: Array.isArray(t.history) ? t.history : [],
  conversation: Array.isArray(t.conversation) ? t.conversation : [],
  starter: t.starter && typeof t.starter.css === "string" ? t.starter : null,
});

// ---- Read --------------------------------------------------------------------

const readIndex = () => {
  const raw = getSetting(KEYS.themeIndex, null);
  return Array.isArray(raw) ? raw : null;
};

export const getThemes = () => {
  const index = readIndex();
  if (!index) {
    // Not migrated yet: every theme in the legacy single value.
    const raw = getSetting(KEYS.themes, DEFAULTS[KEYS.themes]);
    return Array.isArray(raw) ? raw.map(normalize) : [];
  }
  return index.map((entry) =>
    normalize({ ...(getSetting(themeKey(entry.id), null) || {}), id: entry.id, name: entry.name, createdAt: entry.createdAt })
  );
};

export const getActiveThemeId = () => getSetting(KEYS.activeThemeId, null);

export const getActiveTheme = () => {
  const themes = getThemes();
  if (!themes.length) return null;
  return themes.find((t) => t.id === getActiveThemeId()) || themes[0];
};

export const getActiveThemeName = () => getActiveTheme()?.name || DEFAULT_THEME_NAME;

export const getThemeById = (id) => getThemes().find((t) => t.id === id) || null;

/** A name not already used, e.g. "Nord", "Nord (2)", "Nord (3)"… */
export const uniqueThemeName = (base, excludeId = null) => {
  const names = new Set(
    getThemes()
      .filter((t) => t.id !== excludeId)
      .map((t) => t.name.toLowerCase())
  );
  const root = toSafeBlockText(base) || DEFAULT_THEME_NAME; // written on [[roam/css]] (marker block)
  if (!names.has(root.toLowerCase())) return root;
  let n = 2;
  while (names.has(`${root} (${n})`.toLowerCase())) n++;
  return `${root} (${n})`;
};

// ---- Write helpers -------------------------------------------------------------

const saveIndex = (themes) =>
  setSetting(
    KEYS.themeIndex,
    themes.map(({ id, name, createdAt }) => ({ id, name, createdAt }))
  );

const saveRecord = (theme) =>
  setSetting(themeKey(theme.id), {
    css: theme.css,
    updatedAt: theme.updatedAt,
    history: theme.history,
    conversation: theme.conversation,
    starter: theme.starter,
  });

const RECORD_FIELDS = ["css", "history", "conversation", "starter"];

/** Updates one theme: the index only for a rename, its own record for the rest. */
const patchTheme = async (id, patch) => {
  const themes = getThemes();
  const idx = themes.findIndex((t) => t.id === id);
  if (idx < 0) return null;
  const next = { ...themes[idx], ...patch, updatedAt: new Date().toISOString() };
  themes[idx] = next;
  if ("name" in patch) await saveIndex(themes);
  if (RECORD_FIELDS.some((f) => f in patch)) await saveRecord(next);
  notify();
  return next;
};

const sameName = (a, b) => (a || "").trim().toLowerCase() === (b || "").trim().toLowerCase();

/**
 * Copies the CSS currently in [[roam/css]] into the theme the page holds, so
 * that manual edits of the code blocks are not lost when switching themes.
 * Works while the CSS is disabled too (the blocks keep the theme under a text
 * fence). The page names its theme: if it is not the one this device thinks
 * is active (settings not synced yet, switch made on another device), the CSS
 * goes to the theme named on the page, and never into the wrong one.
 */
export async function captureActiveCss() {
  const active = getActiveTheme();
  if (!active) return;
  const marker = getLiveThemesMarker();
  let target = active;
  if (marker && !sameName(marker, active.name)) {
    target = getThemes().find((t) => sameName(t.name, marker));
    if (!target) {
      console.warn(`[Live Themes] [[roam/css]] holds the theme “${marker}”, unknown here: not captured.`);
      return;
    }
    console.warn(`[Live Themes] [[roam/css]] holds “${marker}”, not the active theme “${active.name}”: captured into “${marker}”.`);
  }
  const css = getLiveThemesCss();
  if (css !== target.css) await patchTheme(target.id, { css });
}

/**
 * Writes CSS to [[roam/css]] + preview <style>, and records it in the active
 * theme. `starter` (see starterOrigin) when the CSS comes from a starter theme.
 */
export async function setActiveThemeCss(css, { starter } = {}) {
  const active = getActiveTheme();
  await writeLiveThemesCss(css);
  injectStyle(css);
  if (active) {
    await setLiveThemesMarker(active.name);
    await patchTheme(active.id, starter ? { css, starter } : { css });
  }
}

// ---- Migration / bootstrap -----------------------------------------------------

/** Moves the legacy single `themes` value to the index + one value per theme. */
async function migrateThemeStorage() {
  if (readIndex()) return;
  const raw = getSetting(KEYS.themes, null);
  const legacy = Array.isArray(raw) ? raw.map(normalize) : [];
  if (!legacy.length) return;
  for (const theme of legacy) await saveRecord(theme);
  await saveIndex(legacy);
  await setSetting(KEYS.themes, []);
}

/**
 * The page is what every device renders: if it holds another theme than the
 * one this device thinks is active, follow the page. A page without a theme
 * name (older versions) gets the active theme's name.
 */
async function reconcileActiveTheme() {
  const active = getActiveTheme();
  if (!active) return;
  const marker = getLiveThemesMarker();
  if (!marker) {
    await setLiveThemesMarker(active.name);
    return;
  }
  if (sameName(marker, active.name)) return;
  const onPage = getThemes().find((t) => sameName(t.name, marker));
  if (onPage) {
    await setSetting(KEYS.activeThemeId, onPage.id);
    notify();
  }
}

/**
 * Makes sure at least one theme exists and one is active. On first run the
 * current Live Themes CSS (and the legacy global history) become the
 * "Default" theme. Returns the active theme.
 */
export async function ensureThemes() {
  await migrateThemeStorage();
  let themes = getThemes();
  if (!themes.length) {
    const legacyHistory = getSetting(KEYS.history, []) || [];
    const css = getLiveThemesCss();
    const theme = normalize({
      name: DEFAULT_THEME_NAME,
      css,
      history: legacyHistory.slice(-MAX_HISTORY),
    });
    await saveRecord(theme);
    await saveIndex([theme]);
    await setSetting(KEYS.activeThemeId, theme.id);
    if (legacyHistory.length) await setSetting(KEYS.history, []);
    await setLiveThemesMarker(theme.name);
    notify();
    return theme;
  }
  const activeId = getActiveThemeId();
  if (!themes.some((t) => t.id === activeId)) {
    await setSetting(KEYS.activeThemeId, themes[0].id);
    notify();
  }
  await reconcileActiveTheme();
  return getActiveTheme();
}

// ---- Theme management ----------------------------------------------------------

/**
 * Creates a theme and activates it.
 * @param {object} p
 * @param {string} p.name
 * @param {string} [p.css]        initial CSS ("" for a blank theme)
 * @param {Array}  [p.conversation]
 * @param {object} [p.starter]    origin when created from a starter theme
 *                                ({ id, version, css }, see starterOrigin)
 */
export async function createTheme({ name, css = "", conversation = [], starter = null }) {
  await captureActiveCss();
  const theme = normalize({
    name: uniqueThemeName(name),
    css,
    conversation: conversation.slice(-MAX_THEME_CONVERSATION),
    starter,
  });
  await saveRecord(theme);
  await saveIndex([...getThemes(), theme]);
  await activateTheme(theme.id, { skipCapture: true });
  return theme;
}

/**
 * Duplicates a theme (CSS + conversation + starter origin, not the history)
 * and activates the copy.
 */
export async function duplicateTheme(id, name) {
  const source = getThemeById(id);
  if (!source) return null;
  const isActive = source.id === getActiveThemeId();
  const css = isActive ? getLiveThemesCss() : source.css;
  return createTheme({
    name: name || `${source.name} copy`,
    css,
    conversation: source.conversation,
    starter: source.starter,
  });
}

/**
 * Makes a theme the active one: its CSS replaces the Live Themes block.
 * The previously active theme first captures the block content.
 */
export async function activateTheme(id, { skipCapture = false } = {}) {
  const theme = getThemeById(id);
  if (!theme) return null;
  if (!skipCapture) await captureActiveCss();
  await setSetting(KEYS.activeThemeId, theme.id);
  // While the CSS is disabled, the theme is written with the text fence
  // (inactive) and no preview style is injected.
  await writeLiveThemesCss(theme.css);
  await setLiveThemesMarker(theme.name);
  if (!getSetting(KEYS.cssDisabled, false)) injectStyle(theme.css);
  notify();
  return theme;
}

export async function renameTheme(id, name) {
  const clean = (name || "").trim();
  if (!clean) return null;
  const theme = await patchTheme(id, { name: uniqueThemeName(clean, id) });
  if (theme && id === getActiveThemeId()) await setLiveThemesMarker(theme.name);
  return theme;
}

/**
 * Deletes a theme. If it was active, the previous one in the list (or the
 * next) becomes active; if it was the last theme, a blank Default is created.
 */
export async function deleteTheme(id) {
  const themes = getThemes();
  const idx = themes.findIndex((t) => t.id === id);
  if (idx < 0) return null;
  const wasActive = getActiveThemeId() === id;
  const remaining = themes.filter((t) => t.id !== id);
  await saveIndex(remaining);
  await setSetting(themeKey(id), null);
  if (!remaining.length) {
    const theme = normalize({ name: DEFAULT_THEME_NAME, css: "" });
    await saveRecord(theme);
    await saveIndex([theme]);
    await activateTheme(theme.id, { skipCapture: true });
    return theme;
  }
  if (wasActive) {
    const fallback = remaining[Math.max(0, idx - 1)];
    await activateTheme(fallback.id, { skipCapture: true });
    return fallback;
  }
  notify();
  return getActiveTheme();
}

/** Activates the next (or previous) theme in the list, cycling. */
export async function cycleTheme(step = 1) {
  const themes = getThemes();
  if (themes.length < 2) return getActiveTheme();
  const idx = Math.max(0, themes.findIndex((t) => t.id === getActiveThemeId()));
  const next = themes[(idx + step + themes.length) % themes.length];
  return activateTheme(next.id);
}

// ---- Conversation (per theme) ----------------------------------------------------

export const getActiveConversation = () => getActiveTheme()?.conversation || [];

export async function setActiveConversation(conversation) {
  const active = getActiveTheme();
  if (!active) return;
  await patchTheme(active.id, {
    conversation: (conversation || []).slice(-MAX_THEME_CONVERSATION),
  });
}

// ---- History (per theme) ---------------------------------------------------------

export const getActiveHistory = () => getActiveTheme()?.history || [];

/**
 * Records a validated change on the active theme and stores the new CSS. The
 * entry keeps only the sections the change touched (see cssHistory.js).
 */
export async function pushActiveHistory({ summary, previousCss, css }) {
  const active = getActiveTheme();
  if (!active) return;
  const next = typeof css === "string" ? css : active.css;
  const history = [...active.history, makeHistoryEntry({ summary, previousCss, css: next })];
  while (history.length > MAX_HISTORY) history.shift();
  await patchTheme(active.id, { history, css: next });
  await setLiveThemesMarker(active.name);
}

export async function truncateActiveHistory(length) {
  const active = getActiveTheme();
  if (!active) return;
  await patchTheme(active.id, { history: active.history.slice(0, Math.max(0, length)) });
}

/**
 * Restores the CSS as it was before history entry `index` of the active
 * theme, and drops that entry and the later ones. Returns the entry.
 */
export async function restoreActiveHistory(index) {
  await captureActiveCss();
  const history = getActiveHistory();
  const entry = history[index];
  if (!entry) return null;
  const css = cssBeforeEntry(getActiveTheme()?.css || "", history, index);
  await writeLiveThemesCss(css);
  injectStyle(css);
  const active = getActiveTheme();
  await patchTheme(active.id, { css, history: history.slice(0, index), conversation: [] });
  return entry;
}

// ---- Export / import ---------------------------------------------------------------

export function exportTheme(id) {
  const theme = getThemeById(id);
  if (!theme) return null;
  const css = theme.id === getActiveThemeId() ? getLiveThemesCss() : theme.css;
  return JSON.stringify(
    { format: EXPORT_FORMAT, name: theme.name, css, exportedAt: new Date().toISOString() },
    null,
    2
  );
}

/**
 * Imports a theme from a JSON export or a raw CSS text. Returns the new theme
 * (activated). Throws on invalid input.
 */
export async function importTheme(text, fallbackName = "Imported theme", { confirmExternalUrls } = {}) {
  const raw = (text || "").trim();
  if (!raw) throw new Error("Empty file.");
  let name = fallbackName;
  let css = raw;
  if (raw.startsWith("{")) {
    let data;
    try {
      data = JSON.parse(raw);
    } catch (e) {
      throw new Error("Invalid JSON.");
    }
    if (typeof data.css !== "string") throw new Error("No “css” field in this file.");
    css = data.css;
    if (typeof data.name === "string" && data.name.trim()) name = data.name.trim();
  }
  const urls = findUntrustedUrls(css);
  if (urls.length && confirmExternalUrls && !confirmExternalUrls(urls)) {
    throw new Error("cancelled: it loads resources from other sites");
  }
  return createTheme({ name, css });
}
