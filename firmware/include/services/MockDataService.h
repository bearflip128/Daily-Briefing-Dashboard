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
  int rawMinutes;
};

struct CtaSnapshot {
  String station;
  String recommendation;
  CtaArrival arrivals[3];
};

struct QuoteSnapshot {
  String text;
  String author;
};

struct DashboardSnapshot {
  String time;
  String meridiem;
  String date;
  bool wifiConnected;
  WeatherSnapshot weather;
  CtaSnapshot cta;
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

  DashboardSnapshot dashboard() {
    DashboardSnapshot snapshot = fallbackDashboard();
    maintainWiFi();

    if (WiFi.status() != WL_CONNECTED) {
      applyLoopMorningFilter(snapshot.cta);
      snapshot.wifiConnected = false;
      return snapshot;
    }

    snapshot.wifiConnected = true;
    applyLiveTime(snapshot);
    applyLiveWeather(snapshot);
    applyLiveQuote(snapshot);
    applyLiveCta(snapshot);
    applyLoopMorningFilter(snapshot.cta);
    return snapshot;
  }

  void refreshClock(DashboardSnapshot& snapshot) {
    maintainWiFi();
    snapshot.wifiConnected = WiFi.status() == WL_CONNECTED;
    if (snapshot.wifiConnected) {
      applyLiveTime(snapshot);
    }
  }

 private:
  void maintainWiFi() {
#if defined(WIFI_SSID) && defined(WIFI_PASSWORD)
    if (WiFi.status() == WL_CONNECTED) {
      return;
    }

    const uint32_t now = millis();
    if (now - lastReconnectAttemptMs_ < 30000) {
      return;
    }

    lastReconnectAttemptMs_ = now;
    Serial.println("WiFi disconnected; attempting reconnect.");
    WiFi.disconnect();
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
#endif
  }

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
        false,
        {"43", "Chicago", "49", "36"},
        {"Fullerton",
         "WAIT 1m",
         {{"R", "18m", "Howard", DashboardColor::ctaRed, 18},
          {"B", "22m", "Loop", DashboardColor::ctaBrown, 22},
          {"P", "27m", "Linden", DashboardColor::ctaPurple, 27}}},
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

    const bool loopOnly = shouldShowLoopOnlyNow();
    const int redMinutes = applyRouteArrival(body, "Red", snapshot.cta.arrivals[0], loopOnly);
    const int brownMinutes = applyRouteArrival(body, "Brn", snapshot.cta.arrivals[1], loopOnly);
    const int purpleMinutes = applyRouteArrival(body, "P", snapshot.cta.arrivals[2], loopOnly);
    snapshot.cta.recommendation = ctaRecommendation(redMinutes, brownMinutes, purpleMinutes);
#else
    (void)snapshot;
#endif
  }

  static int applyRouteArrival(const String& body, const String& route, CtaArrival& arrival, bool loopOnly) {
    const String routeToken = "\"rt\":\"" + route + "\"";
    int routeIndex = body.indexOf(routeToken);
    int selectedMinutes = -1;
    int selectedRouteIndex = -1;

    while (routeIndex >= 0) {
      const int predictionKey = body.indexOf("\"prdt\":\"", routeIndex);
      const int arrivalKey = body.indexOf("\"arrT\":\"", routeIndex);
      if (arrivalKey >= 0) {
        const String arrivalTime = extractJsonStringAt(body, arrivalKey, "arrT");
        const String predictionTime = predictionKey >= 0 ? extractJsonStringAt(body, predictionKey, "prdt") : "";
        const int minutes = predictionTime.length() ? minutesBetween(predictionTime, arrivalTime) : minutesUntil(arrivalTime);
        const String direction = compactCtaDirection(body, routeIndex);
        if ((!loopOnly || direction == "Loop") && minutes >= ctaCatchableMinutes() &&
            (selectedMinutes < 0 || minutes < selectedMinutes)) {
          selectedMinutes = minutes;
          selectedRouteIndex = routeIndex;
        }
      }
      routeIndex = body.indexOf(routeToken, routeIndex + routeToken.length());
    }

    if (selectedMinutes < 0) {
      arrival.nextArrival = "--";
      arrival.direction = "";
      arrival.rawMinutes = -1;
      return -1;
    }

    arrival.nextArrival = String(selectedMinutes) + "m";
    arrival.direction = compactCtaDirection(body, selectedRouteIndex);
    arrival.rawMinutes = selectedMinutes;
    return selectedMinutes;
  }

  static String ctaRecommendation(int redMinutes, int brownMinutes, int purpleMinutes) {
    int soonest = -1;
    const int values[3] = {redMinutes, brownMinutes, purpleMinutes};
    for (uint8_t i = 0; i < 3; i++) {
      if (values[i] >= 0 && (soonest < 0 || values[i] < soonest)) {
        soonest = values[i];
      }
    }

    if (soonest < 0) return "CTA LIVE";

    const int waitMinutes = max(0, soonest - ctaCatchableMinutes());
    return waitMinutes == 0 ? "LEAVE NOW" : "WAIT " + String(waitMinutes) + "m";
  }

  static constexpr int ctaCatchableMinutes() {
    return AppConfig::ctaWalkMinutes + AppConfig::ctaComfortMinutes;
  }

  static bool shouldShowLoopOnlyNow() {
    struct tm timeinfo;
    if (!getLocalTime(&timeinfo, 200)) {
      return false;
    }

    return timeinfo.tm_wday >= 1 && timeinfo.tm_wday <= 5 && timeinfo.tm_hour < 12;
  }

  static int parseMinutesText(const String& value) {
    if (value.length() == 0) {
      return -1;
    }

    int minutes = 0;
    bool foundDigit = false;
    for (size_t i = 0; i < value.length(); i++) {
      const char c = value[i];
      if (!isDigit(c)) {
        break;
      }
      foundDigit = true;
      minutes = minutes * 10 + (c - '0');
    }

    return foundDigit ? minutes : -1;
  }

  static void applyLoopMorningFilter(CtaSnapshot& cta) {
    if (!shouldShowLoopOnlyNow()) {
      return;
    }

    CtaArrival compacted[3];
    int compactedMinutes[3] = {-1, -1, -1};
    uint8_t visibleCount = 0;

    for (uint8_t i = 0; i < 3; i++) {
      const CtaArrival& arrival = cta.arrivals[i];
      if (arrival.nextArrival == "--" || arrival.direction != "Loop") {
        continue;
      }

      compacted[visibleCount] = arrival;
      compactedMinutes[visibleCount] = arrival.rawMinutes >= 0 ? arrival.rawMinutes : parseMinutesText(arrival.nextArrival);
      visibleCount++;
    }

    for (uint8_t i = visibleCount; i < 3; i++) {
      CtaArrival blank;
      blank.badge = "";
      blank.nextArrival = "--";
      blank.direction = "";
      blank.accentColor = 0;
      blank.rawMinutes = -1;
      compacted[i] = blank;
    }

    for (uint8_t i = 0; i < 3; i++) {
      cta.arrivals[i] = compacted[i];
    }

    cta.recommendation = ctaRecommendation(compactedMinutes[0], compactedMinutes[1], compactedMinutes[2]);
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
    if (value.indexOf("95th") >= 0) return "95th";
    if (value.indexOf("Howard") >= 0) return "Howard";
    if (value.indexOf("Loop") >= 0) return "Loop";
    if (value.indexOf("Kimball") >= 0) return "Kimball";
    if (value.indexOf("Linden") >= 0) return "Linden";
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

  uint32_t lastReconnectAttemptMs_ = 0;
};
