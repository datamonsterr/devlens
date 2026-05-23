import { describe, it, expect, vi } from "vitest";

describe("team management authorization", () => {
  it("requires manager context for roster", async () => {
    vi.resetModules();
    vi.doMock("next/server", () => ({ NextResponse: { json: (body, init = {}) => new Response(JSON.stringify(body), { status: init.status || 200 }) } }));
    vi.doMock("@/lib/auth", () => ({ requireManagerContext: vi.fn().mockRejectedValue(new Response(JSON.stringify({ error: "Insufficient permissions" }), { status: 403 })) }));
    const { GET } = await import("@/app/api/team/members/route.js");
    await expect(GET()).rejects.toMatchObject({ status: 403 });
  });
});
