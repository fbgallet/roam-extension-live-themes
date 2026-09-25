# Live Themes - AI-powered theming

Change the look of your Roam graph **by simply describing what you want**: "wider pages", "a calm dark mode", "make tags look like colored pills"… No CSS knowledge needed. Live Themes asks an AI model to do it, shows you the result immediately, and **undoes it automatically unless you confirm it**, so a bad result can never leave your graph unusable.

## Setup (2 minutes)

Live Themes uses the AI models of the **[Live AI](https://github.com/fbgallet/roam-extension-live-ai-assistant)** extension, so it needs no API key of its own.

1. Install **Live AI** from Roam Depot and set up at least one AI provider (API key) in its settings, if you have not already.
2. In **Live AI**'s settings, turn on **"Public API (window.LiveAI_API)"** (last option).
3. Install **Live Themes** from Roam Depot. A drop icon 💧 appears in the top bar, next to the search box.

## Your first theme

1. Click the **drop icon** in the top bar (or run `Live Themes: Open / close` from the command palette, `Cmd/Ctrl + P`).
2. Either:
   - pick a **ready-made proposal** (wider content, serif font, Nord colors, complete dark mode, colored tags, strike-through DONE tasks…). Some of them ask you to fill in a detail first (a color, a font, a tag name…);
   - or **write your request** in your own words, in any language.
3. Click **Generate & preview** (or `Cmd/Ctrl + Enter`). The change appears on screen after a few seconds.
4. A banner at the top of the screen counts down (30 seconds by default):
   - **Keep**: you like it, the change is saved.
   - **Revert**: go back to how it was.
   - **Adjust…**: refine it ("a bit lighter", "same but with rounded corners"…). The model remembers the conversation.
   - **Do nothing**: when the countdown ends, the change is undone automatically.

Changes build on each other: you can apply several proposals and requests one after another.

**If something goes wrong**: just wait for the countdown to finish, or reload Roam. A change that was not kept is always undone. Later, you can still undo kept changes with `Live Themes: Undo last change` or from the dialog's history (last 10 changes).

## Pointing at what you want to change

You do not need to know the technical names of Roam's parts:

- **Pick on screen**: click this button under the request field, then click the thing that bothers you in the page (a title, a tag, the sidebar…). Then just write "make this smaller" or "less bright".
- **Type `/` in the request field** to browse all the parts of Roam by category (top bar, sidebars, titles, bullets, tags, references, tables…) and insert one in your sentence. Names are also understood in French, Spanish, German, Italian, Portuguese, Dutch, Russian, Chinese, Japanese and Korean (`/puce`, `/Seitentitel`…).

## Themes

You can keep **several themes** (e.g. "Work", "Reading", "Minimal") and switch between them. One theme is active at a time.

- Use the **theme bar** at the top of the dialog to create a **New** theme, **Duplicate** the current one to try a variant safely, **Rename** or **Delete** it.
- Switch themes from the same bar, or from the command palette: `Live Themes: Activate theme “<name>”` or `Live Themes: Next theme`.
- **Export** a theme to a file to share it or keep a backup; **Import** a theme file (or any `.css` file) to create a new theme.

## Dark mode

Roam has no built-in dark mode, so your theme needs one first: use the **Complete dark mode** proposal (or click the 🌙 button in the dialog, which prepares it for you). Then switch between light and dark with:

- the 🌙/☀ button of the dialog,
- the `Live Themes: Toggle dark mode` command (you can give it a keyboard shortcut in Roam's settings),
- an optional 🌙/☀ button in the top bar (enable it in the settings),
- or automatically with your computer's setting (_Follow the system light/dark setting_).

After each change, Live Themes checks that text stays **readable** (enough contrast) in both light and dark mode. If some text became hard to read, the banner tells you and offers to **ask the model to fix it**.

## Commands (command palette, `Cmd/Ctrl + P`)

- `Live Themes: Open / close`
- `Live Themes: Toggle dark mode`
- `Live Themes: Activate theme “<name>”` (one per theme), `Live Themes: Next theme`
- `Live Themes: Undo last change`
- `Live Themes: Disable / re-enable Live Themes CSS (emergency)`: turns the whole theme off (and back on), without deleting anything.

## Settings

- **Button in the top bar** / **Light/dark button in the top bar**.
- **Follow the system light/dark setting**.
- **Review delay**: how long you have to confirm a change (15, 30, 60 or 120 seconds).
- **Check text contrast after applying a proposal** (on by default).
- **Thinking (reasoning) mode**: better results on complex requests, but slower and more costly.
- **Send a snapshot of the live page to the model**: lets the model "see" the actual colors and fonts on screen (off by default, a bit more costly).
- **Read the whole [[roam/css]] page**: the model takes your other existing CSS into account.
- **Allow editing the whole [[roam/css]] page**: lets the model also modify your other CSS, only when you explicitly ask for it (off by default).
- **Disable Live Themes CSS (emergency)**: same as the command above.

## Where your theme is stored

Roam applies the styles written on its `[[roam/css]]` page. Live Themes writes the active theme there, under a block named **`Live Themes`**, split into small collapsed blocks by topic (_Colors_, _Typography_, _Dark mode_…). Everything else on this page (CSS you or other tools added before) is left untouched, and stays applied under your theme. Other themes are stored in the extension's settings until you activate them.

You never need to open this page, but you can: hand edits made there are kept in the theme.

## Safety

- **Nothing is permanent until you confirm it**: an unconfirmed change is undone after the countdown, and also on the next reload of Roam.
- A proposal that would **hide essential parts of Roam** (the page, the top bar, blocks, menus…) or that contains **broken CSS** is not applied: you see a warning first.
- **No hidden calls to other sites**: a theme could load images or files from any website, which can be used to track you. Live Themes only loads fonts from Google Fonts automatically; any other external address in a proposal is shown to you as a warning before anything is applied, and importing a theme file that contains one asks for your confirmation.
- Only the `Live Themes` block of `[[roam/css]]` is ever modified, unless you turn on _Allow editing the whole [[roam/css]] page_.
- In an emergency, the `Disable / re-enable Live Themes CSS` command turns the theme off instantly.

## For the curious: how the model knows Roam

The model receives a catalog of about 100 parts of Roam (name, CSS selector, description) checked against Roam's real stylesheet, facts about Roam's CSS (native variables, default colors, how dark mode and Blueprint controls work), and optionally a measurement of what is actually displayed. It answers with changes to specific sections of the theme only, so a targeted request cannot break the rest. Before any change is applied, the CSS is checked section by section for syntax errors, dangerous rules and invented selectors.

## Development

A development command that exports a snapshot of Roam's DOM (to improve the element catalog) is available, commented out, in `src/index.js`.
