import React, { useState } from "react";
import { Button, Collapse, Icon } from "@blueprintjs/core";
import { countCssLines } from "../utils/cssSections";

/**
 * Read-only view of a theme stylesheet, section by section (one collapsible
 * row per `/* === Section === *\/` header, mirroring the blocks of [[roam/css]]).
 * Falls back to a plain <pre> when the CSS has no section header.
 */
const CssSectionsView = ({ sections, emptyText }) => {
  const [open, setOpen] = useState({});
  const titled = sections.filter((s) => s.title);

  if (!sections.length) return <pre className="lt-css-preview">{emptyText}</pre>;
  if (!titled.length) {
    return <pre className="lt-css-preview">{sections.map((s) => s.css).join("\n\n")}</pre>;
  }

  const allOpen = sections.every((_, i) => open[i]);
  const setAll = (value) =>
    setOpen(Object.fromEntries(sections.map((_, i) => [i, value])));

  return (
    <div className="lt-css-sections">
      <div className="lt-base-bulk">
        <Button small minimal icon="expand-all" onClick={() => setAll(true)} disabled={allOpen}>
          Expand all
        </Button>
        <Button
          small
          minimal
          icon="collapse-all"
          onClick={() => setAll(false)}
          disabled={!Object.values(open).some(Boolean)}
        >
          Collapse all
        </Button>
      </div>
      <ul className="lt-base-list">
        {sections.map((s, i) => {
          const lines = countCssLines(s.css);
          const isOpen = !!open[i];
          return (
            <li key={i}>
              <div className="lt-base-row">
                <button
                  type="button"
                  className="lt-base-path"
                  onClick={() => setOpen((prev) => ({ ...prev, [i]: !prev[i] }))}
                >
                  <Icon icon={isOpen ? "caret-down" : "caret-right"} />
                  <span className="lt-base-path-text">
                    {s.title || <em>(no section)</em>}
                  </span>
                </button>
                <span className="lt-hint lt-base-lines">
                  {lines} line{lines > 1 ? "s" : ""}
                </span>
              </div>
              <Collapse isOpen={isOpen}>
                <pre className="lt-css-preview">{s.css}</pre>
              </Collapse>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default CssSectionsView;
