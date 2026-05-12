#pragma once

#include "display/DisplayDriver.h"
#include "services/MockDataService.h"

class StockWidget {
 public:
  explicit StockWidget(DisplayDriver& display) : display_(display) {}

  void render(const StockSnapshot& stock) {
    display_.drawCard("Stocks", stock.symbol + " $" + stock.price + " " + stock.movement);
  }

 private:
  DisplayDriver& display_;
};
