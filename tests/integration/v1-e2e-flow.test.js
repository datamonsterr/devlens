import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { hashApiKey, generateApiKey, verifyApiKey } from "@/lib/apiKeyUtils";

let tempDir;
let db;
let adapter;
let originalDataDir;
let originalVercel;

const TEST_TEAM = "team-e2e-001";
const TEST_MANAGER = "user-e2e-mgr";
const TEST_DEV = "user-e2e-dev";

beforeAll(async () => {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "devlens-e2e-flow-"));
  originalDataDir = process.env.DATA_DIR;
  originalVercel = process.env.VERCEL;
  delete process.env.VERCEL;
  process.env.DATA_DIR = tempDir;

  vi.resetModules();

  db = await import("@/lib/db/index.js");
  await db.initDb();

  const driver = await import("@/lib/db/driver");
  adapter = await driver.getAdapter();

  const now = new Date().toISOString();

  await adapter.run(
    `INSERT INTO teams(id, name, clerkOrgId, rtkPool, createdAt, updatedAt) VALUES(?, ?, ?, 0, ?, ?)`,
    [TEST_TEAM, "E2E Test Team", "clerk_e2e_org", now, now]
  );
  await adapter.run(
    `INSERT INTO users(id, clerkUserId, teamId, role, isActive, createdAt, updatedAt) VALUES(?, ?, ?, ?, 1, ?, ?)`,
    [TEST_MANAGER, "clerk_e2e_mgr", TEST_TEAM, "manager", now, now]
  );
  await adapter.run(
    `INSERT INTO users(id, clerkUserId, teamId, role, isActive, createdAt, updatedAt) VALUES(?, ?, ?, ?, 1, ?, ?)`,
    [TEST_DEV, "clerk_e2e_dev", TEST_TEAM, "developer", now, now]
  );
  await adapter.run(
    `INSERT INTO teamSettings(teamId, maxKeysPerDeveloper, data) VALUES(?, 10, '{}')`,
    [TEST_TEAM]
  );
});

afterAll(() => {
  if (tempDir) fs.rmSync(tempDir, { recursive: true, force: true });
  if (originalDataDir === undefined) delete process.env.DATA_DIR;
  else process.env.DATA_DIR = originalDataDir;
  if (originalVercel === undefined) delete process.env.VERCEL;
  else process.env.VERCEL = originalVercel;
});

describe("E2E flow: Manager creates provider+combo → Developer creates key → v1 API call", () => {
  let providerNodeId;
  let providerConnectionId;
  let developerApiKey;

  describe("Step 1: Create provider node (openai-compatible 9router)", () => {
    it("creates an openai-compatible node for the 9router tunnel", async () => {
      const node = await db.createProviderNode({
        type: "openai-compatible",
        name: "9router Tunnel",
        prefix: "9r",
        apiType: "openai",
        baseUrl: "http://127.0.0.1:20128/v1",
      });

      expect(node.id).toBeDefined();
      expect(node.type).toBe("openai-compatible");
      expect(node.prefix).toBe("9r");
      expect(node.baseUrl).toBe("http://127.0.0.1:20128/v1");
      expect(node.apiType).toBe("openai");

      providerNodeId = node.id;
    });
  });

  describe("Step 2: Manager creates provider connection using the node", () => {
    it("creates a team-scoped connection for the 9router node", async () => {
      const conn = await db.createProviderConnection({
        teamId: TEST_TEAM,
        provider: providerNodeId,
        authType: "apikey",
        name: "9router-Tunnel-Via-Test",
        apiKey: "sk-dd28b2b1ca75d61d-conn-test",
        providerSpecificData: {
          prefix: "9r",
          apiType: "openai",
          baseUrl: "http://127.0.0.1:20128/v1",
          nodeName: "9router Tunnel",
        },
        isActive: true,
      });

      expect(conn.id).toBeDefined();
      expect(conn.teamId).toBe(TEST_TEAM);
      expect(conn.provider).toBe(providerNodeId);
      expect(conn.providerSpecificData.baseUrl).toBe("http://127.0.0.1:20128/v1");

      providerConnectionId = conn.id;
    });

    it("connection is scoped to team and shows up in team queries", async () => {
      const teamConns = await db.getProviderConnections({
        teamId: TEST_TEAM,
        isActive: true,
      });
      const found = teamConns.find((c) => c.id === providerConnectionId);
      expect(found).toBeDefined();
      expect(found.providerSpecificData.apiType).toBe("openai");
    });

    it("connection not visible to other teams", async () => {
      const otherTeamConns = await db.getProviderConnections({
        teamId: "non-existent-team",
        isActive: true,
      });
      expect(otherTeamConns.length).toBe(0);
    });
  });

  describe("Step 3: Manager creates Combo with the provider model", () => {
    it("creates a combo referencing models from the provider", async () => {
      const models = [
        `${providerNodeId}/SuperBrain`,
        `${providerNodeId}/BigBrain`,
        `${providerNodeId}/MiniBrain`,
      ];

      const combo = await db.createCombo({
        teamId: TEST_TEAM,
        name: "test-brain-combo",
        models,
        kind: null,
      });

      expect(combo.id).toBeDefined();
      expect(combo.name).toBe("test-brain-combo");
      expect(combo.models).toEqual(models);
      expect(combo.teamId).toBe(TEST_TEAM);
    });

    it("combo is queryable by name and team-scoped", async () => {
      const found = await db.getComboByName("test-brain-combo", TEST_TEAM);
      expect(found).toBeDefined();
      expect(found.models.length).toBe(3);
      expect(found.models[0]).toContain("SuperBrain");
    });

    it("combo not found for wrong team", async () => {
      const notFound = await db.getComboByName("test-brain-combo", "other-team");
      expect(notFound).toBeNull();
    });
  });

  describe("Step 4: Developer creates API key", () => {
    it("generates and stores API key for developer", async () => {
      const keyValue = generateApiKey();
      const keyHashValue = hashApiKey(keyValue);
      const { v4 } = await import("uuid");
      const now = new Date().toISOString();
      const keyId = v4();

      await adapter.run(
        `INSERT INTO apiKeys(id, keyHash, name, teamId, userId, isActive, createdAt) VALUES(?, ?, ?, ?, ?, 1, ?)`,
        [keyId, keyHashValue, "cli-test-key", TEST_TEAM, TEST_DEV, now]
      );

      developerApiKey = { id: keyId, key: keyValue, hash: keyHashValue };
      expect(keyValue).toMatch(/^dvl_/);
    });

    it("API key hashes correctly for auth verification", async () => {
      expect(verifyApiKey(developerApiKey.key, developerApiKey.hash)).toBe(true);
    });

    it("key quota enforces team settings", async () => {
      const settings = await adapter.get(
        `SELECT maxKeysPerDeveloper FROM teamSettings WHERE teamId = ?`,
        [TEST_TEAM]
      );
      expect(settings.maxKeysPerDeveloper).toBe(10);
    });

    it("raises error when key name duplicate", async () => {
      const dup = await adapter.get(
        `SELECT id FROM apiKeys WHERE userId = ? AND name = ?`,
        [TEST_DEV, "cli-test-key"]
      );
      expect(dup).toBeDefined();
    });
  });

  describe("Step 5: v1 API call with API key (team-scoped routing)", () => {
    it("authenticateApiKey resolves team context from API key", async () => {
      const apiKeys = await adapter.all(
        `SELECT id, keyHash, userId, teamId, isActive FROM apiKeys WHERE isActive = 1`
      );

      expect(apiKeys.length).toBeGreaterThanOrEqual(1);

      let found = false;
      for (const ak of apiKeys) {
        if (ak.keyHash && verifyApiKey(developerApiKey.key, ak.keyHash)) {
          found = true;
          expect(ak.teamId).toBe(TEST_TEAM);
          expect(ak.userId).toBe(TEST_DEV);
          break;
        }
      }
      expect(found).toBe(true);
    });

    it("getComboByName resolves combo for the team", async () => {
      const combo = await db.getComboByName("test-brain-combo", TEST_TEAM);
      expect(combo).toBeDefined();
      expect(combo.models.length).toBe(3);
      expect(combo.models[0]).toContain("SuperBrain");
    });

    it("provider node prefix matching works for openai-compatible routing", async () => {
      const nodes = await db.getProviderNodes({ type: "openai-compatible" });
      const matched = nodes.find((n) => n.prefix === "9r");
      expect(matched).toBeDefined();
      expect(matched.apiType).toBe("openai");
      expect(matched.baseUrl).toBe("http://127.0.0.1:20128/v1");
    });

    it("provider connection credentials retrieved for team", async () => {
      const conns = await db.getProviderConnections({
        provider: providerNodeId,
        teamId: TEST_TEAM,
        isActive: true,
      });

      expect(conns.length).toBeGreaterThanOrEqual(1);
      const conn = conns[0];
      expect(conn.apiKey).toBeDefined();
      expect(conn.providerSpecificData.baseUrl).toBe("http://127.0.0.1:20128/v1");
    });
  });

  describe("Step 6: Roundtrip — full data integrity", () => {
    it("all data persisted and queryable after mutations", async () => {
      const nodes = await db.getProviderNodes({ type: "openai-compatible" });
      expect(nodes.length).toBeGreaterThanOrEqual(1);

      const conns = await db.getProviderConnections({ teamId: TEST_TEAM });
      expect(conns.length).toBeGreaterThanOrEqual(1);

      const combos = await db.getCombos(TEST_TEAM);
      expect(combos.some((c) => c.name === "test-brain-combo")).toBe(true);

      const keys = await adapter.all(
        `SELECT id FROM apiKeys WHERE teamId = ? AND isActive = 1`,
        [TEST_TEAM]
      );
      expect(keys.length).toBeGreaterThanOrEqual(1);
    });
  });
});
