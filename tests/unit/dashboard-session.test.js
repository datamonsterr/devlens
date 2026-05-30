import { describe, it, expect, vi, beforeEach } from "vitest";

describe("dashboardSession", () => {
  let createDashboardAuthToken;
  let verifyDashboardAuthToken;
  let getDashboardAuthSession;
  let shouldUseSecureCookie;
  let setDashboardAuthCookie;
  let clearDashboardAuthCookie;

  beforeEach(async () => {
    vi.resetModules();
    process.env.JWT_SECRET = "test-secret-for-unit-tests-32bytes!!";
    process.env.AUTH_COOKIE_SECURE = "false";

    vi.doMock("@/lib/dataDir", () => ({
      DATA_DIR: "/tmp/devlens-test-data",
    }));

    const mod = await import("@/lib/auth/dashboardSession");
    createDashboardAuthToken = mod.createDashboardAuthToken;
    verifyDashboardAuthToken = mod.verifyDashboardAuthToken;
    getDashboardAuthSession = mod.getDashboardAuthSession;
    shouldUseSecureCookie = mod.shouldUseSecureCookie;
    setDashboardAuthCookie = mod.setDashboardAuthCookie;
    clearDashboardAuthCookie = mod.clearDashboardAuthCookie;
  });

  describe("createDashboardAuthToken + verifyDashboardAuthToken", () => {
    it("creates token that verifies successfully", async () => {
      const token = await createDashboardAuthToken({ role: "manager" });
      expect(token).toBeTypeOf("string");
      expect(token.split(".")).toHaveLength(3);

      const valid = await verifyDashboardAuthToken(token);
      expect(valid).toBe(true);
    });

    it("rejects invalid token", async () => {
      expect(await verifyDashboardAuthToken("not.a.token")).toBe(false);
    });

    it("rejects null/empty token", async () => {
      expect(await verifyDashboardAuthToken(null)).toBe(false);
      expect(await verifyDashboardAuthToken("")).toBe(false);
    });

    it("rejects tampered token", async () => {
      const token = await createDashboardAuthToken();
      const parts = token.split(".");
      const tampered = parts[0] + "." + "x".repeat(parts[1].length) + "." + parts[2];
      expect(await verifyDashboardAuthToken(tampered)).toBe(false);
    });
  });

  describe("getDashboardAuthSession", () => {
    it("returns payload with claims", async () => {
      const token = await createDashboardAuthToken({ teamId: "team-1", role: "developer" });
      const session = await getDashboardAuthSession(token);
      expect(session).not.toBeNull();
      expect(session.authenticated).toBe(true);
      expect(session.teamId).toBe("team-1");
      expect(session.role).toBe("developer");
    });

    it("returns null for invalid token", async () => {
      expect(await getDashboardAuthSession("bad.token.here")).toBeNull();
    });

    it("returns null for null token", async () => {
      expect(await getDashboardAuthSession(null)).toBeNull();
    });
  });

  describe("shouldUseSecureCookie", () => {
    it("returns false when not forced and no https", () => {
      const req = new Request("http://localhost:3000/login");
      expect(shouldUseSecureCookie(req)).toBe(false);
    });

    it("returns true when AUTH_COOKIE_SECURE is set", () => {
      const prev = process.env.AUTH_COOKIE_SECURE;
      process.env.AUTH_COOKIE_SECURE = "true";
      try {
        expect(shouldUseSecureCookie(new Request("http://localhost"))).toBe(true);
      } finally {
        process.env.AUTH_COOKIE_SECURE = prev;
      }
    });

    it("returns true when x-forwarded-proto is https", () => {
      const req = new Request("http://localhost", {
        headers: { "x-forwarded-proto": "https" },
      });
      expect(shouldUseSecureCookie(req)).toBe(true);
    });
  });

  describe("setDashboardAuthCookie", () => {
    it("sets auth_token cookie", async () => {
      const cookieStore = { set: vi.fn() };
      const req = new Request("http://localhost/login");

      await setDashboardAuthCookie(cookieStore, req, { role: "manager" });

      expect(cookieStore.set).toHaveBeenCalledWith(
        "auth_token",
        expect.any(String),
        expect.objectContaining({
          httpOnly: true,
          path: "/",
        })
      );
    });
  });

  describe("clearDashboardAuthCookie", () => {
    it("deletes auth_token cookie", () => {
      const cookieStore = { delete: vi.fn() };
      clearDashboardAuthCookie(cookieStore);
      expect(cookieStore.delete).toHaveBeenCalledWith("auth_token");
    });
  });
});
