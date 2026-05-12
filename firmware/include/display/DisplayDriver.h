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
    Serial.println("Board-specific ST7789T3 SPI setup belongs in DisplayDriver::begin().");
  }

  void clear(uint16_t color) {
    Serial.print("--- Clear screen color ");
    Serial.print(color);
    Serial.println(" ---");
  }

  void roundedRect(int16_t x, int16_t y, int16_t w, int16_t h, int16_t radius, uint16_t color) {
    Serial.printf("Rounded frame x=%d y=%d w=%d h=%d r=%d color=%u\n", x, y, w, h, radius, color);
  }

  void line(int16_t x1, int16_t y1, int16_t x2, int16_t y2, uint16_t color) {
    Serial.printf("Divider x1=%d y1=%d x2=%d y2=%d color=%u\n", x1, y1, x2, y2, color);
  }

  void text(int16_t x, int16_t y, const String& value, uint8_t size, uint16_t color) {
    Serial.printf("Text x=%d y=%d size=%u color=%u: %s\n", x, y, size, color, value.c_str());
  }

  void circle(int16_t x, int16_t y, int16_t radius, uint16_t color) {
    Serial.printf("Circle x=%d y=%d r=%d color=%u\n", x, y, radius, color);
  }

  void weatherCloud(int16_t x, int16_t y, uint16_t color) {
    Serial.printf("Cloud icon x=%d y=%d color=%u\n", x, y, color);
  }
};
