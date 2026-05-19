#pragma once

#include <Arduino.h>
#include <ArduinoOTA.h>
#include <WiFi.h>

#if __has_include("config/config.local.h")
#include "config/config.local.h"
#endif

#include "config/AppConfig.h"

class OtaUpdateService {
 public:
  void begin() {
    if (WiFi.status() != WL_CONNECTED) {
      Serial.println("OTA unavailable until WiFi is connected.");
      return;
    }

    ArduinoOTA.setHostname(AppConfig::otaHostname);
#if defined(OTA_PASSWORD)
    ArduinoOTA.setPassword(OTA_PASSWORD);
#endif

    ArduinoOTA.onStart([]() { Serial.println("OTA update starting."); });
    ArduinoOTA.onEnd([]() { Serial.println("\nOTA update finished."); });
    ArduinoOTA.onProgress([](unsigned int progress, unsigned int total) {
      Serial.printf("OTA progress: %u%%\r", (progress / (total / 100)));
    });
    ArduinoOTA.onError([](ota_error_t error) {
      Serial.printf("OTA error[%u]\n", error);
    });

    ArduinoOTA.begin();
    Serial.print("OTA ready: ");
    Serial.println(AppConfig::otaHostname);
  }

  void update() {
    if (WiFi.status() == WL_CONNECTED) {
      ArduinoOTA.handle();
    }
  }
};
