import React, { useMemo } from "react";
import { Icon } from "@blueprintjs/core";
import { getLocalizedName, getUiLang } from "../ai/elementTranslations";

// Two-pane picker of Roam elements, rendered under the request textarea by
// RequestEditor (which owns the state and the keyboard handling).
// Left: categories. Right: the elements of the selected category, or, while
// filtering, every matching element grouped under sticky category headers.

const Key = ({ children }) => <span className="lt-key lt-picker-key">{children}</span>;
const Hint = ({ keys, children }) => (
  <span className="lt-picker-hint">
    {keys.map((k) => (
      <Key key={k}>{k}</Key>
    ))}
    {children}
  </span>
);

// Whether the picker must use its dark variant: measured on the actual
// background of the dialog (the page's rm-dark-theme class does not imply a
// dark dialog, that depends on the user's theme).
const isDarkBackground = (el) => {
  for (let node = el; node; node = node.parentElement) {
    const m = getComputedStyle(node).backgroundColor.match(/[\d.]+/g);
    if (!m || (m.length === 4 && parseFloat(m[3]) === 0)) continue;
    const [r, g, b] = m.map(Number);
    return 0.2126 * r + 0.7152 * g + 0.0722 * b < 128;
  }
  return false;
};

const ElementPicker = ({
  panelRef,
  anchor,
  query,
  groups,
  category,
  onCategory,
  visible,
  active,
  onActive,
  onPick,
  onMouseDown,
}) => {
  const filtering = !!query;
  const uiLang = getUiLang();
  const dark = useMemo(() => (anchor ? isDarkBackground(anchor.parentElement) : false), [anchor]);
  const total = groups.reduce((n, g) => n + g.items.length, 0);
  const shownGroups =
    category === null ? groups.filter((g) => g.items.length) : groups.filter((g) => g.id === category);

  let index = -1;
  const renderItem = (item) => {
    index += 1;
    const i = index;
    const localized = uiLang === "en" ? null : getLocalizedName(item.selector, uiLang);
    return (
      <div
        key={item.selector}
        role="option"
        aria-selected={i === active}
        className={`lt-picker-item${i === active ? " lt-picker-item--active" : ""}`}
        onMouseDown={(e) => e.preventDefault()} // keep focus in the textarea
        onMouseEnter={() => onActive(i)}
        onClick={() => onPick(item)}
      >
        <div className="lt-picker-item-head">
          <span className="lt-picker-item-label">
            {item.label}
            {localized ? <span className="lt-picker-item-localized"> · {localized}</span> : null}
          </span>
          <code className="lt-picker-item-selector">{item.selector}</code>
        </div>
        <div className="lt-picker-item-desc">{item.description}</div>
      </div>
    );
  };

  const categoryButton = ({ id, label, icon, count, disabled }) => (
    <button
      key={id === null ? "all" : id}
      type="button"
      className={`lt-picker-cat${category === id ? " lt-picker-cat--active" : ""}`}
      disabled={disabled}
      onMouseDown={(e) => e.preventDefault()}
      onClick={() => onCategory(id)}
    >
      <Icon icon={icon} iconSize={13} className="lt-picker-cat-icon" />
      <span className="lt-picker-cat-label">{label}</span>
      {count !== undefined ? <span className="lt-picker-cat-count">{count}</span> : null}
    </button>
  );

  return (
    <div
      className={`lt-picker${dark ? " lt-picker--dark" : ""}`}
      ref={panelRef}
      role="listbox"
      onMouseDown={onMouseDown}
    >
      <div className="lt-picker-body">
        <nav className="lt-picker-cats">
          {filtering
            ? categoryButton({ id: null, label: "All results", icon: "search", count: total })
            : null}
          {groups.map((g) =>
            categoryButton({
              id: g.id,
              label: g.label,
              icon: g.icon,
              count: filtering ? g.items.length : undefined,
              disabled: filtering && g.items.length === 0,
            })
          )}
        </nav>
        <div className="lt-picker-list">
          {total === 0 ? (
            <div className="lt-picker-empty">
              <Icon icon="search" iconSize={16} />
              <span>
                No element matches <b>{query}</b>
              </span>
            </div>
          ) : (
            shownGroups.map((g) => (
              <section key={g.id} className="lt-picker-group">
                <header className="lt-picker-group-label">
                  <Icon icon={g.icon} iconSize={12} />
                  {g.label}
                </header>
                {g.items.map(renderItem)}
              </section>
            ))
          )}
        </div>
      </div>
      <footer className="lt-picker-footer">
        <span className="lt-picker-status">
          {filtering ? (
            <>
              {total} element{total === 1 ? "" : "s"} matching <b>{query}</b>
            </>
          ) : (
            "Keep typing after the / to search every category"
          )}
        </span>
        <span className="lt-picker-keys">
          <Hint keys={["←", "→"]}>category</Hint>
          <Hint keys={["↑", "↓"]}>element</Hint>
          <Hint keys={["↵"]}>insert</Hint>
          <Hint keys={["esc"]}>close</Hint>
        </span>
      </footer>
    </div>
  );
};

export default ElementPicker;
