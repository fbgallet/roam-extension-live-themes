import React, { useEffect, useMemo, useRef, useState } from "react";
import { Button, TextArea } from "@blueprintjs/core";
import Tooltip from "./LtTooltip";
import { ROAM_ELEMENTS, searchElements } from "../ai/roamElements";
import ElementPicker from "./ElementPicker";

// Textarea of the natural-language request, with a "/" picker that inserts
// the name of a Roam element (as listed in the catalog) at the caret, so that
// users who do not know Roam's CSS vocabulary can still designate precisely
// what they want to restyle. Typing "/" at the start of a word opens the
// picker: categories on the left (←/→), elements of the selected category on
// the right (↑/↓); the letters typed after "/" filter every category at once;
// Enter or Tab insert, Esc closes. The "Insert element" button opens the
// same picker.

const isBoundary = (ch) => !ch || /\s/.test(ch);

const RequestEditor = ({ value, onChange, onSubmit, disabled, placeholder, actions }) => {
  const inputRef = useRef(null);
  const panelRef = useRef(null);
  const pendingCaret = useRef(null); // caret to restore after a programmatic edit
  const interacting = useRef(false); // mouse is down inside the panel
  const [slashPos, setSlashPos] = useState(null); // index of the "/" that opened the picker
  const [caret, setCaret] = useState(0);
  const [active, setActive] = useState(0);
  const [category, setCategory] = useState(ROAM_ELEMENTS[0].id); // null = all (query mode)

  const open = slashPos !== null && !disabled;
  const query = open ? value.slice(slashPos + 1, caret) : "";
  const filtering = !!query.trim();
  const results = useMemo(() => (open ? searchElements(query) : []), [open, query]);

  // Results per category (catalog order), with a count; in query mode the
  // list can show every category at once (category === null).
  const groups = useMemo(
    () =>
      ROAM_ELEMENTS.map((g) => ({
        id: g.id,
        label: g.label,
        icon: g.icon,
        items: results.filter((r) => r.groupId === g.id),
      })),
    [results]
  );
  const visible = useMemo(() => {
    if (category === null) return results;
    const g = groups.find((x) => x.id === category);
    return g ? g.items : [];
  }, [groups, results, category]);

  const close = () => setSlashPos(null);

  // Browsing (no query): one category at a time, never "all". Filtering:
  // start from all categories, the user may then restrict to one.
  useEffect(() => {
    if (!open) return;
    setCategory(filtering ? null : ROAM_ELEMENTS[0].id);
  }, [open, filtering]);

  const cycleCategory = (dir) => {
    const ids = groups.filter((g) => g.items.length).map((g) => g.id);
    if (filtering) ids.unshift(null);
    if (!ids.length) return;
    const i = ids.indexOf(category);
    setCategory(ids[(i + dir + ids.length) % ids.length]);
  };

  // Close when the caret leaves the query, on a newline, when the "/" is gone,
  // or when nothing matches after a few characters (like Roam's own menu).
  useEffect(() => {
    if (!open) return;
    if (
      caret <= slashPos ||
      value[slashPos] !== "/" ||
      query.includes("\n") ||
      (results.length === 0 && query.length >= 3)
    ) {
      close();
    }
  }, [open, caret, slashPos, value, query, results.length]);

  useEffect(() => setActive(0), [query, category]);

  useEffect(() => {
    if (!open) return;
    const el = panelRef.current?.querySelector(".lt-picker-item--active");
    if (el && el.scrollIntoView) el.scrollIntoView({ block: "nearest" });
  }, [open, active, visible]);

  useEffect(() => {
    if (open && panelRef.current?.scrollIntoView) {
      panelRef.current.scrollIntoView({ block: "nearest" });
    }
  }, [open]);

  // Restore focus and caret after an insertion done outside a keystroke.
  useEffect(() => {
    if (pendingCaret.current == null) return;
    const el = inputRef.current;
    if (el) {
      el.focus();
      el.setSelectionRange(pendingCaret.current, pendingCaret.current);
    }
    pendingCaret.current = null;
  }, [value]);

  // Clicking inside the panel blurs the textarea: give the focus back on
  // mouseup so the user can keep typing (and the picker stays open).
  useEffect(() => {
    const onUp = () => {
      if (interacting.current) {
        interacting.current = false;
        inputRef.current?.focus();
      }
    };
    document.addEventListener("mouseup", onUp);
    return () => document.removeEventListener("mouseup", onUp);
  }, []);

  const syncCaret = (e) => setCaret(e.target.selectionStart);

  const handleChange = (e) => {
    const el = e.target;
    const next = el.value;
    const pos = el.selectionStart;
    onChange(next);
    setCaret(pos);
    if (
      !open &&
      next.length === value.length + 1 &&
      next[pos - 1] === "/" &&
      isBoundary(next[pos - 2])
    ) {
      setSlashPos(pos - 1);
    }
  };

  const insert = (item) => {
    if (slashPos === null) return;
    const el = inputRef.current;
    const end = el ? el.selectionStart : caret;
    const before = value.slice(0, slashPos);
    const after = value.slice(end);
    const text = item.label + (isBoundary(after[0]) && after !== "" ? "" : " ");
    const next = before + text + after;
    const newCaret = before.length + text.length;
    onChange(next);
    pendingCaret.current = newCaret;
    setCaret(newCaret);
    close();
  };

  const openFromButton = () => {
    const el = inputRef.current;
    if (!el) return;
    el.focus();
    const pos = el.selectionStart ?? value.length;
    const before = value.slice(0, pos);
    const after = value.slice(pos);
    const prefix = isBoundary(before[before.length - 1]) ? "" : " ";
    onChange(before + prefix + "/" + after);
    const slash = pos + prefix.length;
    pendingCaret.current = slash + 1;
    setCaret(slash + 1);
    setSlashPos(slash);
  };

  const handleKeyDown = (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      close();
      onSubmit?.();
      return;
    }
    if (!open) return;
    const n = visible.length;
    if (e.key === "ArrowDown" && n) {
      e.preventDefault();
      setActive((i) => (i + 1) % n);
    } else if (e.key === "ArrowUp" && n) {
      e.preventDefault();
      setActive((i) => (i - 1 + n) % n);
    } else if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      e.preventDefault();
      cycleCategory(e.key === "ArrowRight" ? 1 : -1);
    } else if ((e.key === "Enter" || e.key === "Tab") && n) {
      e.preventDefault();
      insert(visible[Math.min(active, n - 1)]);
    } else if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation(); // keep the dialog open
      close();
    }
  };

  const handleBlur = () => {
    setTimeout(() => {
      if (!interacting.current && document.activeElement !== inputRef.current) close();
    }, 150);
  };

  return (
    <div className="lt-request-wrapper">
      <TextArea
        className="lt-request"
        inputRef={(el) => (inputRef.current = el)}
        fill
        growVertically
        value={value}
        placeholder={placeholder}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onKeyUp={syncCaret}
        onSelect={syncCaret}
        onClick={syncCaret}
        onBlur={handleBlur}
        disabled={disabled}
      />
      {open ? (
        <ElementPicker
          panelRef={panelRef}
          anchor={inputRef.current}
          query={query.trim()}
          groups={groups}
          category={category}
          onCategory={setCategory}
          visible={visible}
          active={active}
          onActive={setActive}
          onPick={insert}
          onMouseDown={() => {
            interacting.current = true;
          }}
        />
      ) : null}
      <div className="lt-request-help">
        <div className="lt-request-tips">
          <span className="lt-request-tip">
            Type <span className="lt-key">/</span> to insert the name of a Roam element (page title, bullet, sidebar…)
          </span>
          <span className="lt-request-tip">
            <span className="lt-key">⌘</span>/<span className="lt-key">Ctrl</span> + <span className="lt-key">Enter</span> to generate
          </span>
        </div>
        <div className="lt-request-actions">
          {actions}
          <Tooltip content="Browse the Roam elements by category and insert a name at the cursor" hoverOpenDelay={400}>
            <Button
              small
              icon="insert"
              className="lt-insert-btn"
              onClick={openFromButton}
              disabled={disabled}
            >
              Insert element
            </Button>
          </Tooltip>
        </div>
      </div>
    </div>
  );
};

export default RequestEditor;
