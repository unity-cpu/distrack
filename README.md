# gallery

A real shared gallery: upload an image + description, everyone who
visits the site sees it. Images and their descriptions are stored in
Vercel Blob storage — not just your browser.

## Deploy to Vercel

1. Push this folder to a GitHub repo (or run `vercel` from the CLI
   inside this folder — either works).

2. Import the repo at vercel.com/new and deploy.

3. **Connect Blob storage** (one-time, required):
   - In your Vercel project → **Storage** tab → **Create Database** → **Blob**.
   - Connect it to this project. Vercel automatically adds the
     `BLOB_READ_WRITE_TOKEN` environment variable for you.
   - Redeploy once (Deployments → ⋯ → Redeploy) so the new env var
     is picked up.

That's it — the site is now live and shared for anyone with the URL.

## Run locally

    npm install
    npm run dev

For local dev to actually upload, pull the Blob token down:

    npm i -g vercel
    vercel link
    vercel env pull .env.local

## How it works

- `app/api/upload` issues a short-lived token so the browser can
  upload the image file directly to Blob storage (skips Vercel's
  ~4.5MB serverless body limit, so full-size phone photos work fine).
- `app/api/items` stores a `manifest.json` blob listing every image's
  URL + description; that's what the homepage reads to render the grid.
- Editing a description or deleting an image updates that manifest
  (and, on delete, removes the underlying image blob too).

No database, no auth — anyone with the link can view, and anyone
with the link can also upload/delete. Say the word if you want a
password gate or an admin-only upload mode.
