// Disable / re-enable the Live Themes CSS (emergency switch, also handy to
// compare the graph with and without the theme). Reachable from the dialog,
// the settings panel and the command palette.
//
// Disabling switches the fence of the Live Themes code blocks from css to
// "plain text": Roam stops applying them, but they stay on [[roam/css]]
// (visible, same uids) and re-enabling switches them back.

import { Intent } from "@blueprintjs/core";
import { getSetting, KEYS, setSetting } from "./storage";
import { captureActiveCss } from "./themes";
import { getLiveThemesCss, setLiveThemesFences } from "./utils/roamCss";
import { injectStyle, removeAllStyles } from "./utils/cssPreview";
import { showToast } from "./utils/notify";

const listeners = new Set();

export const subscribeCssDisabled = (fn) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};

const notify = (disabled) => listeners.forEach((fn) => fn(disabled));

export const isCssDisabled = () => !!getSetting(KEYS.cssDisabled, false);

export async function disableLiveThemesCss() {
  await captureActiveCss();
  await setSetting(KEYS.cssDisabled, true);
  await setLiveThemesFences(true);
  removeAllStyles();
  notify(true);
  showToast(
    "Live Themes: CSS disabled. Its blocks stay on [[roam/css]] as plain text code blocks, inactive until re-enabled.",
    Intent.WARNING
  );
}

export async function enableLiveThemesCss() {
  await setSetting(KEYS.cssDisabled, false);
  await setLiveThemesFences(false);
  injectStyle(getLiveThemesCss());
  notify(false);
  showToast("Live Themes: CSS re-enabled.", Intent.SUCCESS);
}
