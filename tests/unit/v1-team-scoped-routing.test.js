import { describe, it, expect, vi } from "vitest";

describe("v1 team scoped routing", () => {
  it("passes API key team context into chat handler", async () => {
    vi.resetModules();
    const auth = { apiKeyId: "key-a", teamId: "team-a", userId: "user-a", role: "developer" };
    const handleChat = vi.fn().mockResolvedValue(Response.json({ ok: true }));
    vi.doMock("@/lib/apiKeyAuth", () => ({ authenticateApiKey: vi.fn().mockResolvedValue(auth) }));
    vi.doMock("@/sse/handlers/chat.js", () => ({ handleChat }));
    vi.doMock("open-sse/translator/index.js", () => ({ initTranslators: vi.fn().mockResolvedValue(undefined) }));

    const { POST } = await import("@/app/api/v1/chat/completions/route.js");
    const req = new Request("https://devlens.test/api/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: "Bearer dvl_test", "Content-Type": "application/json" },
      body: JSON.stringify({ model: "code-review", messages: [] }),
    });

    await POST(req);
    expect(handleChat).toHaveBeenCalledWith(req, auth);
  });

  it("scopes /v1/models to API key team", async () => {
    vi.resetModules();
    const auth = { apiKeyId: "key-a", teamId: "team-a", userId: "user-a", role: "developer" };
    const getProviderConnections = vi.fn().mockResolvedValue([]);
    const getCombos = vi.fn().mockResolvedValue([]);
    const getCustomModels = vi.fn().mockResolvedValue([]);
    const getModelAliases = vi.fn().mockResolvedValue({});
    vi.doMock("@/lib/apiKeyAuth", () => ({ authenticateApiKey: vi.fn().mockResolvedValue(auth) }));
    vi.doMock("@/lib/localDb", () => ({ getProviderConnections, getCombos, getCustomModels, getModelAliases }));
    vi.doMock("@/lib/db", () => ({ getDisabledModels: vi.fn().mockResolvedValue({}) }));
    vi.doMock("open-sse/services/kiroModels.js", () => ({ resolveKiroModels: vi.fn() }));

    const { GET } = await import("@/app/api/v1/models/route.js");
    const req = new Request("https://devlens.test/v1/models", { headers: { Authorization: "Bearer dvl_test" } });

    await GET(req);
    expect(getProviderConnections).toHaveBeenCalledWith({ teamId: "team-a", isActive: true });
    expect(getCombos).toHaveBeenCalledWith("team-a");
    expect(getCustomModels).toHaveBeenCalledWith("team-a");
    expect(getModelAliases).toHaveBeenCalledWith("team-a");
  });

  it("scopes /v1/models/[kind] to API key team", async () => {
    vi.resetModules();
    const auth = { apiKeyId: "key-a", teamId: "team-a", userId: "user-a", role: "developer" };
    const getProviderConnections = vi.fn().mockResolvedValue([]);
    const getCombos = vi.fn().mockResolvedValue([]);
    const getCustomModels = vi.fn().mockResolvedValue([]);
    const getModelAliases = vi.fn().mockResolvedValue({});
    vi.doMock("@/lib/apiKeyAuth", () => ({ authenticateApiKey: vi.fn().mockResolvedValue(auth) }));
    vi.doMock("@/lib/localDb", () => ({ getProviderConnections, getCombos, getCustomModels, getModelAliases }));
    vi.doMock("@/lib/db", () => ({ getDisabledModels: vi.fn().mockResolvedValue({}) }));
    vi.doMock("open-sse/services/kiroModels.js", () => ({ resolveKiroModels: vi.fn() }));

    const { GET } = await import("@/app/api/v1/models/[kind]/route.js");
    const req = new Request("https://devlens.test/v1/models/embedding", { headers: { Authorization: "Bearer dvl_test" } });

    await GET(req, { params: Promise.resolve({ kind: "embedding" }) });
    expect(getProviderConnections).toHaveBeenCalledWith({ teamId: "team-a", isActive: true });
  });
});
