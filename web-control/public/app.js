const form = document.querySelector("#configForm");
const saveButton = document.querySelector("#saveButton");
const statusText = document.querySelector("#statusText");
const preview = document.querySelector("#preview");
const jsonOutput = document.querySelector("#jsonOutput");

let currentConfig;

const routeMeta = {
  Red: { badge: "R", tone: "red", destination: "Howard" },
  Brown: { badge: "B", tone: "brown", destination: "Loop" },
  Purple: { badge: "P", tone: "purple", destination: "Linden" }
};

function getPath(object, path) {
  return path.split(".").reduce((value, key) => value?.[key], object);
}

function setPath(object, path, value) {
  const keys = path.split(".");
  const last = keys.pop();
  const target = keys.reduce((node, key) => {
    node[key] ||= {};
    return node[key];
  }, object);
  target[last] = value;
}

function fillForm(config) {
  for (const field of form.elements) {
    if (!field.name) continue;
    const value = getPath(config, field.name);
    if (field.type === "checkbox") {
      field.checked = Boolean(value);
    } else if (field.name === "cta.routes") {
      field.value = Array.isArray(value) ? value.join(", ") : "";
    } else {
      field.value = value ?? "";
    }
  }
}

function readForm() {
  const next = structuredClone(currentConfig);
  for (const field of form.elements) {
    if (!field.name) continue;
    let value = field.type === "checkbox" ? field.checked : field.value;
    if (field.type === "number") value = Number(value);
    if (field.name === "cta.routes") {
      value = field.value.split(",").map((item) => item.trim()).filter(Boolean);
    }
    setPath(next, field.name, value);
  }
  return next;
}

function renderPreview(config) {
  const routeRows = config.cta.routes.slice(0, 3).map((routeName, index) => {
    const route = routeMeta[routeName] || { badge: routeName.slice(0, 1), tone: "", destination: routeName };
    const minutes = `${config.cta.walkMinutes + config.cta.comfortMinutes + 1 + index * 4}m`;
    return `<li class="train-row">
      <span class="badge ${route.tone}">${route.badge}</span>
      <span class="minutes">${minutes}</span>
      <span class="destination">${config.cta.showDestinationNames ? route.destination : ""}</span>
    </li>`;
  }).join("");

  const recommendation = config.cta.walkMinutes <= 0 ? "LEAVE NOW" : "WAIT 1m";
  preview.innerHTML = `<span class="wifi-dot"></span>
    <p class="device-title">CTA &mdash; ${escapeHtml(config.cta.stationName)}</p>
    <p class="device-time">5:37 PM</p>
    <p class="recommendation">${recommendation}</p>
    <ul class="train-list">${routeRows}</ul>
    <div class="dots"><span class="dot"></span><span class="dot active"></span></div>`;

  jsonOutput.textContent = JSON.stringify(config, null, 2);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

async function loadConfig() {
  const response = await fetch("/api/config", { cache: "no-store" });
  if (!response.ok) throw new Error("Unable to load config");
  currentConfig = await response.json();
  fillForm(currentConfig);
  renderPreview(currentConfig);
  statusText.textContent = "Loaded";
}

async function saveConfig() {
  currentConfig = readForm();
  statusText.textContent = "Saving...";
  const response = await fetch("/api/config", {
    method: "PUT",
    headers: {
      "content-type": "application/json",
      ...adminAuthHeader()
    },
    body: JSON.stringify(currentConfig)
  });

  if (!response.ok) {
    statusText.textContent = "Save failed";
    return;
  }

  currentConfig = await response.json();
  fillForm(currentConfig);
  renderPreview(currentConfig);
  statusText.textContent = "Saved";
}

function adminAuthHeader() {
  const token = window.localStorage.getItem("dashboardAdminToken");
  return token ? { authorization: `Bearer ${token}` } : {};
}

form.addEventListener("input", () => {
  currentConfig = readForm();
  renderPreview(currentConfig);
});

saveButton.addEventListener("click", saveConfig);

loadConfig().catch((error) => {
  statusText.textContent = error.message;
});
