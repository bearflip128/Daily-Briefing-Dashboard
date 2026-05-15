#pragma once

#include <Arduino.h>
#include <HTTPClient.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>

#if __has_include("config/config.local.h")
#include "config/config.local.h"
#endif

#include "config/AppConfig.h"

struct WeatherSnapshot {
  String temperature;
  String city;
  String high;
  String low;
};

struct CtaArrival {
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
  void begin() {
#if defined(WIFI_SSID) && defined(WIFI_PASSWORD)
    WiFi.mode(WIFI_STA);
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
    Serial.print("Connecting WiFi");
    for (uint8_t attempt = 0; attempt < 30 && WiFi.status() != WL_CONNECTED; attempt++) {
      delay(250);
      Serial.print(".");
    }
    Serial.println();

    if (WiFi.status() == WL_CONNECTED) {
      Serial.print("WiFi connected: ");
      Serial.println(WiFi.localIP());
      configTime(0, 0, "pool.ntp.org", "time.nist.gov");
    } else {
      Serial.println("WiFi unavailable; using fallback dashboard data.");
    }
#else
    Serial.println("No config.local.h WiFi credentials; using fallback dashboard data.");
#endif
  }

  DashboardSnapshot dashboard() const {
    DashboardSnapshot snapshot = fallbackDashboard();

    if (WiFi.status() != WL_CONNECTED) {
      return snapshot;
    }

    applyLiveTime(snapshot);
    applyLiveWeather(snapshot);
    applyLiveMarkets(snapshot);
    applyLiveQuote(snapshot);
    applyLiveCta(snapshot);
    return snapshot;
  }

 private:
  static DashboardSnapshot fallbackDashboard() {
    return {
        "5:37",
        "PM",
        "Tue, May 12",
        {"43", "Chicago", "49", "36"},
        {"Fullerton",
         {{"R", "4 min", DashboardColor::ctaRed},
          {"B", "6 min", DashboardColor::ctaBrown},
          {"P", "9 min", DashboardColor::ctaPurple}}},
        {{"S&P 500", "+0.71%", true},
         {"VXUS", "+0.42%", true},
         {"BTC", "-1.23%", false}},
        {"Discipline compounds quietly.", "James Clear"}};
  }

  static bool getHttps(const String& url, String& body) {
    WiFiClientSecure client;
    client.setInsecure();

    HTTPClient http;
    if (!http.begin(client, url)) {
      return false;
    }

    const int code = http.GET();
    if (code != HTTP_CODE_OK) {
      http.end();
      return false;
    }

    body = http.getString();
    http.end();
    return true;
  }

  static String extractJsonString(const String& body, const String& key) {
    const int keyIndex = body.indexOf("\"" + key + "\"");
    if (keyIndex < 0) return "";
    const int colon = body.indexOf(':', keyIndex);
    const int start = body.indexOf('"', colon + 1);
    const int end = body.indexOf('"', start + 1);
    if (start < 0 || end < 0) return "";
    return body.substring(start + 1, end);
  }

  static float extractFirstJsonNumberAfter(const String& body, const String& key) {
    const int keyIndex = body.indexOf("\"" + key + "\"");
    if (keyIndex < 0) return NAN;
    int start = body.indexOf('[', keyIndex);
    if (start < 0) start = body.indexOf(':', keyIndex);
    if (start < 0) return NAN;
    start++;
    while (start < body.length() && (body[start] == ' ' || body[start] == '\n')) start++;
    int end = start;
    while (end < body.length() && (isDigit(body[end]) || body[end] == '-' || body[end] == '.')) end++;
    return body.substring(start, end).toFloat();
  }

  static void applyLiveTime(DashboardSnapshot& snapshot) {
    struct tm timeinfo;
    if (!getLocalTime(&timeinfo, 200)) {
      return;
    }

    char timeBuffer[8];
    char dateBuffer[18];
    strftime(timeBuffer, sizeof(timeBuffer), "%I:%M", &timeinfo);
    strftime(dateBuffer, sizeof(dateBuffer), "%a, %b %e", &timeinfo);

    String timeValue(timeBuffer);
    if (timeValue.startsWith("0")) {
      timeValue.remove(0, 1);
    }

    snapshot.time = timeValue;
    snapshot.meridiem = timeinfo.tm_hour >= 12 ? "PM" : "AM";
    snapshot.date = String(dateBuffer);
  }

  static void applyLiveWeather(DashboardSnapshot& snapshot) {
    String body;
    const String url =
        "https://api.open-meteo.com/v1/forecast?latitude=41.8781&longitude=-87.6298"
        "&daily=temperature_2m_max&temperature_unit=fahrenheit&timezone=America%2FChicago&forecast_days=1";

    if (!getHttps(url, body)) {
      return;
    }

    const float high = extractFirstJsonNumberAfter(body, "temperature_2m_max");
    if (!isnan(high)) {
      snapshot.weather.high = String((int)round(high));
    }
  }

  static void applyLiveMarkets(DashboardSnapshot& snapshot) {
    const char* symbols[3] = {"^spx", "vxus.us", "btcusd"};
    for (uint8_t i = 0; i < 3; i++) {
      String body;
      String url = "https://stooq.com/q/l/?s=" + String(symbols[i]) + "&f=sd2t2ohlcvp&h&e=csv";
      if (!getHttps(url, body)) continue;

      const int headerEnd = body.indexOf('\n');
      if (headerEnd < 0) continue;
      String row = body.substring(headerEnd + 1);
      int comma = -1;
      int lastComma = -1;
      for (uint8_t field = 0; field < 8; field++) {
        lastComma = comma;
        comma = row.indexOf(',', comma + 1);
        if (comma < 0) break;
      }
      if (lastComma < 0 || comma < 0) continue;
      String percent = row.substring(lastComma + 1, comma);
      percent.trim();
      if (percent == "N/D" || percent.length() == 0) continue;
      if (!percent.startsWith("-") && !percent.startsWith("+")) {
        percent = "+" + percent;
      }
      snapshot.markets[i].percent = percent;
      snapshot.markets[i].positive = !percent.startsWith("-");
    }
  }

  static void applyLiveQuote(DashboardSnapshot& snapshot) {
    String body;
    if (!getHttps("https://quoteslate.vercel.app/api/quotes/random?maxLength=45", body)) {
      getHttps("https://api.quotable.io/random?maxLength=45", body);
    }

    const String text = extractJsonString(body, "quote").length() ? extractJsonString(body, "quote")
                                                                 : extractJsonString(body, "content");
    const String author = extractJsonString(body, "author");
    if (text.length() > 0) snapshot.quote.text = text;
    if (author.length() > 0) snapshot.quote.author = author;
  }

  static void applyLiveCta(DashboardSnapshot& snapshot) {
#if defined(CTA_API_KEY)
    String body;
    String url = "https://lapi.transitchicago.com/api/1.0/ttarrivals.aspx?key=" + String(CTA_API_KEY) +
                 "&mapid=" + String(CTA_STATION_MAP_ID) + "&outputType=JSON";
    if (!getHttps(url, body)) {
      return;
    }

    // Keep CTA parsing intentionally conservative. The official endpoint
    // requires a key; fallback arrivals remain if the response shape changes.
    const int red = body.indexOf("\"rt\":\"Red\"");
    const int brn = body.indexOf("\"rt\":\"Brn\"");
    const int purple = body.indexOf("\"rt\":\"P\"");
    if (red >= 0) snapshot.cta.arrivals[0].nextArrival = "live";
    if (brn >= 0) snapshot.cta.arrivals[1].nextArrival = "live";
    if (purple >= 0) snapshot.cta.arrivals[2].nextArrival = "live";
#else
    (void)snapshot;
#endif
  }
};
