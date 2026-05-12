function renderStockWidget(stock) {
  return `
    <article class="card stock-card">
      <div class="card-topline">
        <span class="icon-bubble">↗</span>
        <span>${stock.symbol}</span>
      </div>
      <p class="stock-price">$${stock.price}</p>
      <p class="stock-move">${stock.movement}</p>
    </article>
  `;
}
