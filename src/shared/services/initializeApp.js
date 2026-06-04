import os from "os";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { existsSync } from "fs";
import { cleanupProviderConnections, getSettings } from "@/lib/localDb";
import {
  enableTunnel,
  isTunnelManuallyDisabled, isTunnelReconnecting,
  getTunnelService, setTunnelUnexpectedExitCallback,
  isCloudflaredRunning, killCloudflared, ensureCloudflared,
  loadState, clearState,
} from "@/lib/tunnel/tunnelManager";
import { checkInternet, probeUrlAlive } from "@/lib/tunnel/networkProbe";
import {
  RESTART_COOLDOWN_MS, NETWORK_SETTLE_MS,
  WATCHDOG_INTERVAL_MS, NETWORK_CHECK_INTERVAL_MS,
} from "@/lib/tunnel/tunnelConfig";
import { updateSettings } from "@/lib/localDb";

const g = global.__appSingleton ??= {
  signalHandlersRegistered: false,
  watchdogInterval: null,
  networkMonitorInterval: null,
  lastNetworkFingerprint: null,
  lastWatchdogTick: Date.now(),
  lastOnline: null,
  tunnelAutoResumed: false,
};

export async function initializeApp() {
  try {
    await cleanupProviderConnections();
    const settings = await getSettings();

    if (settings.tunnelEnabled && !g.tunnelAutoResumed) {
      g.tunnelAutoResumed = true;
      console.log("[InitApp] Tunnel was enabled, auto-resuming...");
      try {
        await safeRestartTunnel("startup");
      } catch (e) {
        console.log("[InitApp] Tunnel resume failed:", e.message);
        if (!(await isCloudflaredRunning())) {
          console.log("[InitApp] Tunnel not running after resume attempt, clearing stale state");
          await updateSettings({ tunnelEnabled: false, tunnelUrl: "" });
          await clearState();
        }
      }
    }

    if (!g.signalHandlersRegistered) {
      const cleanup = () => {
        killCloudflared().catch(() => {});
        process.exit();
      };
      process.on("SIGINT", cleanup);
      process.on("SIGTERM", cleanup);
      process.on("exit", () => { try {} catch {} });
      g.signalHandlersRegistered = true;
    }

    ensureCloudflared().catch(() => {});

    setTunnelUnexpectedExitCallback(() => {
      safeRestartTunnel("unexpected-exit").catch(() => {});
    });

    startWatchdog();
    startNetworkMonitor();

    discoverChatbotSkills().catch((e) => console.warn("[InitApp] Chatbot skills not loaded:", e.message));
  } catch (error) {
    console.error("[InitApp] Error:", error);
  }
}

async function discoverChatbotSkills() {
  try {
    const { discoverSkills } = await import('@/chatbot/skillRegistry.js');
    await discoverSkills();
  } catch (e) {
    console.warn('[InitApp] Failed to discover chatbot skills:', e.message);
  }
}

async function safeRestartTunnel(reason) {
  const svc = getTunnelService();
  const settings = await getSettings();
  if (!settings.tunnelEnabled) return;
  if (svc.cancelToken.cancelled) return;
  if (svc.spawnInProgress) return;
  const processDead = !(await isCloudflaredRunning());
  if (!processDead && Date.now() - svc.lastRestartAt < RESTART_COOLDOWN_MS) return;

  if (await isCloudflaredRunning()) {
    const state = await loadState();
    const publicUrl = state?.shortId ? `https://r${state.shortId}.abc-tunnel.us` : null;
    const directUrl = state?.tunnelUrl || null;
    if (publicUrl && directUrl) {
      const [publicOk, directOk] = await Promise.all([
        probeUrlAlive(publicUrl),
        probeUrlAlive(directUrl),
      ]);
      if (publicOk && directOk) return;
    }
  }

  if (!await checkInternet()) return;

  console.log(`[Tunnel] safeRestart (${reason})`);
  try {
    await enableTunnel();
    svc.lastRestartAt = Date.now();
    console.log("[Tunnel] restart success");
  } catch (err) {
    console.log("[Tunnel] restart failed:", err.message);
  }
}

function startWatchdog() {
  if (g.watchdogInterval) return;
  g.watchdogInterval = setInterval(() => {
    safeRestartTunnel("watchdog").catch(() => {});
  }, WATCHDOG_INTERVAL_MS);
  if (g.watchdogInterval.unref) g.watchdogInterval.unref();
}

function getNetworkFingerprint() {
  const interfaces = os.networkInterfaces();
  const active = [];
  for (const [name, addrs] of Object.entries(interfaces)) {
    if (!addrs) continue;
    for (const addr of addrs) {
      if (!addr.internal && addr.family === "IPv4") {
        active.push(`${name}:${addr.address}`);
      }
    }
  }
  return active.sort().join("|");
}

function startNetworkMonitor() {
  if (g.networkMonitorInterval) return;

  g.lastNetworkFingerprint = getNetworkFingerprint();
  g.lastWatchdogTick = Date.now();
  g.lastOnline = null;

  g.networkMonitorInterval = setInterval(async () => {
    try {
      const now = Date.now();
      const elapsed = now - g.lastWatchdogTick;
      g.lastWatchdogTick = now;

      const currentFingerprint = getNetworkFingerprint();
      const networkChanged = currentFingerprint !== g.lastNetworkFingerprint;
      const wasSleep = elapsed > NETWORK_CHECK_INTERVAL_MS * 6;
      if (networkChanged) g.lastNetworkFingerprint = currentFingerprint;

      const online = await checkInternet();
      const wasOffline = g.lastOnline === false;
      g.lastOnline = online;

      if (!online) return;

      const onlineEdge = wasOffline;
      if (!networkChanged && !wasSleep && !onlineEdge) return;

      await new Promise((r) => setTimeout(r, NETWORK_SETTLE_MS));

      const reason = onlineEdge ? "online"
        : wasSleep && networkChanged ? "sleep+netchange"
        : wasSleep ? "sleep" : "netchange";
      safeRestartTunnel(reason).catch(() => {});
    } catch (err) {
      console.log("[NetworkMonitor] error:", err.message);
    }
  }, NETWORK_CHECK_INTERVAL_MS);

  if (g.networkMonitorInterval.unref) g.networkMonitorInterval.unref();
}

export default initializeApp;
