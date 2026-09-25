// Timed review of a proposal.
//
// A proposal is applied immediately (written in [[roam/css]] + mirrored in a
// <style> tag), then the user has N seconds to validate it. Without explicit
// validation the previous state is restored. The revert snapshot is also
// persisted in the extension settings, so that if the new CSS breaks the
// display and the user reloads Roam, the extension restores the previous
// state on load.
//
// The settings are synced with the graph, so another device may load Roam
// while a review is pending here. The persisted snapshot therefore records
// the device that owns it and when its countdown ends: on load, a device only
// restores its own snapshot, or a foreign one whose countdown ended long ago
// (its session crashed or was closed without validating).

import {
  applyProposal,
  getLiveThemesCss,
  revertSnapshot,
} from "./utils/roamCss";
import { injectStyle } from "./utils/cssPreview";
import { DEFAULTS, getDeviceId, getReviewDelaySeconds, getSetting, KEYS, setSetting } from "./storage";
import { diffContrast, measureContrastAllModes } from "./ai/contrast";
import {
  getActiveHistory,
  getActiveThemeName,
  pushActiveHistory,
  truncateActiveHistory,
} from "./themes";

let pending = null; // { snapshot, summary, css, previousCss, themeName, deadline, timerId, tickId, paused }
const listeners = new Set();

export const REVIEW_STATUS = {
  KEPT: "kept",
  REVERTED: "reverted",
  TIMEOUT: "timeout",
};

export const subscribeReview = (fn) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};

const notify = () => {
  const state = getReviewState();
  listeners.forEach((fn) => {
    try {
      fn(state);
    } catch (e) {
      console.error("[Live Themes] review listener error", e);
    }
  });
};

export const getReviewState = () => {
  if (!pending) return null;
  return {
    summary: pending.summary,
    themeName: pending.themeName,
    css: pending.css,
    notes: pending.notes,
    contrast: pending.contrast, // null while measuring, else { issues, checked, measuredAt }
    paused: pending.paused,
    remaining: pending.paused
      ? pending.remainingWhenPaused
      : Math.max(0, Math.ceil((pending.deadline - Date.now()) / 1000)),
    total: pending.total,
  };
};

const clearTimers = () => {
  if (!pending) return;
  clearTimeout(pending.timerId);
  clearInterval(pending.tickId);
  pending.timerId = null;
  pending.tickId = null;
};

// A foreign snapshot is left alone until its countdown has been over for this
// long; a paused review (no countdown) is only considered abandoned after PAUSED_EXPIRY_MS.
const FOREIGN_GRACE_MS = 2 * 60 * 1000;
const PAUSED_EXPIRY_MS = 60 * 60 * 1000;

/** Persists the revert point with its owner and the end of its countdown. */
const persistRevertPoint = (snapshot, { expiresAt = null, paused = false } = {}) =>
  setSetting(KEYS.pendingRevert, {
    ...snapshot,
    device: getDeviceId(),
    savedAt: Date.now(),
    expiresAt,
    paused,
  });

const armTimers = (seconds) => {
  clearTimers();
  pending.paused = false;
  pending.deadline = Date.now() + seconds * 1000;
  pending.timerId = setTimeout(() => finishReview(REVIEW_STATUS.TIMEOUT), seconds * 1000);
  pending.tickId = setInterval(notify, 500);
  notify();
};

/**
 * Applies a proposal and starts (or restarts) the review countdown.
 * If a review is already pending, its original snapshot is kept as the
 * revert point (so successive refinements all revert to the pre-review state).
 */
export async function startReview({ liveThemesCss, otherBlocks = [], summary, notes = [] }) {
  const previousCss = pending ? pending.previousCss : getLiveThemesCss();
  const snapshot = pending
    ? pending.snapshot
    : null;
  const checkContrast = !!getSetting(KEYS.contrastCheck, DEFAULTS[KEYS.contrastCheck]);
  const before = checkContrast ? safeMeasure() : null;

  const applied = await applyProposal({ liveThemesCss, otherBlocks });
  const revertPoint = snapshot || applied;
  await persistRevertPoint(revertPoint, { expiresAt: Date.now() + getReviewDelaySeconds() * 1000 });
  injectStyle(liveThemesCss);

  clearTimers();
  pending = {
    snapshot: revertPoint,
    previousCss,
    summary,
    notes,
    contrast: checkContrast ? null : { issues: [], checked: 0, skipped: true },
    themeName: getActiveThemeName(),
    css: liveThemesCss,
    total: getReviewDelaySeconds(),
    paused: false,
    remainingWhenPaused: 0,
  };
  armTimers(pending.total);
  if (checkContrast) scheduleContrastCheck(pending, before);
  return pending.total;
}

// ---- Contrast check --------------------------------------------------------
//
// Measured on the real page once the new CSS has been laid out. The result is
// only reported (banner + dialog): the user decides whether to ask the model
// for a fix, to keep the CSS as is, or to revert.

const CONTRAST_DELAY_MS = 400;

const safeMeasure = () => {
  try {
    return measureContrastAllModes();
  } catch (e) {
    console.warn("[Live Themes] contrast measurement failed", e);
    return null;
  }
};

const scheduleContrastCheck = (target, before) => {
  setTimeout(() => {
    if (pending !== target) return; // review ended or replaced meanwhile
    const after = safeMeasure();
    target.contrast = after
      ? {
          issues: diffContrast(before, after),
          checked: new Set(after.map((r) => r.selector)).size,
          bothModes: after.some((r) => r.mode),
          measuredAt: Date.now(),
        }
      : { issues: [], checked: 0, failed: true };
    notify();
  }, CONTRAST_DELAY_MS);
};

/** Contrast issues of the pending proposal (empty when none or not measured yet). */
export const getPendingContrastIssues = () => pending?.contrast?.issues || [];

export function pauseReview() {
  if (!pending || pending.paused) return;
  pending.remainingWhenPaused = Math.max(
    0,
    Math.ceil((pending.deadline - Date.now()) / 1000)
  );
  clearTimers();
  pending.paused = true;
  persistRevertPoint(pending.snapshot, { paused: true });
  notify();
}

export function resumeReview() {
  if (!pending || !pending.paused) return;
  const seconds = Math.max(5, pending.remainingWhenPaused);
  persistRevertPoint(pending.snapshot, { expiresAt: Date.now() + seconds * 1000 });
  armTimers(seconds);
}

export const isReviewPending = () => !!pending;

/** Ends the review: keeps or reverts. Returns the status, or null if nothing pending. */
export async function finishReview(status) {
  if (!pending) return null;
  const current = pending;
  clearTimers();
  pending = null;
  try {
    if (status === REVIEW_STATUS.KEPT) {
      await pushActiveHistory({
        summary: current.summary,
        previousCss: current.previousCss,
        css: current.css,
      });
    } else {
      await revertSnapshot(current.snapshot);
      injectStyle(current.previousCss);
    }
  } finally {
    // Only clear our own snapshot: another device may have started a review meanwhile.
    const stored = getSetting(KEYS.pendingRevert, null);
    if (!stored?.device || stored.device === getDeviceId()) await setSetting(KEYS.pendingRevert, null);
    notify();
  }
  return status;
}

export const keepProposal = () => finishReview(REVIEW_STATUS.KEPT);
export const revertProposal = () => finishReview(REVIEW_STATUS.REVERTED);

// ---- History (validated changes of the active theme) ----------------------

export const getHistory = getActiveHistory;
export const truncateHistory = truncateActiveHistory;

// ---- Recovery on load ------------------------------------------------------

/**
 * Whether a persisted snapshot must be restored by this device on load: its
 * own (left by a session that did not end the review, e.g. a reload after a
 * broken display), a snapshot saved before devices were recorded, or a
 * foreign one that is clearly abandoned. A review still running on another
 * device is left alone.
 */
export const shouldRecoverSnapshot = (snapshot, now = Date.now(), deviceId = getDeviceId()) => {
  if (!snapshot) return false;
  if (!snapshot.device || snapshot.device === deviceId) return true;
  if (snapshot.paused) return now - (snapshot.savedAt || 0) > PAUSED_EXPIRY_MS;
  const end = snapshot.expiresAt || snapshot.savedAt || 0;
  return now - end > FOREIGN_GRACE_MS;
};

/** Restores a pending snapshot left by a previous session (e.g. after a reload). */
export async function recoverPendingRevert() {
  const snapshot = getSetting(KEYS.pendingRevert, null);
  if (!shouldRecoverSnapshot(snapshot)) return false;
  try {
    await revertSnapshot(snapshot);
  } catch (e) {
    console.error("[Live Themes] Failed to restore the previous CSS", e);
  }
  await setSetting(KEYS.pendingRevert, null);
  return true;
}
