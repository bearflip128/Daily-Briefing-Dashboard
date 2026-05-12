export function renderCtaWidget(cta) {
  return `
    <article class="card cta-card">
      <div class="card-topline">
        <span class="icon-bubble">CTA</span>
        <span>${cta.status}</span>
      </div>
      <p class="route-name">${cta.route}</p>
      <p class="card-detail">${cta.stop}</p>
      <p class="arrival-pill">${cta.nextArrival}</p>
    </article>
  `;
}
