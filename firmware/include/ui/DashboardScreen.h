#pragma once

#include <Arduino.h>

#include "display/DisplayDriver.h"
#include "services/MockDataService.h"
#include "widgets/CtaWidget.h"
#include "widgets/MorningWidget.h"
#include "widgets/SpotifyWidget.h"
#include "widgets/StockWidget.h"
#include "widgets/WeatherWidget.h"

class DashboardScreen {
 public:
  DashboardScreen(DisplayDriver& display, MockDataService& dataService)
      : display_(display),
        dataService_(dataService),
        weatherWidget_(display),
        ctaWidget_(display),
        spotifyWidget_(display),
        morningWidget_(display),
        stockWidget_(display) {}

  void begin() {
    Serial.println("Dashboard screen ready.");
  }

  void update() {
    display_.clear();
    drawHeader();
    weatherWidget_.render(dataService_.weather());
    ctaWidget_.render(dataService_.cta());
    spotifyWidget_.render(dataService_.spotify());
    morningWidget_.render(dataService_.morning());
    stockWidget_.render(dataService_.stock());
  }

 private:
  void drawHeader() {
    const unsigned long seconds = millis() / 1000;
    display_.drawText("Time", String(seconds) + "s since boot");
    display_.drawText("Date", "Mock date");
  }

  DisplayDriver& display_;
  MockDataService& dataService_;
  WeatherWidget weatherWidget_;
  CtaWidget ctaWidget_;
  SpotifyWidget spotifyWidget_;
  MorningWidget morningWidget_;
  StockWidget stockWidget_;
};
