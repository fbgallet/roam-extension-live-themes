import { Intent } from "@blueprintjs/core";
import {
  DEFAULTS,
  KEYS,
  REVIEW_DELAY_OPTIONS,
  extensionAPI as storedExtensionAPI,
  getSetting,
  setExtensionAPI,
  setSetting,
} from "./storage";
import {
  closeLiveThemesDialog,
  mountDarkModeButton,
  mountReviewBanner,
  mountTopbarButton,
  removeDarkModeButton,
  // openLiveThemesDialog, // used by the commented-out commands
  removeTopbarButton,
  showToast,
  toggleLiveThemesDialog,
  unmountAllUI,
} from "./ui";
import {
  isReviewPending,
  // keepProposal, // used by the commented-out commands
  recoverPendingRevert,
  revertProposal,
  getHistory,
  subscribeReview,
} from "./review";
import {
  activateTheme,
  captureActiveCss,
  cycleTheme,
  ensureThemes,
  getActiveThemeId,
  getActiveThemeName,
  getThemes,
  restoreActiveHistory,
  subscribeThemes,
} from "./themes";
import {
  getDarkModeState,
  initDarkMode,
  refreshDarkRules,
  setFollowSystem,
  stopDarkMode,
  toggleDarkMode,
} from "./utils/darkMode";
import { getLiveThemesCss, setLiveThemesFences, writeLiveThemesCss } from "./utils/roamCss";
import { removeAllStyles, syncFontLinks } from "./utils/cssPreview";
import { disableLiveThemesCss, enableLiveThemesCss } from "./cssToggle";
import { resetConversation } from "./components/LiveThemesDialog";
// import { exportDomSnapshot } from "./ai/domInspector"; // development commands

const COMMANDS = [];
const THEME_COMMANDS = []; // one "Activate theme" command per user theme
let unsubscribeThemes = null;
let unsubscribeDarkRules = [];

const addCommand = (extensionAPI, label, callback) => {
  extensionAPI.ui.commandPalette.addCommand({ label, callback });
  COMMANDS.push(label);
};

const removeCommands = (extensionAPI, labels) => {
  labels.forEach((label) => {
    try {
      extensionAPI?.ui?.commandPalette?.removeCommand({ label });
    } catch (e) {
      /* ignore */
    }
  });
  labels.length = 0;
};

// ---- Themes ----------------------------------------------------------------

const switchTheme = async (id) => {
  if (isReviewPending()) {
    showToast("Live Themes: keep or revert the pending proposal before switching theme.", Intent.WARNING);
    return;
  }
  if (id === getActiveThemeId()) {
    showToast(`Live Themes: “${getActiveThemeName()}” is already the active theme.`);
    return;
  }
  const theme = await activateTheme(id);
  if (theme) showToast(`Live Themes: theme “${theme.name}” activated.`, Intent.SUCCESS);
};

/** (Re)registers one command palette entry per theme so switching is one keystroke away. */
let themeCommandsSignature = "";
const refreshThemeCommands = (extensionAPI) => {
  const themes = getThemes();
  const signature = themes.map((t) => `${t.id}:${t.name}`).join("|");
  if (signature === themeCommandsSignature) return; // only names/ids matter here
  themeCommandsSignature = signature;
  removeCommands(extensionAPI, THEME_COMMANDS);
  for (const theme of themes) {
    const label = `Live Themes: Activate theme “${theme.name}”`;
    extensionAPI.ui.commandPalette.addCommand({ label, callback: () => switchTheme(theme.id) });
    THEME_COMMANDS.push(label);
  }
};

// ---- Emergency disable (see cssToggle.js) ------------------------------------

/**
 * Earlier versions disabled the CSS by replacing it with a placeholder and
 * keeping the theme in the `disabledCss` setting: put it back on the page,
 * still disabled (text fence).
 */
async function migrateLegacyDisabledCss() {
  const legacy = getSetting(KEYS.disabledCss, null);
  if (typeof legacy !== "string") return;
  if (getSetting(KEYS.cssDisabled, false)) await writeLiveThemesCss(legacy, { disabled: true });
  await setSetting(KEYS.disabledCss, null);
}

async function undoLastChange() {
  if (isReviewPending()) {
    await revertProposal();
    showToast("Live Themes: pending proposal reverted.", Intent.SUCCESS);
    return;
  }
  const history = getHistory();
  if (!history.length) {
    showToast("Live Themes: nothing to undo.", Intent.NONE);
    return;
  }
  const last = await restoreActiveHistory(history.length - 1);
  resetConversation();
  showToast(
    `Live Themes: undone “${last?.summary || "last change"}” on theme “${getActiveThemeName()}”.`,
    Intent.SUCCESS
  );
}

// ---- Settings panel --------------------------------------------------------

const getPanelConfig = () => ({
  tabTitle: "Live Themes",
  settings: [
    {
      id: KEYS.topbarButton,
      name: "Button in the top bar",
      description: "Display a button (drop icon) next to the search box of the top bar to open Live Themes. Without it, use the command palette: \"Live Themes: Open / close\".",
      action: {
        type: "switch",
        onChange: (evt) => {
          if (evt.target.checked) mountTopbarButton();
          else removeTopbarButton();
        },
      },
    },
    {
      id: KEYS.darkModeButton,
      name: "Light/dark button in the top bar",
      description:
        "Display a 🌙/☀ button in the top bar, next to the Live Themes button, to switch between light and dark mode (off by default: the dialog has the same switch). It only appears once a dark mode exists (e.g. after the \"Complete dark mode\" proposal).",
      action: {
        type: "switch",
        onChange: (evt) => {
          if (evt.target.checked) mountDarkModeButton();
          else removeDarkModeButton();
        },
      },
    },
    {
      id: KEYS.darkModeFollowSystem,
      name: "Follow the system light/dark setting",
      description:
        "Switch between light and dark mode when your operating system does. You can still switch manually; the next system change wins.",
      action: {
        type: "switch",
        onChange: (evt) => setFollowSystem(evt.target.checked),
      },
    },
    {
      id: KEYS.reviewDelay,
      name: "Review delay (seconds)",
      description:
        "After a proposal is applied, you have this delay to validate it. Without explicit validation the previous CSS is restored (protects you from a change that would break the display).",
      action: { type: "select", items: REVIEW_DELAY_OPTIONS },
    },
    {
      id: KEYS.contrastCheck,
      name: "Check text contrast after applying a proposal",
      description:
        "Once a proposal is applied, measure the contrast between text and background on the main elements (WCAG ratio). Elements that became hard to read are listed in the review banner: you can then ask the model to fix them, or keep the CSS anyway.",
      action: { type: "switch" },
    },
    {
      id: KEYS.thinking,
      name: "Thinking (reasoning) mode",
      description:
        "Ask the model to think before writing the CSS: better handling of specificity, dark mode and contrast, but slower and more tokens. The depth follows Live AI's \"Reasoning effort\" setting. Models without a thinking mode ignore it; thinking-only models always think.",
      action: { type: "switch" },
    },
    {
      id: KEYS.domSnapshot,
      name: "Send a snapshot of the live page to the model",
      description:
        "Before each generation, measure the page in the browser (actual background/text colors and fonts of the main surfaces, CSS variables defined by Roam, [[roam/css]] and other extensions, which elements are on screen) and send this summary to the model, so its changes stay coherent with what is really displayed. Costs a few hundred extra tokens per request.",
      action: { type: "switch" },
    },
    {
      id: KEYS.includePageContext,
      name: "Read the whole [[roam/css]] page",
      description:
        "Send the other CSS blocks of [[roam/css]] (your base CSS, always applied under the active theme) to the model as read-only context, so the generated CSS is consistent with it (costs more tokens). Individual blocks can be excluded from the Live Themes dialog.",
      action: { type: "switch" },
    },
    {
      id: KEYS.allowWholePageEdit,
      name: "Allow editing the whole [[roam/css]] page",
      description:
        "⚠️ When on, the model may also rewrite other CSS blocks of the page if you explicitly ask for it. Otherwise only the code block under the 'Live Themes' block is ever modified.",
      action: { type: "switch" },
    },
    {
      id: KEYS.cssDisabled,
      name: "Disable Live Themes CSS (emergency)",
      description:
        "Temporarily stops applying the Live Themes CSS: its blocks stay on [[roam/css]] but as plain text code blocks. Switch it back off to restore it.",
      action: {
        type: "switch",
        onChange: (evt) => {
          if (evt.target.checked) disableLiveThemesCss();
          else enableLiveThemesCss();
        },
      },
    },
  ],
});

// ---- Lifecycle -------------------------------------------------------------

export default {
  onload: async ({ extensionAPI }) => {
    setExtensionAPI(extensionAPI);

    for (const [key, value] of Object.entries(DEFAULTS)) {
      if (extensionAPI.settings.get(key) === null) {
        await extensionAPI.settings.set(key, value);
      }
    }
    extensionAPI.settings.panel.create(getPanelConfig());

    // A proposal that was never validated (e.g. Roam reloaded after a broken
    // display) is reverted now.
    const recovered = await recoverPendingRevert();
    if (recovered) {
      showToast(
        "Live Themes: a CSS proposal was not validated before the reload, the previous CSS has been restored.",
        Intent.WARNING,
        10000
      );
    }

    await migrateLegacyDisabledCss();
    // Aligns the fences of the Live Themes blocks with the Disable setting
    // (only the blocks that differ are written): repairs blocks left as
    // "text"/"javascript" by an earlier version, or a state changed elsewhere.
    await setLiveThemesFences(!!getSetting(KEYS.cssDisabled, false));
    // Web fonts of the theme: Roam ignores the @import lines of [[roam/css]]
    // once other css blocks precede them, so the extension loads them itself.
    if (!getSetting(KEYS.cssDisabled, false)) syncFontLinks(getLiveThemesCss());
    // Themes: first run migrates the current CSS into a "Default" theme.
    await ensureThemes();
    refreshThemeCommands(extensionAPI);
    unsubscribeThemes = subscribeThemes(() => refreshThemeCommands(extensionAPI));

    initDarkMode();
    // Stylesheet changes that the head observer cannot see (roam/css
    // rendered elsewhere) come with a theme switch or a proposal.
    unsubscribeDarkRules = [subscribeThemes(refreshDarkRules), subscribeReview(refreshDarkRules)];

    if (getSetting(KEYS.topbarButton, true)) mountTopbarButton();
    if (getSetting(KEYS.darkModeButton, DEFAULTS[KEYS.darkModeButton])) mountDarkModeButton();
    mountReviewBanner();

    // Only the essential commands are registered; the others (redundant with
    // the dialog / review banner, or for development) are kept commented out.
    addCommand(extensionAPI, "Live Themes: Open / close", toggleLiveThemesDialog);
    // addCommand(extensionAPI, "Live Themes: Open", openLiveThemesDialog);
    addCommand(extensionAPI, "Live Themes: Toggle dark mode", () => {
      const on = toggleDarkMode();
      if (on && !getDarkModeState().hasRules) {
        showToast(
          "Live Themes: dark mode is on, but no stylesheet defines a dark mode yet, so nothing changes. Open Live Themes and use the \"Complete dark mode\" proposal.",
          Intent.WARNING,
          8000
        );
      }
    });
    addCommand(extensionAPI, "Live Themes: Next theme", async () => {
      if (isReviewPending()) {
        return showToast("Live Themes: keep or revert the pending proposal before switching theme.", Intent.WARNING);
      }
      const theme = await cycleTheme(1);
      showToast(`Live Themes: theme “${theme?.name}” activated.`, Intent.SUCCESS);
    });
    // addCommand(extensionAPI, "Live Themes: Previous theme", async () => {
    //   if (isReviewPending()) {
    //     return showToast("Live Themes: keep or revert the pending proposal before switching theme.", Intent.WARNING);
    //   }
    //   const theme = await cycleTheme(-1);
    //   showToast(`Live Themes: theme “${theme?.name}” activated.`, Intent.SUCCESS);
    // });
    // Keep / Revert are on the review banner; Undo also reverts a pending proposal.
    // addCommand(extensionAPI, "Live Themes: Keep (validate) the pending proposal", async () => {
    //   if (!isReviewPending()) return showToast("Live Themes: no pending proposal.");
    //   await keepProposal();
    //   showToast("Live Themes: proposal validated.", Intent.SUCCESS);
    // });
    // addCommand(extensionAPI, "Live Themes: Revert the pending proposal", async () => {
    //   if (!isReviewPending()) return showToast("Live Themes: no pending proposal.");
    //   await revertProposal();
    //   showToast("Live Themes: proposal reverted.", Intent.SUCCESS);
    // });
    addCommand(extensionAPI, "Live Themes: Undo last change", undoLastChange);
    // Emergency switch, reachable even when a broken theme hides the settings.
    addCommand(extensionAPI, "Live Themes: Disable / re-enable Live Themes CSS (emergency)", async () => {
      if (getSetting(KEYS.cssDisabled, false)) {
        await enableLiveThemesCss();
        showToast("Live Themes: CSS re-enabled.", Intent.SUCCESS);
      } else {
        await disableLiveThemesCss();
        showToast("Live Themes: CSS disabled. Run the same command again to re-enable it.", Intent.WARNING, 8000);
      }
    });

    // ---- Development commands (DOM snapshot for the Roam elements catalog) ----
    // const runSnapshotExport = () => {
    //   try {
    //     const snap = exportDomSnapshot();
    //     const h = snap.liveThemesHealth;
    //     if (h?.disabledByCondition || h?.brokenBlocks.length) {
    //       const b = h.brokenBlocks[0];
    //       showToast(
    //         `Live Themes: ${h.disabledByCondition}/${h.found} theme rules are disabled by ${h.disablingConditions.join(" | ") || "a broken block"}.${
    //           b ? ` Unbalanced bracket in [[roam/css]] block "${b.label}" (${b.problem}).` : ""
    //         }`,
    //         Intent.WARNING,
    //         15000
    //       );
    //     }
    //     showToast(
    //       `Live Themes: DOM snapshot exported (${snap.variables.length} CSS variables, ${snap.unknownClasses.length} classes unknown to the catalog, ${snap.anatomy.filter((a) => !a.missing).length}/${snap.anatomy.length} elements mapped, ${snap.stylesheetClasses.missingFromList.length} stylesheet classes missing from the static list). Anatomy also logged in the console.`,
    //       Intent.SUCCESS,
    //       8000
    //     );
    //   } catch (e) {
    //     showToast(`Live Themes: snapshot failed (${e.message}).`, Intent.DANGER);
    //   }
    // };
    // addCommand(extensionAPI, "Live Themes: Export Roam DOM snapshot (JSON, for the catalog)", runSnapshotExport);
    // // Running a command closes menus and ends block editing: the delayed
    // // variant leaves time to open a menu, a popover or a block in edit mode.
    // const SNAPSHOT_DELAY = 6;
    // addCommand(extensionAPI, `Live Themes: Export Roam DOM snapshot in ${SNAPSHOT_DELAY} s (to capture menus, popovers, editing)`, () => {
    //   showToast(
    //     `Live Themes: snapshot in ${SNAPSHOT_DELAY} s. Now open the menu / popover or click into a block, and leave it open.`,
    //     Intent.PRIMARY,
    //     (SNAPSHOT_DELAY - 1) * 1000
    //   );
    //   setTimeout(runSnapshotExport, SNAPSHOT_DELAY * 1000);
    // });

    console.log("Live Themes loaded");
  },

  onunload: async () => {
    // A proposal still under review is reverted: without the extension nobody
    // would revert it.
    if (isReviewPending()) await revertProposal();
    closeLiveThemesDialog();
    unmountAllUI();
    removeAllStyles();
    if (unsubscribeThemes) unsubscribeThemes();
    unsubscribeThemes = null;
    unsubscribeDarkRules.forEach((fn) => fn());
    unsubscribeDarkRules = [];
    stopDarkMode();
    removeCommands(storedExtensionAPI, THEME_COMMANDS);
    removeCommands(storedExtensionAPI, COMMANDS);
    console.log("Live Themes unloaded");
  },
};
