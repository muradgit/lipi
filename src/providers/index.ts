/**
 * Provider registry and factory.
 *
 * Built-in providers (Anthropic, OpenAI, Google) are created on demand.
 * `resolveProvider` picks one based on options / env vars / defaults, then
 * creates and returns it. Callers can also pass a custom provider to skip
 * the factory entirely.
 */
import type { ProviderOptions, VisionProvider } from "./types";
import { createAnthropicProvider } from "./anthropic";
import { createOpenAIProvider } from "./openai";
import { createGoogleProvider } from "./google";

export type { VisionProvider, VisionRequest, VisionResult, VisionSource, ProviderOptions } from "./types";

/** Built-in provider names. */
export type ProviderName = "anthropic" | "openai" | "google";

/** Options passed to resolveProvider. */
export interface ResolveProviderOptions extends ProviderOptions {
  /** A ready-made provider instance — wins over everything. */
  provider?: VisionProvider;
  /** Built-in provider name. Else `LIPI_VISION_PROVIDER`, else "anthropic". */
  providerName?: string;
}

/**
 * Resolve and create the configured provider.
 *
 * - If `opts.provider` is set, use it directly (full custom control).
 * - Else, pick a provider name: `opts.providerName` > `LIPI_VISION_PROVIDER` > "anthropic".
 * - Then create it with `opts.apiKey` and `opts.model` (or their env var defaults).
 */
export function resolveProvider(opts: ResolveProviderOptions = {}): VisionProvider {
  if (opts.provider) return opts.provider;

  const providerName = (opts.providerName ?? process.env.LIPI_VISION_PROVIDER ?? "anthropic").toLowerCase();

  switch (providerName) {
    case "anthropic":
      return createAnthropicProvider({ apiKey: opts.apiKey, model: opts.model, client: opts.client });
    case "openai":
      return createOpenAIProvider({ apiKey: opts.apiKey, model: opts.model, client: opts.client });
    case "google":
      return createGoogleProvider({ apiKey: opts.apiKey, model: opts.model, client: opts.client });
    default:
      throw new Error(`lipi: unknown vision provider "${providerName}"`);
  }
}

export { createAnthropicProvider, createOpenAIProvider, createGoogleProvider };
