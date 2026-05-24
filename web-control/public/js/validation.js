import { activeWidgets, widgetEnabled } from "./config-schema.js";

const CTA_ROUTE_NAMES = new Set(["Red", "Brown", "Purple"]);

export function validateConfig(config) {
  const issues = [];

  if (activeWidgets(config).length === 0) {
    issues.push({ field: "widgets", message: "Enable at least one widget for the device screen." });
  }

  if (widgetEnabled(config, "cta")) {
    if (!config.cta.stationName.trim()) {
      issues.push({ field: "cta.stationName", message: "CTA station name is required." });
    }
    if (!/^\d{5,8}$/.test(config.cta.stationMapId)) {
      issues.push({ field: "cta.stationMapId", message: "CTA map ID must be numeric." });
    }
    if (!config.cta.routes.every((route) => CTA_ROUTE_NAMES.has(route))) {
      issues.push({ field: "cta.routes", message: "CTA routes must be Red, Brown, or Purple." });
    }
  }

  if (widgetEnabled(config, "weather")) {
    if (!config.weather.city.trim()) {
      issues.push({ field: "weather.city", message: "Weather city is required." });
    }
    if (!Number.isFinite(Number(config.weather.latitude)) || !Number.isFinite(Number(config.weather.longitude))) {
      issues.push({ field: "weather.location", message: "Weather latitude and longitude must be valid numbers." });
    }
  }

  if (widgetEnabled(config, "markets")) {
    const invalidSymbols = config.markets.symbols.filter((symbol) => !/^[A-Z0-9.^-]{1,10}$/.test(symbol));
    if (invalidSymbols.length > 0) {
      issues.push({ field: "markets.symbols", message: "Market symbols should be short ticker symbols." });
    }
  }

  if (widgetEnabled(config, "image") && config.image.url && !isLikelyUrl(config.image.url)) {
    issues.push({ field: "image.url", message: "Image URL must start with http:// or https://." });
  }

  return issues;
}

function isLikelyUrl(value) {
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol);
  } catch {
    return false;
  }
}
