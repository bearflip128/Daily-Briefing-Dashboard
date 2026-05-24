import { activeWidgets, WIDGET_DEFINITIONS, widgetEnabled } from "./config-schema.js";

const ROUTES = {
  Red: { badge: "R", tone: "red", destination: "Howard" },
  Brown: { badge: "B", tone: "brown", destination: "Loop" },
  Purple: { badge: "P", tone: "purple", destination: "Linden" }
};

const MOCK_MARKETS = {
  SPY: "+0.71%",
  "S&P 500": "+0.71%",
  VXUS: "+0.42%",
  BTC: "-1.23%"
};

export function renderDevicePreview(container, config, deviceStatus) {
  const widgets = activeWidgets(config);
  const isFullCta = config.activePage === "cta-full" && widgetEnabled(config, "cta");

  container.classList.toggle("full-cta", isFullCta);
  container.innerHTML = isFullCta
    ? renderFullCta(config, deviceStatus)
    : renderOverview(config, widgets, deviceStatus);
}

export function renderLiveDeviceSnapshot(container, livePayload) {
  if (!livePayload?.online || !livePayload.snapshot) {
    container.classList.add("full-cta");
    container.innerHTML = `<div class="live-empty">${escapeHtml(livePayload?.error || "Live device snapshot unavailable")}</div>`;
    return;
  }

  const snapshot = livePayload.snapshot;
  container.classList.add("full-cta");
  container.innerHTML = renderFullCtaSnapshot(snapshot);
}

function renderFullCta(config, deviceStatus) {
  const rows = config.cta.routes.slice(0, 3).map((routeName, index) => {
    const route = ROUTES[routeName] || { badge: routeName.slice(0, 1), tone: "", destination: routeName };
    const minutes = config.cta.walkMinutes + config.cta.comfortMinutes + 1 + index * 4;
    return `<li class="train-row">
      <span class="route-badge ${route.tone}">${route.badge}</span>
      <span class="train-minutes">${minutes}m</span>
      <span class="train-destination">${config.cta.showDestinationNames ? escapeHtml(route.destination) : ""}</span>
    </li>`;
  }).join("");

  return `
    ${renderWifi(deviceStatus)}
    <header class="full-cta-head">
      <p class="device-title">CTA - ${escapeHtml(config.cta.stationName)}</p>
      <p class="device-time">${currentTime()}</p>
    </header>
    <p class="leave-label">WAIT</p>
    <p class="leave-time">${Math.max(0, config.cta.walkMinutes - 14)}m</p>
    <ul class="train-list">${rows}</ul>
  `;
}

function renderFullCtaSnapshot(snapshot) {
  const arrivals = Array.isArray(snapshot.cta?.arrivals) ? snapshot.cta.arrivals.slice(0, 3) : [];
  const rows = arrivals.map((arrival) => {
    return `<li class="train-row">
      <span class="route-badge ${routeToneForBadge(arrival.badge)}">${escapeHtml(arrival.badge)}</span>
      <span class="train-minutes">${escapeHtml(arrival.nextArrival)}</span>
      <span class="train-destination">${escapeHtml(arrival.direction)}</span>
    </li>`;
  }).join("");

  return `
    ${renderWifi({ online: snapshot.wifiConnected })}
    <header class="full-cta-head">
      <p class="device-title">CTA - ${escapeHtml(snapshot.cta?.station || "Fullerton")}</p>
      <p class="device-time">${escapeHtml(`${snapshot.time || "--:--"} ${snapshot.meridiem || ""}`.trim())}</p>
    </header>
    <p class="leave-label">${recommendationLabel(snapshot.cta?.recommendation)}</p>
    <p class="leave-time">${recommendationValue(snapshot.cta?.recommendation)}</p>
    <ul class="train-list">${rows}</ul>
  `;
}

function renderOverview(config, widgets, deviceStatus) {
  const renderedWidgets = widgets.map((widget) => renderWidget(widget.id, config)).join("");
  return `
    ${renderWifi(deviceStatus)}
    <section class="overview-grid">
      ${renderedWidgets || renderEmptyPreview()}
    </section>
    <div class="page-dots"><span class="active"></span><span></span></div>
  `;
}

function renderWidget(widgetId, config) {
  switch (widgetId) {
    case "clock":
      return `<article class="preview-widget clock-widget">
        <p class="preview-label">${currentDate()}</p>
        <strong>${currentTime()}</strong>
      </article>`;
    case "weather":
      return `<article class="preview-widget weather-widget">
        <p class="preview-label">${escapeHtml(config.weather.city)}</p>
        <strong>43C</strong>
        <span>H 49</span>
      </article>`;
    case "cta":
      return `<article class="preview-widget cta-widget">
        <p class="preview-label">CTA - ${escapeHtml(config.cta.stationName)}</p>
        <div class="mini-routes">${config.cta.routes.slice(0, 3).map((routeName, index) => {
          const route = ROUTES[routeName];
          return `<span><b class="${route?.tone || ""}">${route?.badge || routeName[0]}</b>${config.cta.walkMinutes + index * 4}m</span>`;
        }).join("")}</div>
      </article>`;
    case "markets":
      return `<article class="preview-widget markets-widget">
        ${config.markets.symbols.slice(0, 3).map((symbol) => {
          const value = MOCK_MARKETS[symbol] || "+0.00%";
          const tone = value.startsWith("-") ? "negative" : "positive";
          return `<span>${escapeHtml(symbol)} <b class="${tone}">${value}</b></span>`;
        }).join("")}
      </article>`;
    case "quote":
      return `<article class="preview-widget quote-widget">
        <p>"Discipline compounds quietly."</p>
        <span>- James Clear</span>
      </article>`;
    case "image":
      return `<article class="preview-widget image-widget">
        <p class="preview-label">Image page</p>
        <strong>${config.image.url ? "Ready" : "No image"}</strong>
      </article>`;
    default:
      return "";
  }
}

function renderWifi(deviceStatus) {
  const online = Boolean(deviceStatus?.online);
  return `<span class="wifi-indicator ${online ? "online" : "offline"}" title="${online ? "Device online" : "Device offline"}"></span>`;
}

function recommendationLabel(value) {
  const text = String(value || "CTA LIVE");
  if (text.startsWith("WAIT ")) return "WAIT";
  return text;
}

function recommendationValue(value) {
  const text = String(value || "CTA LIVE");
  if (text.startsWith("WAIT ")) return text.replace("WAIT ", "");
  if (text === "LEAVE NOW") return "NOW";
  return "";
}

function routeToneForBadge(badge) {
  if (badge === "R") return "red";
  if (badge === "B") return "brown";
  if (badge === "P") return "purple";
  return "";
}

function renderEmptyPreview() {
  return `<article class="preview-widget empty-widget">
    <strong>No widgets</strong>
    <span>Enable one widget to show content.</span>
  </article>`;
}

function currentTime() {
  return new Intl.DateTimeFormat([], { hour: "numeric", minute: "2-digit" }).format(new Date());
}

function currentDate() {
  return new Intl.DateTimeFormat([], { weekday: "short", month: "short", day: "numeric" }).format(new Date());
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function widgetLabel(widgetId) {
  return WIDGET_DEFINITIONS.find((widget) => widget.id === widgetId)?.name || widgetId;
}
