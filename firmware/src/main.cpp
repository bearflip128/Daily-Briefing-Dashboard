#include <Arduino.h>

#include "config/AppConfig.h"
#include "display/DisplayDriver.h"
#include "services/MockDataService.h"
#include "services/OtaUpdateService.h"
#include "ui/DashboardScreen.h"

DisplayDriver display;
MockDataService dataService;
OtaUpdateService otaService;
DashboardScreen dashboard(display, dataService);

void setup() {
  Serial.begin(AppConfig::serialBaud);
  delay(500);

  display.begin();
  dataService.begin();
  otaService.begin();
  dashboard.begin();
}

void loop() {
  otaService.update();
  dashboard.update();
  delay(AppConfig::dashboardRefreshMs);
}
