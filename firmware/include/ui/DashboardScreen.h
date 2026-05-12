#pragma once

#include <Arduino.h>

#include "display/DisplayDriver.h"
#include "services/MockDataService.h"

namespace DashboardLayout {
constexpr int16_t frameX = 8;
constexpr int16_t frameY = 8;
constexpr int16_t frameW = 304;
constexpr int16_t frameH = 224;
constexpr int16_t frameRadius = 14;
constexpr int16_t contentX = 20;
constexpr int16_t topY = 20;
constexpr int16_t topH = 102;
constexpr int16_t dividerTopY = 124;
constexpr int16_t marketsY = 126;
constexpr int16_t dividerBottomY = 170;
constexpr int16_t quoteY = 176;
constexpr int16_t timeDividerX = 118;
constexpr int16_t weatherDividerX = 206;
constexpr int16_t marketDividerA = 113;
constexpr int16_t marketDividerB = 206;
}

class DashboardScreen {
 public:
  DashboardScreen(DisplayDriver& display, MockDataService& dataService)
      : display_(display), dataService_(dataService) {}

  void begin() {
    Serial.println("Dashboard screen ready.");
  }

  void update() {
    const DashboardSnapshot data = dataService_.dashboard();

    display_.clear(DashboardColor::black);
    drawRoundedFrame();
    drawDivider();
    drawTimeSection(data);
    drawWeatherSection(data.weather);
    drawCTASection(data.cta);
    drawMarketsStrip(data.markets);
    drawQuoteSection(data.quote);
    drawPageIndicator();
  }

 private:
  void drawRoundedFrame() {
    display_.roundedRect(DashboardLayout::frameX, DashboardLayout::frameY, DashboardLayout::frameW,
                         DashboardLayout::frameH, DashboardLayout::frameRadius, DashboardColor::muted);
  }

  void drawDivider() {
    // Major dividers map to the requested y ~= 125 and y ~= 170 layout bands.
    display_.line(20, DashboardLayout::dividerTopY, 300, DashboardLayout::dividerTopY, DashboardColor::divider);
    display_.line(20, DashboardLayout::dividerBottomY, 300, DashboardLayout::dividerBottomY, DashboardColor::divider);
    display_.line(DashboardLayout::timeDividerX, 20, DashboardLayout::timeDividerX, 122, DashboardColor::divider);
    display_.line(DashboardLayout::weatherDividerX, 20, DashboardLayout::weatherDividerX, 122, DashboardColor::divider);
    display_.line(DashboardLayout::marketDividerA, 132, DashboardLayout::marketDividerA, 162, DashboardColor::divider);
    display_.line(DashboardLayout::marketDividerB, 132, DashboardLayout::marketDividerB, 162, DashboardColor::divider);
  }

  void drawTimeSection(const DashboardSnapshot& data) {
    display_.text(20, 24, data.time, 4, DashboardColor::white);
    display_.text(88, 35, data.meridiem, 1, DashboardColor::muted);
    display_.text(20, 76, data.date, 2, DashboardColor::muted);
  }

  void drawWeatherSection(const WeatherSnapshot& weather) {
    display_.text(134, 24, weather.temperature + " deg", 4, DashboardColor::white);
    display_.text(132, 76, weather.city, 2, DashboardColor::white);
    display_.text(126, 104, "H " + weather.high + " deg  L " + weather.low + " deg", 1, DashboardColor::muted);
  }

  void drawCTASection(const CtaSnapshot& cta) {
    display_.text(214, 24, "CTA - " + cta.station, 1, DashboardColor::muted);
    for (uint8_t i = 0; i < 3; i++) {
      const int16_t y = 50 + (i * 24);
      display_.circle(224, y + 7, 11, cta.arrivals[i].accentColor);
      display_.text(221, y + 3, cta.arrivals[i].badge, 1, DashboardColor::white);
      display_.text(244, y + 2, cta.arrivals[i].nextArrival, 2, DashboardColor::white);
    }
  }

  void drawMarketsStrip(const MarketSnapshot markets[3]) {
    const int16_t x[3] = {32, 132, 226};
    for (uint8_t i = 0; i < 3; i++) {
      display_.text(x[i], 134, markets[i].label, 1, DashboardColor::white);
      display_.text(x[i], 152, markets[i].percent, 1,
                    markets[i].positive ? DashboardColor::positive : DashboardColor::negative);
    }
  }

  void drawQuoteSection(const QuoteSnapshot& quote) {
    display_.text(24, 184, "\"" + quote.text + "\"", 2, DashboardColor::white);
    display_.text(24, 210, "- " + quote.author, 1, DashboardColor::muted);
  }

  void drawPageIndicator() {
    display_.circle(154, 222, 2, DashboardColor::white);
    display_.circle(166, 222, 2, DashboardColor::muted);
  }

  DisplayDriver& display_;
  MockDataService& dataService_;
};
