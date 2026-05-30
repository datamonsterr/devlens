import { describe, it, expect } from "vitest";
import {
  hashApiKey,
  generateApiKey,
  verifyApiKey,
} from "@/lib/apiKeyUtils";

describe("apiKeyUtils", () => {
  describe("hashApiKey", () => {
    it("returns deterministic SHA-256 hex hash", () => {
      const key = "dvl_test-key-12345";
      const h1 = hashApiKey(key);
      const h2 = hashApiKey(key);
      expect(h1).toBe(h2);
      expect(h1).toHaveLength(64);
      expect(h1).toMatch(/^[0-9a-f]+$/);
    });

    it("produces different hashes for different keys", () => {
      expect(hashApiKey("dvl_aaa")).not.toBe(hashApiKey("dvl_bbb"));
    });

    it("handles empty string", () => {
      const h = hashApiKey("");
      expect(h).toBeTypeOf("string");
      expect(h).toHaveLength(64);
    });

    it("handles long keys", () => {
      const long = "dvl_" + "x".repeat(1000);
      const h = hashApiKey(long);
      expect(h).toHaveLength(64);
    });
  });

  describe("generateApiKey", () => {
    it("prefixes with dvl_", () => {
      const key = generateApiKey();
      expect(key).toMatch(/^dvl_/);
    });

    it("has base64url random part after prefix", () => {
      const key = generateApiKey();
      const random = key.slice(4);
      expect(random).toMatch(/^[A-Za-z0-9_-]+$/);
      expect(random.length).toBeGreaterThanOrEqual(32);
    });

    it("produces unique keys across multiple invocations", () => {
      const keys = new Set();
      for (let i = 0; i < 50; i++) {
        keys.add(generateApiKey());
      }
      expect(keys.size).toBe(50);
    });

    it("total key length is reasonable", () => {
      const key = generateApiKey();
      expect(key.length).toBeGreaterThanOrEqual(36);
      expect(key.length).toBeLessThan(50);
    });
  });

  describe("verifyApiKey", () => {
    it("verifies against correct hash", () => {
      const key = "dvl_test-sample-key-123";
      const hash = hashApiKey(key);
      expect(verifyApiKey(key, hash)).toBe(true);
    });

    it("rejects wrong key", () => {
      const hash = hashApiKey("dvl_correct-key");
      expect(verifyApiKey("dvl_wrong-key", hash)).toBe(false);
    });

    it("rejects empty key against non-empty hash", () => {
      const hash = hashApiKey("dvl_abc");
      expect(verifyApiKey("", hash)).toBe(false);
    });

    it("rejects non-empty key against empty hash", () => {
      expect(verifyApiKey("dvl_abc", "")).toBe(false);
    });

    it("hash roundtrip works", () => {
      for (let i = 0; i < 10; i++) {
        const key = generateApiKey();
        const hash = hashApiKey(key);
        expect(verifyApiKey(key, hash)).toBe(true);
      }
    });
  });
});
