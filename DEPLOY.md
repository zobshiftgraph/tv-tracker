# Deploy TV Tracker to GitHub + Cloudflare

You need **two pieces**:

| Piece | What it does |
|--------|----------------|
| **GitHub** | Stores your code and can host the app (Pages) |
| **Cloudflare Worker** | Syncs favorites to the Family Dashboard (`family-dashboard-api…workers.dev`) |

You can host the **website** on **GitHub Pages** or **Cloudflare Pages** (pick one — both work).

---

## Part 1 — Create the GitHub repo

1. Go to [github.com/new](https://github.com/new)
2. Repository name: **`tv-tracker`**
3. **Public** repo
4. Do **not** add README / .gitignore (you already have them locally)
5. Click **Create repository**

### Upload your project

From `C:\Users\thom7\Desktop\tv-tracker\`, upload **everything except** `node_modules` and `standalone`:

- `src/` folder  
- `index.html`  
- `package.json`, `package-lock.json`  
- `vite.config.ts`, `tsconfig.json`, `tsconfig.node.json`  
- `.github/workflows/pages.yml`  
- `README.md`, `DEPLOY.md`, `.gitignore`  
- `Start TV Tracker.bat`, `Start TV Tracker Standalone.bat` (optional)

**Do not upload** `node_modules` or `standalone` (GitHub Actions builds those).

On GitHub: **Add file → Upload files**, drag the folders/files, **Commit**.

---

## Part 2 — GitHub Pages (host the app)

1. Open your **`tv-tracker`** repo on GitHub  
2. **Settings → Pages**  
3. **Source:** **GitHub Actions** (not “Deploy from branch”)  
4. Go to **Actions** tab → run **Deploy GitHub Pages** if it did not start automatically  
5. Wait for a green checkmark  

Your app will be at:

**https://thom7215.github.io/tv-tracker/**

(Replace `thom7215` with your GitHub username.)

---

## Part 3 — Cloudflare Pages (optional alternative host)

Use this if you want the app on a `*.pages.dev` URL or a custom domain instead of GitHub Pages.

1. [dash.cloudflare.com](https://dash.cloudflare.com) → **Workers & Pages**  
2. **Create** → **Pages** → **Connect to Git**  
3. Authorize GitHub and select **`tv-tracker`**  
4. Build settings:

   | Setting | Value |
   |--------|--------|
   | Production branch | `main` |
   | Build command | `npm ci && npm run build:standalone` |
   | Build output directory | `standalone` |
   | Root directory | `/` (leave default) |

5. **Save and deploy**

Cloudflare gives you a URL like **`https://tv-tracker.pages.dev`**.

You do **not** need both GitHub Pages and Cloudflare Pages live at once — one URL is enough for your family.

---

## Part 4 — Connect Cloudflare Worker (sync + TVMaze proxy)

Your Worker should already exist at:

**https://family-dashboard-api.thom7215.workers.dev**

If you cannot find it in the dashboard, open that URL — if you see `{"ok":true,...}`, it is still running under your Cloudflare account (try the account switcher top-left).

In the **TV Tracker** app (on your phone or PC):

1. Tap **☁ Sync**  
2. **Cloud API URL:** `https://family-dashboard-api.thom7215.workers.dev`  
3. **Family password:** same as `FAMILY_TOKEN` in Cloudflare  
4. **Save**

Favorites sync to the Family Dashboard TV panel. TVMaze requests can go through the Worker when sync is configured (helps with some networks).

---

## Part 5 — Test

1. Open your live URL (GitHub or Cloudflare Pages)  
2. Star a show under **Favorites**  
3. Check the Family Dashboard TV section (after sync, within ~2 minutes)

---

## Updating the app later

1. Edit files locally in `C:\Users\thom7\Desktop\tv-tracker\`  
2. Upload changed files to GitHub (or use git push if you use CLI)  
3. GitHub Actions / Cloudflare Pages rebuilds automatically  

---

## Quick reference

| Item | URL |
|------|-----|
| TV Tracker (GitHub Pages) | https://thom7215.github.io/tv-tracker/ |
| TV Tracker (Cloudflare Pages) | https://tv-tracker.pages.dev (after Part 3) |
| Cloud API / sync | https://family-dashboard-api.thom7215.workers.dev |
| Local project | `C:\Users\thom7\Desktop\tv-tracker\` |
