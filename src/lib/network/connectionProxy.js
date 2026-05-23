function normalizeString(value) {
  if (value === undefined || value === null) return "";
  return String(value).trim();
}

function normalizeConnectionProxy(providerSpecificData = {}) {
  const connectionProxyEnabled = providerSpecificData?.connectionProxyEnabled === true;
  const connectionProxyUrl = normalizeString(providerSpecificData?.connectionProxyUrl);
  const connectionNoProxy = normalizeString(providerSpecificData?.connectionNoProxy);

  return {
    connectionProxyEnabled,
    connectionProxyUrl,
    connectionNoProxy,
  };
}

export async function resolveConnectionProxyConfig(providerSpecificData = {}) {
  try {
    const legacy = normalizeConnectionProxy(providerSpecificData);

    if (legacy.connectionProxyEnabled && legacy.connectionProxyUrl) {
      return {
        source: "legacy",
        ...legacy,
      };
    }

    return {
      source: "none",
      ...legacy,
    };
  } catch (error) {
    console.error("[resolveConnectionProxyConfig] Failed to resolve proxy config:", error);

    return {
      source: "error",
      connectionProxyEnabled: false,
      connectionProxyUrl: "",
      connectionNoProxy: "",
      strictProxy: false,
    };
  }
}
