export function renderSpotifyWidget(spotify) {
  return `
    <article class="card spotify-card">
      <div class="spotify-logo" aria-label="Spotify placeholder">
        <span></span>
        <span></span>
        <span></span>
      </div>
      <div>
        <p class="card-title">${spotify.status}</p>
        <p class="card-detail">${spotify.detail}</p>
      </div>
    </article>
  `;
}
