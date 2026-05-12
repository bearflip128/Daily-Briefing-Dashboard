#pragma once

#include "display/DisplayDriver.h"
#include "services/MockDataService.h"

class MorningWidget {
 public:
  explicit MorningWidget(DisplayDriver& display) : display_(display) {}

  void render(const MorningSnapshot& morning) {
    display_.drawCard("Morning", morning.summary);
  }

 private:
  DisplayDriver& display_;
};
