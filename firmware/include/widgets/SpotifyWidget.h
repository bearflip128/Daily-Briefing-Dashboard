#pragma once

#include "display/DisplayDriver.h"
#include "services/MockDataService.h"

class SpotifyWidget {
 public:
  explicit SpotifyWidget(DisplayDriver& display) : display_(display) {}

  void render(const SpotifySnapshot& spotify) {
    display_.drawCard("Spotify", spotify.status + " - " + spotify.detail);
  }

 private:
  DisplayDriver& display_;
};
