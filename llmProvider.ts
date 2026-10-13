// Shared LLM provider selection (client-side).
// The four GoogleGenAI shims read this at request time, so switching the
// provider in the UI applies to the next generate call without a reload.
export type LLMProvider = "gemini" | "deepseek";

const STORAGE_KEY = "ecm_llm_provider";
export const LLM_PROVIDER_EVENT = "ecm-llm-provider-change";

export function getActiveProvider(): LLMProvider {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === "deepseek" || v === "gemini") return v;
  } catch {
    /* localStorage unavailable (SSR/test) */
  }
  return "gemini";
}

export function setActiveProvider(p: LLMProvider): void {
  try {
    localStorage.setItem(STORAGE_KEY, p);
  } catch {
    /* ignore */
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(LLM_PROVIDER_EVENT));
  }
}

// Resolve the effective model for the active provider. Frontends pass a
// Gemini model id (e.g. "gemini-3.5-flash"); DeepSeek maps to "deepseek-chat".
export function resolveModel(model: string): string {
  if (getActiveProvider() === "deepseek") {
    return model?.toLowerCase().startsWith("deepseek") ? model : "deepseek-chat";
  }
  return model;
}
