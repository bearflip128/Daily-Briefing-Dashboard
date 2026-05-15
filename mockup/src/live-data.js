const liveConfig = {
  refreshMs: 60000,
  weather: {
    latitude: 41.8781,
    longitude: -87.6298,
    timezone: "America/Chicago"
  },
  cta: {
    // CTA Train Tracker requires a key. Add one here or in config.local.json.
    apiKey: "",
    stationMapId: "41220",
    proxyUrl: "/api/cta"
  },
  markets: [
    { label: "S&P 500", stooq: "^spx" },
    { label: "VXUS", stooq: "vxus.us" },
    { label: "BTC", stooq: "btcusd" }
  ]
};

if (window.dashboardLocalConfig) {
  Object.assign(liveConfig.cta, window.dashboardLocalConfig.cta || {});
  Object.assign(liveConfig.weather, window.dashboardLocalConfig.weather || {});
}

async function fetchJson(url) {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }
  return response.json();
}

async function loadWeather(data) {
  const { latitude, longitude, timezone } = liveConfig.weather;
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.search = new URLSearchParams({
    latitude,
    longitude,
    daily: "temperature_2m_max",
    temperature_unit: "fahrenheit",
    timezone,
    forecast_days: "1"
  });

  const payload = await fetchJson(url);
  const high = Math.round(payload.daily.temperature_2m_max[0]);
  return {
    ...data.weather,
    high: `${high}&deg;`
  };
}

function parseStooqCsv(csv) {
  const [, row] = csv.trim().split(/\r?\n/);
  const [, , , , , , closeValue, , previousClose] = row.split(",");
  const close = Number(closeValue);
  const previous = Number(previousClose);
  const change = Number.isFinite(close) && Number.isFinite(previous) && previous !== 0
    ? ((close - previous) / previous) * 100
    : 0;
  const pct = `${change >= 0 ? "+" : ""}${change.toFixed(2)}%`;
  return {
    close: closeValue,
    percent: pct.startsWith("-") || pct.startsWith("+") ? pct : `+${pct}`
  };
}

async function loadMarket(market) {
  const url = `https://stooq.com/q/l/?s=${encodeURIComponent(market.stooq)}&f=sd2t2ohlcvp&h&e=csv`;
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Market request failed: ${response.status}`);
  }
  const parsed = parseStooqCsv(await response.text());
  return {
    label: market.label,
    percent: parsed.percent,
    direction: parsed.percent.startsWith("-") ? "negative" : "positive"
  };
}

async function loadMarkets(data) {
  const markets = await Promise.all(liveConfig.markets.map(loadMarket));
  return markets.length === data.markets.length ? markets : data.markets;
}

async function loadQuote(data) {
  try {
    const quote = await fetchJson("https://quoteslate.vercel.app/api/quotes/random?maxLength=45");
    return {
      text: quote.quote || data.quote.text,
      author: quote.author || data.quote.author
    };
  } catch {
    const quote = await fetchJson("https://api.quotable.io/random?maxLength=45");
    return {
      text: quote.content || data.quote.text,
      author: quote.author || data.quote.author
    };
  }
}

async function loadCta(data) {
  const canUseLocalProxy = window.location.protocol.startsWith("http");
  if (!liveConfig.cta.apiKey && !canUseLocalProxy) {
    return data.cta;
  }

  const url = canUseLocalProxy
    ? new URL(liveConfig.cta.proxyUrl, window.location.origin)
    : new URL("https://lapi.transitchicago.com/api/1.0/ttarrivals.aspx");

  if (canUseLocalProxy) {
    url.search = new URLSearchParams({ mapid: liveConfig.cta.stationMapId });
  } else {
    // Direct mode is a fallback for opening index.html from disk. The local
    // dev server is preferred because CTA may block file:// browser requests.
    url.search = new URLSearchParams({
      key: liveConfig.cta.apiKey,
      mapid: liveConfig.cta.stationMapId,
      outputType: "JSON"
    });
  }

  const payload = await fetchJson(url);
  const eta = payload.ctatt?.eta || [];
  const routeOrder = [
    { rt: "Red", badge: "R", tone: "red" },
    { rt: "Brn", badge: "B", tone: "brown" },
    { rt: "P", badge: "P", tone: "purple" }
  ];

  const arrivals = routeOrder.map((route, index) => {
    const match = eta.find((arrival) => arrival.rt === route.rt);
    if (!match) {
      return { ...data.cta.arrivals[index], minutes: "--" };
    }

    const now = new Date();
    const arrival = new Date(match.arrT);
    const minutes = Math.max(0, Math.round((arrival - now) / 60000));
    return { badge: route.badge, minutes: `${minutes} min`, tone: route.tone };
  });

  return { ...data.cta, arrivals };
}

async function loadDashboardData(fallbackData = dashboardData) {
  const next = structuredClone(fallbackData);

  const [weather, markets, quote, cta] = await Promise.allSettled([
    loadWeather(next),
    loadMarkets(next),
    loadQuote(next),
    loadCta(next)
  ]);

  if (weather.status === "fulfilled") next.weather = weather.value;
  if (markets.status === "fulfilled") next.markets = markets.value;
  if (quote.status === "fulfilled") next.quote = quote.value;
  if (cta.status === "fulfilled") next.cta = cta.value;

  return next;
}
