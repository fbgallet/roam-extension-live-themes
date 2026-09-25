import React, { useEffect, useMemo, useRef, useState } from "react";
import { Button, Callout, Classes, Collapse, Dialog, HTMLSelect, Icon, Intent, Popover, Position, Spinner, Switch, Tag } from "@blueprintjs/core";
import Tooltip from "./LtTooltip";
import Presets from "./Presets.jsx";
import ThemeManager from "./ThemeManager";
import BaseCssSection from "./BaseCssSection";
import CssSectionsView from "./CssSectionsView";
import RequestEditor from "./RequestEditor";
import ExistingRules from "./ExistingRules";
import { buildRuleInventory, rulesForElements } from "../ai/ruleInventory";
import { analyzePickedElement, isScreenPicking, startScreenPick } from "../utils/screenPick";
import { ROAM_ELEMENTS } from "../ai/roamElements";
import {
  generateTheme,
  getLiveAIStatus,
  getDefaultModelId,
  listModels,
} from "../ai/generate";
import {
  darkModeTooltip,
  getDarkModeState,
  isFollowingSystem,
  refreshDarkRules,
  setDarkMode,
  setFollowSystem,
  subscribeDarkMode,
} from "../utils/darkMode";
import { PRESET_GROUPS } from "./presetData";
import { buildContrastFixRequest } from "../ai/contrast";
import { DEFAULTS, getSetting, KEYS, setSetting } from "../storage";
import { disableLiveThemesCss, enableLiveThemesCss, isCssDisabled, subscribeCssDisabled } from "../cssToggle";
import {
  getReviewState,
  isReviewPending,
  keepProposal,
  pauseReview,
  resumeReview,
  revertProposal,
  startReview,
  subscribeReview,
} from "../review";
import {
  getBaseCssBlocks,
  getLiveThemesCss,
  setAllBlocksContextIncluded,
  setBlockContextIncluded,
} from "../utils/roamCss";
import { openRoamCssPage, showToast } from "../utils/notify";
import { countCssLines, parseCssSections } from "../utils/cssSections";
import StarterGallery from "./StarterGallery";
import { starterOrigin } from "../starterThemes";
import {
  DEFAULT_THEME_NAME,
  activateTheme,
  createTheme,
  getActiveConversation,
  getActiveHistory,
  getActiveTheme,
  getThemes,
  renameTheme,
  restoreActiveHistory,
  setActiveConversation,
  setActiveThemeCss,
  subscribeThemes,
} from "../themes";

// Conversation of the active theme, kept between openings so the user can
// refine a result. It is persisted in the theme and reloaded on switch.
let savedConversation = [];
let savedRequest = "";
let conversationThemeId = null;

const loadThemeConversation = () => {
  const active = getActiveTheme();
  if (active?.id !== conversationThemeId) {
    conversationThemeId = active?.id || null;
    savedConversation = getActiveConversation();
    savedRequest = "";
  }
};

export const resetConversation = () => {
  savedConversation = [];
  savedRequest = "";
};

// A request queued from outside the dialog (e.g. "fix the contrast" from the
// review banner): it fills the request field on next open and, if asked,
// runs the generation right away as a refinement of the pending proposal.
let queued = null; // { text, autoGenerate, refine }

// Result of a "pick on screen" (the dialog is closed while picking and gets
// the result on reopen).
let pendingPick = null;

// Catalog label of each selector, for the targets summary under the request.
const elementLabels = new Map(
  ROAM_ELEMENTS.flatMap((g) => g.items.map((item) => [item.selector, item.label]))
);

const DARK_MODE_PRESET_PROMPT = PRESET_GROUPS.flatMap((g) => g.presets).find(
  (p) => p.label === "Complete dark mode"
)?.prompt;

export const queueRequest = (text, { autoGenerate = false, refine = true } = {}) => {
  queued = { text, autoGenerate, refine };
};

const LiveThemesDialog = ({ isOpen, onClose, onReopen }) => {
  const [status, setStatus] = useState(getLiveAIStatus());
  const [models, setModels] = useState([]);
  const [model, setModel] = useState(getSetting(KEYS.model, DEFAULTS[KEYS.model]));
  const [{ dark, hasRules: hasDarkRules }, setDarkState] = useState(getDarkModeState());
  const [followSystem, setFollowSystemState] = useState(isFollowingSystem());
  const [request, setRequest] = useState(savedRequest);
  const [refine, setRefine] = useState(savedConversation.length > 0);
  const [selected, setSelected] = useState([]);
  // Target rules: rules touching the selected elements are targeted by
  // default; the user can add (manual) or remove (excluded) any rule.
  const [manualRules, setManualRules] = useState(() => new Set());
  const [excludedRules, setExcludedRules] = useState(() => new Set());
  const [restrictTargets, setRestrictTargets] = useState(false);
  const [editBaseInPlace, setEditBaseInPlace] = useState(false);
  const [picked, setPicked] = useState(null); // element picked on screen (screenPick)
  const [showElements, setShowElements] = useState(false);
  // Collapsed by default (the list is long); the last choice is remembered.
  const [showPresets, setShowPresets] = useState(
    !!getSetting(KEYS.presetsOpen, DEFAULTS[KEYS.presetsOpen])
  );
  const togglePresets = () => {
    const next = !showPresets;
    setShowPresets(next);
    setSetting(KEYS.presetsOpen, next);
  };
  const [showStarters, setShowStarters] = useState(
    !!getSetting(KEYS.startersOpen, DEFAULTS[KEYS.startersOpen])
  );
  const toggleStarters = () => {
    const next = !showStarters;
    setShowStarters(next);
    setSetting(KEYS.startersOpen, next);
  };
  const [showHistory, setShowHistory] = useState(false);
  const [showCurrentCss, setShowCurrentCss] = useState(false);
  const [phase, setPhase] = useState("idle"); // idle | generating | warning | error
  const [stream, setStream] = useState("");
  const [error, setError] = useState("");
  const [proposal, setProposal] = useState(null);
  const [review, setReview] = useState(getReviewState());
  const [history, setHistory] = useState(getActiveHistory());
  const [themes, setThemes] = useState(getThemes());
  const [activeTheme, setActiveTheme] = useState(getActiveTheme());
  const [baseVersion, setBaseVersion] = useState(0); // bumps when a base block toggles
  const [snapshotOn, setSnapshotOn] = useState(
    !!getSetting(KEYS.domSnapshot, DEFAULTS[KEYS.domSnapshot])
  );
  const abortRef = useRef(null);
  const streamRef = useRef(null);
  const targetsRef = useRef(null);

  const refreshThemes = () => {
    setThemes(getThemes());
    setActiveTheme(getActiveTheme());
    setHistory(getActiveHistory());
  };

  useEffect(() => {
    if (!isOpen) return;
    setStatus(getLiveAIStatus());
    setModels(listModels());
    refreshDarkRules();
    setDarkState(getDarkModeState());
    setFollowSystemState(isFollowingSystem());
    loadThemeConversation();
    refreshThemes();
    setRefine(savedConversation.length > 0);
    setRequest(savedRequest);
    setSnapshotOn(!!getSetting(KEYS.domSnapshot, DEFAULTS[KEYS.domSnapshot]));
    if (isReviewPending()) pauseReview();
    if (queued) {
      const q = queued;
      queued = null;
      const useRefine = q.refine && savedConversation.length > 0;
      setRequest(q.text);
      setRefine(useRefine);
      if (q.autoGenerate) setTimeout(() => generate(q.text, useRefine), 0);
    }
    if (pendingPick) {
      const p = pendingPick;
      pendingPick = null;
      applyPick(p);
    }
    return () => {
      // The countdown stays paused while the user picks an element on screen.
      if (isReviewPending() && !isScreenPicking()) resumeReview();
    };
  }, [isOpen]);

  useEffect(() => subscribeReview(setReview), []);
  const [cssDisabled, setCssDisabled] = useState(isCssDisabled());
  useEffect(() => subscribeCssDisabled(setCssDisabled), []);
  const [togglingCss, setTogglingCss] = useState(false);
  const toggleCss = async () => {
    if (review) return showToast("Live Themes: keep or revert the pending proposal first.", Intent.WARNING);
    setTogglingCss(true);
    try {
      if (isCssDisabled()) await enableLiveThemesCss();
      else await disableLiveThemesCss();
    } finally {
      setTogglingCss(false);
    }
  };
  useEffect(() => subscribeThemes(refreshThemes), []);

  useEffect(() => {
    if (streamRef.current) streamRef.current.scrollTop = streamRef.current.scrollHeight;
  }, [stream]);

  const defaultModelId = getDefaultModelId();
  const defaultModelName = useMemo(() => {
    const m = models.find((x) => x.id === defaultModelId);
    return m ? m.name : defaultModelId || "none";
  }, [models, defaultModelId]);

  const currentCss = useMemo(
    () => (isOpen ? getLiveThemesCss() : ""),
    [isOpen, review, phase, activeTheme]
  );
  const currentSections = useMemo(() => parseCssSections(currentCss), [currentCss]);
  const currentLines = countCssLines(currentCss);
  const themeName = activeTheme?.name || "";

  // Base CSS: the other css blocks of [[roam/css]], always applied by Roam.
  const baseBlocks = useMemo(
    () => (isOpen ? getBaseCssBlocks() : []),
    [isOpen, review, phase, baseVersion]
  );
  const contextEnabled = !!getSetting(KEYS.includePageContext, DEFAULTS[KEYS.includePageContext]);
  const wholePageEdit = !!getSetting(KEYS.allowWholePageEdit, DEFAULTS[KEYS.allowWholePageEdit]);

  // Inventory of the existing rules (theme + base), rebuilt when the CSS changes.
  const ruleInventory = useMemo(
    () => (isOpen ? buildRuleInventory({ themeCss: currentCss, baseBlocks }) : []),
    [isOpen, currentCss, baseBlocks]
  );
  const targetRuleIds = useMemo(() => {
    const ids = new Set(rulesForElements(ruleInventory, selected).map((r) => r.id));
    manualRules.forEach((id) => ids.add(id));
    excludedRules.forEach((id) => ids.delete(id));
    const known = new Set(ruleInventory.map((r) => r.id));
    return new Set([...ids].filter((id) => known.has(id)));
  }, [ruleInventory, selected, manualRules, excludedRules]);
  const targetRules = useMemo(
    () => ruleInventory.filter((r) => targetRuleIds.has(r.id)),
    [ruleInventory, targetRuleIds]
  );
  const toggleRule = (id) => {
    if (targetRuleIds.has(id)) {
      setExcludedRules((prev) => new Set(prev).add(id));
      setManualRules((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    } else {
      setManualRules((prev) => new Set(prev).add(id));
      setExcludedRules((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };
  const clearTargets = () => {
    setSelected([]);
    setManualRules(new Set());
    setExcludedRules(new Set());
    setPicked(null);
  };
  const hasTargets = !!picked || selected.length > 0 || targetRules.length > 0;
  // Opens the (advanced) targets section and brings it into view.
  const openTargets = () => {
    setShowElements(true);
    setTimeout(() => targetsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
  };

  // Pick on screen: the dialog closes, the user clicks an element of the
  // page, the dialog reopens with that element's catalog entries selected
  // and the rules that really apply to it targeted.
  const applyPick = (p) => {
    setPicked(p);
    setSelected((prev) => [...new Set([...prev, ...p.nearestElements])]);
    setManualRules((prev) => new Set([...prev, ...p.directRules]));
    setExcludedRules((prev) => {
      const next = new Set(prev);
      p.directRules.forEach((id) => next.delete(id));
      return next;
    });
  };
  const pickOnScreen = () => {
    savedRequest = request; // the request typed so far is restored on reopen
    const rules = ruleInventory;
    onClose();
    startScreenPick({
      onPick: (el) => {
        pendingPick = analyzePickedElement(el, rules);
        onReopen?.();
      },
      onCancel: () => onReopen?.(),
    });
  };
  const onToggleBaseContext = async (uid, included) => {
    await setBlockContextIncluded(uid, included);
    setBaseVersion((v) => v + 1);
  };
  const onToggleAllBaseContext = async (included) => {
    await setAllBlocksContextIncluded(included);
    setBaseVersion((v) => v + 1);
  };

  const onModelChange = async (e) => {
    const value = e.target.value;
    setModel(value);
    await setSetting(KEYS.model, value);
  };

  useEffect(() => subscribeDarkMode(setDarkState), []);

  // Without any dark rule, turning dark mode on would change nothing: the
  // button prepares the "Complete dark mode" proposal instead (in dark mode,
  // so the review and the contrast check show the result).
  const toggleDark = () => {
    if (dark || hasDarkRules) return setDarkMode(!dark);
    setDarkMode(true);
    setRequest(DARK_MODE_PRESET_PROMPT);
    setRefine(false);
    showToast(
      "Live Themes: this theme has no dark mode yet. The \"Complete dark mode\" proposal is ready in the request field: generate it to create one.",
      Intent.PRIMARY,
      8000
    );
  };

  const onFollowSystemChange = async (e) => {
    const on = e.target.checked;
    setFollowSystemState(on);
    await setSetting(KEYS.darkModeFollowSystem, on);
    setFollowSystem(on);
  };

  const toggleSelector = (sel) =>
    setSelected((prev) =>
      prev.includes(sel) ? prev.filter((s) => s !== sel) : [...prev, sel]
    );

  const onSnapshotChange = async (e) => {
    const on = e.target.checked;
    setSnapshotOn(on);
    await setSetting(KEYS.domSnapshot, on);
  };

  const applyProposalNow = async (p) => {
    try {
      const seconds = await startReview({
        liveThemesCss: p.liveThemesCss,
        otherBlocks: p.otherBlocks,
        summary: p.summary,
        notes: p.notes || [],
      });
      setProposal(null);
      setPhase("idle");
      showToast(
        `Live Themes: CSS applied${p.changesText ? ` (${p.changesText})` : ""}. Validate it within ${seconds}s (banner at the top) or it will be reverted.`,
        Intent.PRIMARY,
        8000
      );
      onClose();
    } catch (e) {
      setError(`Could not write to [[roam/css]]: ${e.message}`);
      setPhase("error");
    }
  };

  // `textOverride` / `refineOverride` are used by queued requests (the state
  // may not be committed yet when they run).
  const generate = async (textOverride, refineOverride) => {
    const text = (typeof textOverride === "string" ? textOverride : request).trim();
    const useRefine = typeof refineOverride === "boolean" ? refineOverride : refine;
    if (!text) return;
    setError("");
    setStream("");
    setProposal(null);
    setPhase("generating");
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const result = await generateTheme({
        request: text,
        targetSelectors: selected,
        targetRules,
        restrictToTargets: restrictTargets && targetRules.length > 0,
        editBaseInPlace: editBaseInPlace && wholePageEdit,
        pickedElement: picked,
        conversation: useRefine ? savedConversation : [],
        onChunk: (chunk) => setStream((prev) => prev + chunk),
        signal: controller.signal,
      });
      savedRequest = text;
      if (!result.ok) {
        setError(result.error + " Try again or rephrase the request.");
        setPhase("error");
        return;
      }
      savedConversation = result.conversation;
      conversationThemeId = getActiveTheme()?.id || null;
      await setActiveConversation(result.conversation);
      setRefine(true);
      if (result.warnings.length) {
        setProposal(result);
        setPhase("warning");
        return;
      }
      await applyProposalNow(result);
    } catch (e) {
      if (e?.name === "AbortError") {
        setPhase("idle");
      } else {
        setError(e?.message || String(e));
        setPhase("error");
      }
    } finally {
      abortRef.current = null;
    }
  };

  const cancelGeneration = () => abortRef.current?.abort();

  const restoreFromHistory = async (index) => {
    const entry = history[index];
    if (!entry) return;
    if (
      !window.confirm(
        `Restore the Live Themes CSS as it was before "${entry.summary || "this change"}"? Later validated changes will be dropped from the history.`
      )
    )
      return;
    await restoreActiveHistory(index);
    refreshThemes();
    resetConversation();
    setRefine(false);
    showToast(`Live Themes: previous CSS of “${themeName}” restored.`, Intent.SUCCESS);
  };

  // The pending proposal can be settled from the dialog as from the banner.
  const onKeepReview = async () => {
    await keepProposal();
    refreshThemes();
    showToast("Live Themes: proposal validated.", Intent.SUCCESS);
  };
  const onRevertReview = async () => {
    await revertProposal();
    refreshThemes();
    showToast("Live Themes: proposal reverted.", Intent.SUCCESS);
  };

  const clearCss = async () => {
    if (!window.confirm(`Remove all the CSS of theme “${themeName}”?`)) return;
    await setActiveThemeCss("");
    await setActiveConversation([]);
    resetConversation();
    setRefine(false);
    refreshThemes();
    showToast(`Live Themes: stylesheet of “${themeName}” cleared.`, Intent.SUCCESS);
  };

  const generating = phase === "generating";
  const themesLocked = generating || !!review;
  const themesLockedReason = review
    ? "Keep or revert the pending proposal before switching or editing themes."
    : "Wait for the generation to finish.";

  // Switching theme: its CSS replaces the current one, and the dialog reloads
  // that theme's conversation, history and request.
  const onSwitchTheme = async (id) => {
    if (!id || id === activeTheme?.id) return;
    const theme = await activateTheme(id);
    if (!theme) return;
    onThemeChanged(theme);
    showToast(`Live Themes: theme “${theme.name}” activated.`, Intent.SUCCESS);
  };

  // Inline gallery (active theme still empty): the starter fills this theme,
  // which takes the starter's name if it still has the default one.
  const fillWithStarter = async (starter) => {
    if (!starter || review || generating || isCssDisabled()) return;
    const theme = getActiveTheme();
    const origin = starterOrigin(starter.id);
    if (!origin) return;
    await setActiveThemeCss(origin.css, { starter: origin });
    if (theme && theme.name === DEFAULT_THEME_NAME) await renameTheme(theme.id, starter.name);
    onThemeChanged();
    showToast(
      `Live Themes: “${starter.name}” applied. Customize it with the proposals or your own requests.`,
      Intent.SUCCESS
    );
  };

  // Collapsible gallery (active theme not empty): the starter becomes a new
  // theme, as with the "+" button, so the current one is left untouched.
  const createFromStarter = async (starter) => {
    if (!starter || review || generating || isCssDisabled()) return;
    const origin = starterOrigin(starter.id);
    if (!origin) return;
    const theme = await createTheme({ name: starter.name, css: origin.css, starter: origin });
    onThemeChanged(theme);
    showToast(
      `Live Themes: starter theme “${theme.name}” created and activated. Customize it with the proposals or your own requests.`,
      Intent.SUCCESS
    );
  };

  const onThemeChanged = () => {
    loadThemeConversation();
    refreshThemes();
    setManualRules(new Set());
    setExcludedRules(new Set());
    setPicked(null);
    setRefine(savedConversation.length > 0);
    setRequest(savedRequest);
    setProposal(null);
    setError("");
    if (phase !== "generating") setPhase("idle");
  };

  // Rarely changed settings, kept in the ⚙ popover of the title bar.
  const settingsPanel = (
    <div className="lt-settings">
      <label className="lt-field">
        <span className="lt-label">Model</span>
        <HTMLSelect value={model} onChange={onModelChange} disabled={!status.ok}>
          <option value="default">Live AI default ({defaultModelName})</option>
          {models.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name} · {m.provider}
            </option>
          ))}
        </HTMLSelect>
      </label>
      <Switch
        checked={snapshotOn}
        onChange={onSnapshotChange}
        label="Page snapshot"
        className="lt-switch"
        disabled={generating}
      />
      <p className="lt-hint">
        Measures the page before each generation (actual colors and fonts of the main surfaces,
        CSS variables in use, elements on screen) and sends this summary to the model, so its
        changes stay coherent with what is really displayed. A few hundred extra tokens per request.
      </p>
      <Switch
        checked={followSystem}
        onChange={onFollowSystemChange}
        label="Follow the system light/dark setting"
        className="lt-switch"
      />
      <p className="lt-hint">
        Switches between light and dark mode when your operating system does. The moon/sun
        button still works; the next system change wins.
      </p>
    </div>
  );

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={
        <span className="lt-title">
          <Icon icon="tint" style={{ marginRight: 8 }} />
          Live Themes
          {themeName ? <span className="lt-title-theme"> · {themeName}</span> : null}
          <span className="lt-title-actions">
            <Tooltip
              content={
                dark || hasDarkRules
                  ? darkModeTooltip(dark)
                  : "This theme has no dark mode yet: click to prepare the \"Complete dark mode\" proposal"
              }
            >
              <Button small minimal icon={dark ? "flash" : "moon"} onClick={toggleDark} disabled={generating} />
            </Tooltip>
            <Popover position={Position.BOTTOM_RIGHT} content={settingsPanel}>
              <Tooltip content="Settings: model, page snapshot, light/dark">
                <Button small minimal icon="cog" />
              </Tooltip>
            </Popover>
          </span>
        </span>
      }
      className="lt-dialog"
      canOutsideClickClose={!generating}
      canEscapeKeyClose={!generating}
    >
      <div className={`${Classes.DIALOG_BODY} lt-body`}>
        {!status.ok ? (
          <Callout intent={Intent.WARNING} icon="warning-sign" title={status.title}>
            <p>{status.message}</p>
            <Button
              small
              icon="refresh"
              onClick={() => {
                setStatus(getLiveAIStatus());
                setModels(listModels());
              }}
            >
              Check again
            </Button>
          </Callout>
        ) : null}

        {cssDisabled ? (
          <Callout intent={Intent.DANGER} icon="disable" className="lt-callout" title="Live Themes CSS is disabled">
            The theme stays on [[roam/css]] as plain text code blocks and is not applied. Re-enable it to see it
            again and to generate changes.
            <div>
              <Button small icon="power" intent={Intent.PRIMARY} onClick={toggleCss} loading={togglingCss} style={{ marginTop: 6 }}>
                Re-enable
              </Button>
            </div>
          </Callout>
        ) : null}

        {review ? (
          <Callout intent={Intent.PRIMARY} icon="time" className="lt-callout">
            A proposal for theme “{review.themeName || themeName}” is being reviewed
            {review.summary ? `: ${review.summary}` : ""}.
            The countdown is paused while this dialog is open: keep or revert it now,
            or describe an adjustment below.
            {review.contrast?.issues?.length ? (
              <div className="lt-contrast">
                <b>
                  Low text contrast measured on {review.contrast.issues.length} element
                  {review.contrast.issues.length > 1 ? "s" : ""}:
                </b>
                <ul className="lt-warnings">
                  {review.contrast.issues.map((i) => (
                    <li key={i.key || i.selector}>
                      {i.label}: {i.ratio}:1 (min {i.min}:1){" "}
                      <span
                        className="lt-swatch"
                        style={{ background: i.bg, color: i.fg }}
                        title={`text ${i.fg} on ${i.bg}`}
                      >
                        Aa
                      </span>
                      {!i.regressed ? <span className="lt-hint"> · already low before</span> : null}
                    </li>
                  ))}
                </ul>
                <Button
                  small
                  icon="contrast"
                  disabled={generating || !status.ok}
                  onClick={() => {
                    const text = buildContrastFixRequest(review.contrast.issues);
                    setRequest(text);
                    setRefine(true);
                    generate(text, true);
                  }}
                >
                  Ask the model to fix the contrast
                </Button>
              </div>
            ) : null}
            <div className="lt-actions lt-review-actions">
              <Button small icon="undo" intent={Intent.DANGER} minimal onClick={onRevertReview} disabled={generating}>
                Revert
              </Button>
              <Button small icon="tick" intent={Intent.PRIMARY} onClick={onKeepReview} disabled={generating}>
                Keep (validate)
              </Button>
            </div>
          </Callout>
        ) : null}

        <ThemeManager
          themes={themes}
          active={activeTheme}
          locked={themesLocked}
          lockedReason={themesLockedReason}
          onSwitch={onSwitchTheme}
          onChanged={onThemeChanged}
          cssDisabled={cssDisabled}
          onToggleCss={toggleCss}
          togglingCss={togglingCss}
        />

        {cssDisabled || review || generating ? null : !currentCss.trim() ? (
          <div className="lt-section lt-starter-inline">
            <span className="lt-label">Start from a ready-made design</span>
            <span className="lt-hint">
              {" "}
              · or describe the look you want below. Everything stays customizable.
            </span>
            <StarterGallery onPick={fillWithStarter} />
          </div>
        ) : (
          <div className="lt-section lt-starter-inline">
            <button type="button" className="lt-section-toggle" onClick={toggleStarters}>
              <Icon icon={showStarters ? "chevron-down" : "chevron-right"} />
              Ready-made designs
            </button>
            <Collapse isOpen={showStarters}>
              <span className="lt-hint">Each one is created as a new theme; the current theme is kept.</span>
              <StarterGallery onPick={createFromStarter} />
            </Collapse>
          </div>
        )}

        <div className="lt-section">
          <span className="lt-label">
            Your request
            {themeName ? (
              <span className="lt-label-theme"> · modifies theme “{themeName}”</span>
            ) : null}
          </span>
          <RequestEditor
            value={request}
            onChange={setRequest}
            onSubmit={generate}
            placeholder="Describe the style you want, e.g. “Softer bullets, a serif font for block text and a warm dark mode”"
            disabled={generating}
            actions={
              <Tooltip content="Closes this dialog and lets you click the element to restyle directly in the page. Its catalog entries get selected and the rules that really apply to it get targeted.">
                <Button small icon="select" onClick={pickOnScreen} disabled={generating}>
                  Pick on screen
                </Button>
              </Tooltip>
            }
          />
          {hasTargets ? (
            <div className="lt-targets-summary">
              <span className="lt-label">Targets</span>
              {picked ? (
                <Tooltip
                  content={`${picked.path} · ${
                    picked.elements.length
                      ? `${picked.elements[0].label}${picked.elements.length > 1 ? ` +${picked.elements.length - 1}` : ""}`
                      : "not in the catalog"
                  } · ${picked.directRules.length} matching rule${picked.directRules.length > 1 ? "s" : ""}`}
                >
                  <Tag minimal round icon="locate" onRemove={generating ? undefined : () => setPicked(null)}>
                    {picked.descriptor}
                  </Tag>
                </Tooltip>
              ) : null}
              {selected.map((sel) => (
                <Tag
                  key={sel}
                  minimal
                  round
                  intent={Intent.PRIMARY}
                  onRemove={generating ? undefined : () => toggleSelector(sel)}
                >
                  {elementLabels.get(sel) || sel}
                </Tag>
              ))}
              {targetRules.length ? (
                <Tag minimal round interactive icon="code" onClick={openTargets}>
                  {targetRules.length} rule{targetRules.length > 1 ? "s" : ""}
                  {restrictTargets ? " · only these" : ""}
                </Tag>
              ) : null}
              <Button small minimal onClick={openTargets}>
                Edit
              </Button>
              <Button small minimal icon="cross" onClick={clearTargets} disabled={generating}>
                Clear
              </Button>
            </div>
          ) : null}
          {savedConversation.length ? (
            <Switch
              checked={refine}
              onChange={(e) => setRefine(e.target.checked)}
              label="Refine the previous result (keep the conversation)"
              className="lt-switch"
              disabled={generating}
            />
          ) : null}
        </div>

        {generating ? (
          <div className="lt-stream-wrapper">
            <div className="lt-stream-header">
              <Spinner size={16} /> Generating…
            </div>
            <pre className="lt-stream" ref={streamRef}>
              {stream}
            </pre>
          </div>
        ) : null}

        {phase === "error" && error ? (
          <Callout intent={Intent.DANGER} icon="error" className="lt-callout">
            {error}
          </Callout>
        ) : null}

        {phase === "warning" && proposal ? (
          <Callout intent={Intent.WARNING} icon="warning-sign" title="Check before applying" className="lt-callout">
            <ul className="lt-warnings">
              {proposal.warnings.map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
            <CssSectionsView
              sections={parseCssSections(proposal.liveThemesCss)}
              emptyText="/* empty */"
            />
            <div className="lt-actions">
              <Button intent={Intent.WARNING} onClick={() => applyProposalNow(proposal)}>
                Apply anyway (with review)
              </Button>
              <Button onClick={() => { setProposal(null); setPhase("idle"); }}>Discard</Button>
            </div>
          </Callout>
        ) : null}

        <div className="lt-section">
          <button
            type="button"
            className="lt-section-toggle"
            onClick={togglePresets}
          >
            <Icon icon={showPresets ? "chevron-down" : "chevron-right"} />
            Standard proposals
          </button>
          <Collapse isOpen={showPresets}>
            <Presets
              disabled={generating}
              onPick={(text) => {
                setRequest(text);
                setRefine(false);
              }}
            />
          </Collapse>
        </div>

        <div className="lt-section" ref={targetsRef}>
          <button
            type="button"
            className="lt-section-toggle"
            onClick={() => setShowElements((v) => !v)}
          >
            <Icon icon={showElements ? "chevron-down" : "chevron-right"} />
            Target elements & rules
            {selected.length || targetRules.length ? (
              <Tag minimal round className="lt-count">
                {selected.length ? `${selected.length} element${selected.length > 1 ? "s" : ""}` : ""}
                {selected.length && targetRules.length ? " · " : ""}
                {targetRules.length ? `${targetRules.length} rule${targetRules.length > 1 ? "s" : ""}` : ""}
              </Tag>
            ) : (
              <span className="lt-hint">(optional: focus on elements, or on existing rules)</span>
            )}
          </button>
          <Collapse isOpen={showElements}>
            <div className="lt-elements">
              {ROAM_ELEMENTS.map((group) => (
                <div key={group.id} className="lt-element-group">
                  <span className="lt-preset-group-label">{group.label}</span>
                  <div className="lt-chips">
                    {group.items.map((item) => {
                      const active = selected.includes(item.selector);
                      return (
                        <Tooltip
                          key={item.selector}
                          content={`${item.selector} — ${item.description}`}
                          hoverOpenDelay={400}
                        >
                          <Tag
                            interactive
                            round
                            minimal={!active}
                            intent={active ? Intent.PRIMARY : Intent.NONE}
                            onClick={() => toggleSelector(item.selector)}
                          >
                            {item.label}
                          </Tag>
                        </Tooltip>
                      );
                    })}
                  </div>
                </div>
              ))}
              {selected.length ? (
                <Button small minimal icon="cross" onClick={() => setSelected([])}>
                  Clear selection
                </Button>
              ) : null}
              <ExistingRules
                rules={ruleInventory}
                selectedSelectors={selected}
                targetIds={targetRuleIds}
                onToggleRule={toggleRule}
                onClearTargets={clearTargets}
                restrict={restrictTargets}
                onRestrict={setRestrictTargets}
                editInPlace={editBaseInPlace}
                onEditInPlace={setEditBaseInPlace}
                canEditInPlace={wholePageEdit}
                disabled={generating}
              />
            </div>
          </Collapse>
        </div>

        <BaseCssSection
          blocks={baseBlocks}
          contextEnabled={contextEnabled}
          onToggleContext={onToggleBaseContext}
          onToggleAll={onToggleAllBaseContext}
        />

        <div className="lt-section lt-secondary">
          <button
            type="button"
            className="lt-section-toggle"
            onClick={() => setShowCurrentCss((v) => !v)}
          >
            <Icon icon={showCurrentCss ? "chevron-down" : "chevron-right"} />
            Theme CSS of “{themeName}”
            <span className="lt-hint">
              {currentCss.trim()
                ? `(${currentSections.length} section${currentSections.length > 1 ? "s" : ""}, ${currentLines} lines${baseBlocks.length ? ", applied on top of the base CSS" : ""})`
                : baseBlocks.length
                ? "(empty: no change over the base CSS yet)"
                : "(empty)"}
            </span>
          </button>
          <Collapse isOpen={showCurrentCss}>
            <p className="lt-hint lt-base-intro">
              Each section is a collapsible block under “Live Themes” on [[roam/css]].
            </p>
            <CssSectionsView
              sections={currentSections}
              emptyText={
                baseBlocks.length
                  ? "/* empty: this theme adds nothing yet on top of your base CSS */"
                  : "/* empty */"
              }
            />
            <div className="lt-actions">
              <Button small icon="document-open" onClick={openRoamCssPage}>
                Open [[roam/css]] in sidebar
              </Button>
              <Button small icon="trash" intent={Intent.DANGER} minimal onClick={clearCss}>
                Clear stylesheet
              </Button>
            </div>
          </Collapse>
        </div>

        <div className="lt-section lt-secondary">
          <button
            type="button"
            className="lt-section-toggle"
            onClick={() => setShowHistory((v) => !v)}
          >
            <Icon icon={showHistory ? "chevron-down" : "chevron-right"} />
            History of “{themeName}”
            <span className="lt-hint">({history.length} validated change{history.length > 1 ? "s" : ""})</span>
          </button>
          <Collapse isOpen={showHistory}>
            {history.length ? (
              <ul className="lt-history">
                {history
                  .map((h, i) => ({ ...h, index: i }))
                  .reverse()
                  .map((h) => (
                    <li key={h.index}>
                      <span className="lt-history-date">
                        {new Date(h.at).toLocaleString()}
                      </span>
                      <span className="lt-history-summary">{h.summary || "(no summary)"}</span>
                      <Button
                        small
                        minimal
                        icon="undo"
                        title="Restore the CSS as it was before this change"
                        onClick={() => restoreFromHistory(h.index)}
                      />
                    </li>
                  ))}
              </ul>
            ) : (
              <p className="lt-hint">No validated change yet.</p>
            )}
          </Collapse>
        </div>
      </div>

      <div className={Classes.DIALOG_FOOTER}>
        <div className={Classes.DIALOG_FOOTER_ACTIONS}>
          {savedConversation.length ? (
            <Button
              minimal
              icon="refresh"
              onClick={async () => {
                resetConversation();
                await setActiveConversation([]);
                setRefine(false);
                setRequest("");
              }}
              disabled={generating}
            >
              New request
            </Button>
          ) : null}
          <Button onClick={onClose} disabled={generating}>
            Close
          </Button>
          {generating ? (
            <Button intent={Intent.DANGER} icon="stop" onClick={cancelGeneration}>
              Cancel
            </Button>
          ) : (
            <Button
              intent={Intent.PRIMARY}
              icon="clean"
              onClick={generate}
              disabled={!status.ok || cssDisabled || !request.trim()}
            >
              Generate & preview
              {themeName ? ` (${themeName})` : ""}
            </Button>
          )}
        </div>
      </div>
    </Dialog>
  );
};

export default LiveThemesDialog;
