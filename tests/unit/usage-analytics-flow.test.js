import { describe, it, expect, vi } from "vitest";

const jsonMock = () => ({ NextResponse: { json: (body, init = {}) => new Response(JSON.stringify(body), { status: init.status || 200 }) } });
const readJson = async (res) => JSON.parse(await res.text());

describe("usage analytics API flow", () => {
  it("awaits developer stats query and scopes by team and developer", async () => {
    vi.resetModules();
    const get = vi.fn().mockResolvedValue({ totalRequests: 2, totalPromptTokens: 10, totalCompletionTokens: 15, totalCost: 0.03 });
    vi.doMock("next/server", jsonMock);
    vi.doMock("@/lib/auth", () => ({ requireTeamContext: vi.fn().mockResolvedValue({ teamId: "team-a", userId: "user-a", role: "developer" }) }));
    vi.doMock("@/lib/db/driver", () => ({ getAdapter: vi.fn().mockResolvedValue({ get }) }));
    vi.doMock("@/lib/db", () => ({ getUsageStats: vi.fn() }));
    const { GET } = await import("@/app/api/usage/stats/route.js");
    const res = await GET(new Request("https://devlens.test/api/usage/stats?period=7d"));
    expect(res.status).toBe(200);
    expect(await readJson(res)).toMatchObject({ totalRequests: 2, totalTokens: 25 });
    expect(get.mock.calls[0][0]).toContain("teamId = ? AND userId = ?");
    expect(get.mock.calls[0][1]).toEqual(["team-a", "user-a", expect.any(String)]);
  });

  it("awaits developer chart query and rejects invalid periods", async () => {
    vi.resetModules();
    const all = vi.fn().mockResolvedValue([{ label: "2026-05-24", tokens: 42, cost: 0.1 }]);
    vi.doMock("next/server", jsonMock);
    vi.doMock("@/lib/auth", () => ({ requireTeamContext: vi.fn().mockResolvedValue({ teamId: "team-a", userId: "user-a", role: "developer" }) }));
    vi.doMock("@/lib/db/driver", () => ({ getAdapter: vi.fn().mockResolvedValue({ all }) }));
    vi.doMock("@/lib/db", () => ({ getChartData: vi.fn() }));
    const { GET } = await import("@/app/api/usage/chart/route.js");
    const bad = await GET(new Request("https://devlens.test/api/usage/chart?period=tomorrow"));
    expect(bad.status).toBe(400);
    const res = await GET(new Request("https://devlens.test/api/usage/chart?period=24h"));
    expect(await readJson(res)).toEqual([{ label: "2026-05-24", tokens: 42, cost: 0.1 }]);
    expect(all.mock.calls[0][0]).toContain("teamId = ? AND userId = ?");
    expect(all.mock.calls[0][1]).toEqual(["team-a", "user-a", expect.any(String)]);
  });

  it("streams awaited developer totals", async () => {
    vi.resetModules();
    const get = vi.fn().mockResolvedValue({ totalRequests: 1, totalPromptTokens: 4, totalCompletionTokens: 6, totalCost: 0.02 });
    vi.doMock("@/lib/auth", () => ({ requireTeamContext: vi.fn().mockResolvedValue({ teamId: "team-a", userId: "user-a", role: "developer" }) }));
    vi.doMock("@/lib/db/driver", () => ({ getAdapter: vi.fn().mockResolvedValue({ get }) }));
    vi.doMock("@/lib/db", () => ({ getUsageStats: vi.fn(), getActiveRequests: vi.fn(), statsEmitter: { on: vi.fn(), off: vi.fn() } }));
    const { GET } = await import("@/app/api/usage/stream/route.js");
    const res = await GET(new Request("https://devlens.test/api/usage/stream"));
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("text/event-stream");
    const text = await res.text();
    expect(text).toContain('"totalRequests":1');
    expect(text).not.toContain("{}");
    expect(get.mock.calls[0][1]).toEqual(["team-a", "user-a"]);
  });

  it("preserves auth Response instead of swallowing as 500", async () => {
    vi.resetModules();
    vi.doMock("next/server", jsonMock);
    vi.doMock("@/lib/auth", () => ({ requireManagerContext: vi.fn().mockRejectedValue(new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 })) }));
    vi.doMock("@/lib/db", () => ({ getRequestDetails: vi.fn() }));
    vi.doMock("@/lib/localDb", () => ({ getProviderNodes: vi.fn() }));
    vi.doMock("@/shared/constants/providers", () => ({ AI_PROVIDERS: {}, getProviderByAlias: vi.fn() }));
    const { GET } = await import("@/app/api/usage/providers/route.js");
    const res = await GET(new Request("https://devlens.test/api/usage/providers"));
    expect(res.status).toBe(403);
  });

  it("scopes provider connection usage lookup to manager team", async () => {
    vi.resetModules();
    const getProviderConnectionById = vi.fn().mockResolvedValue(null);
    vi.doMock("next/server", jsonMock);
    vi.doMock("open-sse/index.js", () => ({}));
    vi.doMock("@/lib/auth", () => ({ requireManagerContext: vi.fn().mockResolvedValue({ teamId: "team-a", userId: "manager-a", role: "manager" }) }));
    vi.doMock("@/lib/localDb", () => ({ getProviderConnectionById, updateProviderConnection: vi.fn() }));
    vi.doMock("open-sse/services/usage.js", () => ({ getUsageForProvider: vi.fn() }));
    vi.doMock("open-sse/executors/index.js", () => ({ getExecutor: vi.fn() }));
    vi.doMock("@/lib/network/connectionProxy", () => ({ resolveConnectionProxyConfig: vi.fn() }));
    vi.doMock("@/shared/constants/providers", () => ({ USAGE_APIKEY_PROVIDERS: [] }));
    const { GET } = await import("@/app/api/usage/[connectionId]/route.js");
    const res = await GET(new Request("https://devlens.test/api/usage/conn-b"), { params: Promise.resolve({ connectionId: "conn-b" }) });
    expect(res.status).toBe(404);
    expect(getProviderConnectionById).toHaveBeenCalledWith("conn-b", "team-a");
  });
});
