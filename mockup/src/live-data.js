const liveConfig = {
  refreshMs: 60000,
  weather: {
    latitude: 41.8781,
    longitude: -87.6298,
    timezone: "America/Chicago",
    proxyUrl: "/api/weather"
  },
  cta: {
    // CTA Train Tracker requires a key. Add one here or in config.local.json.
    apiKey: "",
    stationMapId: "41220",
    proxyUrl: "/api/cta"
  },
  markets: [
    { label: "S&P 500", stooq: "^spx", proxyUrl: "/api/market" },
    { label: "VXUS", stooq: "vxus.us", proxyUrl: "/api/market" },
    { label: "BTC", stooq: "btcusd", proxyUrl: "/api/market" }
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

function loadTime(data) {
  const now = new Date();
  return {
    ...data.time,
    hourMinute: now.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true
    }).replace(/\s?(AM|PM)$/, ""),
    meridiem: now.toLocaleTimeString("en-US", {
      hour: "numeric",
      hour12: true
    }).endsWith("AM") ? "AM" : "PM",
    date: now.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric"
    })
  };
}

function loadStatus(data) {
  return {
    ...data.status,
    wifiConnected: navigator.onLine
  };
}

async function loadWeather(data) {
  const { latitude, longitude, timezone } = liveConfig.weather;
  const canUseLocalProxy = window.location.protocol.startsWith("http");
  const url = canUseLocalProxy
    ? new URL(liveConfig.weather.proxyUrl, window.location.origin)
    : new URL("https://api.open-meteo.com/v1/forecast");
  url.search = new URLSearchParams({
    latitude,
    longitude,
    current: "temperature_2m",
    daily: "temperature_2m_max",
    temperature_unit: "fahrenheit",
    timezone,
    forecast_days: "1"
  });

  const payload = await fetchJson(url);
  const current = Math.round(payload.current.temperature_2m);
  const high = Math.round(payload.daily.temperature_2m_max[0]);
  return {
    ...data.weather,
    temp: `${current}&deg;`,
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

function minutesBetween(startTime, arrivalTime) {
  const start = new Date(startTime);
  const arrival = new Date(arrivalTime);
  if (Number.isNaN(start.getTime()) || Number.isNaN(arrival.getTime())) {
    return null;
  }
  return Math.max(0, Math.round((arrival - start) / 60000));
}

function compactCtaDirection(arrival) {
  const destination = arrival.destNm || arrival.stpDe || "";
  if (destination.includes("95th")) return "95";
  if (destination.includes("Howard")) return "How";
  if (destination.includes("Loop")) return "Loop";
  if (destination.includes("Kimball")) return "Kim";
  if (destination.includes("Linden")) return "Ldn";
  return arrival.trDr === "1" ? "N" : arrival.trDr === "5" ? "S" : "";
}

async function loadMarket(market) {
  const canUseLocalProxy = window.location.protocol.startsWith("http");
  const url = canUseLocalProxy
    ? `${market.proxyUrl}?symbol=${encodeURIComponent(market.stooq)}`
    : `https://stooq.com/q/l/?s=${encodeURIComponent(market.stooq)}&f=sd2t2ohlcvp&h&e=csv`;
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
    const quoteUrl = window.location.protocol.startsWith("http")
      ? "/api/quote"
      : "https://quoteslate.vercel.app/api/quotes/random?maxLength=45";
    const quote = await fetchJson(quoteUrl);
    return {
      text: quote.quote || data.quote.text,
      author: quote.author || data.quote.author
    };
  } catch {
    const quote = await fetchJson("https://dummyjson.com/quotes/random");
    return {
      text: quote.quote || data.quote.text,
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

    const minutes = minutesBetween(match.prdt, match.arrT);
    return {
      badge: route.badge,
      minutes: minutes === null ? "--" : `${minutes}m`,
      direction: compactCtaDirection(match),
      tone: route.tone
    };
  });

  return { ...data.cta, arrivals };
}

async function loadDashboardData(fallbackData = dashboardData) {
  const next = structuredClone(fallbackData);
  next.time = loadTime(next);
  next.status = loadStatus(next);

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
