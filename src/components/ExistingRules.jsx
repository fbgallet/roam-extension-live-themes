import React, { useMemo, useState } from "react";
import { Button, Checkbox, Collapse, Icon, InputGroup, Switch, Tag } from "@blueprintjs/core";
import Tooltip from "./LtTooltip";
import { displaySelector, elementLabel, rulesForElements, searchRules } from "../ai/ruleInventory";

const countLines = (text) => (text.trim() ? text.trim().split("\n").length : 0);

/**
 * Lets the user target EXISTING rules (theme sections and base blocks of
 * [[roam/css]]) so the model works on them instead of adding new ones.
 * Rules that touch the selected target elements are listed automatically
 * (and targeted by default); any other rule can be found with the search.
 */
const ExistingRules = ({
  rules,
  selectedSelectors,
  targetIds,
  onToggleRule,
  onClearTargets,
  restrict,
  onRestrict,
  editInPlace,
  onEditInPlace,
  canEditInPlace,
  disabled,
}) => {
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState({});

  const searching = !!query.trim();
  const shown = useMemo(() => {
    if (searching) return searchRules(rules, query);
    const auto = rulesForElements(rules, selectedSelectors);
    const seen = new Set(auto.map((r) => r.id));
    const targeted = rules.filter((r) => targetIds.has(r.id) && !seen.has(r.id));
    return [...auto, ...targeted];
  }, [rules, query, searching, selectedSelectors, targetIds]);

  const targets = rules.filter((r) => targetIds.has(r.id));
  const baseTargets = targets.filter((r) => r.scope === "base").length;
  const themeCount = rules.filter((r) => r.scope === "theme").length;
  const baseCount = rules.length - themeCount;

  return (
    <div className="lt-rules">
      <div className="lt-rules-head">
        <span className="lt-label">
          Existing rules
          <span className="lt-hint lt-rules-total">
            {" "}
            ({themeCount} in the theme, {baseCount} in the base CSS)
          </span>
        </span>
        <InputGroup
          small
          leftIcon="search"
          placeholder="Find a rule: selector, property, section, element…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          disabled={disabled}
          className="lt-rules-search"
          rightElement={
            query ? <Button small minimal icon="cross" onClick={() => setQuery("")} /> : undefined
          }
        />
      </div>

      {shown.length ? (
        <ul className="lt-base-list lt-rules-list">
          {shown.map((r) => {
            const on = targetIds.has(r.id);
            const isExpanded = !!expanded[r.id];
            return (
              <li key={r.id}>
                <div className="lt-base-row">
                  <Tooltip
                    content={on ? "Targeted: the model will work on this rule" : "Not targeted"}
                    hoverOpenDelay={400}
                  >
                    <Checkbox
                      checked={on}
                      disabled={disabled}
                      onChange={() => onToggleRule(r.id)}
                      className="lt-base-check"
                    />
                  </Tooltip>
                  <Tag minimal className="lt-rule-scope" intent={r.scope === "theme" ? "primary" : "none"}>
                    {r.scope === "theme" ? r.section || "General" : "base"}
                  </Tag>
                  <button
                    type="button"
                    className="lt-base-path lt-rule-selector"
                    title={`${r.source}\n${displaySelector(r)}`}
                    onClick={() => setExpanded((prev) => ({ ...prev, [r.id]: !prev[r.id] }))}
                  >
                    <Icon icon={isExpanded ? "caret-down" : "caret-right"} />
                    <code className="lt-base-path-text">{displaySelector(r)}</code>
                  </button>
                  {r.elements.length ? (
                    <span className="lt-hint lt-rule-elements" title={r.elements.map(elementLabel).join(", ")}>
                      {elementLabel(r.elements[0])}
                      {r.elements.length > 1 ? ` +${r.elements.length - 1}` : ""}
                    </span>
                  ) : null}
                  <span className="lt-hint lt-base-lines">{countLines(r.text)} l.</span>
                </div>
                <Collapse isOpen={isExpanded}>
                  <pre className="lt-css-preview">{r.text}</pre>
                </Collapse>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="lt-hint lt-base-intro">
          {searching
            ? "No rule matches this search."
            : selectedSelectors.length
            ? "No existing rule styles the selected elements yet: the model will add new ones."
            : "Select target elements above to see the rules that already style them, or search a rule to target it."}
        </p>
      )}

      {targets.length ? (
        <div className="lt-rules-footer">
          <span className="lt-hint">
            {targets.length} targeted rule{targets.length > 1 ? "s" : ""}
            {baseTargets ? ` (${baseTargets} in the base CSS)` : ""}
          </span>
          <Button small minimal icon="cross" onClick={onClearTargets} disabled={disabled}>
            Clear targets
          </Button>
          <Tooltip
            content="The model may only modify the targeted rules (plus a theme rule when it must override a base rule). Otherwise it focuses on them but may still adjust or add other rules."
            hoverOpenDelay={400}
          >
            <Switch
              checked={restrict}
              onChange={(e) => onRestrict(e.target.checked)}
              label="Modify only the targeted rules"
              className="lt-switch"
              disabled={disabled}
            />
          </Tooltip>
          {baseTargets && canEditInPlace ? (
            <Tooltip
              content="On: the targeted base rules are replaced in place in their block (goes through the same review and revert). Off: the base stays untouched and the theme overrides them."
              hoverOpenDelay={400}
            >
              <Switch
                checked={editInPlace}
                onChange={(e) => onEditInPlace(e.target.checked)}
                label="Edit base rules in place"
                className="lt-switch"
                disabled={disabled}
              />
            </Tooltip>
          ) : baseTargets ? (
            <span className="lt-hint">
              Base rules are overridden from the theme (enable “Allow editing the whole [[roam/css]] page” in the settings to edit them in place).
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
};

export default ExistingRules;
