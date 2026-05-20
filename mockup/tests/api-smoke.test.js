import assert from "node:assert/strict";

const baseUrl = process.env.DASHBOARD_BASE_URL || "http://127.0.0.1:5173";

async function getText(path) {
  const response = await fetch(`${baseUrl}${path}`);
  assert.equal(response.ok, true, `${path} should return OK`);
  return response.text();
}

async function getJson(path) {
  return JSON.parse(await getText(path));
}

const weather = await getJson("/api/weather");
assert(Number.isFinite(weather.current.temperature_2m), "weather current temp should be numeric");
assert(Number.isFinite(weather.daily.temperature_2m_max[0]), "weather high temp should be numeric");

const cta = await getJson("/api/cta");
assert.equal(cta.ctatt.errCd, "0", "CTA should return errCd 0");
assert(Array.isArray(cta.ctatt.eta), "CTA eta should be an array");

const quote = await getJson("/api/quote");
assert(quote.quote || quote.content, "quote should include text");
assert(quote.author, "quote should include author");

console.log("API smoke tests passed.");
