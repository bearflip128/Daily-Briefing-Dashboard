#pragma once

#include <Arduino.h>

struct WeatherSnapshot {
  String location;
  String temperature;
  String condition;
  String highLow;
};

struct CtaSnapshot {
  String route;
  String stop;
  String status;
  String nextArrival;
};

struct SpotifySnapshot {
  String status;
  String detail;
};

struct MorningSnapshot {
  String summary;
};

struct StockSnapshot {
  String symbol;
  String price;
  String movement;
};

class MockDataService {
 public:
  WeatherSnapshot weather() const {
    // Future: replace with cached weather API response.
    return {"Chicago", "43F", "Clear", "H 49 / L 36"};
  }

  CtaSnapshot cta() const {
    // Future: replace with CTA train and bus arrivals.
    return {"Brown Line", "Merch Mart", "On time", "6 min"};
  }

  SpotifySnapshot spotify() const {
    // Future: replace with Spotify now-playing status.
    return {"Ready", "Logo/status placeholder"};
  }

  MorningSnapshot morning() const {
    // Future: replace with generated morning briefing.
    return {"Cold start. Pack gloves. Leave a few minutes early for CTA."};
  }

  StockSnapshot stock() const {
    // Future: rotate configured ticker symbols.
    return {"AAPL", "184.20", "+0.8%"};
  }
};
