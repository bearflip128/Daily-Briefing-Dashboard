import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL(".", import.meta.url));
const port = Number(process.env.PORT || 5173);

const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8"
};

async function readLocalCtaConfig() {
  const localConfig = await readFile(join(root, "src", "config.local.js"), "utf8");
  const apiKey = localConfig.match(/apiKey:\s*"([^"]+)"/)?.[1] || "";
  const stationMapId = localConfig.match(/stationMapId:\s*"([^"]+)"/)?.[1] || "41220";
  return { apiKey, stationMapId };
}

async function handleCtaProxy(request, response) {
  const { apiKey, stationMapId } = await readLocalCtaConfig();
  const requestUrl = new URL(request.url, `http://127.0.0.1:${port}`);
  const mapid = requestUrl.searchParams.get("mapid") || stationMapId;

  if (!apiKey) {
    response.writeHead(500, { "content-type": "application/json" });
    response.end(JSON.stringify({ error: "Missing CTA API key in src/config.local.js" }));
    return;
  }

  const ctaUrl = new URL("https://lapi.transitchicago.com/api/1.0/ttarrivals.aspx");
  ctaUrl.search = new URLSearchParams({
    key: apiKey,
    mapid,
    outputType: "JSON"
  });

  const ctaResponse = await fetch(ctaUrl);
  const body = await ctaResponse.text();
  response.writeHead(ctaResponse.status, {
    "content-type": ctaResponse.headers.get("content-type") || "application/json"
  });
  response.end(body);
}

async function handleMarketProxy(request, response) {
  const requestUrl = new URL(request.url, `http://127.0.0.1:${port}`);
  const symbol = requestUrl.searchParams.get("symbol");

  if (!symbol) {
    response.writeHead(400, { "content-type": "text/plain; charset=utf-8" });
    response.end("Missing symbol");
    return;
  }

  const marketUrl = new URL("https://stooq.com/q/l/");
  marketUrl.search = new URLSearchParams({
    s: symbol,
    f: "sd2t2ohlcvp",
    h: "",
    e: "csv"
  });

  const marketResponse = await fetch(marketUrl);
  const body = await marketResponse.text();
  response.writeHead(marketResponse.status, {
    "content-type": "text/csv; charset=utf-8",
    "cache-control": "no-store"
  });
  response.end(body);
}

async function handleWeatherProxy(request, response) {
  const requestUrl = new URL(request.url, `http://127.0.0.1:${port}`);
  const weatherUrl = new URL("https://api.open-meteo.com/v1/forecast");
  weatherUrl.search = new URLSearchParams({
    latitude: requestUrl.searchParams.get("latitude") || "41.8781",
    longitude: requestUrl.searchParams.get("longitude") || "-87.6298",
    current: "temperature_2m",
    daily: "temperature_2m_max",
    temperature_unit: "fahrenheit",
    timezone: requestUrl.searchParams.get("timezone") || "America/Chicago",
    forecast_days: "1"
  });

  const weatherResponse = await fetch(weatherUrl);
  const body = await weatherResponse.text();
  response.writeHead(weatherResponse.status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store"
  });
  response.end(body);
}

async function handleQuoteProxy(response) {
  const urls = [
    "https://quoteslate.vercel.app/api/quotes/random?maxLength=45",
    "https://api.quotable.io/random?maxLength=45",
    "https://dummyjson.com/quotes/random"
  ];

  for (const url of urls) {
    let quoteResponse;
    try {
      quoteResponse = await fetch(url);
    } catch {
      continue;
    }
    if (!quoteResponse.ok) continue;

    const body = await quoteResponse.text();
    response.writeHead(200, {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store"
    });
    response.end(body);
    return;
  }

  response.writeHead(502, { "content-type": "application/json; charset=utf-8" });
  response.end(JSON.stringify({ error: "Quote APIs unavailable" }));
}

async function serveStatic(request, response) {
  const requestUrl = new URL(request.url, `http://127.0.0.1:${port}`);
  const pathname = requestUrl.pathname === "/" ? "/index.html" : requestUrl.pathname;
  const target = normalize(join(root, pathname));

  if (!target.startsWith(root)) {
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
    if (request.url?.startsWith("/api/cta")) {
      await handleCtaProxy(request, response);
      return;
    }

    if (request.url?.startsWith("/api/market")) {
      await handleMarketProxy(request, response);
      return;
    }

    if (request.url?.startsWith("/api/weather")) {
      await handleWeatherProxy(request, response);
      return;
    }

    if (request.url?.startsWith("/api/quote")) {
      await handleQuoteProxy(response);
      return;
    }

    await serveStatic(request, response);
  } catch (error) {
    response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    response.end(error instanceof Error ? error.message : "Not found");
  }
}).listen(port, "127.0.0.1", () => {
  console.log(`Dashboard mockup running at http://127.0.0.1:${port}`);
});
