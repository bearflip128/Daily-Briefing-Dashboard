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
  String direction;
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
    WiFi.setSleep(false);
    WiFi.disconnect(true, true);
    delay(250);
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
    Serial.print("Connecting WiFi");
    for (uint8_t attempt = 0; attempt < 60 && WiFi.status() != WL_CONNECTED; attempt++) {
      delay(500);
      Serial.print(".");
    }
    Serial.println();

    if (WiFi.status() == WL_CONNECTED) {
      Serial.print("WiFi connected: ");
      Serial.println(WiFi.localIP());
      configTzTime("CST6CDT,M3.2.0,M11.1.0", "pool.ntp.org", "time.nist.gov");
    } else {
      Serial.print("WiFi status code: ");
      Serial.println(WiFi.status());
      printConfiguredNetworkScan();
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
  static void printConfiguredNetworkScan() {
#if defined(WIFI_SSID)
    Serial.println("Scanning for configured WiFi SSID...");
    const int16_t networkCount = WiFi.scanNetworks();
    bool found = false;
    for (int16_t i = 0; i < networkCount; i++) {
      if (WiFi.SSID(i) == WIFI_SSID) {
        found = true;
        Serial.print("Configured SSID found. RSSI: ");
        Serial.print(WiFi.RSSI(i));
        Serial.print(" dBm, encryption: ");
        Serial.println(WiFi.encryptionType(i));
      }
    }
    if (!found) {
      Serial.println("Configured SSID was not found during scan.");
    }
    WiFi.scanDelete();
#endif
  }

  static DashboardSnapshot fallbackDashboard() {
    return {
        "5:37",
        "PM",
        "Tue, May 12",
        {"43", "Chicago", "49", "36"},
        {"Fullerton",
         {{"R", "4m", "How", DashboardColor::ctaRed},
          {"B", "6m", "Loop", DashboardColor::ctaBrown},
          {"P", "9m", "Ldn", DashboardColor::ctaPurple}}},
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
    int start = body.indexOf(':', keyIndex);
    if (start < 0) return NAN;
    start++;
    while (start < body.length() && (body[start] == ' ' || body[start] == '\n' || body[start] == '[')) start++;
    int end = start;
    while (end < body.length() && (isDigit(body[end]) || body[end] == '-' || body[end] == '.')) end++;
    return body.substring(start, end).toFloat();
  }

  static float extractFirstJsonNumberInSection(const String& body, const String& section, const String& key) {
    const int sectionIndex = body.indexOf("\"" + section + "\"");
    if (sectionIndex < 0) return NAN;
    const int keyIndex = body.indexOf("\"" + key + "\"", sectionIndex);
    if (keyIndex < 0) return NAN;
    return extractFirstJsonNumberAfter(body.substring(keyIndex), key);
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
        "&current=temperature_2m&daily=temperature_2m_max&temperature_unit=fahrenheit"
        "&timezone=America%2FChicago&forecast_days=1";

    if (!getHttps(url, body)) {
      return;
    }

    const float current = extractFirstJsonNumberInSection(body, "current", "temperature_2m");
    const float high = extractFirstJsonNumberInSection(body, "daily", "temperature_2m_max");
    if (!isnan(current)) {
      snapshot.weather.temperature = String((int)round(current));
    }
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

      const float close = getCsvField(row, 6).toFloat();
      const float previous = getCsvField(row, 8).toFloat();
      if (close <= 0 || previous <= 0) continue;

      const float change = ((close - previous) / previous) * 100.0f;
      String percent = String(change, 2) + "%";
      if (!percent.startsWith("-") && !percent.startsWith("+")) {
        percent = "+" + percent;
      }
      snapshot.markets[i].percent = percent;
      snapshot.markets[i].positive = !percent.startsWith("-");
    }
  }

  static String getCsvField(const String& row, uint8_t targetField) {
    int start = 0;
    for (uint8_t field = 0; field < targetField; field++) {
      start = row.indexOf(',', start);
      if (start < 0) return "";
      start++;
    }

    int end = row.indexOf(',', start);
    if (end < 0) end = row.length();
    String value = row.substring(start, end);
    value.trim();
    return value;
  }

  static void applyLiveQuote(DashboardSnapshot& snapshot) {
    String body;
    if (!getHttps("https://quoteslate.vercel.app/api/quotes/random?maxLength=45", body)) {
      getHttps("https://dummyjson.com/quotes/random", body);
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

    applyRouteArrival(body, "Red", snapshot.cta.arrivals[0]);
    applyRouteArrival(body, "Brn", snapshot.cta.arrivals[1]);
    applyRouteArrival(body, "P", snapshot.cta.arrivals[2]);
#else
    (void)snapshot;
#endif
  }

  static void applyRouteArrival(const String& body, const String& route, CtaArrival& arrival) {
    const String routeToken = "\"rt\":\"" + route + "\"";
    const int routeIndex = body.indexOf(routeToken);
    if (routeIndex < 0) {
      arrival.nextArrival = "--";
      return;
    }

    const int predictionKey = body.indexOf("\"prdt\":\"", routeIndex);
    const int arrivalKey = body.indexOf("\"arrT\":\"", routeIndex);
    if (arrivalKey < 0) {
      arrival.nextArrival = "--";
      return;
    }

    const String arrivalTime = extractJsonStringAt(body, arrivalKey, "arrT");
    const String predictionTime = predictionKey >= 0 ? extractJsonStringAt(body, predictionKey, "prdt") : "";
    if (!arrivalTime.length()) {
      return;
    }

    const int minutes = predictionTime.length() ? minutesBetween(predictionTime, arrivalTime) : minutesUntil(arrivalTime);
    if (minutes >= 0) {
      arrival.nextArrival = String(minutes) + "m";
    }
    arrival.direction = compactCtaDirection(body, routeIndex);
  }

  static String extractJsonStringAt(const String& body, int keyIndex, const String& key) {
    (void)key;
    if (keyIndex < 0) return "";
    const int colon = body.indexOf(':', keyIndex);
    const int start = body.indexOf('"', colon + 1);
    const int end = body.indexOf('"', start + 1);
    if (start < 0 || end < 0) return "";
    return body.substring(start + 1, end);
  }

  static String compactCtaDirection(const String& body, int routeIndex) {
    const String dest = extractJsonStringAt(body, body.indexOf("\"destNm\":\"", routeIndex), "destNm");
    const String stop = extractJsonStringAt(body, body.indexOf("\"stpDe\":\"", routeIndex), "stpDe");
    const String value = dest.length() ? dest : stop;
    if (value.indexOf("95th") >= 0) return "95";
    if (value.indexOf("Howard") >= 0) return "How";
    if (value.indexOf("Loop") >= 0) return "Loop";
    if (value.indexOf("Kimball") >= 0) return "Kim";
    if (value.indexOf("Linden") >= 0) return "Ldn";
    return "";
  }

  static int minutesBetween(const String& startLocal, const String& arrivalLocal) {
    const time_t start = parseLocalTime(startLocal);
    const time_t arrival = parseLocalTime(arrivalLocal);
    if (start <= 0 || arrival <= 0) return -1;
    return max(0L, ((long)difftime(arrival, start) + 30L) / 60L);
  }

  static int minutesUntil(const String& isoLocal) {
    const time_t arrivalTime = parseLocalTime(isoLocal);
    const time_t now = time(nullptr);
    if (arrivalTime <= 0 || now <= 0) {
      return -1;
    }

    const long seconds = (long)difftime(arrivalTime, now);
    return max(0L, (seconds + 30L) / 60L);
  }

  static time_t parseLocalTime(const String& isoLocal) {
    struct tm arrival = {};
    if (sscanf(isoLocal.c_str(), "%d-%d-%dT%d:%d:%d", &arrival.tm_year, &arrival.tm_mon, &arrival.tm_mday,
               &arrival.tm_hour, &arrival.tm_min, &arrival.tm_sec) != 6) {
      return 0;
    }

    arrival.tm_year -= 1900;
    arrival.tm_mon -= 1;
    return mktime(&arrival);
  }
};
