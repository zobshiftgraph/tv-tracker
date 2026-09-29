# TV Tracker (standalone)

Track TV shows with **TVMaze** (no API key). Favorites, notifications, and optional sync to your Family Dashboard via Cloudflare.

**Live deploy guide:** see **[DEPLOY.md](./DEPLOY.md)** for GitHub + Cloudflare step-by-step.

## Quick start (local)

1. Install [Node.js](https://nodejs.org/)
2. Double-click **`Start TV Tracker Standalone.bat`**
3. Browser opens at http://localhost:5175

## Developer mode

Double-click **`Start TV Tracker.bat`** → http://localhost:5174

## Cloud sync (optional)

Tap **☁ Sync** in the app:

- **Cloud API URL:** `https://family-dashboard-api.thom7215.workers.dev`
- **Family password:** your household `FAMILY_TOKEN`

## Build for hosting

```bash
npm install
npm run build:standalone
```

Upload contents of **`standalone/`**, or push this repo and use GitHub Actions / Cloudflare Pages (see DEPLOY.md).

## Features

- Airing today · On this week · Top rated · Favorites · Search  
- Browser notifications for favorite episodes  
- Cloud sync to Family Dashboard  
