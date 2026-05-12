# Daily Briefing Dashboard

A lightweight, iOS-inspired smart dashboard for a 240x320 ESP32-S3 display.

The project starts with a local browser mockup so the interface can be previewed and tuned before the physical screen arrives. The firmware track mirrors the same widget boundaries in C++ so the design can move toward the Waveshare ESP32-S3 display without dragging along a heavy web app architecture.

## Hardware Target

- Waveshare 2inch ESP32-S3 Display Development Board
- 240x320 IPS display
- ESP32-S3 onboard processor
- WiFi support for future API integrations

## Project Structure

```text
Daily-Briefing-Dashboard/
+-- mockup/
|   +-- index.html
|   +-- package.json
|   +-- src/
|   |   +-- app.js
|   |   +-- mock-data.js
|   |   +-- styles.css
|   |   +-- widgets/
|   |       +-- cta.js
|   |       +-- morning.js
|   |       +-- spotify.js
|   |       +-- stocks.js
|   |       +-- weather.js
|   +-- config.example.json
+-- firmware/
|   +-- platformio.ini
|   +-- src/
|   |   +-- main.cpp
|   +-- include/
|   |   +-- config/
|   |   |   +-- AppConfig.h
|   |   |   +-- config.example.h
|   |   +-- display/
|   |   |   +-- DisplayDriver.h
|   |   +-- services/
|   |   |   +-- MockDataService.h
|   |   +-- ui/
|   |   |   +-- DashboardScreen.h
|   |   +-- widgets/
|   |       +-- CtaWidget.h
|   |       +-- MorningWidget.h
|   |       +-- SpotifyWidget.h
|   |       +-- StockWidget.h
|   |       +-- WeatherWidget.h
|   +-- data/
+-- .gitignore
```

## Run the Local Mockup

The mockup uses plain HTML, CSS, and JavaScript. The simplest path is to open `mockup/index.html` in a browser.

Vite is included as an optional convenience when Node.js is installed:

```bash
cd mockup
npm install
npm run dev
```

Then open the local URL printed by Vite. The dashboard frame is locked to the ESP32 target resolution of 240x320 so spacing and readability can be judged early.

## Firmware Notes

The firmware scaffold is organized as a PlatformIO project.

```bash
cd firmware
pio run
```

The current firmware uses mock data and serial output only. Display rendering is intentionally isolated behind `DisplayDriver`, so the final Waveshare display library can be wired in without rewriting widget logic.

## Configuration

No real API credentials are required yet.

- Copy `mockup/config.example.json` to `mockup/config.local.json` when the web mockup needs local keys.
- Copy `firmware/include/config/config.example.h` to `firmware/include/config/config.local.h` when firmware credentials are needed.
- Keep local config files out of Git.

Future integrations are planned for:

- Spotify now-playing API
- Weather API
- CTA train and bus arrivals
- WSJ or news headlines
- Stock ticker rotation
- Morning briefing summary

## Roadmap

1. Tune the browser mockup for legibility on the 240x320 display size.
2. Add real display driver support for the Waveshare ESP32-S3 board.
3. Add WiFi setup and local configuration loading.
4. Replace mock weather, CTA, Spotify, stock, and summary data with service modules.
5. Add simple caching and refresh intervals suitable for embedded hardware.
6. Package the dashboard as a flashable firmware build.

## Design Principles

- Dark mode by default.
- Persistent time and date.
- Icon-forward cards instead of dense text.
- Compact widget layout inspired by iOS widgets and Control Center.
- Small, modular code that can be understood, modified, and ported.
