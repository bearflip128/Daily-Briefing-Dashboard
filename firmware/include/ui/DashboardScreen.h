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
constexpr int16_t weatherDividerX = 202;
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
    if (rendered_) {
      return;
    }

    const DashboardSnapshot data = dataService_.dashboard();

    display_.clear(DashboardColor::black);
    drawDivider();
    drawTimeSection(data);
    drawWeatherSection(data.weather);
    drawCTASection(data.cta);
    drawMarketsStrip(data.markets);
    drawQuoteSection(data.quote);
    drawPageIndicator();
    rendered_ = true;
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
    display_.line(DashboardLayout::weatherDividerX, 20, DashboardLayout::weatherDividerX, 122, DashboardColor::divider);
    display_.line(DashboardLayout::marketDividerA, 132, DashboardLayout::marketDividerA, 162, DashboardColor::divider);
    display_.line(DashboardLayout::marketDividerB, 132, DashboardLayout::marketDividerB, 162, DashboardColor::divider);
  }

  void drawTimeSection(const DashboardSnapshot& data) {
    display_.textSans(20, 56, data.time, 2, DashboardColor::white);
    display_.text(102, 44, data.meridiem, 1, DashboardColor::muted);
    display_.textSans(20, 94, data.date, 1, DashboardColor::muted);
  }

  void drawWeatherSection(const WeatherSnapshot& weather) {
    display_.textSans(136, 56, weather.temperature, 2, DashboardColor::white);
    display_.degreeMark(188, 34, DashboardColor::white);
    display_.textSans(124, 94, "H " + weather.high + "  L " + weather.low, 1, DashboardColor::muted);
  }

  void drawCTASection(const CtaSnapshot& cta) {
    display_.text(212, 24, "CTA - " + cta.station, 1, DashboardColor::muted);
    for (uint8_t i = 0; i < 3; i++) {
      const int16_t y = 50 + (i * 24);
      display_.circle(222, y + 7, 11, cta.arrivals[i].accentColor);
      display_.text(219, y + 3, cta.arrivals[i].badge, 1, DashboardColor::white);
      display_.textSans(242, y + 18, cta.arrivals[i].nextArrival, 1, DashboardColor::white);
    }
  }

  void drawMarketsStrip(const MarketSnapshot markets[3]) {
    const int16_t x[3] = {32, 132, 226};
    for (uint8_t i = 0; i < 3; i++) {
      display_.textSans(x[i], 146, markets[i].label, 1, DashboardColor::white);
      display_.textSans(x[i], 166, markets[i].percent, 1,
                    markets[i].positive ? DashboardColor::positive : DashboardColor::negative);
    }
  }

  void drawQuoteSection(const QuoteSnapshot& quote) {
    // Future quote API: if quotes exceed the display width, animate this line
    // horizontally as a ticker instead of clipping or shrinking it too far.
    display_.textSans(24, 198, "\"" + quote.text + "\"", 1, DashboardColor::white);
    display_.textSans(24, 218, "- " + quote.author, 1, DashboardColor::muted);
  }

  void drawPageIndicator() {
    display_.circle(154, 230, 2, DashboardColor::white);
    display_.circle(166, 230, 2, DashboardColor::muted);
  }

  DisplayDriver& display_;
  MockDataService& dataService_;
  bool rendered_ = false;
};
