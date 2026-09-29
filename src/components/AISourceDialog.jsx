import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom";
import { Button, Callout, Classes, Dialog, HTMLSelect, InputGroup, Intent, TextArea } from "@blueprintjs/core";
import { DEFAULTS, getSetting, KEYS, setSetting } from "../storage";
import { getLiveAIStatus } from "../ai/generate";
import {
  notifyAIConfigChanged,
  OPENAI_BASE_URL,
  parseModelList,
  SOURCE_ITEMS,
  SOURCES,
} from "../ai/directApi";

const LIVE_AI_URL = "https://github.com/fbgallet/roam-extension-live-ai-assistant";

const read = (key) => String(getSetting(KEYS[key], DEFAULTS[KEYS[key]]) ?? "");

/**
 * Small dialog to choose where the LLM calls go: Live AI (recommended) or,
 * as a basic fallback, OpenAI / an OpenAI-compatible endpoint / OpenRouter
 * with the user's own key. Same values as the Roam settings panel.
 */
const AISourceDialog = ({ isOpen, onClose }) => {
  const [form, setForm] = useState({});
  const [showKey, setShowKey] = useState(false);
  const [liveAI, setLiveAI] = useState(getLiveAIStatus());

  useEffect(() => {
    if (!isOpen) return;
    setForm({
      aiSource: read("aiSource"),
      openaiBaseUrl: read("openaiBaseUrl"),
      openaiApiKey: read("openaiApiKey"),
      openaiModels: parseModelList(read("openaiModels")).join("\n"),
      openrouterApiKey: read("openrouterApiKey"),
      openrouterModels: parseModelList(read("openrouterModels")).join("\n"),
    });
    setShowKey(false);
    setLiveAI(getLiveAIStatus());
  }, [isOpen]);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const source = form.aiSource || SOURCES.liveai;
  const isOpenAI = source === SOURCES.openai;
  const isOpenRouter = source === SOURCES.openrouter;

  const save = async () => {
    for (const [key, value] of Object.entries(form)) {
      const clean = /Models$/.test(key) ? parseModelList(value).join(", ") : String(value).trim();
      await setSetting(KEYS[key], clean);
    }
    notifyAIConfigChanged();
    onClose();
  };

  const keyInput = (key, placeholder) => (
    <InputGroup
      type={showKey ? "text" : "password"}
      value={form[key] || ""}
      onChange={set(key)}
      placeholder={placeholder}
      autoComplete="off"
      spellCheck={false}
      rightElement={
        <Button minimal small icon={showKey ? "eye-off" : "eye-open"} onClick={() => setShowKey((v) => !v)} />
      }
    />
  );

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title="AI source" icon="predictive-analysis" className="lt-source-dialog">
      <div className={`${Classes.DIALOG_BODY} lt-source-body`}>
        <label className="lt-source-row">
          <span className="lt-label">Send requests to</span>
          <HTMLSelect value={source} onChange={set("aiSource")}>
            {SOURCE_ITEMS.map((s) => (
              <option key={s} value={s}>
                {s === SOURCES.liveai ? "Live AI (recommended)" : s}
              </option>
            ))}
          </HTMLSelect>
        </label>

        {source === SOURCES.liveai ? (
          liveAI.ok ? (
            <Callout intent={Intent.SUCCESS} icon="tick-circle">
              Live AI is installed and its public API is enabled: Live Themes uses its models, keys and settings.
            </Callout>
          ) : (
            <Callout intent={Intent.WARNING} icon="warning-sign" title={liveAI.title}>
              {liveAI.message}
            </Callout>
          )
        ) : (
          <>
            {isOpenAI ? (
              <>
                <label className="lt-source-field">
                  <span className="lt-label">Endpoint URL (optional)</span>
                  <InputGroup
                    value={form.openaiBaseUrl || ""}
                    onChange={set("openaiBaseUrl")}
                    placeholder={`${OPENAI_BASE_URL} (empty = OpenAI)`}
                    spellCheck={false}
                  />
                  <span className="lt-hint">
                    Leave empty to use OpenAI. Any OpenAI-compatible server works (e.g.
                    http://localhost:11434/v1 for Ollama, which must allow requests from roamresearch.com).
                  </span>
                </label>
                <label className="lt-source-field">
                  <span className="lt-label">API key{form.openaiBaseUrl ? " (if required)" : ""}</span>
                  {keyInput("openaiApiKey", "sk-…")}
                </label>
                <label className="lt-source-field">
                  <span className="lt-label">Model ids</span>
                  <TextArea
                    value={form.openaiModels || ""}
                    onChange={set("openaiModels")}
                    placeholder="gpt-6-luna"
                    rows={3}
                    fill
                    spellCheck={false}
                  />
                  <span className="lt-hint">One per line. The first one is used by default; pick another in the ⚙ menu of the dialog.</span>
                </label>
              </>
            ) : null}
            {isOpenRouter ? (
              <>
                <label className="lt-source-field">
                  <span className="lt-label">OpenRouter API key</span>
                  {keyInput("openrouterApiKey", "sk-or-…")}
                </label>
                <label className="lt-source-field">
                  <span className="lt-label">Model ids</span>
                  <TextArea
                    value={form.openrouterModels || ""}
                    onChange={set("openrouterModels")}
                    placeholder="openai/gpt-6-luna"
                    rows={3}
                    fill
                    spellCheck={false}
                  />
                  <span className="lt-hint">
                    One per line, as listed on openrouter.ai/models (e.g. openai/gpt-6-luna). The first one is used by default.
                  </span>
                </label>
              </>
            ) : null}
            <p className="lt-hint">
              The key is stored in this graph's extension settings and sent only to {isOpenRouter ? "OpenRouter" : "this endpoint"}.
            </p>
            <Callout icon="lightbulb" className="lt-source-tip">
              This is a basic fallback. With <strong>Live AI</strong> you configure your keys once for all its
              features and get many more models and providers (Anthropic, Google, DeepSeek, Grok, local models…),
              reasoning effort and token usage tracking.{" "}
              {liveAI.ok ? (
                <>Live AI is already available here: choose it above.</>
              ) : (
                <>
                  Install it from Roam Depot (
                  <a href={LIVE_AI_URL} target="_blank" rel="noopener noreferrer">
                    Live AI
                  </a>
                  ) and enable its “Public API” setting.
                </>
              )}
            </Callout>
          </>
        )}
      </div>
      <div className={Classes.DIALOG_FOOTER}>
        <div className={Classes.DIALOG_FOOTER_ACTIONS}>
          <Button onClick={onClose}>Cancel</Button>
          <Button intent={Intent.PRIMARY} onClick={save}>
            Save
          </Button>
        </div>
      </div>
    </Dialog>
  );
};

export default AISourceDialog;

// ---- Mounting (own container: opened from Roam settings, the command palette
// or the Live Themes dialog, above it) ------------------------------------------

const CONTAINER_ID = "live-themes-ai-source-container";

const render = (isOpen) => {
  let el = document.getElementById(CONTAINER_ID);
  if (!el) {
    el = document.createElement("div");
    el.id = CONTAINER_ID;
    document.body.appendChild(el);
  }
  ReactDOM.render(<AISourceDialog isOpen={isOpen} onClose={() => render(false)} />, el);
};

export const openAISourceDialog = () => render(true);

export const unmountAISourceDialog = () => {
  const el = document.getElementById(CONTAINER_ID);
  if (el) {
    ReactDOM.unmountComponentAtNode(el);
    el.remove();
  }
};
