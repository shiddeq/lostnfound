# 🎒 Lost & Found

A self-contained Lost & Found web app: users report lost or found items with photos, browse a searchable gallery, view item details, and contact each other through a per-item chat/message board.

Built with **Node.js + Express + SQLite (better-sqlite3)**. No accounts needed — contact info is provided when reporting an item.

## Features

- 📸 Report lost/found items with image upload (jpg/png/gif/webp, max 5 MB)
- 🔍 Searchable gallery with Lost / Found filters
- 💬 Per-item chat so others can reach out ("I think that's mine…")
- 📇 Contact info shown on each item (email and/or phone)
- ✅ Ownership-verification tip built into the item view

## Run locally

```bash
npm install
npm start
```

Open http://localhost:3000

Data is stored in `data/app.db` (auto-created); uploaded photos in `public/uploads/`.

## Notes

- This app is a Node.js server (API + uploads), so GitHub Pages alone can't host the full app — Pages will serve the landing/gallery front-end only. To run the full app with uploads and chat, deploy on a Node host (Render, Railway, Fly.io, a VPS, etc.) or run locally.
