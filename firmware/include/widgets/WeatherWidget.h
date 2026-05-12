#pragma once

#include "display/DisplayDriver.h"
#include "services/MockDataService.h"

class WeatherWidget {
 public:
  explicit WeatherWidget(DisplayDriver& display) : display_(display) {}

  void render(const WeatherSnapshot& weather) {
    display_.drawCard("Weather", weather.location + " " + weather.temperature + " " + weather.condition + " " + weather.highLow);
  }

 private:
  DisplayDriver& display_;
};
