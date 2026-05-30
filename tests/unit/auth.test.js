import { describe, it, expect, vi, beforeEach } from "vitest";

describe("auth", () => {
  let getUserAuth;
  let requireRole;
  let requireManager;

  beforeEach(async () => {
    vi.resetModules();
  });

  describe("getUserAuth", () => {
    it("returns nulls when no Clerk session", async () => {
      vi.doMock("@clerk/nextjs/server", () => ({
        auth: vi.fn().mockResolvedValue({ userId: null, orgId: null, sessionClaims: {} }),
      }));

      const { getUserAuth: fresh } = await import("@/lib/auth/auth");
      const result = await fresh();
      expect(result.userId).toBeNull();
      expect(result.orgId).toBeNull();
      expect(result.role).toBeNull();
    });

    it("returns userId and role from public_metadata", async () => {
      vi.doMock("@clerk/nextjs/server", () => ({
        auth: vi.fn().mockResolvedValue({
          userId: "clerk_123",
          orgId: "org_456",
          sessionClaims: { public_metadata: { role: "manager" } },
        }),
      }));

      const { getUserAuth: fresh } = await import("@/lib/auth/auth");
      const result = await fresh();
      expect(result.userId).toBe("clerk_123");
      expect(result.orgId).toBe("org_456");
      expect(result.role).toBe("manager");
    });

    it("returns null role when no public_metadata role", async () => {
      vi.doMock("@clerk/nextjs/server", () => ({
        auth: vi.fn().mockResolvedValue({
          userId: "clerk_123",
          orgId: "org_456",
          sessionClaims: {},
        }),
      }));

      const { getUserAuth: fresh } = await import("@/lib/auth/auth");
      const result = await fresh();
      expect(result.userId).toBe("clerk_123");
      expect(result.role).toBeNull();
    });
  });

  describe("requireRole", () => {
    it("returns null when user has allowed role", async () => {
      vi.doMock("@clerk/nextjs/server", () => ({
        auth: vi.fn().mockResolvedValue({
          userId: "u",
          orgId: "o",
          sessionClaims: { public_metadata: { role: "manager" } },
        }),
      }));

      const { requireRole: fresh } = await import("@/lib/auth/auth");
      const handler = fresh("manager");
      const result = await handler();
      expect(result).toBeNull();
    });

    it("returns error when role is missing", async () => {
      vi.doMock("@clerk/nextjs/server", () => ({
        auth: vi.fn().mockResolvedValue({
          userId: "u",
          orgId: "o",
          sessionClaims: {},
        }),
      }));

      const { requireRole: fresh } = await import("@/lib/auth/auth");
      const handler = fresh("manager");
      const result = await handler();
      expect(result.error).toBe("Unauthorized");
      expect(result.status).toBe(401);
    });

    it("returns error when role does not match", async () => {
      vi.doMock("@clerk/nextjs/server", () => ({
        auth: vi.fn().mockResolvedValue({
          userId: "u",
          orgId: "o",
          sessionClaims: { public_metadata: { role: "developer" } },
        }),
      }));

      const { requireRole: fresh } = await import("@/lib/auth/auth");
      const handler = fresh("manager");
      const result = await handler();
      expect(result.error).toBe("Insufficient permissions");
      expect(result.status).toBe(403);
    });

    it("allows manager to access developer-scoped routes via hierarchy", async () => {
      vi.doMock("@clerk/nextjs/server", () => ({
        auth: vi.fn().mockResolvedValue({
          userId: "u",
          orgId: "o",
          sessionClaims: { public_metadata: { role: "manager" } },
        }),
      }));

      const { requireRole: fresh } = await import("@/lib/auth/auth");
      const handler = fresh("developer");
      const result = await handler();
      expect(result).toBeNull();
    });

    it("supports array of allowed roles", async () => {
      vi.doMock("@clerk/nextjs/server", () => ({
        auth: vi.fn().mockResolvedValue({
          userId: "u",
          orgId: "o",
          sessionClaims: { public_metadata: { role: "developer" } },
        }),
      }));

      const { requireRole: fresh } = await import("@/lib/auth/auth");
      const handler = fresh(["manager", "developer"]);
      const result = await handler();
      expect(result).toBeNull();
    });
  });

  describe("requireManager", () => {
    it("is shorthand for requireRole('manager')", async () => {
      vi.doMock("@clerk/nextjs/server", () => ({
        auth: vi.fn().mockResolvedValue({
          userId: "u",
          orgId: "o",
          sessionClaims: { public_metadata: { role: "manager" } },
        }),
      }));

      const { requireManager: fresh } = await import("@/lib/auth/auth");
      const handler = fresh();
      const result = await handler();
      expect(result).toBeNull();
    });
  });
});
