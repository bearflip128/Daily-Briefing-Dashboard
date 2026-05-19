#pragma once

#include <Arduino.h>

namespace AppConfig {
constexpr uint32_t serialBaud = 115200;
constexpr uint32_t dashboardRefreshMs = 100;
constexpr uint32_t liveDataRefreshMs = 60000;
constexpr uint16_t screenWidth = 320;
constexpr uint16_t screenHeight = 240;
constexpr const char* deviceName = "Daily Briefing Dashboard";
constexpr const char* otaHostname = "daily-briefing-dashboard";
}
