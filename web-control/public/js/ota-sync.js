import { DEFAULT_CONFIG, normalizeConfig } from "./config-schema.js";

const DRAFT_KEY = "dailyBriefingDashboardDraft";
const TOKEN_KEY = "dashboardAdminToken";

export async function loadServerConfig() {
  const response = await fetch("/api/config", { cache: "no-store" });
  if (!response.ok) throw new Error("Unable to load dashboard config.");
  return normalizeConfig(await response.json());
}

export async function saveServerConfig(config) {
  const response = await fetch("/api/config", {
    method: "PUT",
    headers: {
      "content-type": "application/json",
      ...adminAuthHeader()
    },
    body: JSON.stringify(normalizeConfig(config))
  });

  if (!response.ok) throw new Error(await readError(response, "Save failed."));
  return normalizeConfig(await response.json());
}

export async function syncDeviceConfig() {
  const response = await fetch("/api/device/sync", {
    method: "POST",
    headers: adminAuthHeader()
  });

  if (!response.ok) throw new Error(await readError(response, "Sync failed."));
  return response.json();
}

export async function loadDeviceStatus() {
  const response = await fetch("/api/device/status", { cache: "no-store" });
  if (!response.ok) return { online: false, lastSyncStatus: "unknown" };
  return response.json();
}

export function loadDraft() {
  try {
    const rawDraft = window.localStorage.getItem(DRAFT_KEY);
    return rawDraft ? normalizeConfig(JSON.parse(rawDraft)) : null;
  } catch {
    return null;
  }
}

export function saveDraft(config) {
  window.localStorage.setItem(DRAFT_KEY, JSON.stringify(normalizeConfig(config)));
}

export function clearDraft() {
  window.localStorage.removeItem(DRAFT_KEY);
}

export function resetConfig() {
  clearDraft();
  return normalizeConfig(DEFAULT_CONFIG);
}

function adminAuthHeader() {
  const token = window.localStorage.getItem(TOKEN_KEY);
  return token ? { authorization: `Bearer ${token}` } : {};
}

async function readError(response, fallback) {
  try {
    const payload = await response.json();
    return payload.error || payload.message || fallback;
  } catch {
    return fallback;
  }
}
