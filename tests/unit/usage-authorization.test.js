import { describe, it, expect, vi } from "vitest";

describe("usage authorization", () => {
  it("denies team dashboard when manager context is unavailable", async () => {
    vi.resetModules();
    vi.doMock("next/server", () => ({ NextResponse: { json: (body, init = {}) => new Response(JSON.stringify(body), { status: init.status || 200 }) } }));
    vi.doMock("@/lib/auth", () => ({ requireManagerContext: vi.fn().mockRejectedValue(new Response(JSON.stringify({ error: "Insufficient permissions" }), { status: 403 })) }));
    const { GET } = await import("@/app/api/usage/dashboard/route.js");
    await expect(GET(new Request("https://devlens.test/api/usage/dashboard"))).rejects.toMatchObject({ status: 403 });
  });

  it("personal usage uses current developer context", async () => {
    vi.resetModules();
    const all = vi.fn().mockReturnValue([]);
    vi.doMock("next/server", () => ({ NextResponse: { json: (body, init = {}) => new Response(JSON.stringify(body), { status: init.status || 200 }) } }));
    vi.doMock("@/lib/auth", () => ({ requireTeamContext: vi.fn().mockResolvedValue({ teamId: "team-a", userId: "user-a", role: "developer", isActive: true }) }));
    vi.doMock("@/lib/db/driver", () => ({ getAdapter: vi.fn().mockResolvedValue({ all }) }));
    const { GET } = await import("@/app/api/usage/me/route.js");
    const res = await GET(new Request("https://devlens.test/api/usage/me"));
    expect(res.status).toBe(200);
    expect(all.mock.calls[0][1]).toEqual(["team-a", "user-a", expect.any(String)]);
  });
});
