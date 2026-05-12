const timeElement = document.querySelector("#time");
const dateElement = document.querySelector("#date");
const dashboardWidgets = document.querySelector("#dashboard-widgets");

function formatTime(now) {
  return new Intl.DateTimeFormat([], {
    hour: "numeric",
    minute: "2-digit"
  }).format(now);
}

function formatDate(now) {
  return new Intl.DateTimeFormat([], {
    weekday: "short",
    month: "short",
    day: "numeric"
  }).format(now);
}

function updateClock() {
  const now = new Date();
  timeElement.textContent = formatTime(now);
  dateElement.textContent = formatDate(now);
}

function renderDashboard(data) {
  dashboardWidgets.innerHTML = [
    renderWeatherWidget(data.weather),
    renderCtaWidget(data.cta),
    renderSpotifyWidget(data.spotify),
    renderMorningWidget(data.morning),
    renderStockWidget(data.stocks)
  ].join("");
}

updateClock();
renderDashboard(dashboardData);
window.setInterval(updateClock, 1000);
