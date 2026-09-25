// Toasts and small helpers shared by the UI modules (kept apart from ui.js to
// avoid circular imports between ui.js and the dialog component).

import { Intent, Position, Toaster } from "@blueprintjs/core";
import { getPageUidByTitle, openPageInSidebar } from "./roamAPI";
import { ROAM_CSS_PAGE } from "./roamCss";

let toaster = null;

export const showToast = (message, intent = Intent.NONE, timeout = 5000) => {
  try {
    if (!toaster) {
      toaster = Toaster.create({ position: Position.TOP, maxToasts: 2 });
    }
    toaster.show({ message, intent, timeout });
  } catch (e) {
    console.log("[Live Themes]", message);
  }
};

export const clearToasts = () => {
  if (!toaster) return;
  try {
    toaster.clear();
  } catch (e) {
    /* ignore */
  }
};

export const openRoamCssPage = async () => {
  const uid = getPageUidByTitle(ROAM_CSS_PAGE);
  if (!uid) {
    showToast("The [[roam/css]] page does not exist yet.", Intent.WARNING);
    return;
  }
  await openPageInSidebar(uid);
};
