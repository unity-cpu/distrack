# gallery

Drop images, write descriptions, browse a grid. Stores everything in
the browser's localStorage (base64 images) — no backend, no DB.
Export/import a JSON backup to move data between browsers/devices.

## Run locally

    npm install
    npm run dev

## Deploy to Vercel

Option A — CLI:

    npm i -g vercel
    vercel

Option B — GitHub:

1. Push this folder to a GitHub repo.
2. Go to vercel.com/new, import the repo, deploy (no config needed).

## Notes

- Data lives per-browser (localStorage), not shared across devices —
  use "export backup" / "import backup" to move it.
- For a shared/multi-device gallery you'd need real storage (e.g.
  Vercel Blob + a small API route) — say the word if you want that
  version instead.
