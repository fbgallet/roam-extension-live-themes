import React, { useRef } from "react";
import { Button, ButtonGroup, HTMLSelect, Intent, Popover, Position } from "@blueprintjs/core";
import Tooltip from "./LtTooltip";
import {
  createTheme,
  deleteTheme,
  duplicateTheme,
  exportTheme,
  importTheme,
  renameTheme,
} from "../themes";
import { starterOrigin } from "../starterThemes";
import StarterGallery from "./StarterGallery";
import { showToast } from "../utils/notify";

const MAX_IMPORT_BYTES = 500 * 1024;

// An imported theme is applied at once: ask before it loads anything from
// another site (see findUntrustedUrls).
const confirmExternalUrls = (urls) =>
  window.confirm(
    `This theme loads ${urls.length} resource(s) from other sites:\n\n${urls.slice(0, 8).join("\n")}${
      urls.length > 8 ? "\n…" : ""
    }\n\nThese sites will be contacted as soon as the theme is applied (this can be used for tracking). Import it anyway?`
  );

const downloadText = (filename, text) => {
  const blob = new Blob([text], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

const safeFilename = (name) =>
  (name || "theme").replace(/[^\w\-]+/g, "_").replace(/^_+|_+$/g, "") || "theme";

/**
 * Theme selector + management buttons shown at the top of the dialog.
 * `locked` (review pending or generation in progress) disables switching and
 * destructive actions; renaming stays available.
 */
const ThemeManager = ({ themes, active, locked, lockedReason, onSwitch, onChanged, cssDisabled, onToggleCss, togglingCss }) => {
  const fileRef = useRef(null);
  const activeName = active?.name || "";

  const guard = () => {
    if (locked) {
      showToast(lockedReason, Intent.WARNING);
      return false;
    }
    return true;
  };

  const onNew = async () => {
    if (!guard()) return;
    const name = window.prompt("Name of the new (blank) theme:", "New theme");
    if (name === null) return;
    const theme = await createTheme({ name });
    onChanged?.(theme);
    showToast(`Live Themes: blank theme “${theme.name}” created and activated.`, Intent.SUCCESS);
  };

  // "+" opens the gallery: a blank theme or a ready-made one.
  const onPickNew = (starter) => (starter ? onStarter(starter) : onNew());

  const onStarter = async (starter) => {
    if (!guard()) return;
    const origin = starterOrigin(starter.id);
    const theme = await createTheme({ name: starter.name, css: origin?.css || "", starter: origin });
    onChanged?.(theme);
    showToast(
      `Live Themes: starter theme “${theme.name}” created and activated. Customize it with the proposals or your own requests.`,
      Intent.SUCCESS
    );
  };

  const onDuplicate = async () => {
    if (!guard() || !active) return;
    const name = window.prompt(`Save a copy of “${activeName}” as:`, `${activeName} copy`);
    if (name === null) return;
    const theme = await duplicateTheme(active.id, name);
    onChanged?.(theme);
    showToast(`Live Themes: “${theme.name}” created from “${activeName}” and activated.`, Intent.SUCCESS);
  };

  const onRename = async () => {
    if (!active) return;
    const name = window.prompt("Rename this theme:", activeName);
    if (name === null || !name.trim() || name.trim() === activeName) return;
    const theme = await renameTheme(active.id, name);
    onChanged?.(theme);
  };

  const onDelete = async () => {
    if (!guard() || !active) return;
    const only = themes.length <= 1;
    const msg = only
      ? `Delete theme “${activeName}”? It is your only theme: a blank “Default” theme will replace it.`
      : `Delete theme “${activeName}” and its history? The previous theme in the list will be activated.`;
    if (!window.confirm(msg)) return;
    const next = await deleteTheme(active.id);
    onChanged?.(next);
    showToast(`Live Themes: theme “${activeName}” deleted. Active theme: “${next?.name}”.`, Intent.SUCCESS);
  };

  const onExport = () => {
    if (!active) return;
    const json = exportTheme(active.id);
    if (!json) return;
    downloadText(`${safeFilename(activeName)}.live-theme.json`, json);
  };

  const onImportFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !guard()) return;
    // A theme is written to [[roam/css]] and synced to every device: refuse
    // files far bigger than any real theme.
    if (file.size > MAX_IMPORT_BYTES) {
      showToast(`Live Themes: this file is too large to be a theme (${Math.round(file.size / 1024)} KB, max ${MAX_IMPORT_BYTES / 1024} KB).`, Intent.DANGER);
      return;
    }
    try {
      const text = await file.text();
      const fallback = file.name.replace(/\.live-theme\.json$|\.json$|\.css$/i, "");
      const theme = await importTheme(text, fallback || "Imported theme", { confirmExternalUrls });
      onChanged?.(theme);
      showToast(`Live Themes: theme “${theme.name}” imported and activated.`, Intent.SUCCESS);
    } catch (err) {
      showToast(`Live Themes: could not import this file (${err.message}).`, Intent.DANGER);
    }
  };

  return (
    <div className="lt-theme-bar">
      <label className="lt-field lt-theme-field">
        <span className="lt-label">Theme</span>
        <Tooltip content={locked ? lockedReason : "Switch the active theme (its CSS replaces the current one)"}>
          <HTMLSelect
            value={active?.id || ""}
            onChange={(e) => onSwitch(e.target.value)}
            disabled={locked || themes.length < 2}
            className="lt-theme-select"
          >
            {themes.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </HTMLSelect>
        </Tooltip>
        {themes.length > 1 ? (
          <span className="lt-hint">{themes.length} themes</span>
        ) : null}
      </label>
      <ButtonGroup minimal className="lt-theme-actions">
        <Popover
          position={Position.BOTTOM_RIGHT}
          disabled={locked}
          popoverClassName="lt-starter-popover"
          content={
            <div className="lt-starter-panel">
              <div className="lt-starter-panel-title">New theme</div>
              <StarterGallery onPick={onPickNew} blankLabel="Blank" dismissOnPick />
            </div>
          }
        >
          <Tooltip content="New theme: blank or from a ready-made design (Paper, Graphite, Nord…)">
            <Button small icon="add" disabled={locked} />
          </Tooltip>
        </Popover>
        <Tooltip content="Save a copy of this theme under another name (fork it)">
          <Button small icon="duplicate" onClick={onDuplicate} disabled={locked || !active} />
        </Tooltip>
        <Tooltip content="Rename this theme">
          <Button small icon="edit" onClick={onRename} disabled={!active} />
        </Tooltip>
        <Tooltip content="Export this theme (JSON file)">
          <Button small icon="export" onClick={onExport} disabled={!active} />
        </Tooltip>
        <Tooltip content="Import a theme (.live-theme.json or .css file)">
          <Button small icon="import" onClick={() => fileRef.current?.click()} disabled={locked} />
        </Tooltip>
        {onToggleCss ? (
          <Tooltip
            content={
              cssDisabled
                ? "Re-enable the Live Themes CSS"
                : "Disable the Live Themes CSS (it stays on [[roam/css]] as plain text, not applied): emergency switch, or to compare with and without the theme"
            }
          >
            <Button
              small
              icon="power"
              intent={cssDisabled ? Intent.WARNING : Intent.NONE}
              active={cssDisabled}
              onClick={onToggleCss}
              loading={togglingCss}
              disabled={locked && !cssDisabled}
            />
          </Tooltip>
        ) : null}
        <Tooltip content="Delete this theme">
          <Button small icon="trash" intent={Intent.DANGER} onClick={onDelete} disabled={locked || !active} />
        </Tooltip>
      </ButtonGroup>
      <input
        ref={fileRef}
        type="file"
        accept=".json,.css,application/json,text/css"
        style={{ display: "none" }}
        onChange={onImportFile}
      />
    </div>
  );
};

export default ThemeManager;
