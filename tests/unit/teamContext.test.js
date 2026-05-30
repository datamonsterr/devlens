import { describe, it, expect, vi, beforeEach } from "vitest";

const mockAuth = vi.fn();
const mockVerifyToken = vi.fn();
const mockCookiesGet = vi.fn();
const mockCookiesObj = { get: mockCookiesGet };

vi.mock("@clerk/nextjs/server", () => ({ auth: mockAuth }));
vi.mock("./dashboardSession.js", () => ({ verifyDashboardAuthToken: mockVerifyToken }));
vi.mock("next/headers", () => ({ cookies: vi.fn().mockResolvedValue(mockCookiesObj) }));

describe("teamContext", () => {
  let mockAdapter;

  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();

    mockAuth.mockResolvedValue({ userId: null, orgId: null });
    mockVerifyToken.mockResolvedValue(false);
    mockCookiesGet.mockReturnValue(undefined);

    mockAdapter = {
      get: vi.fn(),
      run: vi.fn(),
    };

    vi.doMock("@/lib/db/driver", () => ({
      getAdapter: vi.fn().mockResolvedValue(mockAdapter),
    }));
  });

  describe("requireTeamContext", () => {
    it("throws when no auth context and no dev fallback", async () => {
      const { requireTeamContext: fresh } = await import("@/lib/auth/teamContext");
      await expect(fresh()).rejects.toSatisfy(
        (e) => e instanceof Response && e.status === 403
      );
    });
  });

  describe("role resolution", () => {
    async function setupSession(cfg) {
      mockAuth.mockResolvedValue({
        userId: cfg.userId || "clerk_u",
        orgId: cfg.orgId || "org_test",
        orgRole: cfg.orgRole || "org:admin",
        sessionClaims: cfg.sessionClaims,
      });

      if (cfg.mockTeam) {
        mockAdapter.get.mockImplementation((sql, params) => {
          if (sql.includes("teams WHERE clerkOrgId")) {
            return Promise.resolve(cfg.mockTeam);
          }
          if (sql.includes("users WHERE clerkUserId")) {
            return Promise.resolve(cfg.mockUser || { id: "u", role: cfg.role || "developer", isActive: 1 });
          }
          return Promise.resolve(null);
        });
      } else {
        mockAdapter.get.mockResolvedValue(null);
      }

      mockAdapter.run.mockResolvedValue({});
    }

    it("allows manager to access manager route", async () => {
      await setupSession({
        orgRole: "org:admin",
        sessionClaims: { org_name: "Test", orgs: [{ id: "test_org" }] },
      });
      const { requireManagerContext: fresh } = await import("@/lib/auth/teamContext");
      const ctx = await fresh();
      expect(ctx.role).toBe("manager");
    });

    it("allows manager to access developer route via hierarchy", async () => {
      await setupSession({
        orgRole: "org:admin",
        sessionClaims: { org_name: "Test", orgs: [{ id: "test_org" }] },
      });
      const { requireTeamRole: fresh } = await import("@/lib/auth/teamContext");
      const ctx = await fresh("developer");
      expect(ctx.role).toBe("manager");
    });

    it("rejects developer accessing manager route", async () => {
      await setupSession({
        orgRole: "org:member",
        sessionClaims: { org_name: "Dev", orgs: [{ id: "dev_org" }] },
      });
      const { requireTeamRole: fresh } = await import("@/lib/auth/teamContext");
      await expect(fresh("manager")).rejects.toSatisfy(
        (e) => e instanceof Response && e.status === 403
      );
    });

    it("uses public_metadata role when set to manager", async () => {
      await setupSession({
        orgRole: "org:member",
        sessionClaims: {
          org_name: "Override",
          orgs: [{ id: "override_org" }],
          public_metadata: { role: "manager" },
        },
      });
      const { requireManagerContext: fresh } = await import("@/lib/auth/teamContext");
      const ctx = await fresh();
      expect(ctx.role).toBe("manager");
    });

    it("uses unsafe_metadata role fallback", async () => {
      await setupSession({
        orgRole: "org:member",
        sessionClaims: {
          org_name: "Unsafe",
          orgs: [{ id: "unsafe_org" }],
          unsafe_metadata: { role: "manager" },
        },
      });
      const { requireManagerContext: fresh } = await import("@/lib/auth/teamContext");
      const ctx = await fresh();
      expect(ctx.role).toBe("manager");
    });
  });

  describe("team auto-creation", () => {
    it("returns existing team when found", async () => {
      mockAuth.mockResolvedValue({
        userId: "clerk_u",
        orgId: "existing_org",
        orgRole: "org:admin",
        sessionClaims: { org_name: "Existing Team", orgs: [{ id: "existing_org" }] },
      });

      mockAdapter.get.mockImplementation((sql, params) => {
        if (sql.includes("teams WHERE clerkOrgId")) {
          return Promise.resolve({
            id: "team_existing",
            name: "Existing Team",
            clerkOrgId: "existing_org",
            rtkPool: 500,
          });
        }
        if (sql.includes("users WHERE clerkUserId")) {
          return Promise.resolve({ id: "user_existing", role: "manager", isActive: 1 });
        }
        return Promise.resolve(null);
      });

      const { getTeamContext: fresh } = await import("@/lib/auth/teamContext");
      const ctx = await fresh();

      expect(ctx.teamId).toBe("team_existing");
      expect(ctx.teamName).toBe("Existing Team");
      expect(ctx.role).toBe("manager");
      expect(ctx.rtkPool).toBe(500);
    });

    it("creates new team and user when none exist", async () => {
      mockAuth.mockResolvedValue({
        userId: "new_clerk_user",
        orgId: "new_org",
        orgRole: "org:admin",
        sessionClaims: { org_name: "New Team", orgs: [{ id: "new_org" }] },
      });

      mockAdapter.get.mockResolvedValue(null);
      mockAdapter.run.mockResolvedValue({});

      const { getTeamContext: fresh } = await import("@/lib/auth/teamContext");
      const ctx = await fresh();

      expect(ctx.teamId).toBeDefined();
      expect(ctx.teamName).toBe("New Team");
      expect(ctx.role).toBe("manager");
      expect(mockAdapter.run).toHaveBeenCalled();
    });

    it("handles global user migration (user exists but in different team)", async () => {
      mockAuth.mockResolvedValue({
        userId: "global_user",
        orgId: "new_team_org",
        orgRole: "org:admin",
        sessionClaims: { org_name: "New Team", orgs: [{ id: "new_team_org" }] },
      });

      mockAdapter.get.mockImplementation((sql, params) => {
        if (sql.includes("teams WHERE clerkOrgId")) {
          return Promise.resolve(null);
        }
        if (sql.includes("users WHERE clerkUserId AND teamId")) {
          return Promise.resolve(null);
        }
        if (sql.includes("users WHERE clerkUserId")) {
          // global user already exists
          if (sql.includes("AND teamId")) return Promise.resolve(null);
          return Promise.resolve({ id: "global_user_id", role: "developer" });
        }
        return Promise.resolve(null);
      });

      mockAdapter.run.mockResolvedValue({});

      const { getTeamContext: fresh } = await import("@/lib/auth/teamContext");
      const ctx = await fresh();

      expect(ctx.userId).toBe("global_user_id");
      expect(ctx.role).toBe("manager");
    });
  });
});
