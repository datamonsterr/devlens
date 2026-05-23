import { loadState, saveState, generateShortId, clearPid } from "./state.js";
import { spawnQuickTunnel, killCloudflared, isCloudflaredRunning, setUnexpectedExitHandler } from "./cloudflared.js";
import { getSettings, updateSettings } from "@/lib/localDb";
import { waitForHealth, probeUrlAlive } from "./networkProbe.js";

const WORKER_URL = process.env.TUNNEL_WORKER_URL || "https://abc-tunnel.us";

const tunnelSvc = {
  cancelToken: { cancelled: false },
  spawnInProgress: false,
  lastRestartAt: 0,
  activeLocalPort: null,
};

export function getTunnelService() { return tunnelSvc; }

export function isTunnelManuallyDisabled() { return tunnelSvc.cancelToken.cancelled; }
export function isTunnelReconnecting() { return tunnelSvc.spawnInProgress; }

// Callback invoked when cloudflared exits unexpectedly (set by initializeApp)
let onTunnelUnexpectedExit = null;
export function setTunnelUnexpectedExitCallback(cb) { onTunnelUnexpectedExit = cb; }

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

export async function enableTunnel(localPort = 20128) {
  console.log(`[Tunnel] enable start (port=${localPort})`);
  tunnelSvc.cancelToken = { cancelled: false };
  tunnelSvc.activeLocalPort = localPort;
  tunnelSvc.spawnInProgress = true;
  const token = tunnelSvc.cancelToken;

  try {
    if (isCloudflaredRunning()) {
      const existing = loadState();
      if (existing?.tunnelUrl && existing?.shortId) {
        const publicUrl = `https://r${existing.shortId}.abc-tunnel.us`;
        // Reuse only if BOTH direct + public URL alive (avoid stale socket after network change)
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

    killCloudflared(localPort);
    console.log("[Tunnel] killed existing cloudflared");
    throwIfCancelled(token, "tunnel");

    const existing = loadState();
    const shortId = existing?.shortId || generateShortId();

    const onUrlUpdate = async (url) => {
      if (token.cancelled) return;
      console.log(`[Tunnel] url updated: ${url}`);
      await registerTunnelUrl(shortId, url);
      saveState({ shortId, tunnelUrl: url });
      await updateSettings({ tunnelEnabled: true, tunnelUrl: url });
    };

    // Register exit handler BEFORE spawn so it fires even on early exit
    setUnexpectedExitHandler(() => {
      console.warn("[Tunnel] cloudflared exited unexpectedly, scheduling respawn");
      if (onTunnelUnexpectedExit) onTunnelUnexpectedExit();
    });

    const { tunnelUrl } = await spawnQuickTunnel(localPort, onUrlUpdate);
    console.log(`[Tunnel] spawned: ${tunnelUrl}`);
    throwIfCancelled(token, "tunnel");

    const publicUrl = `https://r${shortId}.abc-tunnel.us`;
    await registerTunnelUrl(shortId, tunnelUrl);
    saveState({ shortId, tunnelUrl });
    await updateSettings({ tunnelEnabled: true, tunnelUrl });
    console.log(`[Tunnel] registered shortId=${shortId} publicUrl=${publicUrl}`);

    // Verify publicUrl first (worker route is reliable; direct *.trycloudflare.com DNS may lag)
    await waitForHealth(publicUrl, token);
    console.log("[Tunnel] public URL healthy");
    // Direct tunnel probe is best-effort: DNS for *.trycloudflare.com can be slow/blocked on some networks
    if (!(await probeUrlAlive(tunnelUrl))) {
      console.warn("[Tunnel] direct URL not reachable yet, continuing via publicUrl");
    } else {
      console.log("[Tunnel] direct URL healthy");
    }

    console.log("[Tunnel] enable success");
    return { success: true, tunnelUrl, shortId, publicUrl };
  } catch (e) {
    console.error(`[Tunnel] enable error: ${e.message}`);
    throw e;
  } finally {
    tunnelSvc.spawnInProgress = false;
  }
}

export async function disableTunnel() {
  console.log("[Tunnel] disable");
  // Abort any in-flight enable so it cannot resurrect state after we clear it
  tunnelSvc.cancelToken.cancelled = true;
  setUnexpectedExitHandler(null);

  try { killCloudflared(tunnelSvc.activeLocalPort); } catch (e) { console.warn(`[Tunnel] kill warn: ${e.message}`); }
  clearPid();

  const state = loadState();
  if (state) saveState({ shortId: state.shortId, tunnelUrl: null });

  await updateSettings({ tunnelEnabled: false, tunnelUrl: "" });
  // Force-clear flags so a subsequent enable is not blocked by a stuck spawnInProgress
  tunnelSvc.spawnInProgress = false;
  tunnelSvc.activeLocalPort = null;
  return { success: true };
}

export async function getTunnelStatus() {
  const settings = await getSettings();
  const settingsEnabled = settings.tunnelEnabled === true;
  const state = loadState();
  const shortId = state?.shortId || "";
  const publicUrl = shortId ? `https://r${shortId}.abc-tunnel.us` : "";
  const tunnelUrl = state?.tunnelUrl || "";

  // Lazy: skip PID probe entirely when user disabled tunnel
  const running = settingsEnabled ? isCloudflaredRunning() : false;

  return {
    enabled: settingsEnabled && running,
    settingsEnabled,
    tunnelUrl,
    shortId,
    publicUrl,
    running
  };
}


