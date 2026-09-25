import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  getReviewState,
  keepProposal,
  revertProposal,
  subscribeReview,
} from "../review";

// Deliberately styled inline and without Blueprint, so that it stays usable
// even if the proposed CSS breaks the rest of the UI.

const baseButton = {
  border: "1px solid rgba(0,0,0,0.15)",
  borderRadius: 6,
  padding: "6px 12px",
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
  background: "#fff",
  color: "#182026",
  fontFamily: "inherit",
};

const MAX_ISSUES_SHOWN = 6;
const POSITION_KEY = "live-themes:review-banner-position";
const MARGIN = 8;

const loadPosition = () => {
  try {
    const raw = localStorage.getItem(POSITION_KEY);
    if (!raw) return null;
    const pos = JSON.parse(raw);
    return Number.isFinite(pos?.left) && Number.isFinite(pos?.top) ? pos : null;
  } catch (e) {
    return null;
  }
};

const savePosition = (pos) => {
  try {
    localStorage.setItem(POSITION_KEY, JSON.stringify(pos));
  } catch (e) {
    /* ignore */
  }
};

const clampPosition = (pos, el) => {
  if (!pos || !el) return pos;
  const maxLeft = Math.max(MARGIN, window.innerWidth - el.offsetWidth - MARGIN);
  const maxTop = Math.max(MARGIN, window.innerHeight - el.offsetHeight - MARGIN);
  return {
    left: Math.min(Math.max(MARGIN, pos.left), maxLeft),
    top: Math.min(Math.max(MARGIN, pos.top), maxTop),
  };
};

const isInteractive = (target) =>
  !!target.closest?.("button, a, input, textarea, select, [contenteditable]");

// Bottom-centered by default (so it does not hide the top of the page being
// restyled), and draggable anywhere with the mouse. The chosen position is
// remembered across reviews.
const useDraggable = () => {
  const ref = useRef(null);
  const [position, setPosition] = useState(loadPosition);
  const [dragging, setDragging] = useState(false);
  const drag = useRef(null);

  // Keep the banner inside the viewport when it grows (e.g. contrast issues
  // appear) or when the window is resized.
  useLayoutEffect(() => {
    if (!position || !ref.current) return;
    const clamped = clampPosition(position, ref.current);
    if (clamped.left !== position.left || clamped.top !== position.top) {
      setPosition(clamped);
    }
  });

  useEffect(() => {
    const onResize = () => {
      setPosition((pos) => (pos ? clampPosition(pos, ref.current) : pos));
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const onPointerDown = (e) => {
    if (e.button !== 0 || isInteractive(e.target) || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    drag.current = {
      pointerId: e.pointerId,
      offsetX: e.clientX - rect.left,
      offsetY: e.clientY - rect.top,
    };
    // Switch from the default (bottom-centered) placement to explicit
    // coordinates so that dragging starts from the current visual position.
    setPosition({ left: rect.left, top: rect.top });
    setDragging(true);
    e.currentTarget.setPointerCapture?.(e.pointerId);
    e.preventDefault();
  };

  const onPointerMove = (e) => {
    const d = drag.current;
    if (!d || d.pointerId !== e.pointerId) return;
    setPosition(
      clampPosition(
        { left: e.clientX - d.offsetX, top: e.clientY - d.offsetY },
        ref.current
      )
    );
  };

  const onPointerUp = (e) => {
    const d = drag.current;
    if (!d || d.pointerId !== e.pointerId) return;
    drag.current = null;
    setDragging(false);
    e.currentTarget.releasePointerCapture?.(e.pointerId);
    setPosition((pos) => {
      if (pos) savePosition(pos);
      return pos;
    });
  };

  const positionStyle = position
    ? { top: position.top, left: position.left, transform: "none" }
    : { bottom: 16, left: "50%", transform: "translateX(-50%)" };

  return {
    ref,
    positionStyle,
    dragging,
    handleProps: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel: onPointerUp,
    },
  };
};

const ReviewBanner = ({ hidden, onAdjust, onFixContrast }) => {
  const [state, setState] = useState(getReviewState());
  const { ref, positionStyle, dragging, handleProps } = useDraggable();

  useEffect(() => subscribeReview(setState), []);

  if (!state || hidden) return null;
  const ratio = state.total ? Math.min(1, state.remaining / state.total) : 0;
  const contrast = state.contrast;
  const issues = contrast?.issues || [];
  const regressions = issues.filter((i) => i.regressed);
  const contrastLine = !contrast
    ? "Measuring text contrast…"
    : contrast.skipped
    ? null
    : contrast.failed
    ? "Contrast could not be measured."
    : issues.length
    ? null
    : `Text contrast OK on the ${contrast.checked} elements checked${contrast.bothModes ? ", in light and dark mode" : ""}.`;

  return (
    <div
      ref={ref}
      role="dialog"
      aria-live="polite"
      style={{
        position: "fixed",
        ...positionStyle,
        zIndex: 2147483000,
        maxWidth: 640,
        width: "calc(100% - 32px)",
        background: "#ffffff",
        color: "#182026",
        border: "1px solid rgba(0,0,0,0.2)",
        borderRadius: 10,
        boxShadow: "0 8px 24px rgba(16,22,26,0.3)",
        padding: "12px 16px",
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
        fontSize: 14,
        lineHeight: 1.4,
        display: "block",
        visibility: "visible",
        opacity: 1,
        pointerEvents: "auto",
        userSelect: dragging ? "none" : undefined,
      }}
    >
      <div
        {...handleProps}
        title="Drag to move"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          cursor: dragging ? "grabbing" : "grab",
          touchAction: "none",
        }}
      >
        <span style={{ fontSize: 18 }}>🎨</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700 }}>
            Live Themes — keep these changes
            {state.themeName ? ` on theme “${state.themeName}”` : ""}?
          </div>
          {state.summary ? (
            <div style={{ opacity: 0.85, marginTop: 2 }}>{state.summary}</div>
          ) : null}
          <div style={{ marginTop: 4, fontSize: 12, opacity: 0.75 }}>
            {state.paused
              ? "Countdown paused while you adjust the request."
              : `Without validation, the previous CSS is restored in ${state.remaining}s.`}
          </div>
          {contrastLine ? (
            <div style={{ marginTop: 4, fontSize: 12, opacity: 0.75 }}>{contrastLine}</div>
          ) : null}
          {state.notes?.length ? (
            <div style={{ marginTop: 4, fontSize: 12, color: "#946638" }}>
              {state.notes.map((n, i) => (
                <div key={i}>⚠ {n}</div>
              ))}
            </div>
          ) : null}
        </div>
        <button
          type="button"
          aria-label="Close and revert"
          title="Close and revert to the previous CSS"
          style={{
            alignSelf: "flex-start",
            border: "none",
            background: "transparent",
            color: "#5f6b7c",
            fontSize: 18,
            lineHeight: 1,
            padding: "0 2px",
            cursor: "pointer",
            fontFamily: "inherit",
          }}
          onClick={() => revertProposal()}
        >
          ×
        </button>
      </div>
      {issues.length ? (
        <div
          style={{
            marginTop: 10,
            padding: "8px 10px",
            borderRadius: 6,
            background: "#fff7e6",
            border: "1px solid #f0c27c",
            color: "#5c4400",
            fontSize: 12,
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: 4 }}>
            Low text contrast on {issues.length} element{issues.length > 1 ? "s" : ""}
            {regressions.length && regressions.length < issues.length
              ? ` (${regressions.length} caused by this change)`
              : ""}
            . Keep it if it is intended, or ask the model to fix it.
          </div>
          <ul style={{ margin: "0 0 6px 16px", padding: 0 }}>
            {issues.slice(0, MAX_ISSUES_SHOWN).map((i) => (
              <li key={i.key || i.selector}>
                {i.label}: <b>{i.ratio}:1</b> (min {i.min}:1){" "}
                <span
                  title={`text ${i.fg} on ${i.bg}`}
                  style={{
                    display: "inline-block",
                    padding: "0 6px",
                    borderRadius: 3,
                    background: i.bg,
                    color: i.fg,
                    border: "1px solid rgba(0,0,0,0.15)",
                    fontFamily: "monospace",
                  }}
                >
                  Aa
                </span>
                {!i.regressed ? <span style={{ opacity: 0.7 }}> · already low before</span> : null}
              </li>
            ))}
            {issues.length > MAX_ISSUES_SHOWN ? <li>… and {issues.length - MAX_ISSUES_SHOWN} more</li> : null}
          </ul>
          {onFixContrast ? (
            <button
              type="button"
              style={{ ...baseButton, fontSize: 12, padding: "4px 10px", background: "#fff" }}
              onClick={() => onFixContrast(issues)}
            >
              Ask the model to fix the contrast…
            </button>
          ) : null}
        </div>
      ) : null}
      <div
        style={{
          height: 4,
          background: "rgba(0,0,0,0.08)",
          borderRadius: 2,
          margin: "10px 0",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${ratio * 100}%`,
            background: ratio > 0.3 ? "#2d72d2" : "#cd4246",
            transition: "width 0.5s linear",
          }}
        />
      </div>
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        {onAdjust ? (
          <button type="button" style={baseButton} onClick={onAdjust}>
            Adjust…
          </button>
        ) : null}
        <button
          type="button"
          style={{ ...baseButton, color: "#cd4246", borderColor: "#cd4246" }}
          onClick={() => revertProposal()}
        >
          Revert
        </button>
        <button
          type="button"
          style={{
            ...baseButton,
            background: "#2d72d2",
            color: "#fff",
            borderColor: "#2d72d2",
          }}
          onClick={() => keepProposal()}
        >
          Keep (validate)
        </button>
      </div>
    </div>
  );
};

export default ReviewBanner;
