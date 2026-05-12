function renderMorningWidget(morning) {
  return `
    <article class="card morning-card">
      <div class="card-topline">
        <span class="icon-bubble">☕</span>
        <span>${morning.title}</span>
      </div>
      <p class="summary-text">${morning.summary}</p>
    </article>
  `;
}
