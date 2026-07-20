# Orxify's MOTD Maker

Static, no-build site. `index.html` + `styles.css` + `app.js`. All data (drafts,
credits, saved history, settings) is stored client-side in `localStorage` —
no backend.

## Deploy to Vercel

**Option A — CLI**
```
npm i -g vercel
cd motd-maker
vercel
```
Follow the prompts (link/create a project), then `vercel --prod` to ship it.

**Option B — GitHub**
1. Push this folder to a GitHub repo.
2. On vercel.com → Add New Project → Import the repo.
3. Framework preset: **Other**. No build command, no output directory needed
   (root contains `index.html` directly). Deploy.

**Option C — Drag and drop**
On vercel.com → Add New Project → drag the `motd-maker` folder onto the
upload area.

## Local preview
Just open `index.html` in a browser, or run a static server:
```
npx serve .
```

## Tag format
Default output format matches the reference tool: `<color=#RRGGBB>text</color>`.
An alternate `&#RRGGBB;text` format is available under Settings.
