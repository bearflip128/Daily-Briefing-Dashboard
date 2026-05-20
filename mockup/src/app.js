const dashboard = document.querySelector("#dashboard");

const UI = {
  regions: {
    frame: { x: 8, y: 8, w: 304, h: 224 },
    top: { x: 20, y: 20, w: 280, h: 136 },
    quote: { x: 20, y: 166, w: 280, h: 54 }
  },
  columns: {
    ctaX: 212
  }
};

function drawRoundedFrame() {
  dashboard.insertAdjacentHTML("beforeend", '<div class="rounded-frame"></div>');
}

function drawDivider({ x, y, w, h, className = "" }) {
  dashboard.insertAdjacentHTML(
    "beforeend",
    `<div class="divider ${className}" style="left:${x}px; top:${y}px; width:${w}px; height:${h}px"></div>`
  );
}

function drawTimeSection(time) {
  const region = UI.regions.top;
  dashboard.insertAdjacentHTML(
    "beforeend",
    `<section class="time-section" style="left:${region.x}px; top:${region.y}px">
      <div class="time-line"><span class="time-value">${time.hourMinute}</span><span class="time-meridiem">${time.meridiem}</span></div>
      <p class="date-line">${time.date}</p>
    </section>`
  );
}

function drawWifiIndicator(status) {
  dashboard.insertAdjacentHTML(
    "beforeend",
    `<div class="wifi-indicator ${status.wifiConnected ? "online" : "offline"}" aria-label="${status.wifiConnected ? "WiFi connected" : "WiFi disconnected"}"></div>`
  );
}

function drawWeatherSection(weather) {
  dashboard.insertAdjacentHTML(
    "beforeend",
    `<section class="weather-section" style="left:124px; top:${UI.regions.top.y}px">
      <div class="weather-current">
        <span class="weather-marker">C</span>
        <span class="weather-temp">${weather.temp}</span>
      </div>
      <div class="weather-high">
        <span class="weather-marker">H</span>
        <span class="weather-temp">${weather.high}</span>
      </div>
    </section>`
  );
}

function drawCTASection(cta) {
  const rows = cta.arrivals
    .map(
      (arrival) => `<li>
        <span class="line-badge ${arrival.tone}">${arrival.badge}</span>
        <span class="arrival-time">${arrival.minutes}</span>
        <span class="arrival-direction">${arrival.direction || ""}</span>
      </li>`
    )
    .join("");

  dashboard.insertAdjacentHTML(
    "beforeend",
    `<section class="cta-section" style="left:${UI.columns.ctaX}px; top:${UI.regions.top.y}px">
      <p class="section-label">CTA &mdash; ${cta.station}</p>
      <p class="cta-recommendation ${cta.recommendation === "LEAVE NOW" ? "leave-now" : ""}">${cta.recommendation || "CTA LIVE"}</p>
      <ul class="cta-list">${rows}</ul>
    </section>`
  );
}

function drawFullCTASection(data) {
  const rows = data.cta.arrivals
    .map(
      (arrival) => `<li>
        <span class="full-line-badge ${arrival.tone}">${arrival.badge}</span>
        <span class="full-arrival-time">${arrival.minutes}</span>
        <span class="full-arrival-direction">${arrival.direction || ""}</span>
      </li>`
    )
    .join("");

  dashboard.insertAdjacentHTML(
    "beforeend",
    `<section class="full-cta-page">
      <p class="full-cta-label">CTA &mdash; ${data.cta.station}</p>
      <p class="full-cta-clock">${data.time.hourMinute} ${data.time.meridiem}</p>
      <p class="full-cta-recommendation ${data.cta.recommendation === "LEAVE NOW" ? "leave-now" : ""}">${data.cta.recommendation || "CTA LIVE"}</p>
      <ul class="full-cta-list">${rows}</ul>
    </section>`
  );
}

function drawQuoteSection(quote) {
  const region = UI.regions.quote;
  dashboard.insertAdjacentHTML(
    "beforeend",
    `<section class="quote-section" style="left:${region.x}px; top:${region.y}px">
      <div class="quote-ticker">
        <p class="quote-text">&ldquo;${quote.text}&rdquo;</p>
      </div>
      <p class="quote-author">&mdash; ${quote.author}</p>
    </section>`
  );
}

function drawPageIndicator(activePage = 0) {
  dashboard.insertAdjacentHTML(
    "beforeend",
    `<div class="page-indicator" aria-label="Page 1 of 2">
      <span class="dot ${activePage === 0 ? "active" : ""}"></span>
      <span class="dot ${activePage === 1 ? "active" : ""}"></span>
    </div>`
  );
}

function renderDashboard(data) {
  dashboard.innerHTML = "";

  // Fixed regions match the 320x240 embedded target so browser iteration maps
  // cleanly to the firmware drawing coordinates.
  drawRoundedFrame();
  drawFullCTASection(data);
  drawWifiIndicator(data.status);
  drawPageIndicator(1);
}

function refreshClockOnly() {
  const time = loadTime(dashboardData);
  const status = loadStatus(dashboardData);
  const timeValue = dashboard.querySelector(".time-value");
  const meridiem = dashboard.querySelector(".time-meridiem");
  const fullCtaClock = dashboard.querySelector(".full-cta-clock");
  const dateLine = dashboard.querySelector(".date-line");
  const indicator = dashboard.querySelector(".wifi-indicator");

  if (timeValue) timeValue.textContent = time.hourMinute;
  if (meridiem) meridiem.textContent = time.meridiem;
  if (fullCtaClock) fullCtaClock.textContent = `${time.hourMinute} ${time.meridiem}`;
  if (dateLine) dateLine.textContent = time.date;
  if (indicator) {
    indicator.className = `wifi-indicator ${status.wifiConnected ? "online" : "offline"}`;
    indicator.setAttribute("aria-label", status.wifiConnected ? "WiFi connected" : "WiFi disconnected");
  }
}

async function refreshDashboard() {
  renderDashboard(await loadDashboardData(dashboardData));
}

renderDashboard(dashboardData);
refreshDashboard();
window.setInterval(refreshClockOnly, 1000);
window.setInterval(refreshDashboard, liveConfig.refreshMs);
