const liveConfig = {
  refreshMs: 60000,
  ctaWalkMinutes: 15,
  ctaComfortMinutes: 2,
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
  if (destination.includes("95th")) return "95th";
  if (destination.includes("Howard")) return "Howard";
  if (destination.includes("Loop")) return "Loop";
  if (destination.includes("Kimball")) return "Kimball";
  if (destination.includes("Linden")) return "Linden";
  return arrival.trDr === "1" ? "N" : arrival.trDr === "5" ? "S" : "";
}

function ctaRecommendation(arrivals) {
  const catchableMinutes = liveConfig.ctaWalkMinutes + liveConfig.ctaComfortMinutes;
  const soonest = arrivals
    .map((arrival) => arrival.rawMinutes)
    .filter((minutes) => Number.isFinite(minutes))
    .sort((a, b) => a - b)[0];

  if (!Number.isFinite(soonest)) {
    return "CTA LIVE";
  }

  const wait = Math.max(0, soonest - catchableMinutes);
  return wait === 0 ? "LEAVE NOW" : `WAIT ${wait}m`;
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
    const catchableMinutes = liveConfig.ctaWalkMinutes + liveConfig.ctaComfortMinutes;
    const match = eta
      .filter((arrival) => arrival.rt === route.rt)
      .map((arrival) => ({ arrival, minutes: minutesBetween(arrival.prdt, arrival.arrT) }))
      .filter((candidate) => Number.isFinite(candidate.minutes) && candidate.minutes >= catchableMinutes)
      .sort((a, b) => a.minutes - b.minutes)[0];

    if (!match) {
      return { badge: route.badge, minutes: "--", rawMinutes: null, direction: "", tone: route.tone };
    }

    return {
      badge: route.badge,
      minutes: `${match.minutes}m`,
      rawMinutes: match.minutes,
      direction: compactCtaDirection(match.arrival),
      tone: route.tone
    };
  });

  return { ...data.cta, recommendation: ctaRecommendation(arrivals), arrivals };
}

async function loadDashboardData(fallbackData = dashboardData) {
  const next = structuredClone(fallbackData);
  next.time = loadTime(next);
  next.status = loadStatus(next);

  const [weather, quote, cta] = await Promise.allSettled([
    loadWeather(next),
    loadQuote(next),
    loadCta(next)
  ]);

  if (weather.status === "fulfilled") next.weather = weather.value;
  if (quote.status === "fulfilled") next.quote = quote.value;
  if (cta.status === "fulfilled") next.cta = cta.value;

  return next;
}
