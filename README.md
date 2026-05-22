# Daily Briefing Dashboard

A restrained, black-and-white ESP32-S3 dashboard UI for the Waveshare 2-inch display. The physical panel is 240x320, and this project renders the main dashboard in landscape as a 320x240 screen.

The repo has two tracks:

- `mockup`: a local browser preview for fast visual iteration.
- `firmware`: a PlatformIO/Arduino scaffold with the same layout regions and drawing helper boundaries.
- `web-control`: a lightweight hosted control panel intended for `dashboard.natewalinder.com`.

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
+-- web-control/
|   +-- server.js
|   +-- public/
|   |   +-- index.html
|   |   +-- app.js
|   |   +-- styles.css
|   +-- data/
|   |   +-- dashboard-config.example.json
+-- .gitignore
```

## Run the Local Mockup

For live CTA arrivals, run the tiny local server. It serves the static mockup and proxies CTA Train Tracker so the API key stays local:

```bash
cd mockup
npm run dev
```

Then open `http://127.0.0.1:5173`.

You can still open `mockup/index.html` directly in a browser for static layout work, but some live APIs may fall back to mock data from `file://`.

Run the mock API smoke test while the local server is running:

```bash
cd mockup
npm run test:api
```

Vite is optional if you want the standard Vite workflow:

```bash
cd mockup
npm install
npm run vite
```

The mockup is fixed at 320x240 pixels so browser layout decisions map cleanly to embedded display coordinates.

## Run the Web Control UI

`web-control` is a small Node app designed to be hosted at `dashboard.natewalinder.com`. It provides an admin UI and a device-readable config endpoint:

```bash
cd web-control
npm run dev
```

Then open `http://127.0.0.1:8787`.

Key endpoints:

- `GET /` - admin UI
- `GET /api/config` - current editable config
- `PUT /api/config` - save editable config
- `GET /device-config.json` - ESP32-readable config

The next firmware step is to poll `https://dashboard.natewalinder.com/device-config.json` and apply supported settings without reflashing.

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

After the first serial flash, the firmware starts ArduinoOTA when WiFi connects. Future LAN updates can be sent with:

```bash
cd firmware
pio run -e waveshare_esp32_s3_display_ota --target upload
```

If mDNS does not resolve `daily-briefing-dashboard.local`, set `upload_port` in `firmware/platformio.ini` to the IP printed in the serial log.

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

Optional OTA password protection can be added locally with `#define OTA_PASSWORD "..."` in `firmware/include/config/config.local.h`.

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
