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
});
