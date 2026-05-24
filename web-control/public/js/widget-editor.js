import { setWidgetEnabled, WIDGET_DEFINITIONS } from "./config-schema.js";

const DEFINITION_BY_ID = new Map(WIDGET_DEFINITIONS.map((widget) => [widget.id, widget]));
const CTA_ROUTES = ["Red", "Brown", "Purple"];

export function renderWidgetEditor(container, config, onChange) {
  container.innerHTML = config.widgets.map((widget, index) => renderWidgetCard(widget, config, index)).join("");
  bindCardEvents(container, config, onChange);
}

function renderWidgetCard(widget, config, index) {
  const definition = DEFINITION_BY_ID.get(widget.id);
  if (!definition) return "";

  return `<article class="widget-card ${widget.enabled ? "enabled" : ""}" draggable="true" data-widget-id="${widget.id}">
    <header class="widget-card-head">
      <button class="drag-handle" type="button" aria-label="Drag ${definition.name}" title="Drag to reorder">::</button>
      <div class="widget-title-block">
        <span class="screen-state">${widget.enabled ? "On screen" : "Available"}</span>
        <h3>${definition.name}</h3>
        <p>${definition.description}</p>
      </div>
      <label class="toggle-label">
        <span class="sr-only">Enable ${definition.name}</span>
        <input class="widget-toggle" type="checkbox" data-action="toggle" ${widget.enabled ? "checked" : ""}>
        <span class="toggle-track" aria-hidden="true"></span>
      </label>
    </header>
    <details class="widget-settings" ${index < 2 ? "open" : ""}>
      <summary>Settings</summary>
      ${renderSettings(widget.id, config)}
    </details>
  </article>`;
}

function renderSettings(widgetId, config) {
  switch (widgetId) {
    case "cta":
      return `<div class="settings-grid">
        ${textField("Station name", "cta.stationName", config.cta.stationName, "Fullerton")}
        ${textField("Station map ID", "cta.stationMapId", config.cta.stationMapId, "41220", "numeric")}
        ${numberField("Walk minutes", "cta.walkMinutes", config.cta.walkMinutes, 0, 60)}
        ${numberField("Buffer minutes", "cta.comfortMinutes", config.cta.comfortMinutes, 0, 15)}
        <fieldset class="route-picker">
          <legend>Routes</legend>
          ${CTA_ROUTES.map((route) => `<label class="check-row">
            <input type="checkbox" data-field="cta.routes" value="${route}" ${config.cta.routes.includes(route) ? "checked" : ""}>
            <span>${route}</span>
          </label>`).join("")}
        </fieldset>
        ${checkField("Show destinations", "cta.showDestinationNames", config.cta.showDestinationNames)}
      </div>`;
    case "clock":
      return `<p class="settings-note">Clock uses the device time. Firmware should keep this synced with NTP over Wi-Fi.</p>`;
    case "weather":
      return `<div class="settings-grid">
        ${textField("City", "weather.city", config.weather.city, "Chicago")}
        ${numberField("Latitude", "weather.latitude", config.weather.latitude, -90, 90, "0.0001")}
        ${numberField("Longitude", "weather.longitude", config.weather.longitude, -180, 180, "0.0001")}
        ${checkField("Show current temp", "weather.showCurrent", config.weather.showCurrent)}
        ${checkField("Show high temp", "weather.showHigh", config.weather.showHigh)}
      </div>`;
    case "markets":
      return `<div class="settings-grid">
        ${textField("Ticker symbols", "markets.symbols", config.markets.symbols.join(", "), "SPY, VXUS, BTC")}
      </div>`;
    case "quote":
      return `<div class="settings-grid">
        <label>
          Quote mode
          <select data-field="quote.mode">
            <option value="static" ${config.quote.mode === "static" ? "selected" : ""}>Static</option>
            <option value="ticker" ${config.quote.mode === "ticker" ? "selected" : ""}>Ticker later</option>
          </select>
        </label>
        ${numberField("Max length", "quote.maxLength", config.quote.maxLength, 20, 160)}
      </div>`;
    case "image":
      return `<div class="settings-grid">
        ${textField("Image URL", "image.url", config.image.url, "https://...", "url")}
        <label>
          Fit
          <select data-field="image.fit">
            <option value="cover" ${config.image.fit === "cover" ? "selected" : ""}>Cover</option>
            <option value="contain" ${config.image.fit === "contain" ? "selected" : ""}>Contain</option>
          </select>
        </label>
      </div>`;
    default:
      return "";
  }
}

function bindCardEvents(container, config, onChange) {
  let draggedId = null;

  container.querySelectorAll(".widget-card").forEach((card) => {
    card.addEventListener("dragstart", (event) => {
      draggedId = card.dataset.widgetId;
      event.dataTransfer.effectAllowed = "move";
      card.classList.add("dragging");
    });

    card.addEventListener("dragend", () => {
      draggedId = null;
      card.classList.remove("dragging");
    });

    card.addEventListener("dragover", (event) => {
      event.preventDefault();
      card.classList.add("drop-target");
    });

    card.addEventListener("dragleave", () => card.classList.remove("drop-target"));

    card.addEventListener("drop", (event) => {
      event.preventDefault();
      card.classList.remove("drop-target");
      moveWidget(config, draggedId, card.dataset.widgetId);
      onChange(config);
    });

    bindPointerDrag(card, container, config, onChange);
  });

  container.addEventListener("input", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement || target instanceof HTMLSelectElement)) return;
    const card = target.closest(".widget-card");
    if (!card) return;

    if (target.dataset.action === "toggle") {
      setWidgetEnabled(config, card.dataset.widgetId, target.checked);
      onChange(config);
      return;
    }

    if (target.dataset.field === "cta.routes") {
      config.cta.routes = [...container.querySelectorAll('input[data-field="cta.routes"]:checked')].map((input) => input.value);
      onChange(config, { refreshEditor: false });
      return;
    }

    if (target.dataset.field) {
      setFieldValue(config, target.dataset.field, fieldValue(target));
      onChange(config, { refreshEditor: false });
    }
  });
}

function bindPointerDrag(card, container, config, onChange) {
  const handle = card.querySelector(".drag-handle");
  if (!handle) return;

  let pointerId = null;

  handle.addEventListener("pointerdown", (event) => {
    pointerId = event.pointerId;
    handle.setPointerCapture(pointerId);
    card.classList.add("dragging");
  });

  handle.addEventListener("pointerup", (event) => {
    if (pointerId !== event.pointerId) return;
    const targetCard = document.elementFromPoint(event.clientX, event.clientY)?.closest(".widget-card");
    card.classList.remove("dragging");
    pointerId = null;
    if (targetCard && targetCard !== card) {
      moveWidget(config, card.dataset.widgetId, targetCard.dataset.widgetId);
      onChange(config);
    }
  });
}

function moveWidget(config, sourceId, targetId) {
  if (!sourceId || !targetId || sourceId === targetId) return;
  const sourceIndex = config.widgets.findIndex((widget) => widget.id === sourceId);
  const targetIndex = config.widgets.findIndex((widget) => widget.id === targetId);
  if (sourceIndex < 0 || targetIndex < 0) return;
  const [source] = config.widgets.splice(sourceIndex, 1);
  config.widgets.splice(targetIndex, 0, source);
}

function setFieldValue(object, path, value) {
  const keys = path.split(".");
  const last = keys.pop();
  const target = keys.reduce((node, key) => node[key], object);
  target[last] = value;
}

function fieldValue(field) {
  if (field instanceof HTMLInputElement && field.type === "checkbox") return field.checked;
  if (field instanceof HTMLInputElement && field.type === "number") return Number(field.value);
  if (field.dataset.field === "markets.symbols") {
    return field.value.split(",").map((symbol) => symbol.trim().toUpperCase()).filter(Boolean);
  }
  return field.value;
}

function textField(label, field, value, placeholder, inputMode = "text") {
  const type = inputMode === "url" ? "url" : "text";
  return `<label>
    ${label}
    <input data-field="${field}" type="${type}" inputmode="${inputMode}" value="${escapeAttribute(value)}" placeholder="${escapeAttribute(placeholder)}">
  </label>`;
}

function numberField(label, field, value, min, max, step = "1") {
  return `<label>
    ${label}
    <input data-field="${field}" type="number" min="${min}" max="${max}" step="${step}" value="${escapeAttribute(value)}">
  </label>`;
}

function checkField(label, field, checked) {
  return `<label class="check-row">
    <input data-field="${field}" type="checkbox" ${checked ? "checked" : ""}>
    <span>${label}</span>
  </label>`;
}

function escapeAttribute(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}
