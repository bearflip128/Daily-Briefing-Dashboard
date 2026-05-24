#pragma once

#include <Arduino.h>
#include <WebServer.h>
#include <WiFi.h>

#include "config/AppConfig.h"
#include "ui/DashboardScreen.h"

class DeviceStatusService {
 public:
  explicit DeviceStatusService(DashboardScreen& dashboard) : dashboard_(dashboard) {}

  void begin() {
    if (WiFi.status() != WL_CONNECTED) {
      Serial.println("Device status endpoint unavailable until WiFi is connected.");
      return;
    }

    server_.on("/status", HTTP_GET, [this]() { handleStatus(); });
    server_.on("/health", HTTP_GET, [this]() { handleStatus(); });
    server_.on("/snapshot", HTTP_GET, [this]() { handleSnapshot(); });
    server_.begin();

    Serial.print("Device status endpoint: http://");
    Serial.print(WiFi.localIP());
    Serial.println("/status");
  }

  void update() {
    if (WiFi.status() == WL_CONNECTED) {
      server_.handleClient();
    }
  }

 private:
  void handleStatus() {
    const bool connected = WiFi.status() == WL_CONNECTED;
    String body = "{";
    body += "\"deviceName\":\"" + String(AppConfig::deviceName) + "\",";
    body += "\"hostname\":\"" + String(AppConfig::otaHostname) + "\",";
    body += "\"online\":" + String(connected ? "true" : "false") + ",";
    body += "\"ip\":\"" + WiFi.localIP().toString() + "\",";
    body += "\"rssi\":" + String(WiFi.RSSI()) + ",";
    body += "\"uptimeMs\":" + String(millis());
    body += "}";

    server_.sendHeader("Access-Control-Allow-Origin", "*");
    server_.send(200, "application/json", body);
  }

  void handleSnapshot() {
    const DashboardSnapshot& snapshot = dashboard_.snapshot();
    String body = "{";
    body += "\"screen\":\"full-cta\",";
    body += "\"rendered\":" + String(dashboard_.hasRendered() ? "true" : "false") + ",";
    body += "\"capturedAtMs\":" + String(millis()) + ",";
    body += "\"wifiConnected\":" + String(snapshot.wifiConnected ? "true" : "false") + ",";
    body += "\"time\":\"" + jsonEscape(snapshot.time) + "\",";
    body += "\"meridiem\":\"" + jsonEscape(snapshot.meridiem) + "\",";
    body += "\"date\":\"" + jsonEscape(snapshot.date) + "\",";
    body += "\"weather\":{";
    body += "\"temperature\":\"" + jsonEscape(snapshot.weather.temperature) + "\",";
    body += "\"city\":\"" + jsonEscape(snapshot.weather.city) + "\",";
    body += "\"high\":\"" + jsonEscape(snapshot.weather.high) + "\"";
    body += "},";
    body += "\"cta\":{";
    body += "\"station\":\"" + jsonEscape(snapshot.cta.station) + "\",";
    body += "\"recommendation\":\"" + jsonEscape(snapshot.cta.recommendation) + "\",";
    body += "\"arrivals\":[";
    for (uint8_t i = 0; i < 3; i++) {
      if (i > 0) body += ",";
      body += "{";
      body += "\"badge\":\"" + jsonEscape(snapshot.cta.arrivals[i].badge) + "\",";
      body += "\"nextArrival\":\"" + jsonEscape(snapshot.cta.arrivals[i].nextArrival) + "\",";
      body += "\"direction\":\"" + jsonEscape(snapshot.cta.arrivals[i].direction) + "\",";
      body += "\"accentColor\":" + String(snapshot.cta.arrivals[i].accentColor);
      body += "}";
    }
    body += "]";
    body += "},";
    body += "\"quote\":{";
    body += "\"text\":\"" + jsonEscape(snapshot.quote.text) + "\",";
    body += "\"author\":\"" + jsonEscape(snapshot.quote.author) + "\"";
    body += "}";
    body += "}";

    server_.sendHeader("Access-Control-Allow-Origin", "*");
    server_.send(200, "application/json", body);
  }

  static String jsonEscape(const String& value) {
    String escaped;
    escaped.reserve(value.length() + 8);
    for (uint16_t i = 0; i < value.length(); i++) {
      const char c = value[i];
      if (c == '\\' || c == '"') {
        escaped += '\\';
      }
      if (c == '\n') {
        escaped += "\\n";
      } else if (c == '\r') {
        escaped += "\\r";
      } else {
        escaped += c;
      }
    }
    return escaped;
  }

  DashboardScreen& dashboard_;
  WebServer server_{80};
};
