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
constexpr int16_t topH = 136;
constexpr int16_t dividerTopY = 158;
constexpr int16_t quoteY = 166;
constexpr int16_t weatherDividerX = 202;
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

    if (rendered_ && now - lastDataRefreshMs_ < AppConfig::liveDataRefreshMs) {
      return;
    }

    currentData_ = dataService_.dashboard();

    display_.clear(DashboardColor::black);
    drawDivider();
    drawTimeSection(currentData_);
    drawWeatherSection(currentData_.weather);
    drawCTASection(currentData_.cta);
    drawQuoteSection(currentData_.quote);
    drawWifiIndicator(currentData_.wifiConnected);
    drawPageIndicator();
    rendered_ = true;
    lastDataRefreshMs_ = now;
    lastClockRenderMs_ = now;
  }

 private:
  void drawRoundedFrame() {
    display_.roundedRect(DashboardLayout::frameX, DashboardLayout::frameY, DashboardLayout::frameW,
                         DashboardLayout::frameH, DashboardLayout::frameRadius, DashboardColor::muted);
  }

  void drawDivider() {
    // Removing the stock strip gives the tiny screen more room for glanceable data.
    display_.line(20, DashboardLayout::dividerTopY, 300, DashboardLayout::dividerTopY, DashboardColor::divider);
    display_.line(DashboardLayout::weatherDividerX, 20, DashboardLayout::weatherDividerX, 156, DashboardColor::divider);
  }

  void drawTimeSection(const DashboardSnapshot& data) {
    display_.fillRect(18, 20, 100, 136, DashboardColor::black);
    display_.textSans(20, 56, data.time, 2, DashboardColor::white);
    display_.text(102, 44, data.meridiem, 1, DashboardColor::muted);
    display_.textSans(20, 132, data.date, 1, DashboardColor::muted);
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
    display_.circle(136, 96, 7, DashboardColor::divider);
    display_.text(132, 92, "H", 1, DashboardColor::muted);
    display_.textSans(152, 106, weather.high, 2, DashboardColor::white);
    display_.degreeMark(198, 84, DashboardColor::white);
  }

  void drawCTASection(const CtaSnapshot& cta) {
    display_.text(212, 24, "CTA - " + cta.station, 1, DashboardColor::muted);
    display_.textSans(214, 50, cta.recommendation, 1,
                  cta.recommendation == "LEAVE NOW" ? DashboardColor::positive : DashboardColor::white);
    for (uint8_t i = 0; i < 3; i++) {
      const int16_t y = 72 + (i * 28);
      display_.circle(222, y + 8, 10, cta.arrivals[i].accentColor);
      display_.text(219, y + 4, cta.arrivals[i].badge, 1, DashboardColor::white);
      display_.textSans(242, y + 18, cta.arrivals[i].nextArrival, 1, DashboardColor::white);
      display_.text(286, y + 10, cta.arrivals[i].direction, 1, DashboardColor::muted);
    }
  }

  void drawQuoteSection(const QuoteSnapshot& quote) {
    display_.fillRect(20, DashboardLayout::quoteY, 280, 54, DashboardColor::black);
    const String text = "\"" + quote.text + "\"";
    String firstLine = text;
    String secondLine = "";

    if (text.length() > 30) {
      int split = text.lastIndexOf(' ', 30);
      if (split < 16) split = 30;
      firstLine = text.substring(0, split);
      secondLine = text.substring(split + 1);
    }

    display_.textSans(24, 186, firstLine, 1, DashboardColor::white);
    if (secondLine.length()) {
      display_.textSans(24, 204, secondLine, 1, DashboardColor::white);
    }
    display_.textSans(24, 216, "- " + quote.author, 1, DashboardColor::muted);
  }

  void drawPageIndicator() {
    display_.circle(154, 230, 2, DashboardColor::white);
    display_.circle(166, 230, 2, DashboardColor::muted);
  }

  DisplayDriver& display_;
  MockDataService& dataService_;
  DashboardSnapshot currentData_;
  bool rendered_ = false;
  uint32_t lastDataRefreshMs_ = 0;
  uint32_t lastClockRenderMs_ = 0;
  static constexpr uint16_t clockRefreshMs_ = 1000;
};
