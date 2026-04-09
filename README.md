# SearchOutfit

SearchOutfit is an AI outfit search app that turns Instagram posts, screenshots, and image URLs into detected fashion items and shoppable merchant matches.

## What it does

- analyzes outfit photos with AI
- extracts images from public Instagram posts and carousels
- detects clothing, accessories, brand clues, colors, and style details
- searches merchants by market and ranks likely matches
- supports guest access, saved items, analytics, and magic-link auth

## Tech stack

- React 18
- TypeScript
- Vite
- Tailwind CSS
- Radix UI
- Supabase Edge Functions and auth
- Cloudflare Pages for frontend hosting

## Local development

Requirements:

- Node.js 18+
- npm

Start the app:

```sh
npm install
npm run dev
```

Build for production:

```sh
npm run build
```

Run tests:

```sh
npm run test
```

## Project structure

- `src/` — React app, pages, components, and client-side helpers
- `public/` — static SEO pages, icons, and crawl assets
- `supabase/functions/` — backend Edge Functions for analysis, search, auth, and media handling
- `scripts/` — local utility scripts for assets and maintenance

## Core flows

1. User submits an Instagram URL, screenshot, or image URL
2. Backend extracts or uploads the image
3. AI analyzes the outfit and returns structured item data
4. Product search finds merchant matches for the selected market
5. Results page shows detected items, visual matches, and store comparisons

## Deployment

Frontend is deployed on Cloudflare Pages and backend logic runs on Supabase Edge Functions. Production is served from:

- [searchoutfit.com](https://searchoutfit.com)

## Notes

- Search quality depends on merchant availability and provider coverage
- Some merchant images are proxied or enriched server-side when direct thumbnails are missing
- Search and analysis behavior is tested in-repo with Vitest
