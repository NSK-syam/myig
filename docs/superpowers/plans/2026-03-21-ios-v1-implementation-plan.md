# Search Outfit iOS V1 Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert the existing SearchOutfit web app into an iPhone-first product foundation with dual-input home flow, quota-gated search access, account/paywall surfaces, and backend support for signed-in usage and entitlements.

**Architecture:** Keep the current React/Vite + Supabase architecture, but insert a dedicated access layer between the UI and the analysis flow. Rework the default app shell into a mobile-first consumer experience, then add server-backed usage tracking and subscription state so iOS billing and App Store compliance can sit on stable seams.

**Tech Stack:** React 18, TypeScript, Vite, Vitest, Testing Library, Supabase Auth, Supabase Edge Functions, Supabase Postgres, Capacitor iOS shell, StoreKit-compatible billing adapter

---

## File Structure

### Existing files to modify

- `src/App.tsx`
  Purpose: route registration and global providers
- `src/pages/Index.tsx`
  Purpose: current marketing-heavy homepage that should become the mobile home experience
- `src/pages/Saved.tsx`
  Purpose: authenticated saved-items experience
- `src/components/Navbar.tsx`
  Purpose: current desktop-style navigation that should be replaced or minimized for app shell use
- `src/components/HeroSection.tsx`
  Purpose: current search entry flow; needs to be split so business logic can survive the UI rewrite
- `src/components/AuthDialog.tsx`
  Purpose: sign-in modal that will become app auth sheet building block
- `src/components/AuthProvider.tsx`
  Purpose: auth state and sign-in/out behavior; expand with account deletion support
- `src/lib/outfitApi.ts`
  Purpose: analysis and search calls; route through access consumption points where appropriate
- `src/integrations/supabase/types.ts`
  Purpose: typed schema updates for usage and entitlement tables

### New frontend files

- `src/lib/searchAccess.ts`
  Purpose: pure access/quota decision helpers and local guest persistence
- `src/lib/searchAccessApi.ts`
  Purpose: server calls for signed-in usage and entitlement reads/writes
- `src/hooks/use-search-access.ts`
  Purpose: app-facing access state hook
- `src/components/app/AppShell.tsx`
  Purpose: iPhone-first layout wrapper with top/bottom navigation conventions
- `src/components/app/HomeScreen.tsx`
  Purpose: new app home screen with Instagram URL and upload flows
- `src/components/app/QuotaBadge.tsx`
  Purpose: remaining-search indicator
- `src/components/app/SearchLimitSheet.tsx`
  Purpose: auth/paywall transition UI
- `src/components/app/PaywallScreen.tsx`
  Purpose: monthly/yearly plan UI and restore action
- `src/components/app/AccountScreen.tsx`
  Purpose: account, entitlement, restore, and delete-account UI
- `src/components/app/DeleteAccountDialog.tsx`
  Purpose: destructive confirmation flow
- `src/lib/billing.ts`
  Purpose: billing adapter seam with stubbed web-safe fallback until iOS wiring lands

### New backend files

- `supabase/migrations/20260321150000_user_search_access.sql`
  Purpose: signed-in usage + entitlement tables and RLS
- `supabase/functions/access-state/index.ts`
  Purpose: return usage + entitlement summary for current actor
- `supabase/functions/consume-search/index.ts`
  Purpose: atomically decide whether the search may proceed and consume quota
- `supabase/functions/delete-account/index.ts`
  Purpose: in-app account deletion backend endpoint
- `supabase/functions/sync-entitlement/index.ts`
  Purpose: persist Apple entitlement state after purchase/restore

### New tests

- `src/lib/searchAccess.test.ts`
  Purpose: pure guest/signed-in/subscriber access rules
- `src/hooks/use-search-access.test.tsx`
  Purpose: hook state transitions and auth coupling
- `src/test/homeScreen.test.tsx`
  Purpose: mobile home screen, quota badge, and auth/paywall transitions
- `src/test/accountScreen.test.tsx`
  Purpose: restore/delete actions and account state rendering
- `src/test/paywallScreen.test.tsx`
  Purpose: plan selection and restore states

## Chunk 1: Mobile Home + Access Foundation

### Task 1: Add pure quota decision helpers

**Files:**
- Create: `src/lib/searchAccess.ts`
- Test: `src/lib/searchAccess.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";
import { getSearchAccessState } from "@/lib/searchAccess";

describe("getSearchAccessState", () => {
  it("allows guests while under the 3-search guest limit", () => {
    expect(getSearchAccessState({
      guestSearchesUsed: 2,
      guestSearchLimit: 3,
      signedInSearchesUsed: 0,
      signedInSearchLimit: 5,
      isSignedIn: false,
      hasActiveSubscription: false,
    }).status).toBe("allowed");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/lib/searchAccess.test.ts`
Expected: FAIL because `src/lib/searchAccess.ts` does not exist yet.

- [ ] **Step 3: Write minimal implementation**

```ts
export function getSearchAccessState(input: SearchAccessInput): SearchAccessState {
  if (input.hasActiveSubscription) return { status: "allowed", reason: "subscriber" };
  if (!input.isSignedIn) {
    return input.guestSearchesUsed < input.guestSearchLimit
      ? { status: "allowed", reason: "guest_remaining" }
      : { status: "auth_required", reason: "guest_exhausted" };
  }

  return input.signedInSearchesUsed < input.signedInSearchLimit
    ? { status: "allowed", reason: "signed_in_remaining" }
    : { status: "paywall_required", reason: "signed_in_exhausted" };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- src/lib/searchAccess.test.ts`
Expected: PASS

- [ ] **Step 5: Expand tests for guest exhausted, signed-in exhausted, and subscriber bypass**

Run: `npm run test -- src/lib/searchAccess.test.ts`
Expected: PASS with four targeted cases.

### Task 2: Add access-state hook and local guest persistence

**Files:**
- Create: `src/hooks/use-search-access.ts`
- Modify: `src/components/AuthProvider.tsx`
- Test: `src/hooks/use-search-access.test.tsx`

- [ ] **Step 1: Write the failing hook test**

```tsx
it("promotes a guest from allowed to auth_required after three consumed guest searches", async () => {
  const { result } = renderHook(() => useSearchAccess(), { wrapper });
  expect(result.current.state.status).toBe("allowed");
  act(() => result.current.consumeLocalGuestSearch());
  act(() => result.current.consumeLocalGuestSearch());
  act(() => result.current.consumeLocalGuestSearch());
  expect(result.current.state.status).toBe("auth_required");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/hooks/use-search-access.test.tsx`
Expected: FAIL because the hook does not exist yet.

- [ ] **Step 3: Implement minimal hook**

Include:
- localStorage-backed guest usage
- auth-aware state
- a `refresh()` method that returns the current local/auth-derived state until server sync is added in Chunk 3
- helpers: `consumeLocalGuestSearch`, `resetGuestSearches`

- [ ] **Step 4: Run hook tests**

Run: `npm run test -- src/hooks/use-search-access.test.tsx`
Expected: PASS

### Task 3: Split mobile search UI out of the current hero

**Files:**
- Create: `src/components/app/HomeScreen.tsx`
- Create: `src/components/app/QuotaBadge.tsx`
- Modify: `src/pages/Index.tsx`
- Modify: `src/components/HeroSection.tsx`
- Test: `src/test/homeScreen.test.tsx`

- [ ] **Step 1: Write the failing home-screen test**

```tsx
it("renders both Instagram URL and upload entry points on the first screen", () => {
  render(<Index />);
  expect(screen.getByLabelText(/instagram post url/i)).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /upload screenshot or photo/i })).toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/test/homeScreen.test.tsx`
Expected: FAIL because the current page does not expose the required app-first controls.

- [ ] **Step 3: Implement the new screen**

Requirements:
- move analysis submission logic behind callbacks/hooks instead of leaving it buried in marketing markup
- preserve current Instagram extraction and upload behaviors
- show remaining-search badge
- remove marquee/how-it-works/product-marketing sections from the default app route

- [ ] **Step 4: Run the focused screen test**

Run: `npm run test -- src/test/homeScreen.test.tsx`
Expected: PASS

- [ ] **Step 5: Run the existing hero analytics test and fix regressions**

Run: `npm run test -- src/test/heroAnalytics.test.tsx`
Expected: PASS

### Task 4: Gate searches before analysis starts

**Files:**
- Modify: `src/components/app/HomeScreen.tsx`
- Create: `src/components/app/SearchLimitSheet.tsx`
- Test: `src/test/homeScreen.test.tsx`

- [ ] **Step 1: Add a failing test for guest exhaustion**

```tsx
it("opens auth gating instead of analyzing when the guest quota is exhausted", async () => {
  primeGuestUsage(3);
  render(<Index />);
  fireEvent.submit(screen.getByRole("button", { name: /analyze instagram link/i }).closest("form")!);
  expect(await screen.findByText(/sign up to unlock 5 more searches/i)).toBeInTheDocument();
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test -- src/test/homeScreen.test.tsx`
Expected: FAIL because the current flow always proceeds to analysis.

- [ ] **Step 3: Implement gating**

Rules:
- guest exhausted => auth sheet
- signed-in exhausted without subscription => paywall
- allowed => continue with current analysis flow

- [ ] **Step 4: Re-run the screen tests**

Run: `npm run test -- src/test/homeScreen.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/searchAccess.ts src/lib/searchAccess.test.ts src/hooks/use-search-access.ts src/hooks/use-search-access.test.tsx src/components/app/HomeScreen.tsx src/components/app/QuotaBadge.tsx src/components/app/SearchLimitSheet.tsx src/pages/Index.tsx src/components/HeroSection.tsx src/test/homeScreen.test.tsx
git commit -m "feat: add mobile home and quota gating foundation"
```

## Chunk 2: Account, Saved, and Paywall Surfaces

### Task 5: Add app shell navigation and account screen

**Files:**
- Create: `src/components/app/AppShell.tsx`
- Create: `src/components/app/AccountScreen.tsx`
- Modify: `src/App.tsx`
- Modify: `src/components/Navbar.tsx`
- Modify: `src/pages/Saved.tsx`
- Test: `src/test/accountScreen.test.tsx`

- [ ] **Step 1: Write failing account-screen tests**
- [ ] **Step 2: Run `npm run test -- src/test/accountScreen.test.tsx` and verify failure**
- [ ] **Step 3: Implement mobile shell and account route surface**
- [ ] **Step 4: Re-run `npm run test -- src/test/accountScreen.test.tsx` and verify pass**
- [ ] **Step 5: Run `npm run test -- src/pages/Saved.tsx`-relevant saved tests or add focused saved-page assertions**

### Task 6: Add delete-account UX and provider support

**Files:**
- Create: `src/components/app/DeleteAccountDialog.tsx`
- Modify: `src/components/AuthProvider.tsx`
- Modify: `src/components/app/AccountScreen.tsx`
- Test: `src/test/accountScreen.test.tsx`

- [ ] **Step 1: Write failing delete-account test**
- [ ] **Step 2: Run `npm run test -- src/test/accountScreen.test.tsx` and verify failure**
- [ ] **Step 3: Add provider API for `deleteAccount()` using backend function seam**
- [ ] **Step 4: Re-run tests and verify pass**

### Task 7: Add paywall UI + billing adapter seam

**Files:**
- Create: `src/components/app/PaywallScreen.tsx`
- Create: `src/lib/billing.ts`
- Modify: `src/components/app/SearchLimitSheet.tsx`
- Test: `src/test/paywallScreen.test.tsx`

- [ ] **Step 1: Write failing paywall-screen test**
- [ ] **Step 2: Run `npm run test -- src/test/paywallScreen.test.tsx` and verify failure**
- [ ] **Step 3: Implement monthly/yearly plan presentation and restore button**
- [ ] **Step 4: Re-run `npm run test -- src/test/paywallScreen.test.tsx` and verify pass**

- [ ] **Step 5: Commit**

```bash
git add src/components/app/AppShell.tsx src/components/app/AccountScreen.tsx src/components/app/DeleteAccountDialog.tsx src/components/app/PaywallScreen.tsx src/lib/billing.ts src/components/AuthProvider.tsx src/App.tsx src/components/Navbar.tsx src/pages/Saved.tsx src/test/accountScreen.test.tsx src/test/paywallScreen.test.tsx
git commit -m "feat: add app shell account and paywall surfaces"
```

## Chunk 3: Backend Usage Tracking, Entitlements, and iOS Shell

### Task 8: Add signed-in usage and entitlement schema

**Files:**
- Create: `supabase/migrations/20260321150000_user_search_access.sql`
- Modify: `src/integrations/supabase/types.ts`

- [ ] **Step 1: Write the migration for user search usage and entitlement state**
- [ ] **Step 2: Update generated TypeScript schema types manually for the new tables**
- [ ] **Step 3: Verify migration file syntax by reviewing it against existing migrations**

### Task 9: Add backend access-state and consume-search functions

**Files:**
- Create: `supabase/functions/access-state/index.ts`
- Create: `supabase/functions/consume-search/index.ts`
- Create: `src/lib/searchAccessApi.ts`
- Modify: `src/hooks/use-search-access.ts`

- [ ] **Step 1: Write failing client tests for server-backed signed-in state**
- [ ] **Step 2: Run the relevant tests and verify failure**
- [ ] **Step 3: Implement server calls and hook refresh/consume behavior**
- [ ] **Step 4: Re-run tests and verify pass**

### Task 10: Add account deletion and entitlement sync endpoints

**Files:**
- Create: `supabase/functions/delete-account/index.ts`
- Create: `supabase/functions/sync-entitlement/index.ts`
- Modify: `src/components/AuthProvider.tsx`
- Modify: `src/lib/billing.ts`

- [ ] **Step 1: Implement backend deletion endpoint**
- [ ] **Step 2: Implement entitlement sync endpoint**
- [ ] **Step 3: Wire frontend seams to those endpoints**
- [ ] **Step 4: Verify affected tests still pass**

### Task 11: Add Capacitor iOS shell scaffolding

**Files:**
- Create or modify: `package.json`
- Create: `capacitor.config.ts`
- Create: `ios/` project files if generated in-repo
- Modify: build/docs files as needed

- [ ] **Step 1: Add Capacitor dependencies and scripts**
- [ ] **Step 2: Add Capacitor config targeting the Vite build output**
- [ ] **Step 3: Generate or sync the iOS shell**
- [ ] **Step 4: Verify `npm run build` still succeeds**

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260321150000_user_search_access.sql supabase/functions/access-state/index.ts supabase/functions/consume-search/index.ts supabase/functions/delete-account/index.ts supabase/functions/sync-entitlement/index.ts src/integrations/supabase/types.ts src/lib/searchAccessApi.ts src/lib/billing.ts package.json capacitor.config.ts ios
git commit -m "feat: add backend access services and iOS shell scaffolding"
```

## Execution Notes

- Keep the current analysis and search APIs working throughout. UI changes must not regress the existing happy path.
- Do not wire real Apple purchase verification logic directly into generic React components; keep it behind `src/lib/billing.ts`.
- Do not spread quota arithmetic across components. `src/lib/searchAccess.ts` remains the single pure rule engine.
- If Capacitor or billing dependencies require package installation, perform code/test work first, then install once the local code compiles cleanly.

## Verification Sweep

- [ ] Run: `npm run test`
  Expected: all Vitest suites pass
- [ ] Run: `npm run build`
  Expected: Vite production build succeeds
- [ ] Run iPhone-focused manual smoke checks for Home, Results, Saved, Account, auth gating, and paywall routing
- [ ] Confirm privacy and terms remain reachable from the account surface

## Handoff

Plan complete and saved to `docs/superpowers/plans/2026-03-21-ios-v1-implementation-plan.md`. Execute Chunk 1 first, then continue through later chunks without skipping the failing-test step.
