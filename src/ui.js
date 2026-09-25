// Mounting of the React UI (dialog, review banner, topbar button) and toasts.

import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom";
import { Button } from "@blueprintjs/core";
import Tooltip from "./components/LtTooltip";
import LiveThemesDialog, { queueRequest } from "./components/LiveThemesDialog";
import ReviewBanner from "./components/ReviewBanner";
import { subscribeReview } from "./review";
import { clearToasts } from "./utils/notify";
import { buildContrastFixRequest } from "./ai/contrast";
import { stopScreenPick } from "./utils/screenPick";
import { darkModeTooltip, getDarkModeState, subscribeDarkMode, toggleDarkMode } from "./utils/darkMode";

export { showToast, openRoamCssPage } from "./utils/notify";

const DIALOG_CONTAINER_ID = "live-themes-dialog-container";
const BANNER_CONTAINER_ID = "live-themes-review-container";
const TOPBAR_CLASS = "live-themes-topbar";
const DARK_TOPBAR_CLASS = "live-themes-dark-topbar";

// ---- Dialog ----------------------------------------------------------------

let dialogOpen = false;

const getContainer = (id) => {
  let el = document.getElementById(id);
  if (!el) {
    el = document.createElement("div");
    el.id = id;
    document.body.appendChild(el);
  }
  return el;
};

const renderDialog = () => {
  ReactDOM.render(
    <LiveThemesDialog
      isOpen={dialogOpen}
      onClose={closeLiveThemesDialog}
      onReopen={openLiveThemesDialog}
    />,
    getContainer(DIALOG_CONTAINER_ID)
  );
  // The banner is hidden while the dialog is open (the dialog shows the same
  // Keep / Revert actions).
  if (unsubscribeBanner) renderBanner();
};

export const openLiveThemesDialog = () => {
  dialogOpen = true;
  renderDialog();
};

export const closeLiveThemesDialog = () => {
  dialogOpen = false;
  renderDialog();
};

export const toggleLiveThemesDialog = () =>
  dialogOpen ? closeLiveThemesDialog() : openLiveThemesDialog();

// ---- Review banner ---------------------------------------------------------

let unsubscribeBanner = null;

/** Opens the dialog with a refinement request asking the model to fix the measured contrast issues. */
export const requestContrastFix = (issues) => {
  queueRequest(buildContrastFixRequest(issues), { autoGenerate: true, refine: true });
  openLiveThemesDialog();
};

const renderBanner = () => {
  ReactDOM.render(
    <ReviewBanner
      hidden={dialogOpen}
      onAdjust={openLiveThemesDialog}
      onFixContrast={requestContrastFix}
    />,
    getContainer(BANNER_CONTAINER_ID)
  );
};

export const mountReviewBanner = () => {
  renderBanner();
  unsubscribeBanner = subscribeReview(renderBanner);
};

// ---- Topbar button ---------------------------------------------------------

/**
 * Inserts `el` in the top bar, right after the search box, so the button
 * stays next to it rather than drifting to the right edge among Roam's own
 * buttons. Fallbacks: after the desktop nav arrows, else at the start of the
 * top bar.
 */
const insertInTopbar = (el) => {
  const topbar = document.querySelector(".rm-topbar");
  if (!topbar) return false;
  const search = topbar.querySelector(".rm-find-or-create-wrapper");
  const platform = window.roamAlphaAPI.platform;
  const navForward = document.querySelector(".rm-electron-nav-forward-btn");
  if (search) {
    search.insertAdjacentElement("afterend", el);
  } else if (platform.isDesktop && !platform.isMobile && !platform.isMobileApp && navForward) {
    navForward.insertAdjacentElement("afterend", el);
  } else {
    topbar.insertBefore(el, topbar.firstChild);
  }
  return true;
};

export const mountTopbarButton = () => {
  removeTopbarButton();
  const el = document.createElement("span");
  el.classList.add(TOPBAR_CLASS);
  // The light/dark button, when shown, sits right after the Live Themes button.
  const darkButton = document.querySelector(`.${DARK_TOPBAR_CLASS}`);
  if (darkButton) darkButton.insertAdjacentElement("beforebegin", el);
  else if (!insertInTopbar(el)) return;
  // The dialog gives the focus back to the button when it closes, which
  // would reopen the tooltip: it opens on hover only, and the button loses
  // the focus as soon as it is clicked.
  ReactDOM.render(
    <Tooltip
      content="Live Themes: restyle Roam in natural language"
      hoverOpenDelay={500}
      openOnTargetFocus={false}
    >
      <Button
        icon="tint"
        minimal
        onClick={(e) => {
          e.currentTarget.blur();
          openLiveThemesDialog();
        }}
      />
    </Tooltip>,
    el
  );
};

export const removeTopbarButton = () => {
  document.querySelectorAll(`.${TOPBAR_CLASS}`).forEach((el) => {
    ReactDOM.unmountComponentAtNode(el);
    el.remove();
  });
};

// ---- Light / dark button (top bar) -----------------------------------------
//
// Shown only when a stylesheet defines a dark mode: without one, switching
// would change nothing on screen.

const DarkModeTopbarButton = () => {
  const [{ dark, hasRules }, setState] = useState(getDarkModeState());
  useEffect(() => subscribeDarkMode(setState), []);
  if (!hasRules) return null;
  return (
    <Tooltip content={darkModeTooltip(dark)} hoverOpenDelay={500} openOnTargetFocus={false}>
      <Button
        icon={dark ? "flash" : "moon"}
        minimal
        aria-label={darkModeTooltip(dark)}
        onClick={(e) => {
          e.currentTarget.blur();
          toggleDarkMode();
        }}
      />
    </Tooltip>
  );
};

export const mountDarkModeButton = () => {
  removeDarkModeButton();
  const el = document.createElement("span");
  el.classList.add(DARK_TOPBAR_CLASS);
  const liveThemesButton = document.querySelector(`.${TOPBAR_CLASS}`);
  if (liveThemesButton) liveThemesButton.insertAdjacentElement("afterend", el);
  else if (!insertInTopbar(el)) return;
  ReactDOM.render(<DarkModeTopbarButton />, el);
};

export const removeDarkModeButton = () => {
  document.querySelectorAll(`.${DARK_TOPBAR_CLASS}`).forEach((el) => {
    ReactDOM.unmountComponentAtNode(el);
    el.remove();
  });
};

export const unmountAllUI = () => {
  stopScreenPick();
  if (unsubscribeBanner) unsubscribeBanner();
  unsubscribeBanner = null;
  dialogOpen = false;
  [DIALOG_CONTAINER_ID, BANNER_CONTAINER_ID].forEach((id) => {
    const el = document.getElementById(id);
    if (el) {
      ReactDOM.unmountComponentAtNode(el);
      el.remove();
    }
  });
  removeTopbarButton();
  removeDarkModeButton();
  clearToasts();
};
