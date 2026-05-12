#pragma once

#include <Arduino.h>

#include "config/AppConfig.h"

class DisplayDriver {
 public:
  void begin() {
    Serial.println();
    Serial.println(AppConfig::deviceName);
    Serial.printf("Display target: %ux%u\n", AppConfig::screenWidth, AppConfig::screenHeight);
    Serial.println("Display driver placeholder initialized.");
  }

  void clear() {
    Serial.println("--- Dashboard refresh ---");
  }

  void drawText(const char* label, const String& value) {
    Serial.print(label);
    Serial.print(": ");
    Serial.println(value);
  }

  void drawCard(const char* title, const String& body) {
    Serial.print("[");
    Serial.print(title);
    Serial.print("] ");
    Serial.println(body);
  }
};
