function renderWeatherWidget(weather) {
  return `
    <article class="card weather-card">
      <div class="card-topline">
        <span class="icon-bubble">☀</span>
        <span>${weather.location}</span>
      </div>
      <div class="weather-main">
        <span class="weather-temp">${weather.temp}°</span>
        <span class="weather-condition">${weather.condition}</span>
      </div>
      <p class="card-detail">${weather.highLow}</p>
    </article>
  `;
}
