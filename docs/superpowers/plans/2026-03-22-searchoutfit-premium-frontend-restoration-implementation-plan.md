# SearchOutfit Premium Frontend Restoration Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore the previous richer premium SearchOutfit homepage as the main landing page and migrate the rest of the app to that same visual system without breaking the current Instagram/search/auth/saved/analytics behavior.

**Architecture:** Reintroduce the old premium homepage as a composed route-level screen built from the existing premium sections, then move the current working homepage behavior from `HomeScreen` into `HeroSection` so `/` regains the old look while preserving the new product logic. After the homepage is stable, restyle `SearchResults`, `Saved`, `AccountScreen`, and `AnalyticsPage` to use a shared premium shell and card system.

**Tech Stack:** React 18, TypeScript, Vite, React Router, Vitest, Testing Library, Tailwind CSS, Framer Motion, Supabase Auth, Supabase Edge Functions

---

## File Structure

### Existing files to modify

- `/Users/syam/Downloads/myig-main/src/pages/Index.tsx`
  Purpose: switch the homepage route back to a premium composed landing page.
- `/Users/syam/Downloads/myig-main/src/components/HeroSection.tsx`
  Purpose: restore the old premium hero as the main interactive search entry point and absorb the newer `HomeScreen` behaviors.
- `/Users/syam/Downloads/myig-main/src/components/Navbar.tsx`
  Purpose: align nav with the restored premium shell across all pages.
- `/Users/syam/Downloads/myig-main/src/pages/SearchResults.tsx`
  Purpose: keep current results logic but restyle it to match the premium homepage system.
- `/Users/syam/Downloads/myig-main/src/pages/Saved.tsx`
  Purpose: restyle saved items page into the same premium shell.
- `/Users/syam/Downloads/myig-main/src/components/app/AccountScreen.tsx`
  Purpose: restyle the account page into the premium shell.
- `/Users/syam/Downloads/myig-main/src/pages/AnalyticsPage.tsx`
  Purpose: restyle the analytics page into the premium shell while keeping admin gating.
- `/Users/syam/Downloads/myig-main/src/components/HowItWorks.tsx`
  Purpose: preserve or fine-tune the old explanatory “1, 2, 3” section to match the restored homepage exactly.
- `/Users/syam/Downloads/myig-main/src/components/StyleBoardSection.tsx`
  Purpose: preserve or fine-tune the old interactive/saved-items marketing section.
- `/Users/syam/Downloads/myig-main/src/components/ComplianceSection.tsx`
  Purpose: preserve trust/disclosure content inside the premium homepage stack.
- `/Users/syam/Downloads/myig-main/src/components/app/HomeScreen.tsx`
  Purpose: legacy source of current homepage logic; use only as a behavior reference during migration.

### New frontend files

- `/Users/syam/Downloads/myig-main/src/components/app/PremiumHomePage.tsx`
  Purpose: route-level homepage composition using the restored premium sections.
- `/Users/syam/Downloads/myig-main/src/components/app/PremiumPageShell.tsx`
  Purpose: shared wrapper for inner pages so results/saved/account/analytics inherit the premium visual system consistently.

### Tests to create or expand

- `/Users/syam/Downloads/myig-main/src/test/premiumHomePage.test.tsx`
  Purpose: prove the restored homepage sections render at `/` and the hero remains functional.
- `/Users/syam/Downloads/myig-main/src/test/heroAnalytics.test.tsx`
  Purpose: preserve URL submit, screenshot upload/paste, Instagram chooser, and analytics behavior when `HeroSection` becomes the real homepage entry again.
- `/Users/syam/Downloads/myig-main/src/test/searchResults.test.tsx`
  Purpose: verify the premium restyle keeps item selection/comparison behavior intact.
- `/Users/syam/Downloads/myig-main/src/test/accountScreen.test.tsx`
  Purpose: verify account actions still work after the premium restyle.
- `/Users/syam/Downloads/myig-main/src/test/analyticsPage.test.tsx`
  Purpose: verify analytics gating and rendering still work after the premium restyle.
- `/Users/syam/Downloads/myig-main/src/test/navbarNavigation.test.tsx`
  Purpose: verify nav/logo interactions keep returning to the restored homepage sections.

## Chunk 1: Restore the Premium Homepage at `/`

### Task 1: Add a route-level premium homepage composition

**Files:**
- Create: `/Users/syam/Downloads/myig-main/src/components/app/PremiumHomePage.tsx`
- Test: `/Users/syam/Downloads/myig-main/src/test/premiumHomePage.test.tsx`

- [ ] **Step 1: Write the failing homepage composition test**

```tsx
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import PremiumHomePage from "@/components/app/PremiumHomePage";

it("renders the restored premium homepage sections", () => {
  render(
    <MemoryRouter>
      <PremiumHomePage />
    </MemoryRouter>,
  );

  expect(screen.getByText(/find the/i)).toBeInTheDocument();
  expect(screen.getByText(/how it works/i)).toBeInTheDocument();
  expect(screen.getByText(/your style board/i)).toBeInTheDocument();
  expect(screen.getByText(/transparent by design/i)).toBeInTheDocument();
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test -- src/test/premiumHomePage.test.tsx`
Expected: FAIL because `PremiumHomePage.tsx` does not exist yet.

- [ ] **Step 3: Create the minimal homepage composition**

```tsx
import HeroSection from "@/components/HeroSection";
import HowItWorks from "@/components/HowItWorks";
import StyleBoardSection from "@/components/StyleBoardSection";
import ComplianceSection from "@/components/ComplianceSection";
import Footer from "@/components/Footer";

const PremiumHomePage = () => (
  <>
    <HeroSection />
    <HowItWorks />
    <StyleBoardSection />
    <ComplianceSection />
    <Footer />
  </>
);
```

- [ ] **Step 4: Re-run the homepage composition test**

Run: `npm run test -- src/test/premiumHomePage.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/app/PremiumHomePage.tsx src/test/premiumHomePage.test.tsx
git commit -m "feat: restore premium homepage composition"
```

### Task 2: Switch the `/` route back to the premium homepage

**Files:**
- Modify: `/Users/syam/Downloads/myig-main/src/pages/Index.tsx`
- Modify: `/Users/syam/Downloads/myig-main/src/test/premiumHomePage.test.tsx`

- [ ] **Step 1: Add a failing route-level test**

```tsx
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Index from "@/pages/Index";

it("uses the premium homepage on the default route", () => {
  render(
    <MemoryRouter>
      <Index />
    </MemoryRouter>,
  );

  expect(screen.getByText(/how it works/i)).toBeInTheDocument();
  expect(screen.queryByText(/searchoutfit for iphone/i)).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Run the route-level test**

Run: `npm run test -- src/test/premiumHomePage.test.tsx`
Expected: FAIL because `Index.tsx` still renders `HomeScreen`.

- [ ] **Step 3: Replace the route source**

```tsx
import Navbar from "@/components/Navbar";
import PremiumHomePage from "@/components/app/PremiumHomePage";

const Index = () => (
  <div className="min-h-screen bg-background">
    <Navbar />
    <PremiumHomePage />
  </div>
);
```

- [ ] **Step 4: Re-run the route-level homepage test**

Run: `npm run test -- src/test/premiumHomePage.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/pages/Index.tsx src/test/premiumHomePage.test.tsx
git commit -m "feat: route homepage back to premium landing page"
```

## Chunk 2: Port Current Home Behavior into the Premium Hero

### Task 3: Preserve current hero input behavior inside `HeroSection`

**Files:**
- Modify: `/Users/syam/Downloads/myig-main/src/components/HeroSection.tsx`
- Reference only: `/Users/syam/Downloads/myig-main/src/components/app/HomeScreen.tsx`
- Test: `/Users/syam/Downloads/myig-main/src/test/heroAnalytics.test.tsx`

- [ ] **Step 1: Add failing tests for current homepage behavior on the premium hero**

Add or update tests to cover:

```tsx
it("submits an Instagram URL from the premium hero");
it("shows the Instagram multi-photo chooser when multiple images are extracted");
it("lets the user pick a specific Instagram slide from the chooser");
it("tracks screenshot_pasted when an image is pasted into the hero");
it("persists the selected market from the premium hero");
```

- [ ] **Step 2: Run the targeted hero test file**

Run: `npm run test -- src/test/heroAnalytics.test.tsx`
Expected: FAIL on the behaviors that still only exist in `HomeScreen`.

- [ ] **Step 3: Port the missing behavior from `HomeScreen` into `HeroSection`**

Minimum feature set to preserve:

```tsx
// preserve
- buildInstagramSelectionUrl()
- getRequestedInstagramImageIndex()
- pendingInstagramSelection dialog flow
- finalizeInstagramAnalysis()
- screenshot upload + screenshot paste
- CountrySelect state + persistPreferredMarket()
- fireAndForgetAnalyticsEvent() calls
```

Implementation rule:
- `HeroSection` becomes the functional source of truth
- `HomeScreen` is no longer allowed to be the only place a critical homepage behavior exists

- [ ] **Step 4: Re-run the targeted hero tests**

Run: `npm run test -- src/test/heroAnalytics.test.tsx`
Expected: PASS

- [ ] **Step 5: Re-run chooser-specific regression tests**

Run: `npm run test -- src/test/extractInstagramHelpers.test.ts src/test/homeScreen.test.tsx src/test/heroAnalytics.test.tsx`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/components/HeroSection.tsx src/test/heroAnalytics.test.tsx
git commit -m "feat: preserve homepage search behavior in premium hero"
```

### Task 4: Remove homepage-only dependency on `HomeScreen`

**Files:**
- Modify: `/Users/syam/Downloads/myig-main/src/components/app/HomeScreen.tsx`
- Modify: `/Users/syam/Downloads/myig-main/src/test/homeScreen.test.tsx`

- [ ] **Step 1: Decide the minimal legacy posture**

Choose one:
- keep `HomeScreen` as a legacy/internal component with no route ownership
- or reduce it to a thin wrapper around the new premium homepage behavior

Recommended:
- keep it temporarily as a non-route legacy file until the visual migration is complete

- [ ] **Step 2: Update tests so they no longer assume `HomeScreen` owns `/`**

Run: `npm run test -- src/test/homeScreen.test.tsx`
Expected: adjust or retire route-specific assertions that no longer match the homepage.

- [ ] **Step 3: Commit**

```bash
git add src/components/app/HomeScreen.tsx src/test/homeScreen.test.tsx
git commit -m "refactor: remove homepage route dependence on HomeScreen"
```

## Chunk 3: Create the Shared Premium Shell for Inner Pages

### Task 5: Add a reusable premium inner-page shell

**Files:**
- Create: `/Users/syam/Downloads/myig-main/src/components/app/PremiumPageShell.tsx`
- Modify: `/Users/syam/Downloads/myig-main/src/test/navbarNavigation.test.tsx`

- [ ] **Step 1: Write the failing shell usage test**

```tsx
it("renders a premium shell heading area with consistent back navigation and width", () => {
  render(
    <PremiumPageShell eyebrow="Saved" title="Saved Products">
      <div>content</div>
    </PremiumPageShell>,
  );

  expect(screen.getByText(/saved products/i)).toBeInTheDocument();
  expect(screen.getByRole("link", { name: /back to home/i })).toBeInTheDocument();
});
```

- [ ] **Step 2: Run the shell test**

Run: `npm run test -- src/test/navbarNavigation.test.tsx`
Expected: FAIL because `PremiumPageShell.tsx` does not exist yet.

- [ ] **Step 3: Implement the shell**

```tsx
type PremiumPageShellProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  children: React.ReactNode;
};

const PremiumPageShell = ({ eyebrow, title, description, children }: PremiumPageShellProps) => (
  <section className="min-h-[calc(100vh-4rem)] bg-background px-6 pb-20 pt-28">
    <div className="mx-auto max-w-6xl">
      <Link to="/" className="...">Back to home</Link>
      {eyebrow ? <p className="...">{eyebrow}</p> : null}
      <h1 className="...">{title}</h1>
      {description ? <p className="...">{description}</p> : null}
      <div className="mt-10">{children}</div>
    </div>
  </section>
);
```

- [ ] **Step 4: Re-run the shell/navigation test**

Run: `npm run test -- src/test/navbarNavigation.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/app/PremiumPageShell.tsx src/test/navbarNavigation.test.tsx
git commit -m "feat: add shared premium page shell"
```

## Chunk 4: Restyle Results Without Breaking Comparison Behavior

### Task 6: Restyle `SearchResults` into the premium shell

**Files:**
- Modify: `/Users/syam/Downloads/myig-main/src/pages/SearchResults.tsx`
- Test: `/Users/syam/Downloads/myig-main/src/test/searchResults.test.tsx`

- [ ] **Step 1: Add a failing test that locks in current behavior under the new shell**

```tsx
it("keeps detected item selection and exact match comparison visible after the premium restyle", async () => {
  renderResultsPageWithData();
  expect(screen.getByRole("button", { name: /urban warrior oversized t-shirt/i })).toBeInTheDocument();
  expect(screen.getByText(/closest match/i)).toBeInTheDocument();
});
```

- [ ] **Step 2: Run the targeted results test**

Run: `npm run test -- src/test/searchResults.test.tsx`
Expected: FAIL after introducing shell expectations, before the restyle is implemented.

- [ ] **Step 3: Apply premium styling**

Rules:
- keep all existing data/state logic intact
- wrap the page in `PremiumPageShell`
- migrate spacing, typography, cards, and comparison blocks to the homepage’s premium language
- preserve:
  - item chip selection
  - merchant comparison rows
  - save/remove interactions
  - country selector behavior

- [ ] **Step 4: Re-run the results test suite**

Run: `npm run test -- src/test/searchResults.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/pages/SearchResults.tsx src/test/searchResults.test.tsx
git commit -m "feat: restyle results into premium app shell"
```

## Chunk 5: Restyle Saved, Account, Analytics, and Navbar

### Task 7: Restyle `Saved` into the premium shell

**Files:**
- Modify: `/Users/syam/Downloads/myig-main/src/pages/Saved.tsx`
- Test: `/Users/syam/Downloads/myig-main/src/test/searchResults.test.tsx`

- [ ] **Step 1: Add a failing expectation for the saved-page premium shell**

```tsx
it("shows saved products inside the premium shell while keeping sync prompts intact");
```

- [ ] **Step 2: Run the relevant test(s)**

Run: `npm run test -- src/test/searchResults.test.tsx`
Expected: FAIL on new shell expectations or missing sync prompt placement.

- [ ] **Step 3: Implement the saved-page premium shell**

Requirements:
- keep saved sync and auth dialog behavior intact
- preserve “No saved products yet”
- align buttons/cards with the premium homepage system

- [ ] **Step 4: Re-run tests**

Run: `npm run test -- src/test/searchResults.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/pages/Saved.tsx
git commit -m "feat: restyle saved page into premium shell"
```

### Task 8: Restyle `AccountScreen` and `AnalyticsPage`

**Files:**
- Modify: `/Users/syam/Downloads/myig-main/src/components/app/AccountScreen.tsx`
- Modify: `/Users/syam/Downloads/myig-main/src/pages/AnalyticsPage.tsx`
- Test: `/Users/syam/Downloads/myig-main/src/test/accountScreen.test.tsx`
- Test: `/Users/syam/Downloads/myig-main/src/test/analyticsPage.test.tsx`

- [ ] **Step 1: Add failing assertions for the premium wrapper**

```tsx
it("renders account actions inside the premium shell without losing sign-out/delete behavior");
it("renders analytics inside the premium shell without changing admin gating");
```

- [ ] **Step 2: Run the account and analytics tests**

Run: `npm run test -- src/test/accountScreen.test.tsx src/test/analyticsPage.test.tsx`
Expected: FAIL on shell/layout expectations before the restyle.

- [ ] **Step 3: Apply premium styling while preserving actions**

Requirements:
- account:
  - sign out still works
  - delete account still works
  - signed-in/out states still render correctly
- analytics:
  - admin gating remains authoritative
  - totals, last-24h, and recent events remain visible to allowed users only

- [ ] **Step 4: Re-run account and analytics tests**

Run: `npm run test -- src/test/accountScreen.test.tsx src/test/analyticsPage.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/app/AccountScreen.tsx src/pages/AnalyticsPage.tsx src/test/accountScreen.test.tsx src/test/analyticsPage.test.tsx
git commit -m "feat: restyle account and analytics into premium shell"
```

### Task 9: Align the global navbar to the restored premium system

**Files:**
- Modify: `/Users/syam/Downloads/myig-main/src/components/Navbar.tsx`
- Test: `/Users/syam/Downloads/myig-main/src/test/navbarNavigation.test.tsx`

- [ ] **Step 1: Add a failing nav test**

```tsx
it("uses the logo and top nav to return users to the restored premium homepage sections");
```

- [ ] **Step 2: Run the nav test**

Run: `npm run test -- src/test/navbarNavigation.test.tsx`
Expected: FAIL on old/new nav mismatch.

- [ ] **Step 3: Restyle the navbar**

Requirements:
- keep account/saved/auth state behavior intact
- logo routes home
- top nav feels premium again
- avoid reintroducing the removed “Find a Look” nav CTA

- [ ] **Step 4: Re-run nav tests**

Run: `npm run test -- src/test/navbarNavigation.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/Navbar.tsx src/test/navbarNavigation.test.tsx
git commit -m "feat: align navbar with premium frontend restoration"
```

## Chunk 6: Final Regression, Cleanup, and Release

### Task 10: Remove stale copy and polish cross-page consistency

**Files:**
- Modify as needed:
  - `/Users/syam/Downloads/myig-main/src/components/HowItWorks.tsx`
  - `/Users/syam/Downloads/myig-main/src/components/StyleBoardSection.tsx`
  - `/Users/syam/Downloads/myig-main/src/components/ComplianceSection.tsx`
  - `/Users/syam/Downloads/myig-main/src/components/Footer.tsx`

- [ ] **Step 1: Audit homepage copy for outdated brand/function claims**

Check for:
- legacy OutfitLink/Find Fit references
- stale saved-items copy
- stale compliance wording
- duplicated CTA language that conflicts with the restored homepage

- [ ] **Step 2: Make minimal copy/polish fixes**

Rule:
- preserve the old structure and feel
- do not rewrite the homepage concept
- only fix inconsistencies that conflict with SearchOutfit’s current product behavior

- [ ] **Step 3: Run homepage/legal regression tests**

Run: `npm run test -- src/test/premiumHomePage.test.tsx src/test/legalDisclosures.test.tsx src/test/seoEntryHtml.test.ts`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/components/HowItWorks.tsx src/components/StyleBoardSection.tsx src/components/ComplianceSection.tsx src/components/Footer.tsx
git commit -m "chore: polish restored premium homepage copy and consistency"
```

### Task 11: Full verification and deployment

**Files:**
- No new files; verify entire app

- [ ] **Step 1: Run the targeted restoration regression pack**

Run:

```bash
npm run test -- src/test/premiumHomePage.test.tsx src/test/heroAnalytics.test.tsx src/test/navbarNavigation.test.tsx src/test/searchResults.test.tsx src/test/accountScreen.test.tsx src/test/analyticsPage.test.tsx
```

Expected: PASS

- [ ] **Step 2: Run the full suite**

Run:

```bash
npm test
```

Expected: PASS

- [ ] **Step 3: Build production assets**

Run:

```bash
npm run build
```

Expected: build succeeds with no production-blocking errors

- [ ] **Step 4: Deploy the frontend**

Run:

```bash
npm run cf:deploy
```

If `npm run cf:deploy` is unavailable, use the project’s established Cloudflare Pages deploy command.

- [ ] **Step 5: Smoke test production**

Check:
- `/`
- `/results` from a fresh search
- Instagram multi-photo chooser
- `/saved`
- `/account`
- `/analytics` as allowed user

- [ ] **Step 6: Final commit**

```bash
git add src docs
git commit -m "feat: restore premium SearchOutfit frontend across app"
```

