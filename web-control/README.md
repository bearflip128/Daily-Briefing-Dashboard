# Daily Briefing Web Control

Small hosted control surface for the ESP32 dashboard. This is intended to live at `dashboard.natewalinder.com` once deployed.

The app has three jobs:

- Provide an admin UI for changing dashboard settings without editing code.
- Keep a local draft in the browser so edits survive refresh before sync.
- Expose `/device-config.json`, a compact JSON document the ESP32 can poll later.

## Run Locally

```bash
cd web-control
npm run dev
```

Open `http://127.0.0.1:8787`.

## Endpoints

- `GET /` - admin UI
- `GET /api/config` - current config for the admin UI
- `PUT /api/config` - save config
- `GET /api/device/status` - current known device/publish state
- `POST /api/device/sync` - publish the saved config for device polling
- `GET /device-config.json` - public device-readable config

## Admin UI Features

- Drag-and-drop widget ordering with mouse or touch.
- Enabled/disabled state per widget.
- Compact settings and validation for CTA, weather, markets, quote, clock, and future image pages.
- Live `320x240` device preview that updates immediately from the draft.
- Explicit OTA sync state: unsaved changes, syncing, saved, failed, last published time, and online/offline indicator.
- Collapsible advanced JSON inspector for debugging firmware config.

## Optional Admin Token

Set `DASHBOARD_ADMIN_TOKEN` in the hosting environment. When set, `PUT /api/config` requires:

```text
Authorization: Bearer YOUR_TOKEN
```

In the browser console, store the token locally:

```js
localStorage.setItem("dashboardAdminToken", "YOUR_TOKEN")
```

## Deployment Notes

This can run on a small Node host such as a VPS, Fly.io, Render, Railway, or a home server behind Cloudflare Tunnel.

For `dashboard.natewalinder.com`, point DNS to the host, then run:

```bash
cd web-control
PORT=8787 HOST=0.0.0.0 DASHBOARD_ADMIN_TOKEN=change-me npm start
```

The persisted config defaults to `web-control/data/dashboard-config.json`. Device publish state defaults to `web-control/data/device-state.json`. Set `DASHBOARD_CONFIG_PATH` or `DASHBOARD_DEVICE_STATE_PATH` if the host needs persistent storage somewhere else.

The device online pill probes `DASHBOARD_DEVICE_STATUS_URL`, which defaults to:

```text
http://daily-briefing-dashboard.local/status
```

The firmware exposes that tiny status endpoint over Wi-Fi. If mDNS is unreliable on a host, set `DASHBOARD_DEVICE_STATUS_URL=http://DEVICE_IP/status`.

## Device Integration Plan

The current ESP32 firmware does not yet poll this endpoint. The admin UI now publishes a config and timestamp, but the device needs firmware support before it can apply changes wirelessly. The next firmware step is:

1. Add `REMOTE_CONFIG_URL`, for example `https://dashboard.natewalinder.com/device-config.json`.
2. Poll the config periodically.
3. Apply supported fields, starting with:
   - `activePage`
   - `cta.stationName`
   - `cta.stationMapId`
   - `cta.walkMinutes`
   - `cta.comfortMinutes`
   - `cta.showDestinationNames`
4. Add image support after assets are resized server-side to fit `320x240`.

Keep secrets such as the CTA API key on the device or a backend service. Do not expose them in `device-config.json`.
