import assert from "node:assert/strict";

const baseUrl = process.env.DASHBOARD_CONTROL_URL || "http://127.0.0.1:8787";

async function getJson(path) {
  const response = await fetch(`${baseUrl}${path}`, { cache: "no-store" });
  assert.equal(response.ok, true, `${path} should return OK`);
  return response.json();
}

const config = await getJson("/api/config");
assert.equal(config.version, 1, "config version should be 1");
assert(config.cta.stationName, "CTA station name should be present");
assert(Number.isFinite(config.cta.walkMinutes), "walk minutes should be numeric");

const deviceConfig = await getJson("/device-config.json");
assert.equal(deviceConfig.cta.stationMapId, config.cta.stationMapId, "device config should mirror admin config");

console.log("Web control smoke tests passed.");
