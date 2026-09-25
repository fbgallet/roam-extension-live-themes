import React, { useEffect } from "react";
import { Classes, Icon } from "@blueprintjs/core";
import { STARTER_THEMES, starterFontsUrl } from "../starterThemes";
import { loadPreviewFonts } from "../utils/cssPreview";

// Gallery of the ready-made themes: one card per starter, with a small
// preview drawn in its own colors and fonts (light half, dark half). Used by
// the "+" button of the themes bar (new theme) and inline in the dialog when
// the active theme is still empty. Cards are plain buttons (no menu item
// link), so nothing gets underlined by Roam's Bootstrap styles.

const Half = ({ palette, fonts, dark }) => (
  <div
    className={`lt-starter-half${dark ? " lt-starter-half--dark" : ""}`}
    style={{ background: palette.bg, color: palette.text, fontFamily: fonts.text }}
  >
    <span className="lt-starter-aa" style={{ fontFamily: fonts.title, color: palette.title }}>
      Aa
    </span>
    <span className="lt-starter-line">
      <span className="lt-starter-dot" style={{ background: palette.bullet }} />
      <span style={{ color: palette.link }}>Link</span>{" "}
      <span className="lt-starter-tag" style={{ color: palette.tag, background: palette["tag-bg"] }}>
        #tag
      </span>
    </span>
    <span className="lt-starter-accent" style={{ background: palette.accent }} />
  </div>
);

const StarterGallery = ({ onPick, blankLabel = null, dismissOnPick = false }) => {
  useEffect(() => {
    loadPreviewFonts(STARTER_THEMES.map(starterFontsUrl));
  }, []);
  const dismiss = dismissOnPick ? ` ${Classes.POPOVER_DISMISS}` : "";

  return (
    <div className="lt-starter-gallery">
      {blankLabel ? (
        <button type="button" className={`lt-starter-card lt-starter-card--blank${dismiss}`} onClick={() => onPick(null)}>
          <div className="lt-starter-preview lt-starter-preview--blank">
            <Icon icon="add" iconSize={18} />
          </div>
          <div className="lt-starter-name">{blankLabel}</div>
          <div className="lt-starter-desc">Start from Roam's own look and describe what you want.</div>
        </button>
      ) : null}
      {STARTER_THEMES.map((s) => (
        <button key={s.id} type="button" className={`lt-starter-card${dismiss}`} onClick={() => onPick(s)} title={s.description}>
          <div className="lt-starter-preview">
            <Half palette={s.light} fonts={s.fonts} />
            <Half palette={s.dark} fonts={s.fonts} dark />
          </div>
          <div className="lt-starter-name" style={{ fontFamily: s.fonts.title }}>
            {s.name}
          </div>
          <div className="lt-starter-desc">{s.description}</div>
        </button>
      ))}
    </div>
  );
};

export default StarterGallery;
