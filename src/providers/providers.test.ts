import { describe, it, expect, vi } from "vitest";
import { resolveProvider, createAnthropicProvider } from "./index";
import type { VisionProvider } from "./types";

describe("provider factory", () => {
  it("resolves anthropic by default", () => {
    const provider = resolveProvider();
    expect(provider.name).toBe("anthropic");
  });

  it("uses custom provider when passed", () => {
    const custom: VisionProvider = {
      name: "custom",
      defaultModel: "test-model",
      extract: vi.fn(),
    };
    const provider = resolveProvider({ provider: custom });
    expect(provider).toBe(custom);
  });

  it("resolves by provider name", () => {
    const provider = resolveProvider({ providerName: "openai" });
    expect(provider.name).toBe("openai");
  });

  it("throws on unknown provider", () => {
    expect(() => resolveProvider({ providerName: "unknown" })).toThrow("unknown vision provider");
  });

  it("creates anthropic provider", () => {
    const provider = createAnthropicProvider({ model: "claude-3-sonnet-20240229" });
    expect(provider.name).toBe("anthropic");
    expect(provider.defaultModel).toBe("claude-3-sonnet-20240229");
  });
});
