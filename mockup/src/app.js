const dashboard = document.querySelector("#dashboard");

const UI = {
  regions: {
    frame: { x: 8, y: 8, w: 304, h: 224 },
    top: { x: 20, y: 20, w: 280, h: 102 },
    markets: { x: 20, y: 126, w: 280, h: 42 },
    quote: { x: 20, y: 176, w: 280, h: 46 }
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

function drawWeatherSection(weather) {
  dashboard.insertAdjacentHTML(
    "beforeend",
    `<section class="weather-section" style="left:124px; top:${UI.regions.top.y}px">
      <div class="weather-temp">${weather.temp}</div>
      <p class="weather-range">H ${weather.high}</p>
    </section>`
  );
}

function drawCTASection(cta) {
  const rows = cta.arrivals
    .map(
      (arrival) => `<li>
        <span class="line-badge ${arrival.tone}">${arrival.badge}</span>
        <span class="arrival-time">${arrival.minutes}</span>
      </li>`
    )
    .join("");

  dashboard.insertAdjacentHTML(
    "beforeend",
    `<section class="cta-section" style="left:${UI.columns.ctaX}px; top:${UI.regions.top.y}px">
      <p class="section-label">CTA &mdash; ${cta.station}</p>
      <ul class="cta-list">${rows}</ul>
    </section>`
  );
}

function drawMarketsStrip(markets) {
  const region = UI.regions.markets;
  const items = markets
    .map(
      (market) => `<div class="market-item">
        <span class="market-label">${market.label}</span>
        <span class="market-percent ${market.direction}">${market.percent}</span>
      </div>`
    )
    .join("");

  dashboard.insertAdjacentHTML(
    "beforeend",
    `<section class="markets-strip" style="left:${region.x}px; top:${region.y}px">${items}</section>`
  );
}

function drawQuoteSection(quote) {
  const region = UI.regions.quote;
  dashboard.insertAdjacentHTML(
    "beforeend",
    `<section class="quote-section" style="left:${region.x}px; top:${region.y}px">
      <p class="quote-text">&ldquo;${quote.text}&rdquo;</p>
      <p class="quote-author">&mdash; ${quote.author}</p>
    </section>`
  );
}

function drawPageIndicator() {
  dashboard.insertAdjacentHTML(
    "beforeend",
    `<div class="page-indicator" aria-label="Page 1 of 2">
      <span class="dot active"></span>
      <span class="dot"></span>
    </div>`
  );
}

function renderDashboard(data) {
  dashboard.innerHTML = "";

  // Fixed regions match the 320x240 embedded target so browser iteration maps
  // cleanly to the firmware drawing coordinates.
  drawRoundedFrame();
  drawDivider({ x: 20, y: 124, w: 280, h: 1 });
  drawDivider({ x: 20, y: 170, w: 280, h: 1 });
  drawDivider({ x: 202, y: 20, w: 1, h: 102 });
  drawDivider({ x: 113, y: 132, w: 1, h: 30, className: "markets-divider" });
  drawDivider({ x: 206, y: 132, w: 1, h: 30, className: "markets-divider" });

  drawTimeSection(data.time);
  drawWeatherSection(data.weather);
  drawCTASection(data.cta);
  drawMarketsStrip(data.markets);
  drawQuoteSection(data.quote);
  drawPageIndicator();
}

renderDashboard(dashboardData);
