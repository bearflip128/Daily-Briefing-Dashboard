const CONFIG_KEY = "dashboard-config";
const DEVICE_STATE_KEY = "device-state";
const DEVICE_SNAPSHOT_KEY = "device-snapshot";

const DEFAULT_CONFIG = {
  version: 1,
  deviceName: "Daily Briefing Dashboard",
  activePage: "cta-full",
  theme: {
    mode: "dark",
    accent: "mono"
  },
  widgets: [
    { id: "cta", enabled: true },
    { id: "clock", enabled: true },
    { id: "weather", enabled: false },
    { id: "quote", enabled: false },
    { id: "markets", enabled: false },
    { id: "image", enabled: false }
  ],
  cta: {
    enabled: true,
    stationName: "Fullerton",
    stationMapId: "41220",
    walkMinutes: 15,
    comfortMinutes: 2,
    routes: ["Red", "Brown", "Purple"],
    showDestinationNames: true,
    pageMode: "full"
  },
  weather: {
    enabled: false,
    latitude: 41.8781,
    longitude: -87.6298,
    city: "Chicago",
    showCurrent: true,
    showHigh: true
  },
  markets: {
    enabled: false,
    symbols: ["SPY", "VXUS", "BTC"]
  },
  quote: {
    enabled: false,
    mode: "static",
    maxLength: 45
  },
  image: {
    enabled: false,
    url: "",
    fit: "cover"
  }
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/config" && request.method === "GET") {
      return json(await readConfig(env));
    }

    if (url.pathname === "/api/config" && request.method === "PUT") {
      if (!hasAdminAccess(request, env)) return json({ error: "Missing or invalid admin token" }, 401);
      const config = normalizeConfig(await request.json());
      await env.DASHBOARD_CONFIG.put(CONFIG_KEY, JSON.stringify(config));
      return json(config);
    }

    if (url.pathname === "/device-config.json" && request.method === "GET") {
      return json(await readConfig(env));
    }

    if (url.pathname === "/api/device/status" && request.method === "GET") {
      return json(await readJson(env.DASHBOARD_CONFIG, DEVICE_STATE_KEY, defaultDeviceState()));
    }

    if (url.pathname === "/api/device/live" && request.method === "GET") {
      return json(await readJson(env.DASHBOARD_CONFIG, DEVICE_SNAPSHOT_KEY, {
        online: false,
        receivedAt: null,
        error: "No cloud device snapshot has been posted yet"
      }));
    }

    if (url.pathname === "/api/device/live" && request.method === "POST") {
      if (!hasDeviceIngestAccess(request, env)) return json({ error: "Missing or invalid device ingest token" }, 401);
      const payload = await request.json();
      const snapshot = {
        online: true,
        snapshotUrl: "/api/device/live",
        receivedAt: new Date().toISOString(),
        snapshot: payload
      };
      await env.DASHBOARD_CONFIG.put(DEVICE_SNAPSHOT_KEY, JSON.stringify(snapshot));
      await env.DASHBOARD_CONFIG.put(DEVICE_STATE_KEY, JSON.stringify({
        ...defaultDeviceState(),
        online: true,
        lastSeenAt: snapshot.receivedAt,
        lastError: ""
      }));
      return json(snapshot);
    }

    if (url.pathname === "/api/device/sync" && request.method === "POST") {
      if (!hasAdminAccess(request, env)) return json({ error: "Missing or invalid admin token" }, 401);
      const state = {
        ...(await readJson(env.DASHBOARD_CONFIG, DEVICE_STATE_KEY, defaultDeviceState())),
        lastPublishedAt: new Date().toISOString(),
        lastSyncStatus: "published",
        lastError: ""
      };
      await env.DASHBOARD_CONFIG.put(DEVICE_STATE_KEY, JSON.stringify(state));
      return json({
        ...state,
        message: "Config published. Device firmware must poll /device-config.json or post snapshots to /api/device/live."
      });
    }

    return env.ASSETS.fetch(request);
  }
};

async function readConfig(env) {
  return normalizeConfig(await readJson(env.DASHBOARD_CONFIG, CONFIG_KEY, DEFAULT_CONFIG));
}

async function readJson(kv, key, fallback) {
  const value = await kv.get(key, "json");
  return value || fallback;
}

function hasAdminAccess(request, env) {
  if (!env.DASHBOARD_ADMIN_TOKEN) return true;
  return request.headers.get("authorization") === `Bearer ${env.DASHBOARD_ADMIN_TOKEN}`;
}

function hasDeviceIngestAccess(request, env) {
  if (!env.DEVICE_INGEST_TOKEN) return false;
  return request.headers.get("authorization") === `Bearer ${env.DEVICE_INGEST_TOKEN}`;
}

function json(value, status = 200) {
  return new Response(JSON.stringify(value, null, 2), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store"
    }
  });
}

function defaultDeviceState() {
  return {
    online: false,
    statusUrl: "cloud",
    ip: "",
    rssi: null,
    uptimeMs: null,
    lastSeenAt: null,
    lastPublishedAt: null,
    lastSyncStatus: "idle",
    lastError: "No cloud heartbeat received"
  };
}

function normalizeConfig(input = {}) {
  const config = structuredClone({ ...DEFAULT_CONFIG, ...input });
  config.version = 1;
  config.deviceName = String(config.deviceName || DEFAULT_CONFIG.deviceName).slice(0, 48);
  config.activePage = ["cta-full", "overview", "image"].includes(config.activePage) ? config.activePage : "cta-full";
  config.widgets = normalizeWidgets(config.widgets);

  config.cta ||= {};
  config.cta.enabled = Boolean(config.cta.enabled);
  config.cta.stationName = String(config.cta.stationName || "Fullerton").slice(0, 24);
  config.cta.stationMapId = String(config.cta.stationMapId || "41220").replace(/\D/g, "").slice(0, 8) || "41220";
  config.cta.walkMinutes = clampNumber(config.cta.walkMinutes, 0, 60, 15);
  config.cta.comfortMinutes = clampNumber(config.cta.comfortMinutes, 0, 15, 2);
  config.cta.routes = Array.isArray(config.cta.routes) ? config.cta.routes.slice(0, 6) : ["Red", "Brown", "Purple"];
  config.cta.showDestinationNames = Boolean(config.cta.showDestinationNames);
  config.cta.pageMode = ["full", "compact"].includes(config.cta.pageMode) ? config.cta.pageMode : "full";

  config.weather ||= {};
  config.weather.enabled = Boolean(config.weather.enabled);
  config.weather.latitude = clampNumber(config.weather.latitude, -90, 90, 41.8781);
  config.weather.longitude = clampNumber(config.weather.longitude, -180, 180, -87.6298);
  config.weather.city = String(config.weather.city || "Chicago").slice(0, 24);
  config.weather.showCurrent = Boolean(config.weather.showCurrent);
  config.weather.showHigh = Boolean(config.weather.showHigh);

  config.markets ||= {};
  config.markets.enabled = Boolean(config.markets.enabled);
  config.markets.symbols = Array.isArray(config.markets.symbols)
    ? config.markets.symbols.map((symbol) => String(symbol).trim().toUpperCase()).filter(Boolean).slice(0, 6)
    : ["SPY", "VXUS", "BTC"];
  if (config.markets.symbols.length === 0) config.markets.symbols = ["SPY", "VXUS", "BTC"];

  config.quote ||= {};
  config.quote.enabled = Boolean(config.quote.enabled);
  config.quote.mode = ["static", "ticker"].includes(config.quote.mode) ? config.quote.mode : "static";
  config.quote.maxLength = clampNumber(config.quote.maxLength, 20, 160, 45);

  config.image ||= {};
  config.image.enabled = Boolean(config.image.enabled);
  config.image.url = String(config.image.url || "").slice(0, 512);
  config.image.fit = ["cover", "contain"].includes(config.image.fit) ? config.image.fit : "cover";

  config.theme = {
    mode: "dark",
    accent: String(config.theme?.accent || "mono").slice(0, 24)
  };

  return config;
}

function normalizeWidgets(widgets) {
  const defaults = DEFAULT_CONFIG.widgets;
  const allowed = new Set(defaults.map((widget) => widget.id));
  const seen = new Set();
  const normalized = [];

  if (Array.isArray(widgets)) {
    for (const widget of widgets) {
      const id = String(widget?.id || "");
      if (!allowed.has(id) || seen.has(id)) continue;
      normalized.push({ id, enabled: Boolean(widget.enabled) });
      seen.add(id);
    }
  }

  for (const widget of defaults) {
    if (!seen.has(widget.id)) normalized.push(widget);
  }

  return normalized;
}

function clampNumber(value, min, max, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(min, Math.min(max, Math.round(number)));
}
