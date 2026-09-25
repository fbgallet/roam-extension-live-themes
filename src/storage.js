// Holds the Roam extensionAPI reference and typed accessors for settings.
// All persisted state of Live Themes goes through here.

export let extensionAPI = null;

export const setExtensionAPI = (api) => {
  extensionAPI = api;
};

export const getSetting = (key, fallback = null) => {
  if (!extensionAPI) return fallback;
  const value = extensionAPI.settings.get(key);
  return value === null || value === undefined ? fallback : value;
};

export const setSetting = async (key, value) => {
  if (!extensionAPI) return;
  await extensionAPI.settings.set(key, value);
};

// Settings keys
export const KEYS = {
  reviewDelay: "reviewDelay", // seconds (string in select)
  includePageContext: "includePageContext",
  allowWholePageEdit: "allowWholePageEdit",
  excludedContextBlocks: "excludedContextBlocks", // uids of base css blocks NOT sent as context
  topbarButton: "topbarButton",
  model: "model", // "default" or a Live AI model id
  thinking: "thinking", // ask Live AI for extended thinking (effort = Live AI's "Reasoning effort" setting)
  darkMode: "darkMode",
  darkModeFollowSystem: "darkModeFollowSystem", // follow the OS light/dark preference
  darkModeButton: "darkModeButton", // light/dark button in the top bar (shown only when a dark mode exists)
  history: "history", // legacy global history (migrated into the Default theme)
  themes: "themes", // legacy: every theme in one value (migrated to themeIndex + one key per theme)
  themeIndex: "themeIndex", // [{ id, name, createdAt }], in display order; each theme's content is under themeKey(id)
  activeThemeId: "activeThemeId",
  pendingRevert: "pendingRevert", // snapshot to restore if a proposal is not validated
  disabledCss: "disabledCss", // css moved out of roam/css while "Disable" is on
  cssDisabled: "cssDisabled",
  domSnapshot: "domSnapshot", // send a snapshot of the live DOM (computed colors, variables) to the model
  contrastCheck: "contrastCheck", // measure text contrast after a proposal is applied
  presetsOpen: "presetsOpen", // "Standard proposals" section expanded in the dialog (remembered)
  startersOpen: "startersOpen", // "Ready-made designs" section expanded in the dialog (remembered)
};

export const DEFAULTS = {
  [KEYS.reviewDelay]: "30",
  [KEYS.includePageContext]: true,
  [KEYS.allowWholePageEdit]: false,
  [KEYS.excludedContextBlocks]: [],
  [KEYS.topbarButton]: true,
  [KEYS.model]: "default",
  [KEYS.thinking]: true,
  [KEYS.darkMode]: false,
  [KEYS.darkModeFollowSystem]: false,
  [KEYS.darkModeButton]: false,
  [KEYS.history]: [],
  [KEYS.themes]: [],
  [KEYS.activeThemeId]: null,
  [KEYS.pendingRevert]: null,
  [KEYS.disabledCss]: null,
  [KEYS.cssDisabled]: false,
  [KEYS.domSnapshot]: false,
  [KEYS.contrastCheck]: true,
  [KEYS.presetsOpen]: false,
  [KEYS.startersOpen]: false,
};

// One settings value per theme ({ css, updatedAt, history, conversation }), so
// that a change only rewrites (and syncs to the other devices) the theme it
// concerns, and two devices editing different themes do not overwrite each other.
export const themeKey = (id) => `theme_${id}`;

// Identifies this browser/device (localStorage, never synced), e.g. to tell a
// review pending on another device from one left by a crashed session here.
const DEVICE_KEY = "live-themes-device-id";
let sessionDeviceId = null;
export const getDeviceId = () => {
  if (sessionDeviceId) return sessionDeviceId;
  try {
    sessionDeviceId = localStorage.getItem(DEVICE_KEY);
    if (!sessionDeviceId) {
      sessionDeviceId = `d_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
      localStorage.setItem(DEVICE_KEY, sessionDeviceId);
    }
  } catch (e) {
    sessionDeviceId = sessionDeviceId || `d_session_${Math.random().toString(36).slice(2, 8)}`;
  }
  return sessionDeviceId;
};

export const REVIEW_DELAY_OPTIONS = ["15", "30", "60", "120"];
export const MAX_HISTORY = 10;

export const getReviewDelaySeconds = () => {
  const raw = parseInt(getSetting(KEYS.reviewDelay, DEFAULTS[KEYS.reviewDelay]));
  return Number.isFinite(raw) && raw > 0 ? raw : 30;
};
