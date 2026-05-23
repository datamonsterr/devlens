import crypto from "crypto";

export function hashApiKey(key) {
  return crypto.createHash("sha256").update(key).digest("hex");
}

export function generateApiKey() {
  const prefix = "dvl";
  const random = crypto.randomBytes(24).toString("base64url");
  return `${prefix}_${random}`;
}

export function verifyApiKey(plaintext, hash) {
  return hashApiKey(plaintext) === hash;
}
