#include <Arduino.h>

#include "config/AppConfig.h"
#include "display/DisplayDriver.h"
#include "services/MockDataService.h"
#include "ui/DashboardScreen.h"

DisplayDriver display;
MockDataService dataService;
DashboardScreen dashboard(display, dataService);

void setup() {
  Serial.begin(AppConfig::serialBaud);
  delay(500);

  display.begin();
  dataService.begin();
  dashboard.begin();
}

void loop() {
  dashboard.update();
  delay(AppConfig::dashboardRefreshMs);
}
