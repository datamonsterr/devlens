import { describe, it, expect, vi, beforeEach } from "vitest";

function mockNextResponse() {
  vi.doMock("next/server", () => ({
    NextResponse: { json: (body, init = {}) => new Response(JSON.stringify(body), { status: init.status || 200, headers: init.headers }) },
  }));
}

async function json(res) {
  return res.json();
}

describe("team API flow", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("returns auth Response instead of 500 from manager-only settings", async () => {
    mockNextResponse();
    vi.doMock("@/lib/auth", () => ({ assertManager: vi.fn().mockRejectedValue(new Response(JSON.stringify({ error: "Insufficient permissions" }), { status: 403 })) }));
    vi.doMock("@/lib/localDb", () => ({ getSettings: vi.fn(), updateSettings: vi.fn() }));
    vi.doMock("@/lib/network/outboundProxy", () => ({ applyOutboundProxyEnv: vi.fn() }));
    vi.doMock("open-sse/services/combo.js", () => ({ resetComboRotation: vi.fn() }));

    const { PATCH } = await import("@/app/api/settings/route.js");
    const res = await PATCH(new Request("https://devlens.test/api/settings", { method: "PATCH", body: JSON.stringify({ requireApiKey: true }) }));

    expect(res.status).toBe(403);
    expect(await json(res)).toEqual({ error: "Insufficient permissions" });
  });

  it("scopes provider detail, update, delete to Manager Team", async () => {
    mockNextResponse();
    const requireTeamContext = vi.fn().mockResolvedValue({ teamId: "team-a", userId: "manager-a", role: "manager", isActive: true });
    const requireManagerContext = vi.fn().mockResolvedValue({ teamId: "team-a", userId: "manager-a", role: "manager", isActive: true });
    const getProviderConnectionById = vi.fn().mockResolvedValue({ id: "conn-a", teamId: "team-a", provider: "openai", apiKey: "secret", accessToken: "token" });
    const updateProviderConnection = vi.fn().mockResolvedValue({ id: "conn-a", teamId: "team-a", provider: "openai", apiKey: "secret" });
    const deleteProviderConnection = vi.fn().mockResolvedValue(true);
    vi.doMock("@/lib/auth", () => ({ requireTeamContext, requireManagerContext }));
    vi.doMock("@/models", () => ({ getProviderConnectionById, updateProviderConnection, deleteProviderConnection }));

    const route = await import("@/app/api/providers/[id]/route.js");
    const params = Promise.resolve({ id: "conn-a" });

    expect((await route.GET(new Request("https://devlens.test/api/providers/conn-a"), { params })).status).toBe(200);
    expect(getProviderConnectionById).toHaveBeenCalledWith("conn-a", "team-a");

    expect((await route.PUT(new Request("https://devlens.test/api/providers/conn-a", { method: "PUT", body: JSON.stringify({ name: "Main" }) }), { params })).status).toBe(200);
    expect(updateProviderConnection).toHaveBeenCalledWith("conn-a", { name: "Main" }, "team-a");

    expect((await route.DELETE(new Request("https://devlens.test/api/providers/conn-a", { method: "DELETE" }), { params })).status).toBe(200);
    expect(deleteProviderConnection).toHaveBeenCalledWith("conn-a", "team-a");
  });

  it("rejects invalid RTK Pool updates before DB write", async () => {
    mockNextResponse();
    vi.doMock("@/lib/auth", () => ({ assertManager: vi.fn().mockResolvedValue(undefined), requireTeamContext: vi.fn().mockResolvedValue({ teamId: "team-a" }) }));
    const run = vi.fn();
    vi.doMock("@/lib/db/driver", () => ({ getAdapter: vi.fn().mockResolvedValue({ run }) }));

    const { PUT } = await import("@/app/api/team/rtk-pool/route.js");
    const res = await PUT(new Request("https://devlens.test/api/team/rtk-pool", { method: "PUT", body: JSON.stringify({ amount: -1 }) }));

    expect(res.status).toBe(400);
    expect(await json(res)).toEqual({ error: "amount must be non-negative" });
    expect(run).not.toHaveBeenCalled();
  });

  it("returns RTK Pool history scoped to Team", async () => {
    mockNextResponse();
    vi.doMock("@/lib/auth", () => ({ requireTeamContext: vi.fn().mockResolvedValue({ teamId: "team-a" }) }));
    const adapter = {
      get: vi.fn().mockResolvedValue({ rtkPool: 42 }),
      all: vi.fn().mockResolvedValue([{ action: "allocate", amount: 42, remainingAfter: 42, timestamp: "2026-01-01T00:00:00.000Z" }]),
    };
    vi.doMock("@/lib/db/driver", () => ({ getAdapter: vi.fn().mockResolvedValue(adapter) }));

    const { GET } = await import("@/app/api/team/rtk-pool/route.js");
    const res = await GET();

    expect(res.status).toBe(200);
    expect(await json(res)).toEqual({ rtkPool: 42, active: true, history: [{ action: "allocate", amount: 42, remainingAfter: 42, timestamp: "2026-01-01T00:00:00.000Z" }] });
    expect(adapter.all).toHaveBeenCalledWith(expect.stringContaining("WHERE teamId = ?"), ["team-a"]);
  });

  it("keeps Developer keys scoped to own Team user", async () => {
    mockNextResponse();
    vi.doMock("@/lib/auth", () => ({ requireTeamContext: vi.fn().mockResolvedValue({ teamId: "team-a", userId: "user-a", role: "developer" }) }));
    const adapter = { all: vi.fn().mockResolvedValue([{ id: "key-a", name: "cli", isActive: 1, createdAt: "now" }]) };
    vi.doMock("@/lib/db/driver", () => ({ getAdapter: vi.fn().mockResolvedValue(adapter) }));

    const { GET } = await import("@/app/api/keys/route.js");
    const res = await GET();

    expect(res.status).toBe(200);
    expect(await json(res)).toEqual({ keys: [{ id: "key-a", name: "cli", isActive: true, createdAt: "now" }] });
    expect(adapter.all).toHaveBeenCalledWith(expect.stringContaining("WHERE userId = ?"), ["user-a"]);
  });

  it("removes Team member keys only inside Manager Team", async () => {
    mockNextResponse();
    vi.doMock("@/lib/auth", () => ({ requireManagerContext: vi.fn().mockResolvedValue({ teamId: "team-a", clerkOrgId: "org-a" }) }));
    const adapter = { run: vi.fn().mockResolvedValue({ changes: 1 }) };
    vi.doMock("@/lib/db/driver", () => ({ getAdapter: vi.fn().mockResolvedValue(adapter) }));

    const { DELETE } = await import("@/app/api/team/members/route.js");
    const res = await DELETE(new Request("https://devlens.test/api/team/members?userId=user-a", { method: "DELETE" }));

    expect(res.status).toBe(200);
    expect(adapter.run).toHaveBeenNthCalledWith(1, expect.stringContaining("WHERE id = ? AND teamId = ?"), expect.any(Array));
    expect(adapter.run).toHaveBeenNthCalledWith(2, expect.stringContaining("WHERE userId = ? AND teamId = ?"), ["user-a", "team-a"]);
  });
});
