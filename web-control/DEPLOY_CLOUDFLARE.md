# Deploy to dashboard.natewalinder.com

This deploys the control panel as a Cloudflare Worker with Static Assets and Workers KV.

## Why Worker + KV

The local `server.js` writes config to local JSON files. Cloudflare Workers do not have a local filesystem, so the hosted version stores config, publish state, and optional device snapshots in Workers KV.

The hosted URL can serve:

- `https://dashboard.natewalinder.com/`
- `https://dashboard.natewalinder.com/api/config`
- `https://dashboard.natewalinder.com/device-config.json`
- `https://dashboard.natewalinder.com/api/device/status`
- `https://dashboard.natewalinder.com/api/device/live`

## One-Time Cloudflare Setup

From `web-control`:

```bash
npm install
npx wrangler login
npx wrangler kv namespace create DASHBOARD_CONFIG
npx wrangler kv namespace create DASHBOARD_CONFIG --preview
```

Copy the returned production and preview namespace IDs into `wrangler.jsonc`:

```jsonc
"kv_namespaces": [
  {
    "binding": "DASHBOARD_CONFIG",
    "id": "PRODUCTION_NAMESPACE_ID",
    "preview_id": "PREVIEW_NAMESPACE_ID"
  }
]
```

Set secrets:

```bash
npx wrangler secret put DASHBOARD_ADMIN_TOKEN
npx wrangler secret put DEVICE_INGEST_TOKEN
```

Deploy:

```bash
npm run deploy:cloudflare
```

## DNS / Route

`wrangler.jsonc` includes a Worker route for:

```text
dashboard.natewalinder.com/*
```

The DNS record may remain proxied through Cloudflare. The Worker route will intercept traffic for that hostname and serve the control panel.

If `dashboard.natewalinder.com` is currently a CNAME alias of `www.natewalinder.com`, that is fine as long as the hostname exists in Cloudflare DNS and is proxied.

## Important Device Reality

When the UI is hosted on Cloudflare, Cloudflare cannot directly reach your ESP32 at `192.168.0.156` or `daily-briefing-dashboard.local`. Those addresses only exist on your home network.

For the hosted site to show a true "Currently live" view remotely, the ESP32 needs to push snapshots to:

```text
POST https://dashboard.natewalinder.com/api/device/live
Authorization: Bearer DEVICE_INGEST_TOKEN
```

The Worker endpoint is ready for this. Firmware support for cloud snapshot posting is the next step.

For local development, `server.js` still probes the ESP32 directly and provides the lowest-latency live view.
