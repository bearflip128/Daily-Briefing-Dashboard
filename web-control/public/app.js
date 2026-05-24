import { cloneConfig, normalizeConfig } from "./js/config-schema.js";
import { renderDevicePreview } from "./js/device-preview.js";
import {
  clearDraft,
  loadDeviceStatus,
  loadDraft,
  loadServerConfig,
  resetConfig,
  saveDraft,
  saveServerConfig,
  syncDeviceConfig
} from "./js/ota-sync.js";
import { validateConfig } from "./js/validation.js";
import { renderWidgetEditor } from "./js/widget-editor.js";

const elements = {
  widgetList: document.querySelector("#widgetList"),
  preview: document.querySelector("#preview"),
  jsonOutput: document.querySelector("#jsonOutput"),
  syncButton: document.querySelector("#syncButton"),
  resetButton: document.querySelector("#resetButton"),
  saveStateText: document.querySelector("#saveStateText"),
  lastSyncedText: document.querySelector("#lastSyncedText"),
  deviceStatusPill: document.querySelector("#deviceStatusPill"),
  dirtyPill: document.querySelector("#dirtyPill"),
  validationSummary: document.querySelector("#validationSummary"),
  alertRegion: document.querySelector("#alertRegion")
};

let savedConfig = null;
let draftConfig = null;
let deviceStatus = { online: false, lastPublishedAt: null, lastSyncStatus: "idle" };
let saveState = "loading";

init();

async function init() {
  bindActions();

  try {
    const [serverConfig, status] = await Promise.all([loadServerConfig(), loadDeviceStatus()]);
    savedConfig = serverConfig;
    deviceStatus = status;
    draftConfig = loadDraft() || cloneConfig(serverConfig);
    saveState = isDirty() ? "unsaved" : "saved";
    render();
  } catch (error) {
    draftConfig = resetConfig();
    saveState = "failed";
    showAlert(error.message, "error");
    render();
  }
}

function bindActions() {
  elements.syncButton.addEventListener("click", handleSync);
  elements.resetButton.addEventListener("click", () => {
    draftConfig = resetConfig();
    saveState = "unsaved";
    showAlert("Draft reset to defaults. Sync OTA to publish it.", "info");
    render();
  });
}

function handleDraftChange(nextConfig, options = {}) {
  draftConfig = normalizeConfig(nextConfig);
  saveDraft(draftConfig);
  saveState = "unsaved";
  render({ refreshEditor: options.refreshEditor !== false });
}

async function handleSync() {
  const issues = validateConfig(draftConfig);
  if (issues.length > 0) {
    saveState = "failed";
    showAlert("Fix validation issues before syncing OTA.", "error");
    render();
    return;
  }

  try {
    saveState = "syncing";
    render();
    savedConfig = await saveServerConfig(draftConfig);
    deviceStatus = await syncDeviceConfig();
    draftConfig = cloneConfig(savedConfig);
    clearDraft();
    saveState = "saved";
    showAlert(deviceStatus.message || "Config published for device polling.", "success");
    render();
  } catch (error) {
    saveState = "failed";
    showAlert(error.message, "error");
    render();
  }
}

function render(options = {}) {
  if (!draftConfig) return;
  const issues = validateConfig(draftConfig);

  if (options.refreshEditor !== false) {
    renderWidgetEditor(elements.widgetList, draftConfig, handleDraftChange);
  }
  renderDevicePreview(elements.preview, draftConfig, deviceStatus);
  elements.jsonOutput.textContent = JSON.stringify(draftConfig, null, 2);
  renderValidation(issues);
  renderStatus(issues);
}

function renderValidation(issues) {
  elements.validationSummary.hidden = issues.length === 0;
  elements.validationSummary.innerHTML = issues.length === 0
    ? ""
    : `<strong>Needs attention</strong>${issues.map((issue) => `<p>${escapeHtml(issue.message)}</p>`).join("")}`;
}

function renderStatus(issues) {
  const isOnline = Boolean(deviceStatus?.online);
  elements.deviceStatusPill.className = `status-pill ${isOnline ? "online" : "offline"}`;
  elements.deviceStatusPill.innerHTML = `<span class="status-dot" aria-hidden="true"></span><span>${isOnline ? "Device online" : "Device offline"}</span>`;
  elements.deviceStatusPill.title = isOnline && deviceStatus?.ip
    ? `ESP32 reachable at ${deviceStatus.ip}${deviceStatus.rssi ? `, RSSI ${deviceStatus.rssi} dBm` : ""}`
    : (deviceStatus?.lastError || "Device status endpoint is not responding");

  elements.lastSyncedText.textContent = `Last synced: ${formatDateTime(deviceStatus?.lastPublishedAt)}`;
  elements.saveStateText.textContent = statusText(saveState, issues);
  elements.dirtyPill.textContent = isDirty() ? "Unsaved" : "Saved";
  elements.dirtyPill.className = `dirty-pill ${isDirty() ? "dirty" : ""}`;
  elements.syncButton.disabled = saveState === "syncing" || issues.length > 0;
  elements.syncButton.textContent = saveState === "syncing" ? "Syncing..." : "Sync OTA";
}

function isDirty() {
  if (!savedConfig || !draftConfig) return false;
  return JSON.stringify(savedConfig) !== JSON.stringify(draftConfig);
}

function statusText(state, issues) {
  if (issues.length > 0) return `${issues.length} validation issue${issues.length === 1 ? "" : "s"}`;
  if (state === "loading") return "Loading";
  if (state === "syncing") return "Syncing";
  if (state === "failed") return "Failed sync";
  if (isDirty()) return "Unsaved changes";
  return "Saved";
}

function showAlert(message, tone) {
  elements.alertRegion.innerHTML = `<div class="alert ${tone}">${escapeHtml(message)}</div>`;
  window.setTimeout(() => {
    if (elements.alertRegion.textContent === message) elements.alertRegion.innerHTML = "";
  }, 7000);
}

function formatDateTime(value) {
  if (!value) return "never";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "never";
  return new Intl.DateTimeFormat([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(date);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
