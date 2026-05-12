#pragma once

#include "display/DisplayDriver.h"
#include "services/MockDataService.h"

class CtaWidget {
 public:
  explicit CtaWidget(DisplayDriver& display) : display_(display) {}

  void render(const CtaSnapshot& cta) {
    display_.drawCard("CTA", cta.route + " from " + cta.stop + " " + cta.status + " " + cta.nextArrival);
  }

 private:
  DisplayDriver& display_;
};
