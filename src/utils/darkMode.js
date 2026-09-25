// Dark mode follows the convention of the "Dark Toggle" extension
// (https://github.com/8bitgentleman/roam-depo-dark-toggle): the class
// `rm-dark-theme` is added to both <html> and <body>. Themes then override
// their :root variables in `:root.rm-dark-theme, :root .rm-dark-theme { }`.
//
// The class alone changes nothing: Roam has no dark styles under it. Only a
// stylesheet with `rm-dark-theme` rules (a Live Themes theme with a dark mode,
// the user's base CSS or another extension) gives it a visible effect, hence
// `hasDarkRules()`, used by the UI to explain why a toggle would do nothing.
//
// The class is watched: whoever toggles it (Live Themes, Dark Toggle, the
// system preference), the state is persisted and every listener is told.

import { DEFAULTS, getSetting, KEYS, setSetting } from "../storage";

export const DARK_CLASS = "rm-dark-theme";

export function isDarkMode() {
  return (
    document.documentElement.classList.contains(DARK_CLASS) ||
    document.body.classList.contains(DARK_CLASS)
  );
}

const applyClass = (on) => {
  document.documentElement.classList.toggle(DARK_CLASS, !!on);
  document.body.classList.toggle(DARK_CLASS, !!on);
};

export function setDarkMode(on) {
  applyClass(on);
  sync();
  return !!on;
}

export function toggleDarkMode() {
  return setDarkMode(!isDarkMode());
}

// ---- Dark rules detection ------------------------------------------------------

const rulesMention = (rules) => {
  for (const rule of rules) {
    if (rule.selectorText?.includes(DARK_CLASS)) return true;
    if (rule.cssRules?.length && rulesMention(rule.cssRules)) return true;
  }
  return false;
};

/** True when some stylesheet of the page has rules under `.rm-dark-theme`. */
export function hasDarkRules() {
  for (const sheet of document.styleSheets) {
    const text = sheet.ownerNode?.tagName === "STYLE" ? sheet.ownerNode.textContent : "";
    if (text) {
      if (text.includes(DARK_CLASS)) return true;
      continue;
    }
    // <link> sheets and <style> filled through the CSSOM (no text).
    try {
      if (rulesMention(sheet.cssRules)) return true;
    } catch (e) {
      // cross-origin stylesheet: unreadable
    }
  }
  return false;
}

// ---- State and listeners ---------------------------------------------------------

const listeners = new Set();
let state = { dark: false, hasRules: false };

/** Subscribe to changes of `{ dark, hasRules }`. */
export const subscribeDarkMode = (fn) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};

export const getDarkModeState = () => state;

function sync() {
  const next = { dark: isDarkMode(), hasRules: hasDarkRules() };
  if (next.dark === state.dark && next.hasRules === state.hasRules) return;
  const modeChanged = next.dark !== state.dark;
  state = next;
  if (modeChanged && getSetting(KEYS.darkMode, false) !== next.dark) {
    setSetting(KEYS.darkMode, next.dark);
  }
  listeners.forEach((fn) => {
    try {
      fn(state);
    } catch (e) {
      console.error("[Live Themes] dark mode listener error", e);
    }
  });
}

/** Re-checks the stylesheets now and shortly after (Roam renders [[roam/css]] asynchronously). */
let refreshTimer = null;
const refreshLater = () => {
  clearTimeout(refreshTimer);
  refreshTimer = setTimeout(sync, 400);
};
export function refreshDarkRules() {
  sync();
  refreshLater();
}

// ---- System preference -------------------------------------------------------------

let systemQuery = null;
const onSystemChange = (e) => setDarkMode(e.matches);

export const isFollowingSystem = () =>
  !!getSetting(KEYS.darkModeFollowSystem, DEFAULTS[KEYS.darkModeFollowSystem]);

/** Follows `prefers-color-scheme` (and applies it right away) or stops following it. */
export function setFollowSystem(on) {
  if (systemQuery) systemQuery.removeEventListener("change", onSystemChange);
  systemQuery = null;
  if (!on || !window.matchMedia) return;
  systemQuery = window.matchMedia("(prefers-color-scheme: dark)");
  systemQuery.addEventListener("change", onSystemChange);
  setDarkMode(systemQuery.matches);
}

/** Tooltip of the light/dark buttons (dialog and top bar). */
export const darkModeTooltip = (dark) =>
  `Switch to ${dark ? "light" : "dark"} mode${
    isFollowingSystem() ? " (until the system setting changes: \"Follow the system\" is on)" : ""
  }`;

// ---- Lifecycle ---------------------------------------------------------------------

let classObserver = null;
let headObserver = null;

export function initDarkMode() {
  stopDarkMode();
  state = { dark: isDarkMode(), hasRules: hasDarkRules() };
  if (isFollowingSystem()) setFollowSystem(true);
  else if (getSetting(KEYS.darkMode, false) && !state.dark) setDarkMode(true);
  // A dark mode left on by another extension (Dark Toggle) is adopted.
  else if (state.dark !== getSetting(KEYS.darkMode, false)) setSetting(KEYS.darkMode, state.dark);

  classObserver = new MutationObserver(sync);
  const classOnly = { attributes: true, attributeFilter: ["class"] };
  classObserver.observe(document.documentElement, classOnly);
  classObserver.observe(document.body, classOnly);
  // Stylesheets added, removed or rewritten ([[roam/css]] edits, extensions).
  headObserver = new MutationObserver(refreshLater);
  headObserver.observe(document.head, { childList: true, subtree: true, characterData: true });
}

export function stopDarkMode() {
  setFollowSystem(false);
  classObserver?.disconnect();
  headObserver?.disconnect();
  classObserver = headObserver = null;
  clearTimeout(refreshTimer);
}

// ---- Measuring the other mode ----------------------------------------------------------

/**
 * Runs `fn` with the page switched to the given mode, synchronously: the
 * browser does not paint in between, so the user sees nothing. Transitions
 * are disabled meanwhile, otherwise computed colors would be read at the
 * start of a transition (and a transition would run when switching back).
 */
export function runInMode(dark, fn) {
  if (isDarkMode() === !!dark) return fn();
  const noTransition = document.createElement("style");
  noTransition.textContent = "*, *::before, *::after { transition: none !important; }";
  document.head.appendChild(noTransition);
  applyClass(dark);
  void document.body.offsetHeight;
  try {
    return fn();
  } finally {
    applyClass(!dark);
    void document.body.offsetHeight;
    noTransition.remove();
  }
}
