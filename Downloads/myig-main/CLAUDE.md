# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**SearchOutfit** — a fashion analysis and product discovery app. Users paste an Instagram URL or upload a photo; AI identifies clothing items and returns shoppable product matches. Also ships as an iOS app via Capacitor.

## Commands

```bash
npm run dev          # Dev server on http://localhost:8080
npm run build        # Production build
npm run lint         # ESLint
npm run test         # Vitest (unit tests)
npm run test:watch   # Vitest watch mode
npm run preview      # Preview production build

# Run a single test file
npx vitest run src/lib/outfitApi.test.ts

# iOS
npm run build:ios    # Build + sync to iOS project
npm run cap:open:ios # Open in Xcode
npm run cap:sync     # Sync web assets to native shell
bash scripts/ios/archive.sh  # Archive for App Store
```

## Architecture

**Stack**: React 18 + TypeScript + Vite, Tailwind CSS + shadcn/ui, Supabase (DB + Edge Functions), TanStack Query, Capacitor (iOS).

**Routing** (`src/App.tsx`):

- `/` → `pages/Index.tsx` — hero section + analysis entry point
- `/results` → `pages/SearchResults.tsx` — outfit analysis + product matches
- `/saved` → `pages/Saved.tsx` — favorites from localStorage
- `/account` → `pages/Account.tsx` — user account management
- `/auth/callback` → `pages/AuthCallback.tsx` — magic-link OAuth landing
- `/analytics` → `pages/AnalyticsPage.tsx` — internal analytics dashboard
- `/privacy`, `/terms` → legal pages

**Data Flow**:

1. User inputs image URL or uploads file in `HeroSection.tsx`
2. `src/lib/outfitApi.ts` orchestrates all API calls:
   - `extractInstagramImages()` → calls `extract-instagram` edge function
   - `analyzeOutfitFrom*()` → calls `analyze-outfit` edge function (uses Claude Vision)
   - `searchProductsByImage()` → calls `search-products` edge function
3. Results displayed in `SearchResults.tsx`; saved items persisted to localStorage

**Security / Token Model** (`src/lib/appAccess.ts`):

- All app-facing Edge Functions require two custom headers: `x-searchoutfit-token` (short-lived app token) and `x-searchoutfit-guest` (24h guest token).
- Tokens are issued by `issue-app-token` and cached in `sessionStorage`/`localStorage`. `invokeAppFunction()` handles token refresh transparently.
- Supabase auth (magic-link email OTP) is separate — used only for signed-in user features. Auth state lives in `AuthProvider.tsx` / `useAuth()`.

**Search Quota** (`src/lib/searchAccess.ts`, `src/lib/searchAccessApi.ts`):

- Guests get `GUEST_SEARCH_LIMIT = 3` free searches tracked server-side via the `guest-access-state` and `consume-search` edge functions.
- After exhaustion, `status: "auth_required"` is returned and a sign-in prompt is shown.
- Signed-in users without a subscription get unlimited searches; subscribers have a separate entitlement flow via `sync-entitlement`.

**Supabase Edge Functions** (`supabase/functions/`, Deno runtime):

- `issue-app-token` — mints short-lived app + guest tokens
- `extract-instagram` — scrapes image URLs from Instagram posts
- `analyze-outfit` — Claude Vision API; returns structured outfit JSON (items, brands, style, occasion, season)
- `search-products` — visual product search; ranks results: official store → authorized retailers → resale
- `upload-image` — stores uploaded images and returns signed URLs
- `guest-access-state` / `access-state` — returns remaining search quota
- `consume-search` — decrements search quota (returns 403 when exhausted)
- `ingest-analytics` / `analytics-summary` — event tracking pipeline
- `sync-entitlement` — validates in-app purchase entitlements
- `delete-account` — GDPR account deletion

All Edge Functions are public (`verify_jwt: false`); auth is enforced via the app-token middleware instead.

**Analytics** (`src/lib/analytics.ts`):

- Events: `search_link_submitted`, `screenshot_uploaded`, `screenshot_pasted`, `instagram_extract_succeeded`, `analysis_completed`, `product_results_loaded`.
- Use `fireAndForgetAnalyticsEvent()` for non-blocking calls from UI components.

**Native / Capacitor** (`src/components/app/NativeAppBridge.tsx`):

- `NativeAppBridge` listens for `appUrlOpen` events (deep links / OAuth redirects) and calls `navigate()` — no-ops in the browser.
- App ID: `com.searchoutfit.ios`, custom URL scheme: `searchoutfit://`.
- Camera plugin (`@capacitor/camera`) configured with `saveToGallery: false`.

**Supabase Client**: `src/integrations/supabase/client.ts` — initialized from `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` env vars. DB types are auto-generated in `src/integrations/supabase/types.ts`.

**Path alias**: `@/*` → `src/*` (configured in `tsconfig.json` and `vite.config.ts`).

**Styling**: Tailwind CSS with CSS variables in HSL format. Custom tokens: `warm`, `gold`, `sidebar` color palettes in `tailwind.config.ts`. Component primitives from shadcn/ui live in `src/components/ui/`.

**Tests**: Vitest + jsdom + `@testing-library/react`. Setup file at `src/test/setup.ts`. Tests colocated with source in `src/**/*.test.{ts,tsx}` and `src/test/`.
