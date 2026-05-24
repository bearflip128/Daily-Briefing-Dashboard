import { createServer } from "node:http";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL(".", import.meta.url));
const publicRoot = join(root, "public");
const dataPath = process.env.DASHBOARD_CONFIG_PATH || join(root, "data", "dashboard-config.json");
const statePath = process.env.DASHBOARD_DEVICE_STATE_PATH || join(root, "data", "device-state.json");
const examplePath = join(root, "data", "dashboard-config.example.json");
const port = Number(process.env.PORT || 8787);
const bindHost = process.env.HOST || "127.0.0.1";
const adminToken = process.env.DASHBOARD_ADMIN_TOKEN || "";

const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml"
};

async function ensureConfigFile() {
  try {
    await readFile(dataPath, "utf8");
  } catch {
    await mkdir(dirname(dataPath), { recursive: true });
    await writeFile(dataPath, await readFile(examplePath, "utf8"));
  }
}

async function readConfig() {
  await ensureConfigFile();
  return normalizeConfig(JSON.parse(await readFile(dataPath, "utf8")));
}

async function readDeviceState() {
  try {
    return normalizeDeviceState(JSON.parse(await readFile(statePath, "utf8")));
  } catch {
    return normalizeDeviceState({});
  }
}

async function writeDeviceState(state) {
  await mkdir(dirname(statePath), { recursive: true });
  await writeFile(statePath, JSON.stringify(normalizeDeviceState(state), null, 2));
}

function hasWriteAccess(request) {
  if (!adminToken) return true;
  const authHeader = request.headers.authorization || "";
  return authHeader === `Bearer ${adminToken}`;
}

function sendJson(response, status, value) {
  response.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store"
  });
  response.end(JSON.stringify(value, null, 2));
}

function normalizeConfig(input) {
  const config = structuredClone(input);
  config.version = 1;

  config.activePage = ["cta-full", "overview", "image"].includes(config.activePage) ? config.activePage : "cta-full";
  config.deviceName = String(config.deviceName || "Daily Briefing Dashboard").slice(0, 48);

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

  config.theme ||= {};
  config.theme.mode = "dark";
  config.theme.accent = String(config.theme.accent || "mono").slice(0, 24);

  return config;
}

function normalizeWidgets(widgets) {
  const defaults = [
    { id: "cta", enabled: true },
    { id: "clock", enabled: true },
    { id: "weather", enabled: false },
    { id: "quote", enabled: false },
    { id: "markets", enabled: false },
    { id: "image", enabled: false }
  ];
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

function normalizeDeviceState(input) {
  return {
    online: Boolean(input.online),
    lastSeenAt: input.lastSeenAt || null,
    lastPublishedAt: input.lastPublishedAt || null,
    lastSyncStatus: input.lastSyncStatus || "idle",
    lastError: input.lastError || ""
  };
}

function clampNumber(value, min, max, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(min, Math.min(max, Math.round(number)));
}

async function readRequestJson(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

async function handleApi(request, response) {
  const requestUrl = new URL(request.url, `http://${bindHost}:${port}`);

  if (requestUrl.pathname === "/api/config" && request.method === "GET") {
    sendJson(response, 200, await readConfig());
    return true;
  }

  if (requestUrl.pathname === "/api/config" && request.method === "PUT") {
    if (!hasWriteAccess(request)) {
      sendJson(response, 401, { error: "Missing or invalid admin token" });
      return true;
    }

    const config = normalizeConfig(await readRequestJson(request));
    await mkdir(dirname(dataPath), { recursive: true });
    await writeFile(dataPath, JSON.stringify(config, null, 2));
    sendJson(response, 200, config);
    return true;
  }

  if (requestUrl.pathname === "/api/device/status" && request.method === "GET") {
    sendJson(response, 200, await readDeviceState());
    return true;
  }

  if (requestUrl.pathname === "/api/device/sync" && request.method === "POST") {
    if (!hasWriteAccess(request)) {
      sendJson(response, 401, { error: "Missing or invalid admin token" });
      return true;
    }

    const now = new Date().toISOString();
    const state = {
      ...(await readDeviceState()),
      lastPublishedAt: now,
      lastSyncStatus: "published",
      lastError: ""
    };
    await writeDeviceState(state);
    sendJson(response, 200, {
      ...state,
      message: "Config published. Firmware polling is required for the device to apply it wirelessly."
    });
    return true;
  }

  if (requestUrl.pathname === "/device-config.json" && request.method === "GET") {
    sendJson(response, 200, await readConfig());
    return true;
  }

  return false;
}

async function serveStatic(request, response) {
  const requestUrl = new URL(request.url, `http://${bindHost}:${port}`);
  const pathname = requestUrl.pathname === "/" ? "/index.html" : requestUrl.pathname;
  const target = normalize(join(publicRoot, pathname));

  if (!target.startsWith(publicRoot)) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }

  const body = await readFile(target);
  response.writeHead(200, {
    "content-type": contentTypes[extname(target)] || "application/octet-stream",
    "cache-control": "no-store"
  });
  response.end(body);
}

createServer(async (request, response) => {
  try {
    if (await handleApi(request, response)) return;
    await serveStatic(request, response);
  } catch (error) {
    sendJson(response, 404, { error: error instanceof Error ? error.message : "Not found" });
  }
}).listen(port, bindHost, () => {
  console.log(`Dashboard control running at http://${bindHost}:${port}`);
});
