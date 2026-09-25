// Structured catalog of the typical Roam Research DOM elements that can be
// styled. Used to build the LLM system prompt, to offer "target element"
// chips in the UI, and to feed the "/" element picker of the request editor
// (the `label` is the name inserted into the user's request).
// Selectors are the stable classes of the Roam
// web app (Blueprint v3 => `bp3-` prefix).

import { getTranslations, getUiLang, LANGS } from "./elementTranslations";

export const ROAM_ELEMENTS = [
  {
    id: "layout",
    icon: "page-layout",
    label: "Layout & app shell",
    items: [
      { selector: ".roam-body", label: "App body", description: "whole app wrapper: global background, base font" },
      { selector: ".roam-app", label: "App root", description: "root container of the app" },
      { selector: ".roam-main", label: "Main area", description: "main area containing the article and the right sidebar" },
      { selector: ".roam-article", label: "Main content column", description: "central column holding the current page or the daily notes (padding, width)" },
      { selector: ".rm-article-wrapper", label: "Article wrapper", description: "wrapper of the main content (max-width to widen/narrow the page)" },
      { selector: ".roam-log-container", label: "Daily notes list", description: "container of the chronological daily notes log (absent when a single daily note is opened as a page)" },
      { selector: ".rm-article-wrapper .roam-log-container .roam-log-page", label: "Daily note page", description: "each day in the daily notes log; Roam's separator is border-top 1px #738694 with 40px margin/padding (none on :first-child), so keep this full selector to override it" },
      { selector: ".roam-log-preview", label: "Daily note preview", description: "placeholder of the days not rendered yet in the log (grey #8A9BA8 text and title), shown while scrolling" },
    ],
  },
  {
    id: "topbar",
    icon: "header",
    label: "Top bar",
    items: [
      { selector: ".rm-topbar", label: "Top bar", description: "top bar (background, height, border)" },
      { selector: ".rm-find-or-create-wrapper", label: "Search box", description: "search / find-or-create input in the top bar" },
      { selector: ".rm-topbar .bp3-button", label: "Top bar buttons", description: "buttons in the top bar (sidebar toggle, graph, etc.)" },
      { selector: ".rm-topbar__sync", label: "Sync indicator", description: "sync status indicator in the top bar" },
    ],
  },
  {
    id: "left-sidebar",
    icon: "menu",
    label: "Left sidebar",
    items: [
      { selector: ".roam-sidebar-container", label: "Left sidebar", description: "left sidebar container (background, width)" },
      { selector: ".roam-sidebar-content", label: "Left sidebar content", description: "content of the left sidebar" },
      { selector: ".roam-sidebar-content .log-button", label: "Sidebar entries", description: "entries like Daily Notes, Graph Overview, All Pages" },
      { selector: ".roam-sidebar-content .icon", label: "Sidebar entry icon", description: "icon of each left sidebar entry: a glyph span (span.bp3-icon-small.bp3-icon-<name>.icon, colored hsl(204,20%,45%) by a 0,5,0 rule), not a .bp3-icon element" },
      { selector: ".rm-graph-dropdown", label: "Graph dropdown", description: "menu opened from the graph name at the top of the left sidebar: links a, .menu-title, .menu-item, settings row .setting (#EBF1F5, hover #CED9E0)" },
      { selector: ".rm-left-sidebar__daily-notes", label: "Daily Notes entry", description: "the Daily Notes entry of the left sidebar; the other entries are .rm-left-sidebar__graph-overview, .rm-left-sidebar__all-pages and .rm-left-sidebar__roam-depot" },
      { selector: ".starred-pages", label: "Shortcuts", description: "list of shortcut (starred) pages; each shortcut is .starred-pages .page (inside a link)" },
      { selector: ".roam-sidebar-topnav", label: "Sidebar top nav", description: "top area of the left sidebar (graph name, navigation)" },
    ],
  },
  {
    id: "right-sidebar",
    icon: "panel-stats",
    label: "Right sidebar",
    items: [
      { selector: "#right-sidebar", label: "Right sidebar", description: "right sidebar container (background, width, border)" },
      { selector: "#roam-right-sidebar-content", label: "Right sidebar content", description: "scrollable content of the right sidebar" },
      { selector: ".rm-sidebar-outline", label: "Sidebar window", description: "content of each window (page, block, graph) opened in the right sidebar: breadcrumb .rm-zoom then the blocks" },
      { selector: ".rm-sidebar-window", label: "Sidebar window wrapper", description: "wrapper of a right sidebar window including its header" },
      { selector: ".rm-sidebar-window__controls", label: "Sidebar window controls", description: "buttons (close, pin, collapse) of a right sidebar window header" },
    ],
  },
  {
    id: "page",
    icon: "header-one",
    label: "Page titles & headings",
    items: [
      { selector: ".rm-title-display", label: "Page title", description: "page title (h1) at the top of a page or daily note" },
      { selector: ".roam-log-page .rm-title-display", label: "Daily note title (log view)", description: "titles of the daily notes in the Daily Notes log, rendered smaller and grey (30px #5c7080 by default, vs 36px #202b33 on a single page)" },
      { selector: ".rm-title-textarea", label: "Page title (editing)", description: "textarea shown while the page title is being edited" },
      { selector: ".rm-heading-level-1", label: "Heading 1 block", description: "block set as H1 (the class is on the block container, so it also covers the children: target the text with .rm-heading-level-1 > .rm-block-main .rm-block__input)" },
      { selector: ".rm-heading-level-2", label: "Heading 2 block", description: "block set as H2" },
      { selector: ".rm-heading-level-3", label: "Heading 3 block", description: "block set as H3" },
      { selector: ".rm-zoom", label: "Breadcrumbs", description: "breadcrumb path displayed when zoomed into a block" },
      { selector: ".rm-zoom-item", label: "Breadcrumb item", description: "each item of the breadcrumb path" },
    ],
  },
  {
    id: "blocks",
    icon: "properties",
    label: "Blocks, bullets & threads",
    items: [
      { selector: ".roam-block-container", label: "Block container", description: "a block with its children (spacing between blocks)" },
      { selector: ".roam-block-container[data-page-links*='\"Tag\"'] > .rm-block-main", label: "Blocks tagged with…", description: "row of the blocks referencing a given tag or page (data-page-links lists the pages referenced in the block, e.g. DONE, TODO or a tag)" },
      { selector: ".rm-block-main", label: "Block row", description: "row containing the bullet and the block text" },
      { selector: ".roam-block", label: "Rendered block text", description: "rendered (non-editing) text of a block: font, size, color, line-height (same element as .rm-block__input and .rm-block-text)" },
      { selector: ".rm-block-text", label: "Block text wrapper", description: "wrapper of the block text, both rendered and editing" },
      { selector: ".rm-block__input", label: "Block content", description: "content wrapper of every block, in view mode (.rm-block__input--view) as well as while editing (must stay visible)" },
      { selector: "textarea.rm-block-input", label: "Editing textarea", description: "textarea shown while editing a block (must stay visible and readable)" },
      { selector: ".rm-block-children", label: "Children container", description: "container of the child blocks (indentation); also carries .rm-level-N with N = nesting depth" },
      { selector: ".rm-level-1", label: "Nesting level 1", description: "children container at depth 1 (.rm-level-0 = top-level blocks of the page, then .rm-level-2, .rm-level-3…): per-depth indentation, thread line, bullet or font tweaks" },
      { selector: ".rm-multibar", label: "Thread line", description: "vertical guide line joining nested blocks" },
      { selector: ".rm-bullet", label: "Bullet", description: "bullet container of a block" },
      { selector: ".rm-bullet__inner", label: "Bullet dot", description: "the bullet dot itself (size, color); collapsed blocks get a halo via .rm-bullet--closed" },
      { selector: ".rm-caret", label: "Caret", description: "expand/collapse caret shown on hover (.rm-caret-open / .rm-caret-closed)" },
      { selector: ".block-highlight-blue", label: "Selected blocks", description: "highlight of multi-selected blocks" },
      { selector: ".rm-block-separator", label: "Block separator", description: "spacing element between blocks" },
    ],
  },
  {
    id: "inline",
    icon: "font",
    label: "Inline elements",
    items: [
      { selector: ".rm-page-ref", label: "Page reference", description: "any page reference (link or tag)" },
      { selector: ".rm-page-ref--link", label: "[[Page link]]", description: "page reference written with brackets" },
      { selector: ".rm-page-ref--tag", label: "#tag", description: "page reference written as a tag" },
      { selector: '.rm-page-ref--tag[data-tag^="prefix"]', label: "Tags starting with…", description: "tags whose name starts with a given text (data-tag holds the tag name without #; use [data-tag=\"name\"] for one exact tag)" },
      { selector: '[data-link-title="Page"] .rm-page-ref--link', label: "Link to a given page", description: "page links pointing to one specific page (data-link-title holds the page name, on the wrapper span around the link, hence the descendant selector)" },
      { selector: '[data-link-title^="prefix"] .rm-page-ref--link', label: "Links starting with…", description: "page links whose page name starts with a given text (^= starts with, *= contains, $= ends with); the attribute is on the wrapper span, not on .rm-page-ref--link" },
      { selector: ".rm-page-ref__brackets", label: "Brackets", description: "the [[ ]] brackets around page links" },
      { selector: ".rm-page-ref--namespace", label: "Namespaced ref", description: "page reference with a namespace (parent/child), shown abbreviated" },
      { selector: ".rm-block__ref-count", label: "Block ref count", description: "small counter of references shown at the right of a referenced block (.rm-active when open)" },
      { selector: ".rm-inline-references", label: "Inline references", description: "panel listing the references of a block, opened under it by clicking its counter (#F5F8FA background)" },
      { selector: ".rm-block-ref", label: "Block reference", description: "block reference ((uid)); carries data-uid (the referenced block), no background at rest, .5px #D8E1E8 bottom border" },
      { selector: ".rm-alias", label: "Alias link", description: "markdown links [text](url) and aliases" },
      { selector: ".rm-alias--external", label: "External link", description: "alias pointing to an external URL" },
      { selector: ".rm-bold", label: "Bold", description: "bold text **…**" },
      { selector: ".rm-italics", label: "Italics", description: "italic text __…__" },
      { selector: ".rm-strikethrough", label: "Strikethrough", description: "struck-through text ~~…~~" },
      { selector: ".rm-highlight", label: "Highlight", description: "highlighted text ^^…^^" },
      { selector: ".rm-block-text code", label: "Inline code", description: "inline code `…` (#eee background, #333 text, 1px #ddd border from Roam's re-com.min.css; stays light in dark mode unless restyled)" },
      { selector: ".rm-code-block", label: "Code block", description: "code block container (#f5f5f5, .rm-code-block--<language>); CodeMirror 6 inside: .cm-editor, .cm-gutters (line numbers), .cm-content, syntax tokens .cmt-*; toolbar .rm-code-block__settings-bar" },
      { selector: ".rm-bq", label: "Blockquote", description: "blockquote (> …)" },
      { selector: ".rm-callout", label: "Callout", description: "callout block; type variants .rm-callout--note/info/tip/warning/danger/example/quote; colors via --callout-color and --_callout-bg" },
      { selector: ".rm-callout__header", label: "Callout header", description: "header (icon + title) of a callout; body is .rm-callout__body" },
      { selector: ".rm-attr-ref", label: "Attribute", description: "attribute name (Attribute::)" },
      { selector: ".check-container", label: "Checkbox", description: "TODO / DONE checkbox: span.rm-checkbox.rm-todo > label.check-container > input + span.checkmark (the visible box is .checkmark)" },
      { selector: ".rm-math", label: "Math", description: "KaTeX formulas $$…$$" },
      { selector: ".rm-embed-container", label: "Block embed", description: "embedded block or page {{embed}} (.rm-embed-container--block for a block); toolbar .rm-embed-settings" },
      { selector: ".rm-embed--page", label: "Page embed", description: "embedded page {{embed: [[page]]}} (#EBF1F5); the path bar of an embed is .rm-embed-path (#EBF1F5)" },
      { selector: ".rm-paren", label: "Block ref parentheses", description: "rounded frame of an expanded block reference (#F5F8FA, 1px #EBF1F5 border); its (( )) are .rm-paren__paren (#738694)" },
      { selector: ".rm-inline-img", label: "Inline image", description: "images inside blocks (also .rm-block-text img)" },
    ],
  },
  {
    id: "references",
    icon: "link",
    label: "Linked references & queries",
    items: [
      { selector: ".rm-reference-wrapper > .rm-reference-main", label: "Linked references", description: "linked references section at the bottom of a page (plain .rm-reference-main also matches query results, which reuse this markup)" },
      { selector: ".rm-ref-page-view", label: "Referencing page group", description: "group of references coming from one page" },
      { selector: ".rm-ref-page-view-title", label: "Referencing page title", description: "title of a referencing page in the references section" },
      { selector: ".rm-reference-item", label: "Reference item", description: "each referencing block" },
      { selector: ".rm-unlinked-reference-container", label: "Unlinked references section", description: "container of the (collapsed by default) unlinked references section at the bottom of a page" },
      { selector: ".rm-mentions", label: "References list", description: "list of the linked references (.rm-mentions.refs-by-page-view, one .rm-ref-page-view per page); also used for the unlinked references once expanded" },
      { selector: ".rm-query", label: "Query", description: "query block {{query}} container; its results are .rm-query-content, built like linked references (.rm-ref-page-view, .rm-reference-item)" },
      { selector: ".rm-query-title", label: "Query title", description: "title/header of a query block" },
    ],
  },
  {
    id: "tables",
    icon: "th",
    label: "Tables & kanban",
    items: [
      { selector: ".roam-table", label: "Table", description: "{{table}} rendered tables" },
      { selector: ".rm-table", label: "Native table", description: "Roam's native table view (cells are .rm-table__cell)" },
      { selector: ".rm-table th", label: "Table header cell", description: "header cells of a native table (background hsl(204,33%,97%) and 1px #CED9E0 border by default, bold text); the header row is th inside tbody (no thead), and every cell carries data-row / data-col (0-based) for per-row or per-column styling" },
      { selector: ".rm-table td", label: "Table body cell", description: "body cells of a native table (1px #CED9E0 border by default; the table background is .rm-table table)" },
      { selector: ".rm-table__cell", label: "Table cell content", description: "content wrapper inside each cell of a native table (inner padding); cell backgrounds and borders belong to .rm-table th / .rm-table td" },
      { selector: ".rm-table__col-pill", label: "Table column pill", description: "header pill of a column in a native table; row pills are .rm-table__row-pill" },
      { selector: ".rm-data-table__table", label: "Datalog query table", description: "results table of a {{datalog query}} (.rm-ds-q > .rm-data-table): 12px text, 1px grey borders on th/td/tr, no background and no dark variant by default" },
      { selector: ".rm-data-table__table th", label: "Datalog table header", description: "header cells of a datalog query table; the clickable column title is .rm-column-header--real > .rm-column-header__name (hover rgba(167,182,194,.2))" },
      { selector: ".rm-data-table__table td", label: "Datalog table cell", description: "body cells of a datalog query table (td.rm-data-table__table__cell-container); zebra rows via .rm-data-table__table tbody tr:nth-child(even) > td" },
      { selector: ".kanban-board", label: "Kanban board", description: "{{kanban}} board (#A7B6C2 background)" },
      { selector: ".rm-table .rm-table__col-menu", label: "Table column menu", description: "menu of a native table column (items .rm-table__col-menu-item, hover rgba(0,0,0,.05), divider .rm-table__col-menu-divider)" },
      { selector: ".kanban-column", label: "Kanban column", description: "column of a kanban board (#ededed; nth-child for per-column styling)" },
      { selector: ".kanban-title", label: "Kanban column title", description: "header of a kanban column (centered, fixed 40px min/max height, border-bottom 1px #5C7080)" },
      { selector: ".kanban-card", label: "Kanban card", description: "card of a kanban board (white, margin 0 8px, padding 8px); cards are separated by .rm-dnd-separator drop zones" },
    ],
  },
  {
    id: "popups",
    icon: "applications",
    label: "Dialogs, popovers & menus",
    items: [
      { selector: ".bp3-dialog", label: "Dialog", description: "modal dialogs (settings, etc.)" },
      { selector: ".bp3-popover", label: "Popover", description: "popovers (page previews, menus)" },
      { selector: ".bp3-menu", label: "Menu", description: "context menus and dropdown menus" },
      { selector: ".bp3-menu-item", label: "Menu item", description: "items of menus and of the autocomplete: hover (:hover) and selected (.bp3-active) backgrounds, icon (> .bp3-icon) and label (.bp3-menu-item-label) colors" },
      { selector: ".bp3-popover .bp3-popover-arrow-fill", label: "Popover arrow", description: "SVG arrow of popovers (fill), must match the popover background" },
      { selector: ".bp3-dialog-header", label: "Dialog header", description: "title bar of a dialog: own background, bottom shadow and icon color" },
      { selector: ".bp3-tooltip .bp3-popover-content", label: "Tooltip", description: "tooltips (dark grey with light text by default in both modes)" },
      { selector: ".rm-autocomplete__results", label: "Autocomplete", description: "autocomplete popup for [[ , (( , # and / (white); its SELECTED row has an inline style background-color: rgb(213, 218, 223), reachable only with [style*=\"background-color: rgb(213, 218, 223)\"] and !important" },
      { selector: ".rm-autocomplete-footer", label: "Autocomplete footer", description: "footer of the autocomplete popup (#ebeceb, border-top #D3D4D4): actions .rm-autocomplete-footer__action (--active, --preview), key badges __action__hotkey__icon; the preview pane is .rm-autocomplete__preview (white)" },
      { selector: ".bp3-menu.bp3-text-small", label: "Bullet context menu", description: "menu opened by a right click on a bullet: its alignment / heading / view buttons carry an INLINE white background-color (override with button[style*=\"background-color\"] and !important)" },
      { selector: ".bp3-overlay-backdrop", label: "Backdrop", description: "backdrop behind dialogs" },
      { selector: ".rm-find-or-create-modal", label: "Search dialog", description: "search / find-or-create dialog (Ctrl/Cmd+U): #fff, header .rm-find-or-create-modal-header, results .rm-find-or-create-modal-body__list > li.bp3-menu-item (.bp3-active), rows .rm-find-or-create-row__snippet / __breadcrumb / __ref-count, preview pane .rm-find-or-create-modal-preview, footer .rm-find-or-create-footer (#ebeceb)" },
      { selector: ".rm-find-or-create-popover", label: "Search popover", description: "results popover under the top bar search box: ul.bp3-menu.rm-find-or-create__menu (group headers .rm-find-or-create-body__group-header, rows li.bp3-menu-item > .rm-find-or-create-row with __icon, __title, __ref-count; active row .bp3-active #E1E8ED) then the search footer" },
      { selector: ".rm-find-or-create-footer", label: "Search footer", description: "footer of the search popover and dialog (#ebeceb, border-top #D3D4D4): .rm-find-or-create-footer__title, action buttons button.bp3-button.bp3-minimal.rm-find-or-create-footer__action (--active = toggled Preview, --primary = Open) separated by .bp3-divider, key badges .rm-find-or-create-footer__action-hotkey-icon; the command palette footer is .rm-command-palette__footer" },
      { selector: ".rm-command-palette", label: "Command palette", description: "command palette (Ctrl/Cmd+P): items .rm-command-palette__menu .rm-menu-item (active .rm-menu-item--active #d5dadf), shortcut badges .rm-command-palette__shortcut, footer .rm-command-palette__footer (#ebeceb)" },
      { selector: ".bp3-datepicker", label: "Date picker", description: "calendar popover (date button, /Date, jump to date .rm-jump-date-picker): #fff; days .DayPicker-Day (:hover, .DayPicker-Day--selected, --outside, --today), week numbers .DayPicker-WeekNumber" },
      { selector: ".bp3-toast", label: "Toast", description: "notification toasts (#fff with shadow, icon .bp3-toast > .bp3-icon); intent toasts .bp3-intent-* are colored with white text" },
      { selector: ".bp3-key", label: "Keyboard key", description: "keyboard key badges (hotkeys dialog, shortcut hints): #fff, #5c7080 text, light shadow" },
    ],
  },
  {
    id: "controls",
    icon: "widget-button",
    label: "Buttons & form controls",
    items: [
      { selector: ".bp3-button", label: "Button", description: "Blueprint buttons everywhere (dialogs, popovers, top bar, settings); default look is .bp3-button:not([class*=\"bp3-intent-\"]) with :hover, :active/.bp3-active and :disabled states; colored variants .bp3-intent-primary/success/warning/danger" },
      { selector: ".bp3-button.bp3-minimal", label: "Icon button (minimal)", description: "borderless icon buttons (top bar, block actions, sidebar window controls): transparent, tinted on :hover and :active" },
      { selector: ".bp3-button .bp3-icon", label: "Button icon", description: "icon inside a button (#5c7080 by default; SVG filled with currentColor, so set `color`)" },
      { selector: ".bp3-html-select select", label: "Select dropdown", description: "native <select> styled like a button (settings, query builder, filters); caret is .bp3-html-select .bp3-icon, options are .bp3-html-select option" },
      { selector: ".bp3-input", label: "Text input", description: "text inputs and textareas (search, dialogs, settings): background, border shadow, ::placeholder, :focus ring" },
      { selector: ".bp3-control .bp3-control-indicator", label: "Checkbox / radio box", description: "the box of Blueprint checkboxes and radios; label text is .bp3-control; checked state is .bp3-control input:checked ~ .bp3-control-indicator" },
      { selector: ".bp3-control.bp3-switch .bp3-control-indicator", label: "Switch", description: "toggle switches (settings, extensions): track color (checked via input:checked ~), knob is its ::before" },
      { selector: ".bp3-tab", label: "Tab", description: "tabs in dialogs and panels; selected tab is .bp3-tab[aria-selected=\"true\"], underline is .bp3-tab-indicator" },
      { selector: ".bp3-tag", label: "Badge (Blueprint tag)", description: "small Blueprint badges (hotkey hints, filter chips), not Roam #tags" },
      { selector: ".bp3-card", label: "Card", description: "Blueprint cards used in some panels and extension UIs" },
      { selector: ".bp3-callout", label: "Blueprint callout", description: "info boxes in dialogs and extension UIs (translucent grey rgba(138,155,168,.15), intent variants .bp3-intent-*); not Roam's > [!note] callouts (.rm-callout)" },
    ],
  },
  {
    id: "misc",
    icon: "more",
    label: "Misc",
    items: [
      { selector: ".rm-diagram", label: "Diagram", description: "{{diagram}} canvas (React Flow): colors are inline CSS variables (--diagram-background-color, --block-fill-color, --block-text-color, --edge-stroke-color…) that are also the per-diagram user settings; theme the defaults with .rm-diagram[style*=\"--block-fill-color: white\"] and !important" },
      { selector: ".rm-diagram .rm-diagram-properties-panel", label: "Diagram properties panel", description: "Properties panel of a diagram (hard-coded white background; also the title panel .rm-diagram-title-panel, node toolbar .react-flow__node-toolbar, minimap .react-flow__minimap and controls .react-flow__controls-button #fefefe)" },
      { selector: ".rm-streak", label: "Streak", description: "{{streak}} contribution grid: title .rm-streak__title, labels .rm-streak__weekday / .rm-streak__month, one .rm-streak__day.rm-streak__day-N per day (N = 0 to 4, light green ramp #EBEDF0 → #206E39, dark values only under .bp3-dark, so empty days stay light in a .rm-dark-theme theme)" },
      { selector: ".rm-streak__day", label: "Streak day", description: "one day cell of a {{streak}} grid (12px, radius 1px, positioned by an inline grid-area); intensity classes .rm-streak__day-0 (none, #EBEDF0) to .rm-streak__day-4 (#206E39): restyle the five together as a ramp" },
      { selector: ".rm-all-pages", label: "All Pages view", description: "the All Pages table: rows .rm-all-pages .table .rm-pages-row (#8A9BA8, border #E1E8ED), header row .rm-pages-row-header (#E1E8ED), titles .rm-pages-title-text (color: black!), search input .rm-pages-toolbar .toolbar-search-group .search-input (#F5F8FA)" },
      { selector: ".rm-graph-view-control-panel", label: "Graph Overview controls", description: "settings panel of the Graph Overview (#fff; open state --open with a box-shadow): minimal buttons, a .bp3-button.bp3-fill and .bp3-control.bp3-switch toggles" },
      { selector: ".rm-help-search__input", label: "Help search", description: "search input of the help popup (white, border #B4B7BB) with its icon cell .rm-help-search__icon-container" },
      { selector: "::-webkit-scrollbar", label: "Scrollbars", description: "scrollbars, hidden by Roam by default (global ::-webkit-scrollbar width 0, max-height 4px): redeclare width, height and max-height, then style the thumb as ::-webkit-scrollbar-thumb:vertical, ::-webkit-scrollbar-thumb:horizontal (Roam's re-com.min.css paints a grey rgba(0,0,0,.25) thumb with that 0,1,1 selector and sizes horizontal bars with ::-webkit-scrollbar:horizontal { height: 10px }), plus -track / -corner; never set scrollbar-width or scrollbar-color outside @supports not selector(::-webkit-scrollbar), they disable the webkit rules in Chromium" },
      { selector: ".rm-dark-theme", label: "Dark mode class", description: "class added on <html> and <body> when dark mode is on (Live Themes / Dark Toggle convention)" },
      { selector: ".bp3-dark", label: "Roam native dark class", description: "Blueprint dark class used by Roam's own dark theme rules (not set by Live Themes)" },
    ],
  },
];

export const findElement = (selector) => {
  for (const group of ROAM_ELEMENTS) {
    const item = group.items.find((i) => i.selector === selector);
    if (item) return { ...item, group: group.label };
  }
  return null;
};

export function buildCatalogText() {
  return ROAM_ELEMENTS.map(
    (group) =>
      `### ${group.label}\n` +
      group.items
        .map((i) => `- **${i.label}** \`${i.selector}\` — ${i.description}`)
        .join("\n")
  ).join("\n\n");
}

// Search used by the "/" picker of the request editor. Accent-insensitive,
// case-insensitive, and matching the translated names (elementTranslations)
// as well as the English label. Ranking: exact name or whole word (English,
// then UI language, then other languages), then prefix / word prefix /
// substring of the English label, of the UI-language name, of the other
// languages, then selector, group, description, and finally entries where
// every word of the query appears somewhere.
const norm = (s) =>
  String(s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");

const splitWords = (n) => n.split(/[\s/#()[\]]+/).filter(Boolean);

// Score of a query against one list of names (0 = exact name or whole word,
// 1 = name prefix, 2 = word prefix, 3 = substring), or null.
const nameScore = (names, q) => {
  const words = names.flatMap(splitWords);
  if (names.includes(q) || words.includes(q)) return 0;
  if (names.some((n) => n.startsWith(q))) return 1;
  if (words.some((w) => w.startsWith(q))) return 2;
  if (names.some((n) => n.includes(q))) return 3;
  return null;
};

export function searchElements(query = "", uiLang = getUiLang()) {
  const q = norm(query.trim().replace(/^\./, ""));
  const words = q.split(/\s+/).filter(Boolean);
  const uiIndex = LANGS.indexOf(uiLang);
  const results = [];
  for (const group of ROAM_ELEMENTS) {
    for (const item of group.items) {
      const entry = { ...item, group: group.label, groupId: group.id };
      if (!q) {
        results.push({ ...entry, score: 0 });
        continue;
      }
      const translations = getTranslations(item.selector).map(norm);
      // Names are ranked in three tiers: English label, then the translation
      // in the language of the UI, then the other languages (so a cognate of
      // another language never beats a match in the user's own language).
      const tiers = [
        [norm(item.label)],
        uiIndex >= 0 && translations[uiIndex] ? [translations[uiIndex]] : [],
        translations.filter((_, i) => i !== uiIndex),
      ];
      const selector = norm(item.selector);
      const groupLabel = norm(group.label);
      const description = norm(item.description);
      let score = null;
      const exact = tiers.findIndex((names) => nameScore(names, q) === 0);
      if (exact >= 0) score = exact; // 0..2: exact word, whichever tier
      else {
        for (let t = 0; t < tiers.length && score === null; t++) {
          const s = nameScore(tiers[t], q);
          if (s !== null) score = 3 + t * 3 + (s - 1); // 3..11
        }
      }
      if (score === null) {
        if (selector.includes(q)) score = 12;
        else if (groupLabel.includes(q)) score = 13;
        else if (description.includes(q)) score = 14;
        else {
          const haystack = `${tiers.flat().join(" ")} ${selector} ${groupLabel} ${description}`;
          if (words.length > 1 && words.every((w) => haystack.includes(w))) score = 15;
        }
      }
      if (score !== null) results.push({ ...entry, score });
    }
  }
  if (q) results.sort((a, b) => a.score - b.score);
  return results;
}
