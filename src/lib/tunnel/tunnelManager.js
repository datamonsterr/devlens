import { getSettings, updateSettings } from "@/lib/localDb";
import { waitForHealth, probeUrlAlive } from "./networkProbe.js";

const WORKER_URL = process.env.TUNNEL_WORKER_URL || "https://abc-tunnel.us";
const IS_VERCEL = !!process.env.VERCEL;

let _cloudflaredModule = null;
async function getCloudflared() {
  if (!_cloudflaredModule) {
    _cloudflaredModule = await import("./cloudflared.js");
  }
  return _cloudflaredModule;
}
let _stateModule = null;
async function getState() {
  if (!_stateModule) {
    _stateModule = await import("./state.js");
  }
  return _stateModule;
}

function normalizeEndpoint(url) {
  return url.replace(/\/$/, "");
}

function vercelEndpoint() {
  if (process.env.DEVLENS_PUBLIC_API_ENDPOINT) return normalizeEndpoint(process.env.DEVLENS_PUBLIC_API_ENDPOINT);
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return normalizeEndpoint(`https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`);
  if (process.env.VERCEL_URL) return normalizeEndpoint(`https://${process.env.VERCEL_URL}`);
  return "";
}

export function isVercelRuntime() {
  return IS_VERCEL;
}

const tunnelSvc = {
  cancelToken: { cancelled: false },
  spawnInProgress: false,
  lastRestartAt: 0,
  activeLocalPort: null,
  rateLimitUntil: 0,
};

export function getTunnelService() { return tunnelSvc; }

export function isTunnelManuallyDisabled() { return tunnelSvc.cancelToken.cancelled; }
export function isTunnelReconnecting() { return tunnelSvc.spawnInProgress; }

let onTunnelUnexpectedExit = null;
export function setTunnelUnexpectedExitCallback(cb) { onTunnelUnexpectedExit = cb; }

// Dynamic wrappers for cloudflared exports (used by other modules)
export async function isCloudflaredRunning() {
  const cf = await getCloudflared();
  return cf.isCloudflaredRunning();
}
export async function ensureCloudflared() {
  const cf = await getCloudflared();
  return cf.ensureCloudflared();
}
export async function killCloudflared(port) {
  const cf = await getCloudflared();
  return cf.killCloudflared(port);
}
export async function setUnexpectedExitHandler(handler) {
  const cf = await getCloudflared();
  return cf.setUnexpectedExitHandler(handler);
}
export function getDownloadStatus() {
  if (_cloudflaredModule) return _cloudflaredModule.getDownloadStatus();
  return { downloading: false, progress: 0 };
}

// Dynamic wrappers for state exports
export async function loadState() {
  const st = await getState();
  return st.loadState();
}
export async function saveState(state) {
  const st = await getState();
  return st.saveState(state);
}
export async function clearState() {
  const st = await getState();
  return st.clearState();
}
export async function clearPid() {
  const st = await getState();
  return st.clearPid();
}

// ─── Cloudflare Tunnel ───────────────────────────────────────────────────────

async function registerTunnelUrl(shortId, tunnelUrl) {
  await fetch(`${WORKER_URL}/api/tunnel/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ shortId, tunnelUrl })
  });
}

function throwIfCancelled(token, label) {
  if (token.cancelled) throw new Error(`${label} cancelled`);
}

export async function enableTunnel(localPort = 20261) {
  if (IS_VERCEL) {
    return {
      success: false,
      unsupported: true,
      error: "Cloudflare quick tunnels are not supported on Vercel. Use deployed Vercel URL as API endpoint.",
      publicUrl: vercelEndpoint(),
    };
  }

  console.log(`[Tunnel] enable start (port=${localPort})`);
  tunnelSvc.cancelToken = { cancelled: false };
  tunnelSvc.activeLocalPort = localPort;

  if (Date.now() < tunnelSvc.rateLimitUntil) {
    const waitSec = Math.ceil((tunnelSvc.rateLimitUntil - Date.now()) / 1000);
    const err = new Error(`Cloudflare rate-limited. Retry in ${waitSec}s.`);
    err.isRateLimit = true;
    err.retryAfterSec = waitSec;
    throw err;
  }

  tunnelSvc.spawnInProgress = true;
  const token = tunnelSvc.cancelToken;

  const cf = await getCloudflared();
  const st = await getState();

  try {
    if (cf.isCloudflaredRunning()) {
      const existing = st.loadState();
      if (existing?.tunnelUrl && existing?.shortId) {
        const publicUrl = `https://r${existing.shortId}.abc-tunnel.us`;
        const [directOk, publicOk] = await Promise.all([
          probeUrlAlive(existing.tunnelUrl),
          probeUrlAlive(publicUrl),
        ]);
        if (directOk && publicOk) {
          console.log(`[Tunnel] already running, reuse: ${existing.tunnelUrl}`);
          return { success: true, tunnelUrl: existing.tunnelUrl, shortId: existing.shortId, publicUrl, alreadyRunning: true };
        }
        console.log(`[Tunnel] stale (direct=${directOk} public=${publicOk}), respawn`);
      }
    }

    cf.killCloudflared(localPort);
    console.log("[Tunnel] killed existing cloudflared");
    throwIfCancelled(token, "tunnel");

    const existing = st.loadState();
    const shortId = existing?.shortId || st.generateShortId();

    const onUrlUpdate = async (url) => {
      if (token.cancelled) return;
      console.log(`[Tunnel] url updated: ${url}`);
      await registerTunnelUrl(shortId, url);
      st.saveState({ shortId, tunnelUrl: url });
      await updateSettings({ tunnelEnabled: true, tunnelUrl: url });
    };

    cf.setUnexpectedExitHandler(() => {
      console.warn("[Tunnel] cloudflared exited unexpectedly, scheduling respawn");
      if (tunnelSvc.spawnInProgress) return;
      if (Date.now() - tunnelSvc.lastRestartAt < 5000) return;
      if (onTunnelUnexpectedExit) onTunnelUnexpectedExit();
    });

    const { tunnelUrl } = await cf.spawnQuickTunnel(localPort, onUrlUpdate);
    console.log(`[Tunnel] spawned: ${tunnelUrl}`);
    throwIfCancelled(token, "tunnel");

    const directHealthy = await probeUrlAlive(tunnelUrl);
    console.log(`[Tunnel] direct URL ${directHealthy ? "healthy" : "not yet reachable"}`);

    const publicUrl = `https://r${shortId}.abc-tunnel.us`;
    await registerTunnelUrl(shortId, tunnelUrl);
    st.saveState({ shortId, tunnelUrl });
    await updateSettings({ tunnelEnabled: true, tunnelUrl });
    console.log(`[Tunnel] registered shortId=${shortId} publicUrl=${publicUrl}`);

    let publicHealthy = false;
    try {
      publicHealthy = await waitForHealth(publicUrl, token, 15000);
      console.log("[Tunnel] public URL healthy");
    } catch (e) {
      console.warn(`[Tunnel] public URL health check: ${e.message}`);
    }

    if (!directHealthy && !publicHealthy) {
      throw new Error("Neither tunnel URL nor public URL is healthy");
    }

    console.log("[Tunnel] enable success");
    return {
      success: true,
      tunnelUrl,
      shortId,
      publicUrl,
      directUrl: tunnelUrl,
      publicHealthy,
    };
  } catch (e) {
    console.error(`[Tunnel] enable error: ${e.message}`);
    if (e.isRateLimit) {
      tunnelSvc.rateLimitUntil = Date.now() + 300000;
      console.warn(`[Tunnel] rate-limit cooldown set for 5 min`);
    }
    throw e;
  } finally {
    tunnelSvc.spawnInProgress = false;
  }
}

export async function disableTunnel() {
  if (IS_VERCEL) return { success: true, unsupported: true, publicUrl: vercelEndpoint() };

  console.log("[Tunnel] disable");
  const cf = await getCloudflared();
  const st = await getState();

  tunnelSvc.cancelToken.cancelled = true;
  cf.setUnexpectedExitHandler(null);

  try { cf.killCloudflared(tunnelSvc.activeLocalPort); } catch (e) { console.warn(`[Tunnel] kill warn: ${e.message}`); }
  st.clearPid();

  const state = st.loadState();
  if (state) st.saveState({ shortId: state.shortId, tunnelUrl: null });

  await updateSettings({ tunnelEnabled: false, tunnelUrl: "" });
  tunnelSvc.spawnInProgress = false;
  tunnelSvc.activeLocalPort = null;
  return { success: true };
}

export async function getTunnelStatus() {
  if (IS_VERCEL) {
    const endpoint = vercelEndpoint();
    return {
      enabled: !!endpoint,
      settingsEnabled: !!endpoint,
      tunnelUrl: "",
      shortId: "",
      publicUrl: endpoint,
      running: false,
      unsupported: true,
    };
  }

  const st = await getState();
  const settings = await getSettings();
  const settingsEnabled = settings.tunnelEnabled === true;
  const state = st.loadState();
  const shortId = state?.shortId || "";
  const publicUrl = shortId ? `https://r${shortId}.abc-tunnel.us` : "";
  const tunnelUrl = state?.tunnelUrl || "";

  const cf = await getCloudflared();
  const running = settingsEnabled ? cf.isCloudflaredRunning() : false;

  return {
    enabled: settingsEnabled && running,
    settingsEnabled,
    tunnelUrl,
    shortId,
    publicUrl,
    running
  };
}
