#pragma once

#include <Arduino.h>

struct WeatherSnapshot {
  String temperature;
  String city;
  String high;
  String low;
};

struct CtaArrival {
  String line;
  String badge;
  String nextArrival;
  uint16_t accentColor;
};

struct CtaSnapshot {
  String station;
  CtaArrival arrivals[3];
};

struct MarketSnapshot {
  String label;
  String percent;
  bool positive;
};

struct QuoteSnapshot {
  String text;
  String author;
};

struct DashboardSnapshot {
  String time;
  String meridiem;
  String date;
  WeatherSnapshot weather;
  CtaSnapshot cta;
  MarketSnapshot markets[3];
  QuoteSnapshot quote;
};

namespace DashboardColor {
constexpr uint16_t black = 0x0000;
constexpr uint16_t white = 0xFFFF;
constexpr uint16_t muted = 0x9492;
constexpr uint16_t divider = 0x3186;
constexpr uint16_t ctaRed = 0xC0E4;
constexpr uint16_t ctaBrown = 0x9AC4;
constexpr uint16_t ctaPurple = 0x7978;
constexpr uint16_t positive = 0x35AE;
constexpr uint16_t negative = 0xD249;
}

class MockDataService {
 public:
  DashboardSnapshot dashboard() const {
    // Future: replace each field with cached service data. Keep this snapshot
    // shape stable so rendering stays separate from API/WiFi code.
    return {
        "5:37",
        "PM",
        "Tue, May 12",
        {"43", "Chicago", "49", "36"},
        {"Fullerton",
         {{"Red Line", "R", "4 min", DashboardColor::ctaRed},
          {"Brown Line", "B", "6 min", DashboardColor::ctaBrown},
          {"Purple Line", "P", "9 min", DashboardColor::ctaPurple}}},
        {{"S&P 500", "+0.71%", true},
         {"VXUS", "+0.42%", true},
         {"BTC", "-1.23%", false}},
        {"Discipline compounds quietly.", "James Clear"}};
  }
};
