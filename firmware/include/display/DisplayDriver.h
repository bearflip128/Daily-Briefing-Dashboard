#pragma once

#include <Arduino.h>
#include <Arduino_GFX_Library.h>

#include "config/AppConfig.h"
#include "display/fonts/FreeSansBold10pt7b.h"

namespace WaveshareLcdPins {
// ESP32-S3-LCD-2 schematic mappings for the onboard ST7789T3 LCD.
constexpr int8_t bl = 1;
constexpr int8_t rst = 0;
constexpr int8_t mosi = 38;
constexpr int8_t sclk = 39;
constexpr int8_t dc = 42;
constexpr int8_t cs = 45;
constexpr int8_t miso = -1;
}

class DisplayDriver {
 public:
  DisplayDriver()
      : bus_(new Arduino_ESP32SPI(WaveshareLcdPins::dc, WaveshareLcdPins::cs, WaveshareLcdPins::sclk,
                                  WaveshareLcdPins::mosi, WaveshareLcdPins::miso)),
        gfx_(new Arduino_ST7789(bus_, WaveshareLcdPins::rst, 1 /* landscape */, true /* IPS */, 240, 320)) {}

  void begin() {
    Serial.println();
    Serial.println(AppConfig::deviceName);
    Serial.printf("Display target: %ux%u\n", AppConfig::screenWidth, AppConfig::screenHeight);

    pinMode(WaveshareLcdPins::bl, OUTPUT);
    digitalWrite(WaveshareLcdPins::bl, HIGH);

    if (!gfx_->begin()) {
      Serial.println("Display init failed.");
      return;
    }

    gfx_->fillScreen(BLACK);
    gfx_->setTextWrap(false);
    Serial.println("ST7789T3 display initialized.");
  }

  void clear(uint16_t color) {
    gfx_->fillScreen(color);
  }

  void roundedRect(int16_t x, int16_t y, int16_t w, int16_t h, int16_t radius, uint16_t color) {
    gfx_->drawRoundRect(x, y, w, h, radius, color);
  }

  void line(int16_t x1, int16_t y1, int16_t x2, int16_t y2, uint16_t color) {
    gfx_->drawLine(x1, y1, x2, y2, color);
  }

  void text(int16_t x, int16_t y, const String& value, uint8_t size, uint16_t color) {
    gfx_->setFont(nullptr);
    gfx_->setTextSize(size);
    gfx_->setTextColor(color, BLACK);
    gfx_->setCursor(x, y);
    gfx_->print(value);
  }

  void textSans(int16_t x, int16_t y, const String& value, uint8_t size, uint16_t color) {
    gfx_->setFont(&FreeSansBold10pt7b);
    gfx_->setTextSize(size);
    gfx_->setTextColor(color, BLACK);
    gfx_->setCursor(x, y);
    gfx_->print(value);
  }

  void circle(int16_t x, int16_t y, int16_t radius, uint16_t color) {
    gfx_->fillCircle(x, y, radius, color);
  }

  void degreeMark(int16_t x, int16_t y, uint16_t color) {
    gfx_->drawCircle(x, y, 3, color);
  }

 private:
  Arduino_DataBus* bus_;
  Arduino_GFX* gfx_;
};
