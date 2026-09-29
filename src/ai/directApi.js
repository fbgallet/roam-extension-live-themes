// Minimal fallback to Live AI: calls an OpenAI-compatible Chat Completions
// endpoint (OpenAI, a local/compatible server, or OpenRouter) directly from the
// browser, with the user's own key. Deliberately basic (one model list per
// source, no per-model settings): Live AI remains the recommended source.

import { DEFAULTS, getSetting, KEYS } from "../storage";

// Values of the "AI source" setting (Roam's select stores the displayed item).
export const SOURCES = {
  liveai: "Live AI",
  openai: "OpenAI (or compatible)",
  openrouter: "OpenRouter",
};
export const SOURCE_ITEMS = [SOURCES.liveai, SOURCES.openai, SOURCES.openrouter];

export const OPENAI_BASE_URL = "https://api.openai.com/v1";
export const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";

/** "liveai" | "openai" | "openrouter" */
export const getSource = () => {
  const stored = getSetting(KEYS.aiSource, DEFAULTS[KEYS.aiSource]);
  if (stored === SOURCES.openai) return "openai";
  if (stored === SOURCES.openrouter) return "openrouter";
  return "liveai";
};

/** Model ids typed by the user: one per line or comma separated. */
export const parseModelList = (text) =>
  [...new Set(String(text || "").split(/[\n,]/).map((s) => s.trim()).filter(Boolean))];

const normalizeBaseUrl = (url) => {
  let u = String(url || "").trim().replace(/\/+$/, "");
  // Accept a full ".../chat/completions" URL as well as the base URL.
  u = u.replace(/\/chat\/completions$/, "");
  return u;
};

export const getDirectConfig = (source = getSource()) => {
  if (source === "openrouter") {
    return {
      source,
      label: "OpenRouter",
      baseUrl: OPENROUTER_BASE_URL,
      custom: false,
      apiKey: String(getSetting(KEYS.openrouterApiKey, "") || "").trim(),
      models: parseModelList(getSetting(KEYS.openrouterModels, DEFAULTS[KEYS.openrouterModels])),
    };
  }
  const baseUrl = normalizeBaseUrl(getSetting(KEYS.openaiBaseUrl, ""));
  return {
    source: "openai",
    label: baseUrl ? "OpenAI-compatible" : "OpenAI",
    baseUrl: baseUrl || OPENAI_BASE_URL,
    custom: !!baseUrl,
    apiKey: String(getSetting(KEYS.openaiApiKey, "") || "").trim(),
    models: parseModelList(getSetting(KEYS.openaiModels, DEFAULTS[KEYS.openaiModels])),
  };
};

/** Selected model of the direct source: the stored one if still listed, else the first. */
export const resolveDirectModel = (config = getDirectConfig()) => {
  const stored = getSetting(KEYS.directModel, "");
  return config.models.includes(stored) ? stored : config.models[0] || null;
};

export const getDirectStatus = (source = getSource()) => {
  const config = getDirectConfig(source);
  // A custom (e.g. local) endpoint may not need any key.
  if (!config.apiKey && !config.custom) {
    return {
      ok: false,
      reason: "no-key",
      title: `No ${config.label} API key`,
      message: `The AI source is ${config.label}, but no API key is set. Add it in the AI source configuration (or in Roam settings → Live Themes), or use Live AI instead.`,
    };
  }
  if (!config.models.length) {
    return {
      ok: false,
      reason: "no-model",
      title: "No model id",
      message: `The AI source is ${config.label}, but its model list is empty. Add at least one model id in the AI source configuration.`,
    };
  }
  return { ok: true, reason: "ok", title: "", message: "" };
};

// ---- Call ------------------------------------------------------------------

const readError = async (res) => {
  let detail = "";
  try {
    const body = await res.text();
    try {
      const json = JSON.parse(body);
      detail = json?.error?.message || json?.message || body;
    } catch (e) {
      detail = body;
    }
  } catch (e) {
    detail = "";
  }
  return String(detail || res.statusText || "").slice(0, 500);
};

const buildBody = ({ config, model, messages, thinking, withReasoning }) => {
  const body = { model, messages, stream: true };
  if (thinking && withReasoning) {
    // Only where the parameter is known to exist: a compatible (local) server
    // may reject unknown fields, and OpenAI rejects it for non-reasoning models
    // (the call is then retried without it).
    if (config.source === "openrouter") body.reasoning = { effort: "medium" };
    else if (!config.custom) body.reasoning_effort = "medium";
  }
  return body;
};

const post = (config, body, signal) => {
  const headers = { "Content-Type": "application/json" };
  if (config.apiKey) headers.Authorization = `Bearer ${config.apiKey}`;
  if (config.source === "openrouter") {
    headers["HTTP-Referer"] = "https://roamresearch.com";
    headers["X-Title"] = "Live Themes (Roam Research)";
  }
  return fetch(`${config.baseUrl}/chat/completions`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
    signal,
  });
};

/** Reads an SSE Chat Completions stream; returns { text, model }. */
const readStream = async (res, onChunk) => {
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let text = "";
  let model = null;
  const handleLine = (line) => {
    const trimmed = line.trim();
    // Other lines are SSE comments (e.g. OpenRouter's keep-alive) or fields.
    if (!trimmed.startsWith("data:")) return;
    const data = trimmed.slice(5).trim();
    if (!data || data === "[DONE]") return;
    let json;
    try {
      json = JSON.parse(data);
    } catch (e) {
      return;
    }
    if (json.error) throw new Error(json.error.message || JSON.stringify(json.error));
    if (json.model) model = json.model;
    const piece = json.choices?.[0]?.delta?.content;
    if (typeof piece === "string" && piece) {
      text += piece;
      if (onChunk) onChunk(piece);
    }
  };
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop();
    lines.forEach(handleLine);
  }
  if (buffer) handleLine(buffer);
  return { text, model };
};

/**
 * Same contract as the part of LiveAI_API.generate used by Live Themes.
 * @param {object} p
 * @param {string|Array<{role,content}>} p.prompt
 * @param {string} p.systemPrompt
 * @param {boolean} p.thinking
 * @param {(chunk:string)=>void} p.onChunk
 * @param {AbortSignal} p.signal
 * @returns {Promise<{text:string, model:string, provider:string}>}
 */
export async function directGenerate({ prompt, systemPrompt, thinking, onChunk, signal }) {
  const config = getDirectConfig();
  const status = getDirectStatus(config.source);
  if (!status.ok) throw new Error(status.message);
  const model = resolveDirectModel(config);
  const messages = [
    ...(systemPrompt ? [{ role: "system", content: systemPrompt }] : []),
    ...(Array.isArray(prompt) ? prompt : [{ role: "user", content: prompt }]),
  ];

  const send = async (withReasoning) => {
    try {
      return await post(config, buildBody({ config, model, messages, thinking, withReasoning }), signal);
    } catch (e) {
      if (e?.name === "AbortError") throw e;
      // fetch only throws on network/CORS failures.
      throw new Error(
        `Could not reach ${config.baseUrl} (${e?.message || e}).` +
          (config.custom
            ? " A local server must accept requests from https://roamresearch.com (CORS), e.g. OLLAMA_ORIGINS for Ollama."
            : "")
      );
    }
  };

  let res = await send(true);
  if (res.status === 400 && thinking) {
    const detail = await readError(res);
    if (!/reasoning/i.test(detail)) throw new Error(`${config.label} error 400: ${detail}`);
    res = await send(false);
  }
  if (!res.ok) {
    const detail = await readError(res);
    const hint =
      res.status === 401 ? " Check the API key." : res.status === 404 ? ` Check the model id “${model}” and the endpoint URL.` : "";
    throw new Error(`${config.label} error ${res.status}: ${detail}${hint}`);
  }

  // A server may ignore `stream` and answer with plain JSON.
  if (!(res.headers.get("content-type") || "").includes("text/event-stream")) {
    const json = await res.json();
    const text = json?.choices?.[0]?.message?.content || "";
    if (text && onChunk) onChunk(text);
    return { text, model: json?.model || model, provider: config.label };
  }
  const { text, model: usedModel } = await readStream(res, onChunk);
  return { text, model: usedModel || model, provider: config.label };
}

// ---- Change notification ---------------------------------------------------
// The AI source can be changed from Roam settings or from the AI source dialog
// while the Live Themes dialog is open: it refreshes its status and models.

const listeners = new Set();
export const subscribeAIConfig = (fn) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};
export const notifyAIConfigChanged = () => listeners.forEach((fn) => fn());
