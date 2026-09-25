// Standard proposals offered in the UI (the "Standard proposals" section of
// the dialog, rendered by Presets.jsx).
//
// Every preset is written as a self-contained request that the model can
// apply as a DELTA on the current theme: it names precisely what changes and
// says what must stay untouched, so that presets can be stacked in any
// order (a colour theme keeps the fonts chosen before, a font preset keeps
// the colours, a tag preset leaves the other tags alone...).
//
// A preset may be generic and ask the user to complete it: `fields` lists
// the blanks, and `prompt` refers to them as {key}. The UI shows a small
// form for these presets and builds the final request with
// buildPresetPrompt(); the user can still edit the text before generating.
//
// Field: { key, label, placeholder, default?, type?: "text" | "color",
//          kind?: "tag" | "page" | "element" } — `kind` only drives the
//          normalisation of what the user typed (leading "#", [[ ]]...).

const TAG_HINT = "type the name without #; a name ending with / or - matches a whole family of tags";

export const PRESET_GROUPS = [
  {
    label: "Colors",
    presets: [
      {
        label: "Accent color",
        fields: [{ key: "color", label: "Color", placeholder: "#0f766e", default: "#0f766e", type: "color" }],
        prompt:
          "Use {color} as the accent color of the app: page links, hovered tags, the active shortcut and selected states, focus rings and primary buttons, with a lighter tint of it for dark mode so it stays readable. Keep backgrounds, fonts, sizes and layout unchanged.",
      },
      {
        label: "Background color",
        fields: [{ key: "color", label: "Color", placeholder: "#faf8f2", default: "#faf8f2", type: "color" }],
        prompt:
          "Set the background of the main content column to {color} in light mode, with a slightly different matching tint for the sidebars and the top bar, keeping text, links, tags, bullets and thread lines readable on it. Leave the dark mode values, fonts, sizes and layout unchanged.",
      },
      {
        label: "Warm sepia",
        prompt:
          "Warm sepia color theme: soft warm paper background, dark brown text, muted terracotta accent for page references and tags, matching sidebars and top bar, with a coherent dark mode variant (warm dark brown backgrounds). Only colors change: keep the existing fonts, sizes, spacing and layout.",
      },
      {
        label: "Nord",
        prompt:
          "Nord-inspired color theme: cool blue-grey light palette (snow backgrounds, polar night text, frost accents) and the dark Nord palette for dark mode, applied to backgrounds, text, sidebars, top bar, references, tags, code blocks, tables, popovers and dialogs. Only colors change: keep the existing fonts, sizes, spacing and layout.",
      },
      {
        label: "Solarized",
        prompt:
          "Solarized color theme: Solarized Light palette in light mode and Solarized Dark in dark mode, applied consistently to backgrounds, text, sidebars, top bar, page references, tags, highlights, code blocks, tables, popovers and dialogs. Only colors change: keep the existing fonts, sizes, spacing and layout.",
      },
      {
        label: "Minimal mono",
        prompt:
          "Minimal monochrome color theme: greyscale UI (white/light grey backgrounds, near-black text, grey bullets and thread lines) with a single blue accent reserved for page references and tags, and a dark mode variant. Only colors change: keep the existing fonts, sizes, spacing and layout.",
      },
      {
        label: "High contrast",
        prompt:
          "High contrast for accessibility: pure white background and near-black text in light mode, near-black background and white text in dark mode, strongly contrasted page links and tags (underlined), visible borders and a clear focus ring on the editing block and on controls. Aim for a WCAG contrast of at least 7:1 for text. Keep fonts, sizes and layout unchanged.",
      },
    ],
  },
  {
    label: "Dark mode",
    presets: [
      {
        label: "Complete dark mode",
        prompt:
          "Create a complete dark mode applied only when the rm-dark-theme class is present: dark backgrounds for the app, sidebars, top bar, dialogs (including their header), menus and popovers (including the popover arrow); light text; readable page references, tags, highlights, code blocks, tables, the autocomplete and the editing textarea; and dark variants of all Blueprint controls with their hover, active and disabled states: buttons and minimal icon buttons, select dropdowns and their options, text inputs with placeholder and focus ring, checkboxes, switches, tabs, badges and menu items. Leave light mode, fonts, sizes and layout untouched.",
      },
      {
        label: "Softer dark",
        prompt:
          "Make the dark mode softer: dark grey (not pure black) backgrounds, off-white text, and lower contrast for bullets, thread lines and borders. Only the dark mode values change; light mode, fonts, sizes and layout stay as they are.",
      },
      {
        label: "OLED black",
        prompt:
          "In dark mode, use pure black (#000) for the main backgrounds and near-black tones for the sidebars, top bar and popovers, keeping text, links, tags and bullets clearly readable. Only the dark mode values change; light mode, fonts, sizes and layout stay as they are.",
      },
    ],
  },
  {
    label: "Typography",
    presets: [
      {
        label: "Custom font",
        fields: [{ key: "font", label: "Font", placeholder: "e.g. Lora, Atkinson Hyperlegible", default: "" }],
        prompt:
          "Use the font '{font}' for block text and page titles (load it from Google Fonts unless it is a system font, with a sensible fallback). Keep the app UI (sidebars, top bar, dialogs, menus) in its current font, and keep sizes, colors and layout unchanged.",
      },
      {
        label: "Serif font",
        prompt:
          "Use a readable serif font for block text and page titles (a Google Font such as 'Source Serif 4' with Georgia as fallback). Keep the app UI (sidebars, top bar, dialogs, menus) in the current sans-serif, and keep sizes, colors and layout unchanged.",
      },
      {
        label: "Text size",
        fields: [{ key: "size", label: "Base size", placeholder: "17px", default: "17px" }],
        prompt:
          "Set the base font size of block text to {size} and scale page titles and H1/H2/H3 headings proportionally. Keep fonts, colors, spacing and the app UI (sidebars, top bar, dialogs) unchanged.",
      },
      {
        label: "Page titles",
        fields: [
          { key: "size", label: "Size", placeholder: "36px", default: "36px" },
          { key: "color", label: "Color", placeholder: "#1e293b", default: "#1e293b", type: "color" },
        ],
        prompt:
          "Restyle page titles (single page and daily notes log): font size {size} (a little smaller in the daily notes log), color {color} with a readable dark mode variant, semi-bold, and a bit more space below the title. Keep the title font family, the block text and everything else unchanged.",
      },
      {
        label: "Clear headings",
        prompt:
          "Give H1, H2 and H3 blocks a clear visual hierarchy: distinct sizes and weights, a bit of top margin, and a subtle color for H3 (with a readable dark mode variant). Keep the current font family and the normal block text unchanged.",
      },
    ],
  },
  {
    label: "Layout",
    presets: [
      {
        label: "Wider content",
        fields: [{ key: "width", label: "Max width", placeholder: "1100px", default: "1100px" }],
        prompt:
          "Make the main content column wider: max-width {width}, centered, so long blocks use more horizontal space. Keep the right sidebar usable, and do not change fonts, colors or spacing.",
      },
      {
        label: "Compact",
        prompt:
          "Compact mode: reduce the vertical spacing between blocks and slightly reduce the line-height of block text, so more content fits on screen without hurting readability. Only spacing and line-height change: keep fonts, font sizes, colors and the page width as they are.",
      },
      {
        label: "Relaxed reading",
        prompt:
          "Relaxed reading: increase the line-height of block text (around 1.6) and add a little more space between blocks and around page titles for comfortable reading. Only spacing and line-height change: keep fonts, sizes, colors and layout as they are.",
      },
      {
        label: "Focus mode",
        prompt:
          "Focus mode: slightly fade (opacity around 0.5) the left sidebar, the top bar and the linked references section, and bring them back to full opacity on hover, with a short transition. Do not hide anything and do not change colors, fonts or layout.",
      },
      {
        label: "Daily notes separators",
        prompt:
          "Separate the daily notes pages more clearly: a subtle horizontal separator and more vertical space between two daily note pages, and a slightly bigger daily note title. Nothing else changes.",
      },
    ],
  },
  {
    label: "Blocks",
    presets: [
      {
        label: "Hide leaf bullets",
        prompt:
          "Hide the bullet of blocks that have no children (keep the bullet visible for blocks with children and for collapsed blocks), and show it again on hover. Keep bullet size and color unchanged.",
      },
      {
        label: "Bullet color",
        fields: [{ key: "color", label: "Color", placeholder: "#94a3b8", default: "#94a3b8", type: "color" }],
        prompt:
          "Use {color} for the bullet dots and a lighter tint of it for the thread lines, with a readable dark mode variant. Keep the bullet size and the halo of collapsed blocks, and change nothing else.",
      },
      {
        label: "Thin threads",
        prompt:
          "Make the vertical thread lines between nested blocks thinner and lighter, and slightly reduce the indentation of child blocks. Keep bullets, fonts and colors unchanged.",
      },
      {
        label: "Rainbow levels",
        prompt:
          "Color the thread lines by nesting level (.rm-level-1, .rm-level-2, .rm-level-3… cycling through 5 soft, harmonious hues), so the depth of a block is easy to follow, with readable dark mode variants. Keep the thread thickness, the bullets and the block text unchanged.",
      },
      {
        label: "Hover highlight",
        prompt:
          "Give the block row under the mouse a very subtle background (the row itself, not its children) with slightly rounded corners and a short transition, with a dark mode variant. Nothing else changes.",
      },
      {
        label: "Editing block",
        prompt:
          "Make the block being edited easy to spot: a soft tinted background and a thin left border in the accent color on the focused block row (not its children), with a dark mode variant. Keep the editing textarea text readable, and change nothing else.",
      },
      {
        label: "Highlight color",
        fields: [{ key: "color", label: "Color", placeholder: "#fde68a", default: "#fde68a", type: "color" }],
        prompt:
          "Use {color} as the background of highlighted text ^^…^^ with slightly rounded corners, keeping the text readable, and a readable dark mode variant. Nothing else changes.",
      },
      {
        label: "Elegant blockquotes",
        prompt:
          "Refine blockquotes: a thicker left border in the accent color, a very light background, italic text with a little padding, and a readable dark mode variant. Keep the font family and size, and change nothing else.",
      },
      {
        label: "Callouts",
        prompt:
          "Refine callouts: slightly rounded corners, a soft tinted background per callout type using the existing --callout-color variable, a clearer header, and readable dark mode variants. Change nothing else.",
      },
    ],
  },
  {
    label: "Tasks",
    presets: [
      {
        label: "Strike DONE",
        prompt:
          "Strike through and fade (opacity around 0.6) the text of blocks whose checkbox is DONE (blocks referencing the page 'DONE'), on the block text only: keep the checkbox itself, the children and the TODO blocks unchanged.",
      },
      {
        label: "Nicer checkboxes",
        fields: [{ key: "color", label: "Checked color", placeholder: "#16a34a", default: "#16a34a", type: "color" }],
        prompt:
          "Restyle the TODO/DONE checkboxes (the visible box is .checkmark): slightly rounded square, thin border matching the text color, a short hover effect, and a {color} fill with a white check mark when checked, with readable dark mode variants. Keep the checkbox size and alignment with the text, and change nothing else.",
      },
      {
        label: "Hide DONE blocks",
        prompt:
          "Hide the blocks whose checkbox is DONE (block containers referencing the page 'DONE') in the page and in the daily notes, but keep them visible in the linked references, in queries and in the right sidebar. Nothing else changes.",
      },
    ],
  },
  {
    label: "Tables",
    presets: [
      {
        label: "Clean tables",
        prompt:
          "Clean native tables: thin light borders (horizontal lines only between rows), comfortable cell padding, a header row with a subtle tinted background, semi-bold text and a slightly thicker bottom border, rounded outer corners, and a complete dark mode variant (repaint the table, the header and the borders). Keep the font and the cell content unchanged.",
      },
      {
        label: "Zebra rows",
        prompt:
          "Alternate the background of the body rows of native tables (two soft tones, set on the cells of both odd and even rows) and highlight the row under the mouse, with readable dark mode variants (repaint the table itself too). Keep the header, borders and fonts unchanged.",
      },
      {
        label: "Header color",
        fields: [{ key: "color", label: "Background", placeholder: "#dbeafe", default: "#dbeafe", type: "color" }],
        prompt:
          "Give the header cells of native tables the background {color} with a contrasting text color, and a readable darker variant in dark mode. Keep the body cells, borders and fonts unchanged.",
      },
      {
        label: "First column",
        prompt:
          "Make the first column of native tables stand out: semi-bold text and a very subtle background on its cells (data-col=\"0\"), with a dark mode variant. Keep the other columns, the header row and the borders unchanged.",
      },
      {
        label: "Compact tables",
        prompt:
          "Make native tables and datalog query tables more compact: smaller cell padding and a slightly smaller font size. Keep colors, borders and everything else unchanged.",
      },
      {
        label: "Query tables",
        prompt:
          "Restyle the result tables of {{datalog query}} blocks: light borders, a tinted header row with semi-bold column titles, comfortable padding, zebra rows, and a complete dark mode variant (they have none by default). Keep native tables unchanged.",
      },
      {
        label: "Kanban cards",
        prompt:
          "Restyle {{kanban}} boards: columns with a very light background and rounded corners, cards as white rounded cards with a soft shadow and a little padding, a slightly lifted card on hover, and a complete dark mode variant. Nothing else changes.",
      },
    ],
  },
  {
    label: "Code & media",
    presets: [
      {
        label: "Code font",
        fields: [{ key: "font", label: "Font", placeholder: "JetBrains Mono", default: "JetBrains Mono" }],
        prompt:
          "Use '{font}' (Google Font, monospace fallback) for inline code and code blocks, with a slightly smaller size and a subtle background for inline code (readable in dark mode too). Nothing else changes.",
      },
      {
        label: "Dark code blocks",
        prompt:
          "Render code blocks with a dark editor look in both modes (One Dark-like palette): dark background, light text, muted line numbers, visible cursor and selection, and matching syntax colors for the .cmt-* tokens (keywords, strings, numbers, comments, properties…), with rounded corners. Keep inline code and everything else unchanged.",
      },
      {
        label: "Images",
        fields: [{ key: "height", label: "Max height", placeholder: "400px", default: "400px" }],
        prompt:
          "Style images inside blocks: rounded corners, a soft shadow, and a max-height of {height} (keeping their aspect ratio), with a slightly softer shadow in dark mode. Keep their alignment, and change nothing else.",
      },
      {
        label: "Framed embeds",
        prompt:
          "Frame embedded blocks and pages ({{embed}}): a thin border, rounded corners, a very light background and a little inner padding, with a readable dark mode variant, so embeds are clearly distinct from normal blocks. Nothing else changes.",
      },
    ],
  },
  {
    label: "Tags",
    presets: [
      {
        label: "Tag color",
        fields: [
          { key: "tag", label: "Tag or prefix", placeholder: "e.g. project/ or urgent", kind: "tag", hint: TAG_HINT },
          { key: "color", label: "Color", placeholder: "#c2410c", default: "#c2410c", type: "color" },
        ],
        prompt:
          "Give the tags whose name starts with '{tag}' the text color {color} in light mode, and a lighter readable variant of it in dark mode. Keep their font, size and hover behaviour, and leave every other tag and page link untouched.",
      },
      {
        label: "Tag icon",
        fields: [
          { key: "tag", label: "Tag or prefix", placeholder: "e.g. idea or book/", kind: "tag", hint: TAG_HINT },
          { key: "icon", label: "Icon", placeholder: "an emoji or a symbol, e.g. 💡 or →", default: "" },
        ],
        prompt:
          "Show the icon {icon} just before the tags whose name starts with '{tag}' (a ::before pseudo-element on the tag, with a small gap). Do not change the tag color or size, and leave every other tag untouched.",
      },
      {
        label: "Tag badge",
        fields: [
          { key: "tag", label: "Tag or prefix", placeholder: "e.g. status/ or important", kind: "tag", hint: TAG_HINT },
          { key: "color", label: "Background", placeholder: "#dbeafe", default: "#dbeafe", type: "color" },
        ],
        prompt:
          "Render the tags whose name starts with '{tag}' as a small rounded badge: background {color}, a contrasting text color, slightly smaller font size and a little horizontal padding, with a readable dark mode variant. Every other tag keeps its current style.",
      },
      {
        label: "Hide a tag",
        fields: [{ key: "tag", label: "Tag", placeholder: "e.g. private or .hidden", kind: "tag", hint: "exact name of the tag to hide, without #" }],
        prompt:
          "Hide the tag '{tag}' in rendered blocks (only that tag span, so the block and its other content stay visible; the tag still appears while editing the block). Leave every other tag untouched.",
      },
      {
        label: "Tagged blocks",
        fields: [
          { key: "tag", label: "Tag or page", placeholder: "e.g. important", kind: "tag", hint: "blocks referencing this tag or page will be styled" },
          { key: "color", label: "Background", placeholder: "#fef9c3", default: "#fef9c3", type: "color" },
        ],
        prompt:
          "Give the blocks that reference the tag or page '{tag}' a subtle background {color} with rounded corners and a little padding, applied to the block row itself (not to its children), with a readable dark mode variant. Blocks without this reference are unchanged.",
      },
      {
        label: "Tags as pills",
        prompt:
          "Render all #tags as small rounded pills with a light background, a slightly smaller font size and a little horizontal padding, with a readable dark mode variant. Keep the tag colors already defined and leave [[page links]] unchanged.",
      },
    ],
  },
  {
    label: "Links",
    presets: [
      {
        label: "Page links color",
        fields: [{ key: "color", label: "Color", placeholder: "#1d4ed8", default: "#1d4ed8", type: "color" }],
        prompt:
          "Use {color} as the color of [[page links]] in light mode, with a lighter readable variant in dark mode. Keep their weight, size and hover behaviour, and leave #tags untouched.",
      },
      {
        label: "Subtle references",
        prompt:
          "Make page references and tags less prominent: lighter color, normal weight, and an underline on hover. Keep their font and size, and keep any tag-specific styles already defined.",
      },
      {
        label: "Hide brackets",
        prompt:
          "Hide the [[ ]] brackets around page links in rendered blocks (keep the link itself, its color and its hover, and keep the brackets visible while editing). Nothing else changes.",
      },
      {
        label: "External link icon",
        prompt:
          "Add a small ↗ symbol right after external links (aliases pointing to an external URL), slightly smaller and lighter than the link text. Keep the link color and the other aliases unchanged.",
      },
      {
        label: "Block references",
        prompt:
          "Make block references ((…)) distinct but discreet: a subtle background and a thin left border in the accent color, no underline, with a readable dark mode variant. Keep the text color and size, and leave page links and tags unchanged.",
      },
      {
        label: "Attributes",
        prompt:
          "Style attribute names (Attribute::) as small labels: semi-bold, slightly smaller, muted color, with a readable dark mode variant. Keep the attribute values and the rest of the block unchanged.",
      },
    ],
  },
  {
    label: "References",
    presets: [
      {
        label: "Compact references",
        prompt:
          "Make the linked references section more compact: less vertical space between reference items, smaller referencing page titles, and a slightly smaller text. Keep fonts and colors unchanged, and leave the main page content as it is.",
      },
      {
        label: "Distinct references",
        prompt:
          "Set the linked references section visually apart from the page content: a subtle top separator, a slightly muted text color, and less prominent referencing page titles, with a readable dark mode variant. Leave the main page content unchanged.",
      },
      {
        label: "Discreet breadcrumbs",
        prompt:
          "Make the breadcrumbs above referenced blocks and zoomed blocks more discreet: smaller text, muted color, and the accent color on hover, with a readable dark mode variant. Nothing else changes.",
      },
      {
        label: "Queries as cards",
        prompt:
          "Render query blocks as cards: a thin border, rounded corners, a very light background and a clearer query title, with a readable dark mode variant. Keep the query results text unchanged.",
      },
    ],
  },
  {
    label: "Sidebars",
    presets: [
      {
        label: "Light left sidebar",
        prompt:
          "Make the left sidebar light (it is dark by default even in light mode): a soft light background close to the page background, dark readable text for its entries, shortcuts, icons and graph name, a subtle hover state and a thin right border; in dark mode, a dark background matching the app. Keep its width and layout unchanged.",
      },
      {
        label: "Slim left sidebar",
        prompt:
          "Make the left sidebar slimmer, with smaller text for its entries and shortcuts. Keep the main content, colors and fonts unchanged.",
      },
      {
        label: "Clear shortcuts",
        prompt:
          "Make the shortcuts of the left sidebar easier to scan: comfortable line spacing, slightly larger text, and the accent color on hover. Change nothing else in the sidebar or the app.",
      },
      {
        label: "Distinct right sidebar",
        prompt:
          "Give the right sidebar a slightly different background and a thin left border so it is clearly separated from the main content, with a little more inner padding and a readable dark mode variant. Keep the main content unchanged.",
      },
      {
        label: "Minimal top bar",
        prompt:
          "Minimal top bar: a background matching the page, no bottom border or shadow, and slightly muted icons that regain full color on hover. Keep every control visible and usable, and change nothing else.",
      },
    ],
  },
  {
    label: "Interface",
    presets: [
      {
        label: "Rounded UI",
        prompt:
          "Softer interface: rounded corners (around 8px) and soft diffuse shadows for popovers, menus, dialogs, the autocomplete and buttons, with dark mode variants of the shadows. Keep colors, fonts and layout unchanged.",
      },
      {
        label: "Slim scrollbars",
        prompt:
          "Show slim scrollbars (Roam hides them by default): an 8px ::-webkit-scrollbar whose rounded thumb is drawn 4px wide (2px transparent border with background-clip: padding-box), horizontal bars thinner (6px, a 3px thumb), a thumb discreetly tinted with the theme's accent color (not a neutral grey) that strengthens and widens slightly on hover, a transparent track and corner, the sidebar's own accent on the left sidebar, and a dark mode variant. Include the horizontal scrollers: native tables (reset Roam's scrollbar-color on .rm-block__self--horizontal-scroller, thumb revealed on hover) and kanban boards, {{table}} and datalog tables (overflow-x: auto so the bar only appears when needed). Beat Roam's re-com.min.css grey thumb and 10px horizontal bars by writing ::-webkit-scrollbar-thumb:vertical / :horizontal and ::-webkit-scrollbar:horizontal. Use only the ::-webkit-scrollbar pseudo-elements (scrollbar-width / scrollbar-color only inside @supports not selector(::-webkit-scrollbar)). Nothing else changes.",
      },
      {
        label: "Color of an element",
        fields: [
          { key: "element", label: "Element", placeholder: "e.g. Page title (a name from the / picker)", kind: "element" },
          { key: "color", label: "Color", placeholder: "#334155", default: "#334155", type: "color" },
        ],
        prompt:
          "Set the color of the {element} to {color} in light mode, with a readable variant in dark mode. Keep its font, size and everything else unchanged.",
      },
      {
        label: "Restyle an element",
        fields: [
          { key: "element", label: "Element", placeholder: "e.g. Left sidebar (a name from the / picker)", kind: "element" },
          { key: "change", label: "Change", placeholder: "e.g. bigger text and a light grey background" },
        ],
        prompt: "Change the {element}: {change}. Do not change anything else.",
      },
    ],
  },
];

// What the user typed, cleaned according to the kind of the field.
const normalizeValue = (field, raw) => {
  let v = String(raw ?? "").trim();
  if (field.kind === "tag" || field.kind === "page") {
    v = v.replace(/^#/, "").replace(/^\[\[(.*)\]\]$/, "$1").trim();
  }
  return v;
};

// Builds the request of a preset. Empty fields are left as a visible
// placeholder ("[Tag or prefix]") so the user sees what remains to fill in.
export const buildPresetPrompt = (preset, values = {}) => {
  if (!preset.fields) return preset.prompt;
  return preset.prompt.replace(/\{(\w+)\}/g, (m, key) => {
    const field = preset.fields.find((f) => f.key === key);
    if (!field) return m;
    const v = normalizeValue(field, values[key] ?? field.default ?? "");
    return v || `[${field.label}]`;
  });
};

// Readable version of a parameterised prompt for tooltips: "{tag}" becomes "[Tag or prefix]".
export const describePreset = (preset) => buildPresetPrompt(preset, Object.fromEntries((preset.fields || []).map((f) => [f.key, ""])));

export const presetHasBlanks = (preset, values = {}) =>
  !!preset.fields && preset.fields.some((f) => !normalizeValue(f, values[f.key] ?? f.default ?? ""));
