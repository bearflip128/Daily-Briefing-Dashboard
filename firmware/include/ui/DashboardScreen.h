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
    const uint32_t now = millis();
    if (rendered_ && now - lastClockRenderMs_ >= clockRefreshMs_) {
      dataService_.refreshClock(currentData_);
      drawTimeSection(currentData_);
      drawWifiIndicator(currentData_.wifiConnected);
      lastClockRenderMs_ = now;
    }

    if (rendered_ && now - lastQuoteRenderMs_ >= quoteTickerMs_) {
      drawQuoteSection(currentData_.quote);
      lastQuoteRenderMs_ = now;
      quoteOffset_ = (quoteOffset_ + 3) % quoteCycleWidth(currentData_.quote);
    }

    if (rendered_ && now - lastDataRefreshMs_ < AppConfig::liveDataRefreshMs) {
      return;
    }

    currentData_ = dataService_.dashboard();
    quoteOffset_ = 0;

    display_.clear(DashboardColor::black);
    drawDivider();
    drawTimeSection(currentData_);
    drawWeatherSection(currentData_.weather);
    drawCTASection(currentData_.cta);
    drawMarketsStrip(currentData_.markets);
    drawQuoteSection(currentData_.quote);
    drawWifiIndicator(currentData_.wifiConnected);
    drawPageIndicator();
    rendered_ = true;
    lastDataRefreshMs_ = now;
    lastQuoteRenderMs_ = now;
    lastClockRenderMs_ = now;
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
    display_.fillRect(18, 20, 96, 84, DashboardColor::black);
    display_.textSans(20, 56, data.time, 2, DashboardColor::white);
    display_.text(102, 44, data.meridiem, 1, DashboardColor::muted);
    display_.textSans(20, 94, data.date, 1, DashboardColor::muted);
  }

  void drawWifiIndicator(bool connected) {
    display_.fillRect(300, 14, 12, 12, DashboardColor::black);
    display_.circle(306, 20, 4, connected ? DashboardColor::positive : DashboardColor::negative);
  }

  void drawWeatherSection(const WeatherSnapshot& weather) {
    display_.circle(136, 36, 7, DashboardColor::divider);
    display_.text(132, 32, "C", 1, DashboardColor::muted);
    display_.textSans(152, 46, weather.temperature, 2, DashboardColor::white);
    display_.degreeMark(198, 24, DashboardColor::white);
    display_.circle(136, 78, 7, DashboardColor::divider);
    display_.text(132, 74, "H", 1, DashboardColor::muted);
    display_.textSans(152, 88, weather.high, 2, DashboardColor::white);
    display_.degreeMark(198, 66, DashboardColor::white);
  }

  void drawCTASection(const CtaSnapshot& cta) {
    display_.text(212, 24, "CTA - " + cta.station, 1, DashboardColor::muted);
    for (uint8_t i = 0; i < 3; i++) {
      const int16_t y = 50 + (i * 24);
      display_.circle(222, y + 7, 11, cta.arrivals[i].accentColor);
      display_.text(219, y + 3, cta.arrivals[i].badge, 1, DashboardColor::white);
      display_.textSans(242, y + 18, cta.arrivals[i].nextArrival, 1, DashboardColor::white);
      display_.text(276, y + 10, cta.arrivals[i].direction, 1, DashboardColor::muted);
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
    display_.fillRect(20, 176, 280, 46, DashboardColor::black);
    const String ticker = "\"" + quote.text + "\" - " + quote.author;
    const int16_t textWidth = ticker.length() * 11;
    const int16_t x = textWidth <= 270 ? 24 : 300 - quoteOffset_;
    display_.textSans(x, 205, ticker, 1, DashboardColor::white);
  }

  void drawPageIndicator() {
    display_.circle(154, 230, 2, DashboardColor::white);
    display_.circle(166, 230, 2, DashboardColor::muted);
  }

  uint16_t quoteCycleWidth(const QuoteSnapshot& quote) const {
    const String ticker = "\"" + quote.text + "\" - " + quote.author;
    const uint16_t estimate = ticker.length() * 11;
    return max((uint16_t)300, (uint16_t)(estimate + 320));
  }

  DisplayDriver& display_;
  MockDataService& dataService_;
  DashboardSnapshot currentData_;
  bool rendered_ = false;
  uint32_t lastDataRefreshMs_ = 0;
  uint32_t lastQuoteRenderMs_ = 0;
  uint32_t lastClockRenderMs_ = 0;
  uint16_t quoteOffset_ = 0;
  static constexpr uint16_t quoteTickerMs_ = 120;
  static constexpr uint16_t clockRefreshMs_ = 1000;
};
