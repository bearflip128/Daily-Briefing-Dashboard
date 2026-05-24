#pragma once

#include <Arduino.h>
#include <WebServer.h>
#include <WiFi.h>

#include "config/AppConfig.h"

class DeviceStatusService {
 public:
  void begin() {
    if (WiFi.status() != WL_CONNECTED) {
      Serial.println("Device status endpoint unavailable until WiFi is connected.");
      return;
    }

    server_.on("/status", HTTP_GET, [this]() { handleStatus(); });
    server_.on("/health", HTTP_GET, [this]() { handleStatus(); });
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

  WebServer server_{80};
};
