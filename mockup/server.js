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

    await serveStatic(request, response);
  } catch (error) {
    response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    response.end(error instanceof Error ? error.message : "Not found");
  }
}).listen(port, "127.0.0.1", () => {
  console.log(`Dashboard mockup running at http://127.0.0.1:${port}`);
});
