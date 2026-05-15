# Daily Briefing Dashboard

A restrained, black-and-white ESP32-S3 dashboard UI for the Waveshare 2-inch display. The physical panel is 240x320, and this project renders the main dashboard in landscape as a 320x240 screen.

The repo has two tracks:

- `mockup`: a local browser preview for fast visual iteration.
- `firmware`: a PlatformIO/Arduino scaffold with the same layout regions and drawing helper boundaries.

The V1 dashboard is passive display only. Touch, Spotify, news, and API integrations are intentionally left out of the first page.

## Hardware Target

- Waveshare ESP32-S3 2inch Display Development Board
- 240x320 IPS LCD, used in 320x240 landscape orientation
- ST7789T3 display driver over 4-wire SPI
- ESP32-S3 with WiFi support

Source checked: [Waveshare ESP32-S3-LCD-2 product page](https://www.waveshare.com/product/esp32-s3-lcd-2.htm).

## Current UI

- Top row: time/date, weather, CTA Fullerton arrivals
- Middle strip: S&P 500, VXUS, BTC
- Bottom section: daily quote
- Tiny two-dot page indicator for a future second page
- No gradients, glow, glassmorphism, decorative tech patterns, Spotify, or news

## Project Structure

```text
Daily-Briefing-Dashboard/
+-- mockup/
|   +-- index.html
|   +-- package.json
|   +-- config.example.json
|   +-- src/
|       +-- app.js
|       +-- mock-data.js
|       +-- styles.css
+-- firmware/
|   +-- platformio.ini
|   +-- src/
|   |   +-- main.cpp
|   +-- include/
|       +-- config/
|       |   +-- AppConfig.h
|       |   +-- config.example.h
|       +-- display/
|       |   +-- DisplayDriver.h
|       +-- services/
|       |   +-- MockDataService.h
|       +-- ui/
|           +-- DashboardScreen.h
+-- .gitignore
```

## Run the Local Mockup

Open `mockup/index.html` directly in a browser.

Vite is optional if Node.js is installed:

```bash
cd mockup
npm install
npm run dev
```

The mockup is fixed at 320x240 pixels so browser layout decisions map cleanly to embedded display coordinates.

## Firmware Setup Notes

Install PlatformIO, then build:

```bash
cd firmware
pio run
```

Flash when the board is connected:

```bash
pio run --target upload
pio device monitor
```

The current firmware scaffold compiles around a placeholder `DisplayDriver` that logs drawing calls over serial. This keeps the UI source readable while isolating board-specific display setup.

To render on the real screen, replace the placeholder methods in `firmware/include/display/DisplayDriver.h` with calls to a graphics library such as TFT_eSPI, LovyanGFX, or Waveshare's Arduino examples. The board-specific section to adjust is clearly marked in `DisplayDriver::begin()`.

Likely display details from Waveshare:

- Driver IC: ST7789T3
- Interface: 4-wire SPI
- Native resolution: 240x320
- Desired UI rotation: landscape 320x240

## Configuration

No real API credentials are required yet.

- Copy `mockup/config.example.json` to `mockup/config.local.json` for future browser API testing.
- Copy `firmware/include/config/config.example.h` to `firmware/include/config/config.local.h` for future firmware credentials.
- Keep local config files out of Git.

The live data layer currently uses:

- Time: device/browser clock, with NTP on firmware after WiFi connects.
- Weather: Open-Meteo, no API key.
- Markets: Stooq CSV quotes, no API key.
- Quote: QuoteSlate, with Quotable fallback, no API key.
- CTA: official CTA Train Tracker, requires `CTA_API_KEY`.

Without WiFi credentials, firmware automatically falls back to bundled mock data. Without a CTA key, CTA arrivals stay on fallback values while other live sources can still update.

## Rendering Helpers

Both tracks are organized around these helper ideas:

- `drawRoundedFrame`
- `drawDivider`
- `drawTimeSection`
- `drawWeatherSection`
- `drawCTASection`
- `drawMarketsStrip`
- `drawQuoteSection`
- `drawPageIndicator`

## Roadmap

1. Tune spacing on the actual 2-inch panel.
2. Wire `DisplayDriver` to the Waveshare ST7789T3 display.
3. Add WiFi setup and local config loading.
4. Add cached weather, CTA, and market service modules.
5. Add a second touch/swipe page for Spotify later.
6. Add power-conscious refresh intervals.
