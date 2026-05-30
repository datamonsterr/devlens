const LOG_LEVELS = { DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3 };
const LEVEL = LOG_LEVELS.DEBUG;

function fmt() {
  return new Date().toISOString();
}

function serialize(data) {
  if (!data) return "";
  if (typeof data === "string") return data;
  try { return JSON.stringify(data); } catch { return String(data); }
}

export const log = {
  debug(tag, msg, data) {
    if (LEVEL <= LOG_LEVELS.DEBUG) {
      console.log(`[${fmt()}] DEBUG [${tag}] ${msg}${data ? " " + serialize(data) : ""}`);
    }
  },
  info(tag, msg, data) {
    if (LEVEL <= LOG_LEVELS.INFO) {
      console.log(`[${fmt()}] INFO  [${tag}] ${msg}${data ? " " + serialize(data) : ""}`);
    }
  },
  warn(tag, msg, data) {
    if (LEVEL <= LOG_LEVELS.WARN) {
      console.warn(`[${fmt()}] WARN  [${tag}] ${msg}${data ? " " + serialize(data) : ""}`);
    }
  },
  error(tag, msg, data) {
    if (LEVEL <= LOG_LEVELS.ERROR) {
      console.error(`[${fmt()}] ERROR [${tag}] ${msg}${data ? " " + serialize(data) : ""}`);
    }
  },
  maskKey(key) {
    if (!key || key.length < 8) return "***";
    return `${key.slice(0, 4)}...${key.slice(-4)}`;
  },
};
