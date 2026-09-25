// Starter themes: complete, ready-made themes the user can create in one
// click from the themes bar, then customize like any other theme (presets,
// requests to the model, manual edits).
//
// They are hand-written CSS, not generated, so they are instant, free and
// predictable. All of them come from one template (buildStarterCss) and only
// differ by their palette, fonts and a few options. The template follows the
// conventions the model is asked to respect (prompts.js): "Fonts" first,
// colors as custom properties on :root overridden under .rm-dark-theme,
// short sections with stable names, a complete dark mode for Blueprint
// controls and popups. So a later request ("warmer accent", "bigger text")
// becomes a small delta, typically on the "Palette" or "Dark palette" section.

const VARS = [
  "bg", "bg-soft", "bg-sunken", "surface",
  "text", "text-muted", "text-faint", "border", "title",
  "accent", "link", "tag", "tag-bg", "bullet", "thread", "highlight", "hover", "selection",
  "sidebar-bg", "sidebar-text", "sidebar-hover", "sidebar-accent",
  "control", "control-hover", "control-active", "input",
  "level-1", "level-2", "level-3", "level-4", "level-5",
];

// Optional palette keys and the key they default to: a light sidebar reuses
// the page hover and accent, the nesting levels default to the bullet color.
const FALLBACK = {
  "sidebar-hover": "hover",
  "sidebar-accent": "accent",
  "level-1": "bullet",
  "level-2": "bullet",
  "level-3": "bullet",
  "level-4": "bullet",
  "level-5": "bullet",
};

const declareVars = (palette) =>
  VARS.map((k) => `  --theme-${k}: ${palette[k] ?? palette[FALLBACK[k]]};`).join("\n");

// Colored thread lines by nesting depth (cycling through the 5 level colors),
// echoed by a gradient line under the top bar.
const LEVELS_SECTION = `

/* === Levels === */
${[0, 1, 2, 3, 4]
  .map(
    (i) => `.rm-block-children.rm-level-${i + 1} > .rm-multibar,
.rm-block-children.rm-level-${i + 6} > .rm-multibar {
  border-color: var(--theme-level-${i + 1}) !important;
}`
  )
  .join("\n")}
.rm-topbar {
  border-bottom: 2px solid transparent !important;
  border-image: linear-gradient(90deg, var(--theme-level-1), var(--theme-level-2), var(--theme-level-3), var(--theme-level-4), var(--theme-level-5)) 1;
}
.rm-heading-level-2 > .rm-block-main .rm-block__input {
  color: var(--theme-link);
}`;

const googleFontsUrl = (families) =>
  `https://fonts.googleapis.com/css2?${families.map((f) => `family=${f}`).join("&")}&display=swap`;

const googleImport = (families) => (families.length ? `@import url('${googleFontsUrl(families)}');\n` : "");

/** Google Fonts stylesheet of a starter theme (for the gallery previews), or null. */
export const starterFontsUrl = (starter) =>
  starter?.fonts?.imports?.length ? googleFontsUrl(starter.fonts.imports) : null;

// How page links and tags are drawn: part of each theme's identity.
const LINK_STYLES = {
  plain: "",
  // Thin underline in a faded tint of the link color, stronger on hover.
  underline: `
body .rm-page-ref--link {
  text-decoration: underline;
  text-decoration-thickness: 1px;
  text-underline-offset: 3px;
  text-decoration-color: color-mix(in srgb, var(--theme-link) 35%, transparent);
}
body .rm-page-ref--link:hover {
  text-decoration-color: var(--theme-accent);
}`,
  // Medium weight, no underline, a soft tinted background on hover.
  tint: `
body .rm-page-ref--link {
  font-weight: 500;
  text-decoration: none;
  border-radius: 3px;
}
body .rm-page-ref--link:hover {
  background-color: var(--theme-hover);
  text-decoration: none;
}`,
  // Dotted underline, solid on hover.
  dotted: `
body .rm-page-ref--link {
  text-decoration: none;
  border-bottom: 1px dotted color-mix(in srgb, var(--theme-link) 60%, transparent);
}
body .rm-page-ref--link:hover {
  border-bottom-style: solid;
}`,
};

const TAG_STYLES = {
  plain: "",
  italic: `
  font-style: italic;`,
  // Small monospace chip.
  chip: `
  font-family: var(--theme-font-code);
  font-size: 0.8em;
  background-color: var(--theme-tag-bg);
  padding: 1px 5px;
  border-radius: 4px;`,
  // Rounded pill.
  pill: `
  background-color: var(--theme-tag-bg);
  padding: 0 6px;
  border-radius: 10px;
  font-size: 0.9em;`,
};

/** Builds the full stylesheet of a starter theme. */
export function buildStarterCss({ fonts, light, dark, options = {} }) {
  const {
    textSize = null,
    lineHeight = "1.55",
    titleWeight = 600,
    titleSpacing = "normal",
    linkStyle = "plain",
    tagStyle = "plain",
    levels = false,
  } = options;
  const sized = textSize ? `\n  font-size: ${textSize};` : "";
  return `/* === Fonts === */
${googleImport(fonts.imports || [])}:root {
  --theme-font-text: ${fonts.text};
  --theme-font-title: ${fonts.title};
  --theme-font-code: ${fonts.code};
}

/* === Palette === */
:root {
${declareVars(light)}
  --background-color: var(--theme-bg-sunken);
  --primary-color: ${light.accent};
  --inline-highlight-color: ${light.highlight};
}

/* === Dark palette === */
:root.rm-dark-theme,
:root .rm-dark-theme {
${declareVars(dark)}
  --primary-color: ${dark.accent};
  --inline-highlight-color: ${dark.highlight};
}

/* === Base === */
.roam-body,
.roam-body .roam-app,
.roam-body .roam-main,
.roam-article,
.rm-article-wrapper {
  background-color: var(--theme-bg) !important;
  color: var(--theme-text);
}
.roam-block,
.rm-block-text,
textarea.rm-block-input {
  font-family: var(--theme-font-text);
  color: var(--theme-text);
  line-height: ${lineHeight};${sized}
}
textarea.rm-block-input {
  background-color: transparent !important;
  caret-color: var(--theme-accent);
}
.rm-topbar {
  background-color: var(--theme-bg) !important;
  box-shadow: none !important;
  border-bottom: 1px solid var(--theme-border);
}
.rm-topbar .bp3-button {
  color: var(--theme-text-muted) !important;
}
.rm-topbar .bp3-icon,
.bp3-button:not([class*="bp3-intent-"]):not(:disabled):not(.bp3-disabled) .bp3-icon,
.bp3-button:not([class*="bp3-intent-"]):not(:disabled):not(.bp3-disabled) .bp3-icon-standard,
.bp3-button:not([class*="bp3-intent-"]):not(:disabled):not(.bp3-disabled) .bp3-icon-large,
.bp3-button:not([class*="bp3-intent-"]):not(:disabled):not(.bp3-disabled)[class*="bp3-icon-"]::before,
.bp3-menu-item:not([class*="bp3-intent-"]):not(.bp3-disabled) > .bp3-icon,
.bp3-menu-item:not([class*="bp3-intent-"]):not(.bp3-disabled)::before,
.bp3-callout:not([class*="bp3-intent-"])[class*="bp3-icon-"]::before,
.bp3-menu.bp3-text-small button .bp3-icon,
.bp3-menu.bp3-text-small button .bp3-icon-standard,
.bp3-input-group .bp3-icon,
.bp3-input-group .bp3-icon-standard,
.bp3-html-select .bp3-icon,
.bp3-dialog-header .bp3-icon,
.bp3-dialog-header .bp3-icon-large,
.rm-caret {
  color: var(--theme-text-muted) !important;
}
.rm-find-or-create-wrapper .bp3-input {
  background-color: var(--theme-bg-sunken);
  color: var(--theme-text);
  box-shadow: none;
}
.block-highlight-blue {
  background-color: var(--theme-selection) !important;
}

/* === Titles & headings === */
.rm-title-display,
.rm-title-textarea {
  font-family: var(--theme-font-title);
  font-weight: ${titleWeight};
  letter-spacing: ${titleSpacing};
  color: var(--theme-title) !important;
}
.roam-log-page .rm-title-display {
  color: var(--theme-text-muted) !important;
}
.rm-heading-level-1 > .rm-block-main .rm-block__input,
.rm-heading-level-2 > .rm-block-main .rm-block__input,
.rm-heading-level-3 > .rm-block-main .rm-block__input {
  font-family: var(--theme-font-title) !important;
  font-weight: ${titleWeight};
  color: var(--theme-title);
  letter-spacing: ${titleSpacing};
}
.rm-heading-level-3 > .rm-block-main .rm-block__input {
  color: var(--theme-text-muted);
}
.rm-zoom-item {
  color: var(--theme-text-muted) !important;
}

/* === Sidebars === */
.roam-sidebar-container,
.roam-sidebar-content {
  background-color: var(--theme-sidebar-bg) !important;
  color: var(--theme-sidebar-text);
}
.roam-sidebar-container {
  border-right: 1px solid var(--theme-border);
}
.roam-sidebar-content .log-button,
.roam-sidebar-content .log-button .bp3-icon,
.roam-body .roam-app .roam-sidebar-container .roam-sidebar-content .icon,
.roam-sidebar-content .rm-db-title,
.starred-pages .page {
  color: var(--theme-sidebar-text) !important;
}
.roam-sidebar-content .log-button:hover,
.starred-pages .page:hover {
  background-color: var(--theme-sidebar-hover) !important;
  color: var(--theme-sidebar-accent) !important;
}
.roam-sidebar-content .log-button:hover .bp3-icon,
.roam-body .roam-app .roam-sidebar-container .roam-sidebar-content .log-button:hover .icon {
  color: var(--theme-sidebar-accent) !important;
}
.roam-body .roam-app .roam-sidebar-container .roam-sidebar-content .top-row:hover,
#roam-sidebar-logo:hover {
  background-color: var(--theme-sidebar-hover) !important;
}
.roam-body .roam-app .roam-sidebar-container .rm-graph-dropdown .setting {
  background-color: var(--theme-bg-sunken);
}
.roam-body .roam-app .roam-sidebar-container .rm-graph-dropdown .setting:hover {
  background-color: var(--theme-control-active);
}
.roam-body .roam-app .roam-sidebar-container .rm-graph-dropdown .menu-item {
  color: var(--theme-text) !important;
}
.starred-pages-wrapper {
  border-top-color: var(--theme-border);
}
#right-sidebar {
  background-color: var(--theme-bg-soft) !important;
  border-left: 1px solid var(--theme-border);
}

/* === Scrollbars === */
::-webkit-scrollbar,
::-webkit-scrollbar:hover {
  width: 8px;
  background: transparent;
}
::-webkit-scrollbar:horizontal {
  height: 6px;
  max-height: 6px;
}
::-webkit-scrollbar-track,
::-webkit-scrollbar-corner {
  background: transparent;
}
::-webkit-scrollbar-thumb:vertical,
::-webkit-scrollbar-thumb:horizontal {
  background: color-mix(in srgb, var(--theme-accent) 35%, var(--theme-border));
  background-clip: padding-box;
  border: 2px solid transparent;
  border-radius: 8px;
}
::-webkit-scrollbar-thumb:horizontal {
  border-width: 1.5px;
}
::-webkit-scrollbar-thumb:vertical:hover,
::-webkit-scrollbar-thumb:horizontal:hover,
::-webkit-scrollbar-thumb:vertical:active,
::-webkit-scrollbar-thumb:horizontal:active {
  background: color-mix(in srgb, var(--theme-accent) 70%, var(--theme-border));
  background-clip: padding-box;
  border-width: 1px;
}
.roam-sidebar-container ::-webkit-scrollbar-thumb:vertical,
.roam-sidebar-container ::-webkit-scrollbar-thumb:horizontal {
  background: color-mix(in srgb, var(--theme-sidebar-accent) 40%, transparent);
  background-clip: padding-box;
}
.roam-sidebar-container ::-webkit-scrollbar-thumb:vertical:hover,
.roam-sidebar-container ::-webkit-scrollbar-thumb:horizontal:hover {
  background: color-mix(in srgb, var(--theme-sidebar-accent) 75%, transparent);
  background-clip: padding-box;
}
@supports not selector(::-webkit-scrollbar) {
  * {
    scrollbar-width: thin;
    scrollbar-color: color-mix(in srgb, var(--theme-accent) 35%, var(--theme-border)) transparent;
  }
}

/* === Horizontal scrollers === */
body .kanban-board .kanban-column-container,
.roam-table,
.rm-data-table__table,
#right-sidebar .rm-full-width {
  overflow-x: auto;
}
@supports selector(::-webkit-scrollbar) {
  .rm-block__self--horizontal-scroller,
  .rm-block__self--horizontal-scroller:hover {
    scrollbar-color: auto;
    scrollbar-width: auto;
  }
}
.rm-block__self--horizontal-scroller::-webkit-scrollbar-thumb:horizontal {
  background: transparent;
}
.rm-block__self--horizontal-scroller:hover::-webkit-scrollbar-thumb:horizontal {
  background: color-mix(in srgb, var(--theme-accent) 35%, var(--theme-border));
  background-clip: padding-box;
}
.rm-block__self--horizontal-scroller:hover::-webkit-scrollbar-thumb:horizontal:hover {
  background: color-mix(in srgb, var(--theme-accent) 70%, var(--theme-border));
  background-clip: padding-box;
}

/* === Links & tags === */
body .rm-page-ref--link {
  color: var(--theme-link);
}
body .rm-page-ref--link:hover {
  color: var(--theme-accent);
}${LINK_STYLES[linkStyle] || ""}
body .rm-page-ref__brackets {
  color: var(--theme-text-faint);
}
body .rm-page-ref--tag {
  color: var(--theme-tag);${TAG_STYLES[tagStyle] || ""}
}
body .rm-page-ref--tag:hover {
  color: var(--theme-accent);
}
body .rm-alias {
  color: var(--theme-link);
}
body .rm-block-ref {
  border-bottom-color: var(--theme-border);
}
body .rm-block-ref:hover {
  background-color: var(--theme-hover);
}
.rm-attr-ref {
  color: var(--theme-text-muted) !important;
  font-weight: 600;
}

/* === Blocks === */
body .rm-bullet__inner {
  background-color: var(--theme-bullet);
}
body .rm-multibar {
  border-color: var(--theme-thread) !important;
}
body .rm-bq {
  background-color: var(--theme-bg-sunken);
  border-left-color: var(--theme-accent);
  color: var(--theme-text);
}
body .roam-block code,
body .rm-block-text code {
  font-family: var(--theme-font-code);
  font-size: 0.88em;
  background-color: var(--theme-bg-sunken);
  color: var(--theme-text);
  border: 1px solid var(--theme-border);
  border-radius: 4px;
}
.rm-inline-references {
  background-color: var(--theme-bg-soft) !important;
}
.rm-embed-container {
  background-color: var(--theme-bg-soft);
  border-radius: 6px;
}
.rm-inline-img {
  border-radius: 6px;
}

/* === Code blocks === */
body .rm-code-block {
  background-color: var(--theme-bg-sunken);
  border: 1px solid var(--theme-border);
  border-radius: 6px;
}
.rm-code-block .cm-editor,
.rm-code-block .cm-gutters {
  background-color: transparent !important;
}
.rm-code-block .cm-gutters {
  border-right: none !important;
  color: var(--theme-text-faint) !important;
}
.rm-code-block .cm-content {
  font-family: var(--theme-font-code);
  color: var(--theme-text);
  caret-color: var(--theme-text);
}
.rm-code-block .cm-cursor {
  border-left-color: var(--theme-text) !important;
}

/* === Tables === */
body .rm-table table {
  background-color: var(--theme-bg);
}
body .rm-table th {
  background-color: var(--theme-bg-sunken);
  border-color: var(--theme-border);
  color: var(--theme-title);
}
body .rm-table td {
  border-color: var(--theme-border);
  color: var(--theme-text);
}
.rm-data-table__table th,
.rm-data-table__table td,
.rm-data-table__table tr {
  border-color: var(--theme-border) !important;
  color: var(--theme-text);
}
.rm-data-table__table th {
  background-color: var(--theme-bg-sunken);
}

/* === Kanban === */
body .kanban-board {
  background-color: var(--theme-bg-soft);
  border: 1px solid var(--theme-border);
  border-radius: 10px;
  padding: 10px 6px;
}
body .kanban-column {
  flex: 1 0 220px;
  background-color: var(--theme-bg-sunken);
  border-radius: 10px;
  margin: 0 5px;
  padding: 8px 8px 4px;
}
body .kanban-title {
  display: flex;
  align-items: center;
  gap: 7px;
  min-height: 0;
  max-height: none;
  margin-bottom: 2px;
  padding: 2px 4px 6px;
  border-bottom: none;
  text-align: left;
  font-family: var(--theme-font-title);
  font-size: 0.78em;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--theme-text-muted);
  white-space: nowrap;
  text-overflow: ellipsis;
}
body .kanban-title::before {
  content: "";
  flex: 0 0 auto;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: var(--theme-level-1);
}
body .kanban-column:nth-child(5n+2) .kanban-title::before { background-color: var(--theme-level-2); }
body .kanban-column:nth-child(5n+3) .kanban-title::before { background-color: var(--theme-level-3); }
body .kanban-column:nth-child(5n+4) .kanban-title::before { background-color: var(--theme-level-4); }
body .kanban-column:nth-child(5n+5) .kanban-title::before { background-color: var(--theme-level-5); }

/* === Kanban cards === */
body .kanban-card {
  margin: 0;
  padding: 8px 10px;
  background-color: var(--theme-surface);
  color: var(--theme-text);
  border: 1px solid var(--theme-border);
  border-radius: 8px;
  box-shadow: 0 1px 2px rgba(16, 22, 26, 0.06);
  transition: box-shadow 120ms ease, transform 120ms ease;
}
body .kanban-card:hover {
  box-shadow: 0 4px 12px rgba(16, 22, 26, 0.12);
  transform: translateY(-1px);
}
.rm-dark-theme .kanban-card {
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.35);
}
.rm-dark-theme .kanban-card:hover {
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.45);
}
body .kanban-card textarea {
  background-color: transparent;
  box-shadow: none;
}
body .kanban-column .rm-dnd-separator {
  height: 6px;
}
body .kanban-column .rm-dnd-separator .rm-dnd-drop-area .rm-dnd-drop-bar {
  height: 3px;
  border-radius: 3px;
  background-color: var(--theme-accent);
}

/* === Streak === */
.rm-streak__title {
  color: var(--theme-text);
}
.rm-streak__weekday,
.rm-streak__month {
  color: var(--theme-text-faint);
}
.rm-streak .rm-streak__day {
  border-radius: 2px;
}
.rm-streak .rm-streak__day:hover {
  box-shadow: 0 0 0 1px var(--theme-text-muted);
}
.rm-streak .rm-streak__day-0 { background: var(--theme-bg-sunken); }
.rm-streak .rm-streak__day-1 { background: color-mix(in srgb, var(--theme-accent) 30%, var(--theme-bg-sunken)); }
.rm-streak .rm-streak__day-2 { background: color-mix(in srgb, var(--theme-accent) 55%, var(--theme-bg-sunken)); }
.rm-streak .rm-streak__day-3 { background: color-mix(in srgb, var(--theme-accent) 80%, var(--theme-bg-sunken)); }
.rm-streak .rm-streak__day-4 { background: var(--theme-accent); }

/* === Diagram === */
.rm-diagram[style*="--diagram-background-color: white"] {
  --diagram-background-color: var(--theme-bg) !important;
}
.rm-diagram[style*="--block-fill-color: white"] {
  --block-fill-color: var(--theme-surface) !important;
}
.rm-diagram[style*="--block-text-color: black"] {
  --block-text-color: var(--theme-text) !important;
}
.rm-diagram[style*="--block-border-color: #A7B6C2"] {
  --block-border-color: var(--theme-text-faint) !important;
}
.rm-diagram[style*="-edge-stroke-color: #A7B6C2"] {
  --edge-stroke-color: var(--theme-text-faint) !important;
  --global-edge-stroke-color: var(--theme-text-faint) !important;
}
.rm-diagram marker[style*="stroke: rgb(167, 182, 194)"] {
  stroke: var(--theme-text-faint) !important;
  fill: var(--theme-text-faint) !important;
}
.rm-diagram[style*="--group-border-color: #A7B6C2"] {
  --group-border-color: var(--theme-text-faint) !important;
}
.rm-diagram[style*="--group-title-text-color: black"] {
  --group-title-text-color: var(--theme-text) !important;
}
.rm-diagram[style*="--group-title-fill-color: #A7B6C23F"] {
  --group-title-fill-color: var(--theme-bg-sunken) !important;
}
.rm-diagram[style*="--group-area-fill-color: rgba(225, 232, 237, 0.2)"] {
  --group-area-fill-color: var(--theme-hover) !important;
}
.rm-diagram .react-flow__node-block:hover,
.rm-diagram .react-flow__node-block.selected:after,
.rm-diagram .react-flow__node-group.selected:after {
  box-shadow: 0 1px 10px var(--theme-selection);
}
.rm-diagram .react-flow__background circle {
  fill: var(--theme-text-faint);
}
.rm-diagram-xparser {
  border-color: var(--theme-border);
}

/* === Diagram panels === */
.rm-diagram .rm-diagram-properties-panel,
.rm-diagram-title-panel,
.rm-diagram .react-flow__node-toolbar,
.rm-diagram-pane-context-menu,
.rm-diagram .react-flow__minimap {
  background-color: var(--theme-surface) !important;
  color: var(--theme-text);
  border-color: var(--theme-border);
  box-shadow: 0 0 0 1px var(--theme-border), 0 2px 8px rgba(0, 0, 0, 0.1) !important;
}
.rm-diagram .rm-diagram-properties-panel [class*="bp3-icon-"],
.rm-diagram .react-flow__controls-button [class*="bp3-icon-"],
.rm-diagram .rm-diagram-helper-panel .rm-diagram-properties-panel__content {
  color: var(--theme-text-muted) !important;
}
.rm-diagram-title {
  background-color: transparent;
  color: var(--theme-text);
}
.rm-diagram-title--empty,
.rm-diagram-title::placeholder {
  color: var(--theme-text-faint) !important;
}
.rm-diagram .react-flow__controls {
  box-shadow: 0 0 0 1px var(--theme-border), 0 2px 8px rgba(0, 0, 0, 0.1);
}
.rm-diagram .react-flow__controls-button {
  background-color: var(--theme-surface);
  border-bottom-color: var(--theme-border);
  color: var(--theme-text-muted);
}
.rm-diagram .react-flow__controls-button svg {
  fill: currentColor;
}
.rm-diagram .react-flow__controls-button:hover {
  background-color: var(--theme-control-hover);
  color: var(--theme-text);
}
.rm-diagram .react-flow__minimap-node {
  fill: var(--theme-text-faint);
}
.rm-diagram .react-flow__minimap-mask {
  fill: color-mix(in srgb, var(--theme-text) 12%, transparent);
}
.rm-diagram .rm-diagram-node__resize-control {
  background-color: var(--theme-surface);
  border-color: var(--theme-border);
}

/* === References & queries === */
.rm-reference-wrapper > .rm-reference-main {
  border-top: 1px solid var(--theme-border);
}
.rm-ref-page-view-title .rm-page__title {
  font-family: var(--theme-font-title);
  color: var(--theme-title) !important;
}
body .rm-query {
  border-color: var(--theme-border);
  border-radius: 6px;
}
body .rm-autocomplete__results {
  background-color: var(--theme-surface);
  color: var(--theme-text);
}

/* === Dark mode: buttons === */
.rm-dark-theme .bp3-button:not([class*="bp3-intent-"]) {
  background-color: var(--theme-control);
  background-image: none;
  box-shadow: 0 0 0 1px var(--theme-border);
  color: var(--theme-text);
}
.rm-dark-theme .bp3-button:not([class*="bp3-intent-"]):hover {
  background-color: var(--theme-control-hover);
}
.rm-dark-theme .bp3-button:not([class*="bp3-intent-"]):active,
.rm-dark-theme .bp3-button:not([class*="bp3-intent-"]).bp3-active {
  background-color: var(--theme-control-active);
}
.rm-dark-theme .bp3-button:not([class*="bp3-intent-"]):disabled,
.rm-dark-theme .bp3-button:not([class*="bp3-intent-"]).bp3-disabled {
  background-color: var(--theme-control);
  color: var(--theme-text-faint);
}
.rm-dark-theme .bp3-button.bp3-minimal:not([class*="bp3-intent-"]) {
  background-color: transparent;
  box-shadow: none;
}
.rm-dark-theme .bp3-button.bp3-minimal:not([class*="bp3-intent-"]):hover {
  background-color: var(--theme-hover);
}
.rm-dark-theme .bp3-button.bp3-minimal:not([class*="bp3-intent-"]):active,
.rm-dark-theme .bp3-button.bp3-minimal:not([class*="bp3-intent-"]).bp3-active {
  background-color: var(--theme-control-active);
}

/* === Dark mode: inputs === */
.rm-dark-theme .bp3-html-select select,
.rm-dark-theme .bp3-select select {
  background-color: var(--theme-control);
  background-image: none;
  box-shadow: 0 0 0 1px var(--theme-border);
  color: var(--theme-text);
}
.rm-dark-theme .bp3-html-select select:hover,
.rm-dark-theme .bp3-select select:hover {
  background-color: var(--theme-control-hover);
}
.rm-dark-theme .bp3-html-select option,
.rm-dark-theme .bp3-select option {
  background-color: var(--theme-surface);
  color: var(--theme-text);
}
.rm-dark-theme .bp3-input {
  background-color: var(--theme-input);
  box-shadow: inset 0 0 0 1px var(--theme-border);
  color: var(--theme-text);
}
.rm-dark-theme .bp3-input::placeholder {
  color: var(--theme-text-faint);
}
.rm-dark-theme .bp3-input:focus {
  box-shadow: 0 0 0 1px var(--theme-accent), 0 0 0 3px var(--theme-selection);
}
.rm-dark-theme .bp3-control {
  color: var(--theme-text);
}
.rm-dark-theme .bp3-control input:not(:checked) ~ .bp3-control-indicator {
  background-color: var(--theme-control);
  background-image: none;
  box-shadow: 0 0 0 1px var(--theme-border);
}
.rm-dark-theme .bp3-control.bp3-switch .bp3-control-indicator::before {
  background-color: var(--theme-text-muted);
}
.rm-dark-theme .bp3-tab {
  color: var(--theme-text);
}
.rm-dark-theme .bp3-tab[aria-selected="true"],
.rm-dark-theme .bp3-tab:not([aria-disabled="true"]):hover {
  color: var(--theme-accent);
}
.rm-dark-theme .bp3-tab-indicator-wrapper .bp3-tab-indicator {
  background-color: var(--theme-accent);
}
.rm-dark-theme .bp3-tag:not([class*="bp3-intent-"]) {
  background-color: var(--theme-control-active);
  color: var(--theme-text);
}

/* === Popups === */
.bp3-popover:not(.bp3-tooltip) .bp3-popover-content,
.bp3-menu,
.bp3-card {
  background-color: var(--theme-surface);
  color: var(--theme-text);
}
.bp3-popover:not(.bp3-tooltip) .bp3-popover-arrow-fill {
  fill: var(--theme-surface);
}
.bp3-menu-item {
  color: var(--theme-text);
}
.bp3-menu-item:hover {
  background-color: var(--theme-hover);
}
.bp3-menu-item.bp3-active,
.bp3-menu-item:active {
  background-color: var(--theme-control-active);
  color: var(--theme-text);
}
.bp3-menu-item-label,
.bp3-text-muted {
  color: var(--theme-text-muted);
}
.bp3-menu-divider,
.bp3-menu-header {
  border-top-color: var(--theme-border);
}
.bp3-dialog {
  background-color: var(--theme-bg-soft);
  color: var(--theme-text);
}
.bp3-dialog-header {
  background-color: var(--theme-surface);
  box-shadow: 0 1px 0 var(--theme-border);
  color: var(--theme-text);
}
.bp3-dialog-header .bp3-heading,
.bp3-heading {
  color: var(--theme-text);
}

/* === Dark mode: popups === */
.rm-dark-theme .bp3-toast:not([class*="bp3-intent-"]) {
  background-color: var(--theme-control);
  color: var(--theme-text);
}
.rm-dark-theme .bp3-toast:not([class*="bp3-intent-"]) > .bp3-icon,
.rm-dark-theme .bp3-callout.bp3-callout-icon > .bp3-icon:first-child {
  color: var(--theme-text-muted);
}
.rm-dark-theme .bp3-key {
  background-color: var(--theme-control);
  box-shadow: 0 0 0 1px var(--theme-border);
  color: var(--theme-text-muted);
}

/* === Search footer === */
.rm-find-or-create-footer,
.rm-command-palette__footer,
.rm-cross-graph-search .rm-cross-graph-search-footer {
  background-color: var(--theme-bg-soft) !important;
  border-top-color: var(--theme-border) !important;
  color: var(--theme-text-muted);
}
.rm-find-or-create-footer__title,
.rm-find-or-create-footer .rm-find-or-create-footer__action,
.rm-find-or-create-footer .rm-find-or-create-footer__action .bp3-icon {
  color: var(--theme-text-muted) !important;
}
.rm-find-or-create-footer__actions > .rm-find-or-create-footer__action.bp3-button.bp3-minimal:hover {
  background-color: var(--theme-hover) !important;
  color: var(--theme-text) !important;
}
.rm-find-or-create-footer__actions > .rm-find-or-create-footer__action--active.bp3-button.bp3-minimal,
.rm-find-or-create-footer__actions > .rm-find-or-create-footer__action--active.bp3-button.bp3-minimal:hover {
  background-color: var(--theme-control-active) !important;
  color: var(--theme-text) !important;
}
.rm-find-or-create-footer__action--primary .rm-find-or-create-footer__action-desc {
  color: var(--theme-text);
}
.rm-find-or-create-footer__action-hotkey-icon,
.rm-command-palette__shortcut,
.rm-cross-graph-search-footer__action-items__action-item__hotkey__icon {
  background-color: var(--theme-control-active) !important;
  color: var(--theme-text) !important;
}
.rm-find-or-create-footer__action--active .rm-find-or-create-footer__action-hotkey-icon {
  background-color: transparent !important;
}
.rm-find-or-create-footer__actions > .bp3-divider,
.rm-cross-graph-search-footer__action-items > .bp3-divider {
  border-color: var(--theme-border);
}

/* === Search === */
.rm-find-or-create-modal,
.rm-find-or-create-popover,
.rm-find-or-create__menu,
.rm-command-palette,
.rm-command-palette__menu {
  background-color: var(--theme-surface) !important;
  color: var(--theme-text);
}
.rm-find-or-create-popover {
  border: 1px solid var(--theme-border);
  border-radius: 8px;
}
.rm-find-or-create-modal .rm-find-or-create-modal-header,
.rm-find-or-create-modal .rm-find-or-create-modal-preview {
  border-color: var(--theme-border) !important;
}
.rm-find-or-create-modal-body__list > li.bp3-menu-item.bp3-active,
.rm-find-or-create__menu > li.bp3-menu-item.bp3-active,
.rm-command-palette__menu .rm-menu-item--active {
  background-color: var(--theme-hover) !important;
  box-shadow: inset 3px 0 0 var(--theme-accent);
  color: var(--theme-text) !important;
}
.rm-find-or-create-row__title,
.rm-find-or-create-row__snippet {
  color: var(--theme-text);
}
.rm-find-or-create-row__ref-count {
  margin-left: 4px;
  padding: 0 5px;
  border-radius: 8px;
  background-color: var(--theme-tag-bg);
  font-size: 0.72em;
  vertical-align: 0.2em;
}
.rm-find-or-create-body__group-header {
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

/* === Dark mode: pickers === */
.rm-dark-theme .bp3-datepicker {
  background-color: var(--theme-surface);
  color: var(--theme-text);
}
.rm-dark-theme .bp3-datepicker .DayPicker-Day:hover,
.rm-dark-theme .bp3-datepicker .DayPicker-Day:focus {
  background-color: var(--theme-control-hover);
  color: var(--theme-text);
}
.rm-dark-theme .bp3-datepicker .DayPicker-Day.DayPicker-Day--selected,
.rm-dark-theme .rm-jump-date-picker .DayPicker-Day.DayPicker-Day--selected {
  background-color: var(--theme-accent);
  color: var(--theme-bg);
}
.rm-dark-theme .bp3-datepicker .DayPicker-Day.DayPicker-Day--outside,
.rm-dark-theme .bp3-datepicker .DayPicker-WeekNumber,
.rm-dark-theme .rm-jump-date-picker .DayPicker-Day.DayPicker-Day--dateHasNoPage {
  color: var(--theme-text-faint);
}
.rm-dark-theme .rm-jump-date-picker .DayPicker-Day.DayPicker-Day--today {
  color: var(--theme-accent);
}
.rm-dark-theme .bp3-timepicker .bp3-timepicker-input-row {
  background-color: var(--theme-input);
  box-shadow: inset 0 0 0 1px var(--theme-border);
}
.rm-dark-theme .bp3-timepicker .bp3-timepicker-input {
  color: var(--theme-text);
}

/* === Roam views === */
body .rm-reference-item {
  background-color: var(--theme-bg-soft);
}
body .rm-nested-matches {
  background-color: var(--theme-bg-sunken);
}
body .rm-paren {
  background-color: var(--theme-bg-soft);
  border-color: var(--theme-border);
}
body .rm-paren--closed:hover {
  background-color: var(--theme-control-active);
  color: var(--theme-text);
}
body .rm-embed--page,
body .rm-embed-path {
  background-color: var(--theme-bg-soft);
}
body .roam-article .rm-level-horizontal-outline__child {
  background-color: var(--theme-bg);
}
body .block-highlight-grey,
body .rm-pages-row-highlight {
  background-color: var(--theme-hover);
}

/* === Pages, graph & help === */
.rm-all-pages .table .rm-pages-row {
  border-bottom-color: var(--theme-border);
  color: var(--theme-text-muted);
}
.rm-all-pages .table .rm-pages-row.rm-pages-row-header {
  background-color: var(--theme-bg-sunken);
}
.rm-pages-toolbar .toolbar-search-group .search-input {
  background-color: var(--theme-bg-sunken);
  color: var(--theme-text);
}
.rm-pages-title-text {
  color: var(--theme-text) !important;
}
.rm-all-pages .table .rm-pages-row .rm-pages-title-col {
  color: var(--theme-text-muted);
}
.rm-graph-view-control-panel {
  background-color: var(--theme-surface) !important;
  color: var(--theme-text);
}
.rm-graph-view-control-panel--open {
  box-shadow: 0 0 0 1px var(--theme-border), 0 4px 12px rgba(0, 0, 0, 0.12) !important;
}
.rm-help-search__icon-container,
.rm-help-search__input {
  background-color: var(--theme-input) !important;
  border-color: var(--theme-border) !important;
  color: var(--theme-text) !important;
}
.rm-help-search__icon-container [class*="bp3-icon-"] {
  color: var(--theme-text-muted);
}
.rm-table .rm-table__col-menu {
  background-color: var(--theme-surface);
  border-color: var(--theme-border);
  color: var(--theme-text);
}
.rm-table .rm-table__col-menu-item:hover {
  background-color: var(--theme-hover);
}
.rm-table__col-menu-divider {
  background-color: var(--theme-border) !important;
}
.rm-table .rm-table__col-pill,
.rm-table .rm-table__row-pill {
  border-color: var(--theme-border);
}

/* === Muted text === */
.rm-find-or-create-row__breadcrumb,
.rm-find-or-create-row__ref-count,
.rm-find-or-create-row__icon.bp3-icon,
.rm-find-or-create-body__group-header,
.rm-find-or-create-body__empty,
.rm-find-or-create-modal .rm-find-or-create-modal-header__left-icon,
.rm-find-or-create-modal .rm-find-or-create-modal-preview__title,
.rm-search-query__page-row-icon.bp3-icon,
.rm-autocomplete__ref-count,
.rm-autocomplete__preview-content .rm-autocomplete__preview-title,
.rm-block__self .rm-block__ref-count.rm-active,
.rm-block--comment-card .rm-element--time__edit-time,
.rm-level-tabs__children .rm-gray-tab:not(:hover),
.rm-query-builder-popover .bp3-menu-header,
.rm-table__ref-count:hover,
.rm-table__add-row-btn:hover,
.rm-table__add-col-btn:hover,
.rm-all-pages .table .rm-pages-row.rm-pages-row-header,
.sorted-header-text,
.sorting-button-group .sort-button.focused,
.rm-pages-toolbar .toolbar-search-group .search-icon.focused,
.rm-graph-icons,
.rm-grey-text {
  color: var(--theme-text-muted) !important;
}
.rm-find-or-create-row__breadcrumb .rm-zoom-chevron,
.rm-find-or-create-row__breadcrumb-segment--ellipsis,
.rm-find-or-create-modal .rm-find-or-create-modal-preview__placeholder,
.rm-autocomplete__preview-placeholder,
.rm-command-palette__scroll-container .rm-command-palette__menu--empty,
.rm-jump-date-picker .DayPicker-Day.DayPicker-Day--dateHasNoPage,
.rm-table__ref-count,
.rm-table__empty-filter-cell,
.rm-pages-toolbar .toolbar-search-group .search-icon,
.rm-pages-title-text.title-children-text,
.rm-inline-references .rm-filtered-out,
.rm-nested-matches .rm-filtered-out,
.rm-paren__paren,
.rm-title-untitled,
.rm-article-wrapper .roam-log-container .roam-log-preview,
.rm-article-wrapper .roam-log-container .roam-log-preview h1 {
  color: var(--theme-text-faint) !important;
}
.rm-find-or-create-row__snippet,
.rm-zoom-path .rm-zoom-item .rm-zoom-item-content.rm-zoom-collapsed-item,
.rm-block--comment-card .rm-element--user__display-name,
.rm-paren__paren:hover,
.roam-body .roam-app .roam-sidebar-container .rm-graph-dropdown a {
  color: var(--theme-text) !important;
}
.rm-input::placeholder,
.rm-title-textarea::placeholder {
  color: var(--theme-text-faint) !important;
}
.roam-sidebar-container .rm-db-title-container .rm-db-title,
.roam-body .roam-app .roam-sidebar-container .roam-sidebar-content .rm-db-title .expand-icon,
.roam-body .roam-app .roam-sidebar-container .roam-sidebar-content .starred-pages-wrapper,
.roam-body .roam-app .roam-sidebar-container .rm-graph-dropdown .menu-title {
  color: var(--theme-sidebar-text) !important;
}

/* === Autocomplete === */
body .rm-autocomplete__preview {
  background-color: var(--theme-surface);
  border-color: var(--theme-border);
  color: var(--theme-text);
}
.rm-autocomplete__results [style*="background-color: rgb(213, 218, 223)"] {
  background-color: var(--theme-control-active) !important;
  color: var(--theme-text);
}
.rm-autocomplete__results [style*="color: rgb(129, 145, 157)"] {
  color: var(--theme-text-muted) !important;
}
.rm-autocomplete-footer {
  background-color: var(--theme-bg-soft) !important;
  border-top-color: var(--theme-border) !important;
  color: var(--theme-text-muted);
}
.rm-autocomplete-footer__action--active {
  background-color: var(--theme-control-active) !important;
  color: var(--theme-text);
}
.rm-autocomplete-footer__action--preview:hover {
  background-color: var(--theme-hover) !important;
}
.rm-autocomplete-footer__action__hotkey__icon {
  background-color: var(--theme-control-active) !important;
  color: var(--theme-text);
}
.rm-autocomplete-footer__action--active .rm-autocomplete-footer__action__hotkey__icon {
  background-color: transparent !important;
}

/* === Dark mode: Roam views === */
.rm-dark-theme .bp3-menu.bp3-text-small button[style*="background-color"] {
  background-color: var(--theme-control) !important;
  color: var(--theme-text) !important;
}
.rm-dark-theme .bp3-menu.bp3-text-small button[style*="background-color"]:hover {
  background-color: var(--theme-control-hover) !important;
}
.rm-dark-theme .rm-zoom.zoom-path-view .rm-zoom-mask {
  background-color: unset;
}
.rm-dark-theme .rm-sidebar-search > div {
  background-color: var(--theme-surface) !important;
}
.rm-dark-theme .rm-search-filter-chip {
  background-color: var(--theme-control);
  color: var(--theme-text);
}
.rm-dark-theme .rm-search-filter-chip:hover,
.rm-dark-theme .rm-search-filter-chip--add:hover {
  background-color: var(--theme-control-hover);
}
.rm-dark-theme .rm-search-filter-chip--add {
  background-color: transparent;
  border-color: var(--theme-border);
}
.rm-dark-theme .rm-find-or-create-modal .rm-find-or-create-modal-body {
  background-color: transparent;
}
.rm-dark-theme .rm-help-title,
.rm-dark-theme .rm-help-component__title,
.rm-dark-theme .rm-help-component__description,
.rm-dark-theme .rm-help-function__name,
.rm-dark-theme .rm-help-markdown-function__markdown,
.rm-dark-theme .rm-help-markdown-function__style,
.rm-dark-theme .rm-help-resource__title,
.rm-dark-theme .rm-help-resource__description {
  color: var(--theme-text) !important;
}
.rm-dark-theme .rm-help-component__notation {
  background-color: var(--theme-bg-sunken);
  border-color: var(--theme-border);
  color: var(--theme-text);
}
.rm-dark-theme .rm-help-resource:hover,
.rm-dark-theme .rm-help-results .rm-help-categories .rm-help-category-menu-item:hover {
  background-color: var(--theme-hover);
}
.rm-dark-theme .loading-astrolabe path,
.rm-dark-theme .loading-astrolabe .wand circle {
  fill: var(--theme-text);
}

/* === Dark mode: callouts === */
.rm-dark-theme .rm-callout,
.rm-dark-theme .rm-callout--note,
.rm-dark-theme .rm-callout--info,
.rm-dark-theme .rm-callout--todo {
  --callout-color: #2b95d6;
  --_callout-bg: rgba(43, 149, 214, 0.12);
}
.rm-dark-theme .rm-callout--abstract,
.rm-dark-theme .rm-callout--summary,
.rm-dark-theme .rm-callout--tldr,
.rm-dark-theme .rm-callout--tip,
.rm-dark-theme .rm-callout--hint,
.rm-dark-theme .rm-callout--important {
  --callout-color: #68c1ee;
  --_callout-bg: rgba(104, 193, 238, 0.12);
}
.rm-dark-theme .rm-callout--success,
.rm-dark-theme .rm-callout--check,
.rm-dark-theme .rm-callout--done {
  --callout-color: #3dcc91;
  --_callout-bg: rgba(61, 204, 145, 0.12);
}
.rm-dark-theme .rm-callout--question,
.rm-dark-theme .rm-callout--help,
.rm-dark-theme .rm-callout--faq {
  --callout-color: #fbd065;
  --_callout-bg: rgba(251, 208, 101, 0.12);
}
.rm-dark-theme .rm-callout--warning,
.rm-dark-theme .rm-callout--caution,
.rm-dark-theme .rm-callout--attention {
  --callout-color: #f29d49;
  --_callout-bg: rgba(242, 157, 73, 0.12);
}
.rm-dark-theme .rm-callout--danger,
.rm-dark-theme .rm-callout--error,
.rm-dark-theme .rm-callout--bug,
.rm-dark-theme .rm-callout--failure,
.rm-dark-theme .rm-callout--fail,
.rm-dark-theme .rm-callout--missing {
  --callout-color: #ff7373;
  --_callout-bg: rgba(255, 115, 115, 0.12);
}
.rm-dark-theme .rm-callout--example {
  --callout-color: #bdadff;
  --_callout-bg: rgba(189, 173, 255, 0.12);
}
.rm-dark-theme .rm-callout--quote,
.rm-dark-theme .rm-callout--cite {
  --callout-color: #a7b6c2;
  --_callout-bg: rgba(167, 182, 194, 0.12);
}

/* === Dark mode: code === */
.rm-dark-theme .cm-focused .cm-activeLineGutter {
  background-color: var(--theme-hover) !important;
}
.rm-dark-theme .rm-code-block .cm-selectionBackground,
.rm-dark-theme .rm-code-block .cm-focused .cm-selectionBackground {
  background-color: var(--theme-selection) !important;
}
.rm-dark-theme .rm-code-block .cmt-keyword,
.rm-dark-theme .rm-code-block .cmt-header,
.rm-dark-theme .rm-code-block .cmt-labelName {
  color: #c792ea;
}
.rm-dark-theme .rm-code-block .cmt-string,
.rm-dark-theme .rm-code-block .cmt-string2 {
  color: #c3e88d;
}
.rm-dark-theme .rm-code-block .cmt-number,
.rm-dark-theme .rm-code-block .cmt-atom {
  color: #f78c6c;
}
.rm-dark-theme .rm-code-block .cmt-comment {
  color: var(--theme-text-faint);
}
.rm-dark-theme .rm-code-block .cmt-propertyName,
.rm-dark-theme .rm-code-block .cmt-builtin,
.rm-dark-theme .rm-code-block .cmt-def {
  color: #82aaff;
}
.rm-dark-theme .rm-code-block .cmt-typeName,
.rm-dark-theme .rm-code-block .cmt-className,
.rm-dark-theme .rm-code-block .cmt-attribute,
.rm-dark-theme .rm-code-block .cmt-variable-3 {
  color: #ffcb6b;
}
.rm-dark-theme .rm-code-block .cmt-tag {
  color: #f07178;
}
.rm-dark-theme .rm-code-block .cmt-link {
  color: #89ddff;
}
.rm-dark-theme .rm-code-block .cmt-variableName,
.rm-dark-theme .rm-code-block .cmt-variable-2,
.rm-dark-theme .rm-code-block .cmt-bracket {
  color: var(--theme-text);
}${levels ? LEVELS_SECTION : ""}`;
}

export const STARTER_THEMES = [
  {
    id: "paper",
    name: "Paper",
    description: "Warm paper tones for long-form reading: Source Serif text, Fraunces titles, finely underlined links, italic tags, terracotta accent.",
    fonts: {
      imports: [
        "Source+Serif+4:ital,opsz,wght@0,8..60,400;0,8..60,600;1,8..60,400",
        "Fraunces:opsz,wght@9..144,500;9..144,600",
        "JetBrains+Mono:wght@400;500",
      ],
      text: "'Source Serif 4', Georgia, serif",
      title: "Fraunces, 'Source Serif 4', Georgia, serif",
      code: "'JetBrains Mono', ui-monospace, monospace",
    },
    options: { textSize: "17px", lineHeight: "1.65", titleWeight: 600, linkStyle: "underline", tagStyle: "italic" },
    light: {
      bg: "#fbf8f1",
      "bg-soft": "#f5f0e5",
      "bg-sunken": "#efe8da",
      surface: "#fffdf8",
      text: "#2b2620",
      "text-muted": "#6f6454",
      "text-faint": "#a89c87",
      border: "#e3dccb",
      accent: "#b4532a",
      link: "#9a4521",
      tag: "#7d6d52",
      "tag-bg": "#f1e9d8",
      bullet: "#8b7d69",
      thread: "#e3d9c6",
      highlight: "#f6e3a1",
      hover: "rgba(180, 83, 42, 0.08)",
      selection: "rgba(180, 83, 42, 0.14)",
      "sidebar-bg": "#f1ebdd",
      "sidebar-text": "#54493d",
      title: "#231f1a",
      control: "#f5f0e5",
      "control-hover": "#ede5d5",
      "control-active": "#e3d9c6",
      input: "#fffdf8",
    },
    dark: {
      bg: "#1f1b16",
      "bg-soft": "#25201a",
      "bg-sunken": "#2c261e",
      surface: "#2f2921",
      text: "#ece4d6",
      "text-muted": "#b3a58e",
      "text-faint": "#7f735f",
      border: "#3d352a",
      accent: "#e0895f",
      link: "#eba27f",
      tag: "#c4b393",
      "tag-bg": "#342d23",
      bullet: "#a89a84",
      thread: "#3d352a",
      highlight: "#6b5520",
      hover: "rgba(224, 137, 95, 0.12)",
      selection: "rgba(224, 137, 95, 0.22)",
      "sidebar-bg": "#1a1612",
      "sidebar-text": "#cbbfa9",
      title: "#f3ebdd",
      control: "#3a3329",
      "control-hover": "#443c30",
      "control-active": "#4e4537",
      input: "#1a1712",
    },
  },
  {
    id: "graphite",
    name: "Graphite",
    description: "Clean and modern: white and cool greys, Geist type with tight bold titles, tinted links, monospace tag chips, indigo accent.",
    fonts: {
      imports: ["Geist:wght@400;500;600;700", "Geist+Mono:wght@400;500"],
      text: "Geist, Inter, -apple-system, 'Segoe UI', sans-serif",
      title: "Geist, Inter, -apple-system, 'Segoe UI', sans-serif",
      code: "'Geist Mono', ui-monospace, monospace",
    },
    options: { textSize: "15px", lineHeight: "1.55", titleWeight: 700, titleSpacing: "-0.025em", linkStyle: "tint", tagStyle: "chip" },
    light: {
      bg: "#ffffff",
      "bg-soft": "#f7f7f8",
      "bg-sunken": "#f2f3f5",
      surface: "#ffffff",
      text: "#1f2328",
      "text-muted": "#59636e",
      "text-faint": "#9aa2ab",
      border: "#e4e7eb",
      accent: "#4f46e5",
      link: "#4338ca",
      tag: "#6b7280",
      "tag-bg": "#f1f2f4",
      bullet: "#9ca3af",
      thread: "#e5e7eb",
      highlight: "#fff1a8",
      hover: "rgba(79, 70, 229, 0.07)",
      selection: "rgba(79, 70, 229, 0.14)",
      "sidebar-bg": "#f7f7f8",
      "sidebar-text": "#3f4650",
      title: "#111827",
      control: "#f7f7f8",
      "control-hover": "#eef0f2",
      "control-active": "#e4e7eb",
      input: "#ffffff",
    },
    dark: {
      bg: "#16181c",
      "bg-soft": "#1c1f24",
      "bg-sunken": "#22262c",
      surface: "#23272e",
      text: "#e6e8eb",
      "text-muted": "#9aa3ad",
      "text-faint": "#6b737d",
      border: "#30353d",
      accent: "#8b85ff",
      link: "#a5a0ff",
      tag: "#9aa3ad",
      "tag-bg": "#262a31",
      bullet: "#6b737d",
      thread: "#2c3139",
      highlight: "#5b4d12",
      hover: "rgba(139, 133, 255, 0.10)",
      selection: "rgba(139, 133, 255, 0.22)",
      "sidebar-bg": "#121418",
      "sidebar-text": "#c3c9d0",
      title: "#f3f4f6",
      control: "#2c3139",
      "control-hover": "#353b44",
      "control-active": "#3f4650",
      input: "#121418",
    },
  },
  {
    id: "nord",
    name: "Nord",
    description: "The cool Nord palette (Snow Storm by day, Polar Night by night), IBM Plex type, dotted links and tags as pills.",
    fonts: {
      imports: ["IBM+Plex+Sans:ital,wght@0,400;0,600;1,400", "IBM+Plex+Mono:wght@400;500"],
      text: "'IBM Plex Sans', -apple-system, sans-serif",
      title: "'IBM Plex Sans', -apple-system, sans-serif",
      code: "'IBM Plex Mono', ui-monospace, monospace",
    },
    options: { textSize: "15px", lineHeight: "1.6", titleWeight: 600, linkStyle: "dotted", tagStyle: "pill" },
    light: {
      bg: "#eceff4",
      "bg-soft": "#e5e9f0",
      "bg-sunken": "#dde3ec",
      surface: "#f4f6f9",
      text: "#2e3440",
      "text-muted": "#4c566a",
      "text-faint": "#7b88a1",
      border: "#d3dae5",
      accent: "#5e81ac",
      link: "#46699a",
      tag: "#7f5b83",
      "tag-bg": "#ebe6ef",
      bullet: "#81a1c1",
      thread: "#d0d7e2",
      highlight: "#f3e1b3",
      hover: "rgba(94, 129, 172, 0.10)",
      selection: "rgba(94, 129, 172, 0.18)",
      "sidebar-bg": "#e5e9f0",
      "sidebar-text": "#3b4252",
      title: "#2e3440",
      control: "#e5e9f0",
      "control-hover": "#dde3ec",
      "control-active": "#d3dae5",
      input: "#f4f6f9",
    },
    dark: {
      bg: "#2e3440",
      "bg-soft": "#333a47",
      "bg-sunken": "#3b4252",
      surface: "#3b4252",
      text: "#eceff4",
      "text-muted": "#b4bccb",
      "text-faint": "#7b88a1",
      border: "#4c566a",
      accent: "#88c0d0",
      link: "#88c0d0",
      tag: "#c9a6c3",
      "tag-bg": "#443f55",
      bullet: "#81a1c1",
      thread: "#434c5e",
      highlight: "#6b5b2e",
      hover: "rgba(136, 192, 208, 0.10)",
      selection: "rgba(136, 192, 208, 0.20)",
      "sidebar-bg": "#292e39",
      "sidebar-text": "#d8dee9",
      title: "#eceff4",
      control: "#434c5e",
      "control-hover": "#4c566a",
      "control-active": "#56617a",
      input: "#272c36",
    },
  },
  {
    id: "aurora",
    name: "Aurora",
    description: "Vivid and playful: deep violet sidebar, raspberry accent, teal tag pills, one color per nesting level, Outfit and Nunito Sans.",
    fonts: {
      imports: ["Outfit:wght@500;600;700", "Nunito+Sans:ital,opsz,wght@0,6..12,400;0,6..12,600;1,6..12,400", "Fira+Code:wght@400;500"],
      text: "'Nunito Sans', -apple-system, 'Segoe UI', sans-serif",
      title: "Outfit, 'Nunito Sans', sans-serif",
      code: "'Fira Code', ui-monospace, monospace",
    },
    options: { textSize: "15px", lineHeight: "1.6", titleWeight: 700, titleSpacing: "-0.01em", linkStyle: "tint", tagStyle: "pill", levels: true },
    light: {
      bg: "#fdfbff",
      "bg-soft": "#f6f0ff",
      "bg-sunken": "#efe6fd",
      surface: "#ffffff",
      text: "#241a3a",
      "text-muted": "#5f5378",
      "text-faint": "#a79bbd",
      border: "#e6dcf5",
      accent: "#d63370",
      link: "#6d28d9",
      tag: "#0e6f86",
      "tag-bg": "#d9f6fa",
      bullet: "#a855f7",
      thread: "#e6dcf5",
      highlight: "#ffe07a",
      hover: "rgba(109, 40, 217, 0.08)",
      selection: "rgba(214, 51, 112, 0.16)",
      "sidebar-bg": "#2e1065",
      "sidebar-text": "#e9dcff",
      "sidebar-hover": "rgba(255, 255, 255, 0.10)",
      "sidebar-accent": "#ffb3cf",
      title: "#3b1a78",
      control: "#f6f0ff",
      "control-hover": "#efe6fd",
      "control-active": "#e6dcf5",
      input: "#ffffff",
      "level-1": "#a855f7",
      "level-2": "#ec4899",
      "level-3": "#f97316",
      "level-4": "#14b8a6",
      "level-5": "#3b82f6",
    },
    dark: {
      bg: "#171126",
      "bg-soft": "#1e1631",
      "bg-sunken": "#261c3d",
      surface: "#281e40",
      text: "#efe9fb",
      "text-muted": "#b3a6cf",
      "text-faint": "#7d6f99",
      border: "#3a2d57",
      accent: "#ff6b9d",
      link: "#c4a5ff",
      tag: "#5eead4",
      "tag-bg": "#153b40",
      bullet: "#c084fc",
      thread: "#3a2d57",
      highlight: "#6b4f0f",
      hover: "rgba(196, 165, 255, 0.10)",
      selection: "rgba(255, 107, 157, 0.22)",
      "sidebar-bg": "#120c1f",
      "sidebar-text": "#d9ccf5",
      "sidebar-hover": "rgba(255, 255, 255, 0.07)",
      "sidebar-accent": "#ff9ec0",
      title: "#f5efff",
      control: "#33264f",
      "control-hover": "#3d2e5e",
      "control-active": "#48376e",
      input: "#120c1f",
      "level-1": "#c084fc",
      "level-2": "#f472b6",
      "level-3": "#fb923c",
      "level-4": "#2dd4bf",
      "level-5": "#60a5fa",
    },
  },
];

export const starterThemeCss = (id) => {
  const t = STARTER_THEMES.find((s) => s.id === id);
  return t ? buildStarterCss(t) : "";
};

// Bump when the starter CSS changes (fixes, newly covered Roam elements), so
// that themes created from an older version can be updated.
export const STARTER_VERSION = 1;

/**
 * What a theme created from a starter keeps of its origin: the starter id,
 * the version and the CSS as generated. Comparing each section of the theme
 * with this base tells which ones the user left untouched, so a later update
 * can replace those and keep the customized ones.
 */
export const starterOrigin = (id) => {
  const css = starterThemeCss(id);
  return css ? { id, version: STARTER_VERSION, css } : null;
};
