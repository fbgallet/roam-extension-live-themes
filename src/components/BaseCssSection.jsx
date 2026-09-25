import React, { useState } from "react";
import { Button, Checkbox, Collapse, Icon } from "@blueprintjs/core";
import Tooltip from "./LtTooltip";
import { openRoamCssPage } from "../utils/notify";

const countLines = (css) => (css.trim() ? css.split("\n").length : 0);

/**
 * "Base CSS": the css blocks of [[roam/css]] that are not managed by Live
 * Themes. Roam always applies them; the active theme is layered on top.
 * Each block can be excluded from the context sent to the model.
 */
const BaseCssSection = ({ blocks, contextEnabled, onToggleContext, onToggleAll }) => {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState({});
  const totalLines = blocks.reduce((n, b) => n + countLines(b.css), 0);
  const inContext = blocks.filter((b) => b.inContext).length;

  const summary = !blocks.length
    ? "(none)"
    : `(${blocks.length} block${blocks.length > 1 ? "s" : ""}, ${totalLines} lines, always applied)`;

  return (
    <div className="lt-section lt-secondary">
      <button type="button" className="lt-section-toggle" onClick={() => setOpen((v) => !v)}>
        <Icon icon={open ? "chevron-down" : "chevron-right"} />
        Base CSS from [[roam/css]]
        <span className="lt-hint">{summary}</span>
      </button>
      <Collapse isOpen={open}>
        <p className="lt-hint lt-base-intro">
          Your other CSS blocks on [[roam/css]]. Roam always applies them, whatever the active
          theme, and Live Themes never rewrites them. The active theme is a layer applied on top
          of this base.
        </p>
        {blocks.length ? (
          <>
            <p className="lt-hint lt-base-intro">
              {contextEnabled
                ? `Blocks checked below are sent to the model as context (${inContext}/${blocks.length}). Uncheck the ones the model does not need, to save tokens.`
                : "The setting “Read the whole [[roam/css]] page” is off: none of these blocks is sent to the model."}
            </p>
            {contextEnabled ? (
              <div className="lt-base-bulk">
                <span className="lt-hint">Send to the model:</span>
                <Button
                  small
                  minimal
                  icon="tick"
                  disabled={inContext === blocks.length}
                  onClick={() => onToggleAll(true)}
                >
                  All
                </Button>
                <Button
                  small
                  minimal
                  icon="cross"
                  disabled={inContext === 0}
                  onClick={() => onToggleAll(false)}
                >
                  None
                </Button>
              </div>
            ) : null}
            <ul className="lt-base-list">
              {blocks.map((b) => {
                const lines = countLines(b.css);
                const isExpanded = !!expanded[b.uid];
                return (
                  <li key={b.uid}>
                    <div className="lt-base-row">
                      <Tooltip
                        content={
                          b.inContext
                            ? "Sent to the model as read-only context"
                            : "Not sent to the model"
                        }
                        hoverOpenDelay={400}
                      >
                        <Checkbox
                          checked={b.inContext}
                          disabled={!contextEnabled}
                          onChange={(e) => onToggleContext(b.uid, e.target.checked)}
                          className="lt-base-check"
                        />
                      </Tooltip>
                      <button
                        type="button"
                        className="lt-base-path"
                        title={b.path}
                        onClick={() =>
                          setExpanded((prev) => ({ ...prev, [b.uid]: !prev[b.uid] }))
                        }
                      >
                        <Icon icon={isExpanded ? "caret-down" : "caret-right"} />
                        <span className="lt-base-path-text">{b.path}</span>
                      </button>
                      <span className="lt-hint lt-base-lines">
                        {lines} line{lines > 1 ? "s" : ""}
                      </span>
                    </div>
                    <Collapse isOpen={isExpanded}>
                      <pre className="lt-css-preview">{b.css || "/* empty */"}</pre>
                    </Collapse>
                  </li>
                );
              })}
            </ul>
          </>
        ) : (
          <p className="lt-hint lt-base-intro">
            No other CSS block on [[roam/css]]: the active theme is your whole custom CSS.
          </p>
        )}
        <div className="lt-actions">
          <Button small icon="document-open" onClick={openRoamCssPage}>
            Open [[roam/css]] in sidebar
          </Button>
        </div>
      </Collapse>
    </div>
  );
};

export default BaseCssSection;
