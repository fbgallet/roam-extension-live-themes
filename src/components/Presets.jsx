import React, { useEffect, useRef, useState } from "react";
import { Button, Icon, InputGroup, Intent } from "@blueprintjs/core";
import Tooltip from "./LtTooltip";
import { PRESET_GROUPS, buildPresetPrompt, describePreset, presetHasBlanks } from "./presetData";

// "Standard proposals": one chip per preset, grouped by concern. A plain
// preset fills the request field at once. A preset with blanks (`fields`)
// opens a small inline form under its group; "Use" fills the request with
// the completed text (the user can still edit it before generating). Values
// typed in a form are remembered while the dialog is open.

const isHex = (v) => /^#[0-9a-f]{6}$/i.test(String(v || "").trim());

const Presets = ({ onPick, disabled }) => {
  const [openKey, setOpenKey] = useState(null); // "<group>/<label>" of the open form
  const [values, setValues] = useState({}); // "<group>/<label>/<field>" -> text
  const firstInput = useRef(null);

  useEffect(() => {
    if (openKey) firstInput.current?.focus();
  }, [openKey]);

  const keyOf = (group, preset) => `${group.label}/${preset.label}`;
  const valuesOf = (key, preset) =>
    Object.fromEntries(
      (preset.fields || []).map((f) => [f.key, values[`${key}/${f.key}`] ?? f.default ?? ""])
    );

  const pick = (group, preset) => {
    const key = keyOf(group, preset);
    if (!preset.fields) {
      setOpenKey(null);
      onPick(preset.prompt);
      return;
    }
    setOpenKey(openKey === key ? null : key);
  };

  const use = (key, preset) => {
    onPick(buildPresetPrompt(preset, valuesOf(key, preset)));
    setOpenKey(null);
  };

  return (
    <div className="lt-presets">
      {PRESET_GROUPS.map((group) => {
        const openPreset = group.presets.find((p) => keyOf(group, p) === openKey);
        return (
          <div key={group.label} className="lt-preset-group">
            <span className="lt-preset-group-label">{group.label}</span>
            {group.presets.map((p) => {
              const key = keyOf(group, p);
              const active = key === openKey;
              return (
                <Tooltip key={p.label} content={describePreset(p)} hoverOpenDelay={400}>
                  <Button
                    small
                    minimal
                    className={`lt-preset${p.fields ? " lt-preset--form" : ""}${active ? " lt-preset--active" : ""}`}
                    onClick={() => pick(group, p)}
                    disabled={disabled}
                    rightIcon={p.fields ? <Icon icon="edit" iconSize={10} className="lt-preset-edit" /> : undefined}
                  >
                    {p.label}
                  </Button>
                </Tooltip>
              );
            })}
            {openPreset ? (
              <PresetForm
                preset={openPreset}
                values={valuesOf(openKey, openPreset)}
                onChange={(fieldKey, v) => setValues((prev) => ({ ...prev, [`${openKey}/${fieldKey}`]: v }))}
                onUse={() => use(openKey, openPreset)}
                onCancel={() => setOpenKey(null)}
                firstInput={firstInput}
              />
            ) : null}
          </div>
        );
      })}
    </div>
  );
};

const PresetForm = ({ preset, values, onChange, onUse, onCancel, firstInput }) => {
  const blanks = presetHasBlanks(preset, values);
  const onKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (!blanks) onUse();
    } else if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation(); // keep the dialog open
      onCancel();
    }
  };
  return (
    <div className="lt-preset-form" onKeyDown={onKeyDown}>
      <div className="lt-preset-fields">
        {preset.fields.map((f, i) => (
          <div key={f.key} className="lt-preset-field" title={f.hint || ""}>
            <span className="lt-preset-field-label">{f.label}</span>
            <InputGroup
              small
              className="lt-preset-input"
              value={values[f.key]}
              placeholder={f.placeholder}
              inputRef={i === 0 ? (el) => (firstInput.current = el) : undefined}
              onChange={(e) => onChange(f.key, e.target.value)}
              rightElement={
                f.type === "color" ? (
                  <input
                    type="color"
                    className="lt-preset-swatch"
                    value={isHex(values[f.key]) ? values[f.key].trim() : "#888888"}
                    onChange={(e) => onChange(f.key, e.target.value)}
                    title="Pick a color"
                    tabIndex={-1}
                  />
                ) : undefined
              }
            />
          </div>
        ))}
      </div>
      <div className="lt-preset-form-actions">
        <Tooltip content={blanks ? "Fill in every field first" : "Fill the request field with this proposal (you can still edit it)"} hoverOpenDelay={400}>
          <Button small intent={Intent.PRIMARY} icon="arrow-down" onClick={onUse} disabled={blanks}>
            Use
          </Button>
        </Tooltip>
        <Button small minimal onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
};

export default Presets;
