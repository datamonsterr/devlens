import { describe, it, expect, vi, afterEach } from "vitest";

const originalEnv = { ...process.env };

afterEach(() => {
  vi.resetModules();
  vi.unstubAllEnvs();
  process.env = { ...originalEnv };
});

describe("tunnel Vercel behavior", () => {
  it("returns stable Vercel endpoint status without local tunnel process", async () => {
    vi.stubEnv("VERCEL", "1");
    vi.stubEnv("VERCEL_URL", "devlens-preview.vercel.app");
    const cloudflared = await import("@/lib/tunnel/cloudflared.js");
    const spawnSpy = vi.spyOn(cloudflared, "spawnQuickTunnel");

    const { getTunnelStatus, enableTunnel } = await import("@/lib/tunnel/tunnelManager.js");

    await expect(getTunnelStatus()).resolves.toMatchObject({
      enabled: true,
      settingsEnabled: true,
      publicUrl: "https://devlens-preview.vercel.app",
      unsupported: true,
      running: false,
    });
    await expect(enableTunnel()).resolves.toMatchObject({
      success: false,
      unsupported: true,
      publicUrl: "https://devlens-preview.vercel.app",
    });
    expect(spawnSpy).not.toHaveBeenCalled();
  });

  it("preserves local tunnel status path outside Vercel", async () => {
    vi.stubEnv("VERCEL", "");
    vi.doMock("@/lib/localDb", () => ({ getSettings: vi.fn().mockResolvedValue({ tunnelEnabled: true }), updateSettings: vi.fn() }));
    vi.doMock("@/lib/tunnel/state.js", () => ({
      loadState: vi.fn(() => ({ shortId: "abc123", tunnelUrl: "https://direct.trycloudflare.com" })),
      saveState: vi.fn(),
      generateShortId: vi.fn(() => "abc123"),
      clearPid: vi.fn(),
    }));
    vi.doMock("@/lib/tunnel/cloudflared.js", () => ({
      spawnQuickTunnel: vi.fn(),
      killCloudflared: vi.fn(),
      isCloudflaredRunning: vi.fn(() => true),
      setUnexpectedExitHandler: vi.fn(),
    }));
    vi.doMock("@/lib/tunnel/networkProbe.js", () => ({ waitForHealth: vi.fn(), probeUrlAlive: vi.fn() }));

    const { getTunnelStatus } = await import("@/lib/tunnel/tunnelManager.js");

    await expect(getTunnelStatus()).resolves.toMatchObject({
      enabled: true,
      settingsEnabled: true,
      tunnelUrl: "https://direct.trycloudflare.com",
      publicUrl: "https://rabc123.abc-tunnel.us",
      running: true,
    });
  });
});
