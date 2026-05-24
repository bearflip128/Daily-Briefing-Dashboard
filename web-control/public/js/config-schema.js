export const WIDGET_DEFINITIONS = [
  {
    id: "cta",
    name: "CTA Fullerton",
    description: "Train arrivals and leave timing",
    screenRole: "Primary",
    defaultEnabled: true
  },
  {
    id: "clock",
    name: "Clock",
    description: "Current time and date",
    screenRole: "Utility",
    defaultEnabled: true
  },
  {
    id: "weather",
    name: "Weather",
    description: "Current and high temperature",
    screenRole: "Utility",
    defaultEnabled: false
  },
  {
    id: "quote",
    name: "Quote",
    description: "A calm daily quote",
    screenRole: "Content",
    defaultEnabled: false
  },
  {
    id: "markets",
    name: "Markets",
    description: "Compact ticker percentages",
    screenRole: "Optional",
    defaultEnabled: false
  },
  {
    id: "image",
    name: "Image Page",
    description: "Future uploaded image display",
    screenRole: "Future",
    defaultEnabled: false
  }
];

const WIDGET_IDS = new Set(WIDGET_DEFINITIONS.map((widget) => widget.id));

export const DEFAULT_CONFIG = {
  version: 1,
  deviceName: "Daily Briefing Dashboard",
  activePage: "cta-full",
  theme: {
    mode: "dark",
    accent: "mono"
  },
  widgets: WIDGET_DEFINITIONS.map((widget) => ({
    id: widget.id,
    enabled: widget.defaultEnabled
  })),
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

export function cloneConfig(config) {
  return structuredClone(config);
}

export function normalizeConfig(input = {}) {
  const config = mergeConfig(DEFAULT_CONFIG, input);
  config.version = 1;
  config.deviceName = String(config.deviceName || DEFAULT_CONFIG.deviceName).slice(0, 48);
  config.activePage = ["cta-full", "overview", "image"].includes(config.activePage) ? config.activePage : "cta-full";
  config.theme = { mode: "dark", accent: String(config.theme?.accent || "mono").slice(0, 24) };

  config.widgets = normalizeWidgets(config.widgets);

  config.cta.enabled = widgetEnabled(config, "cta");
  config.cta.stationName = cleanText(config.cta.stationName, "Fullerton", 24);
  config.cta.stationMapId = cleanDigits(config.cta.stationMapId, "41220", 8);
  config.cta.walkMinutes = clampInteger(config.cta.walkMinutes, 0, 60, 15);
  config.cta.comfortMinutes = clampInteger(config.cta.comfortMinutes, 0, 15, 2);
  config.cta.routes = normalizeRoutes(config.cta.routes);
  config.cta.showDestinationNames = Boolean(config.cta.showDestinationNames);
  config.cta.pageMode = ["full", "compact"].includes(config.cta.pageMode) ? config.cta.pageMode : "full";

  config.weather.enabled = widgetEnabled(config, "weather");
  config.weather.latitude = clampNumber(config.weather.latitude, -90, 90, 41.8781);
  config.weather.longitude = clampNumber(config.weather.longitude, -180, 180, -87.6298);
  config.weather.city = cleanText(config.weather.city, "Chicago", 24);
  config.weather.showCurrent = Boolean(config.weather.showCurrent);
  config.weather.showHigh = Boolean(config.weather.showHigh);

  config.markets.enabled = widgetEnabled(config, "markets");
  config.markets.symbols = normalizeSymbols(config.markets.symbols);

  config.quote.enabled = widgetEnabled(config, "quote");
  config.quote.mode = ["static", "ticker"].includes(config.quote.mode) ? config.quote.mode : "static";
  config.quote.maxLength = clampInteger(config.quote.maxLength, 20, 160, 45);

  config.image.enabled = widgetEnabled(config, "image");
  config.image.url = String(config.image.url || "").slice(0, 512);
  config.image.fit = ["cover", "contain"].includes(config.image.fit) ? config.image.fit : "cover";

  return config;
}

export function setWidgetEnabled(config, widgetId, enabled) {
  const widget = config.widgets.find((item) => item.id === widgetId);
  if (widget) widget.enabled = enabled;
  if (config[widgetId] && typeof config[widgetId] === "object") {
    config[widgetId].enabled = enabled;
  }
}

export function widgetEnabled(config, widgetId) {
  return Boolean(config.widgets?.find((widget) => widget.id === widgetId)?.enabled);
}

export function activeWidgets(config) {
  return config.widgets.filter((widget) => widget.enabled && WIDGET_IDS.has(widget.id));
}

function normalizeWidgets(widgets) {
  const seen = new Set();
  const normalized = [];

  if (Array.isArray(widgets)) {
    for (const widget of widgets) {
      const id = String(widget?.id || "");
      if (!WIDGET_IDS.has(id) || seen.has(id)) continue;
      normalized.push({ id, enabled: Boolean(widget.enabled) });
      seen.add(id);
    }
  }

  for (const definition of WIDGET_DEFINITIONS) {
    if (!seen.has(definition.id)) {
      normalized.push({ id: definition.id, enabled: definition.defaultEnabled });
    }
  }

  return normalized;
}

function mergeConfig(base, input) {
  const output = cloneConfig(base);
  for (const [key, value] of Object.entries(input || {})) {
    if (value && typeof value === "object" && !Array.isArray(value) && output[key] && typeof output[key] === "object" && !Array.isArray(output[key])) {
      output[key] = { ...output[key], ...value };
    } else {
      output[key] = value;
    }
  }
  return output;
}

function normalizeRoutes(routes) {
  const allowed = ["Red", "Brown", "Purple"];
  const normalized = Array.isArray(routes)
    ? routes.map((route) => cleanText(route, "", 20)).filter((route) => allowed.includes(route))
    : allowed;
  return normalized.length > 0 ? normalized.slice(0, 3) : allowed;
}

function normalizeSymbols(symbols) {
  const normalized = Array.isArray(symbols)
    ? symbols.map((symbol) => String(symbol).trim().toUpperCase()).filter(Boolean).slice(0, 6)
    : DEFAULT_CONFIG.markets.symbols;
  return normalized.length > 0 ? normalized : DEFAULT_CONFIG.markets.symbols;
}

function cleanText(value, fallback, maxLength) {
  const text = String(value || fallback).trim();
  return (text || fallback).slice(0, maxLength);
}

function cleanDigits(value, fallback, maxLength) {
  return String(value || fallback).replace(/\D/g, "").slice(0, maxLength) || fallback;
}

function clampInteger(value, min, max, fallback) {
  return Math.round(clampNumber(value, min, max, fallback));
}

function clampNumber(value, min, max, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(min, Math.min(max, number));
}
