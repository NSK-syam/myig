# SearchOutfit Premium Frontend Restoration Design

## Summary

Restore the previous richer SearchOutfit landing experience as the main homepage and use that older premium visual language as the source of truth for the rest of the app.

This is not a rollback of product behavior. The newer capabilities stay in place:

- Instagram extraction
- multi-photo Instagram chooser
- screenshot upload and paste
- country-aware shopping search
- auth and session persistence
- saved-product sync
- analytics tracking
- item-level product comparison

The goal is to bring back the previous polished, editorial frontend while preserving the current working product flows.

## Product Goals

- Make the homepage feel premium and explanatory again, with the older richer storytelling flow.
- Restore the hero, interactive imagery, and “How the app works” sequence users already preferred.
- Ensure the visual language feels consistent across homepage, results, saved, account, and analytics.
- Preserve all current search, auth, analytics, and comparison behavior.
- Avoid route changes and avoid rewriting core backend/search logic as part of this visual restoration.

## Confirmed Decisions

- The old richer homepage is the desired baseline, not the stripped-down current `HomeScreen`.
- The restored homepage should be the default `/` route.
- The homepage should include the old explanatory sections, including the interactive visual sections and the `How the app works` block with steps `1, 2, 3`.
- The premium styling should be applied across the whole app, not just the homepage.
- Current routes remain:
  - `/`
  - `/results`
  - `/saved`
  - `/account`
  - `/analytics`
  - legal/auth support routes
- Current product logic and backend integrations must remain intact.

## Non-Goals

- Rebuilding the app from scratch.
- Changing the search backend architecture.
- Replacing current results logic with a new product concept.
- Reworking navigation or route structure beyond restoring the homepage and aligning the app shell.
- Changing quotas, auth model, or analytics model as part of this design.

## Current State

### Homepage

The current homepage route `/` renders:

- `Navbar`
- `HomeScreen`

`HomeScreen` is more utility-first and task-oriented, but it removed the older richer visual storytelling and premium explanatory flow.

### Older Premium Frontend Still Present in Repo

The previous visual system is still largely represented by existing components:

- `HeroSection`
- `HowItWorks`
- `StyleBoardSection`
- `ComplianceSection`

These components are the correct foundation for restoration.

### Inner Pages

The current inner pages still contain the current product logic:

- `SearchResults`
- `Saved`
- `AccountScreen`
- `AnalyticsPage`

These should keep their current functionality, but their visual style should be migrated toward the older premium system.

## User Experience Goals

### Homepage Experience

The homepage should again explain the product clearly before asking users to act:

- what SearchOutfit is
- how it works
- why it is useful
- what happens after submitting a link or screenshot
- what saved items and sign-in unlock
- what trust/data boundaries exist

The hero remains the main action area, but the page should also provide enough explanatory context for new users who are not yet ready to paste a link immediately.

### Search Flow

Users should still be able to:

- paste a public Instagram post link
- paste an image URL
- upload a screenshot
- paste a screenshot
- choose a country
- choose a specific image from a multi-photo Instagram post

That behavior should continue to originate from the homepage hero area, now inside the restored premium homepage rather than the current `HomeScreen`.

### Results Experience

Results should continue to support:

- outfit summary
- detected items
- item selection
- exact-match comparison focus
- merchant comparison fields
- saving products

But the page should visually feel like part of the premium homepage system rather than a separate utility app.

## Architecture

## Frontend Structure

### Homepage Composition

`/` should render a composed premium homepage built from:

- `Navbar`
- `HeroSection`
- `HowItWorks`
- `StyleBoardSection`
- `ComplianceSection`
- footer/legal links as needed

This becomes the source of truth for the brand experience.

### Hero as Functional Entry Point

`HeroSection` should become the functional input surface for the homepage and inherit the behavior currently proven in `HomeScreen`.

That means `HeroSection` must preserve or absorb:

- URL submission flow
- Instagram extraction flow
- screenshot upload flow
- screenshot paste flow
- country selector state
- analytics event firing
- multi-photo chooser flow
- navigation to `/results`

The old premium hero visuals stay, but they must be powered by the current working logic.

### De-emphasize `HomeScreen`

`HomeScreen` should stop being the route-level homepage source of truth.

It may be:

- reduced to a legacy/internal component
- partially mined for logic patterns
- or removed later if no longer needed

But it should not remain the primary homepage renderer once restoration is complete.

### Shared Premium App Shell

A shared visual system should be extracted from the restored homepage and applied across inner pages:

- ivory/warm backgrounds
- serif/editorial headline treatment where appropriate
- gold accent usage
- softer borders and larger radii
- more spacious section framing
- premium chip/button treatment

This should be implemented through reusable class conventions and shared component styling, not duplicated per page.

### Inner Page Mapping

#### Results

Keep all current logic in `SearchResults`, but restyle:

- page header
- source image panel
- summary blocks
- detected item chips
- exact match card
- merchant comparison list/cards

#### Saved

Keep saved-product logic and syncing, but restyle the page to match the restored homepage system.

#### Account

Keep auth/account actions intact, but visually align the page with the premium shell.

#### Analytics

Keep existing restricted analytics functionality, but visually align it with the same system.

## Data Flow

### Homepage Search Submission

The restored homepage hero should continue to support this flow:

1. user submits Instagram URL / image URL / screenshot
2. app validates input
3. app fires analytics events
4. if Instagram post has multiple images:
   - show chooser dialog
   - user selects one image
5. analyze selected image
6. navigate to `/results` with:
   - analysis result
   - selected/derived image URL
   - source URL or filename
   - selected market

### Results Flow

Results flow remains unchanged in behavior:

1. results page receives analysis + image context
2. product search runs
3. products are grouped and ranked
4. user selects a detected item
5. exact-match/comparison view focuses on that item
6. user can save or open merchant links

### Saved/Auth/Analytics

No changes to the functional data model are required for this redesign.

## Error Handling

Visual restoration must not hide or weaken existing error states.

The following behaviors remain required:

- invalid or missing Instagram extraction shows clear feedback
- non-fashion images still show a specific non-fashion message
- carousel selection errors remain recoverable
- sign-in failures still surface clearly
- search provider outages still surface as unavailable states rather than broken UI

Error presentation can be visually improved, but existing logic should not be removed unless replaced with equivalent or better behavior.

## Testing Strategy

This redesign should be implemented in stages.

### Stage 1: Homepage Restoration

Tests should prove:

- `/` renders the restored old homepage sections again
- homepage still supports:
  - Instagram URL submission
  - screenshot upload
  - screenshot paste
  - country selection
  - multi-photo chooser

### Stage 2: Shared Styling Migration

Tests should prove:

- results logic still works
- saved items still work
- account actions still work
- analytics access still works

Visual migration should not break route behavior or state handoff.

### Stage 3: Regression Verification

Run:

- targeted homepage tests
- targeted chooser tests
- targeted auth callback tests
- targeted saved-product tests
- full test suite
- production build

## Rollout Plan

### Phase 1

Restore `/` to the premium old homepage composition.

### Phase 2

Port current `HomeScreen` behavior into `HeroSection` and ensure feature parity.

### Phase 3

Restyle `SearchResults` to match the restored homepage visual system.

### Phase 4

Restyle `Saved`, `Account`, and `Analytics` into the same shell.

### Phase 5

Final polish pass on navigation, spacing, and consistency.

## Risks

### Logic Regressions During Visual Migration

The largest risk is accidentally losing newer product behavior when moving from `HomeScreen` back to `HeroSection`.

Mitigation:

- preserve current behavior as the source of truth
- port logic incrementally
- test before and after the swap

### Partial Visual Consistency

If only the homepage is restored but inner pages are not updated, the product will still feel split between “marketing site” and “utility app.”

Mitigation:

- explicitly treat this as an app-wide premium styling migration

### Over-Restoration

Blindly restoring old code could reintroduce outdated copy, old branding, or obsolete assumptions.

Mitigation:

- restore the visual system and page structure
- keep current SearchOutfit branding, legal disclosures, auth model, and backend behaviors

## Recommendation

Proceed with a conservative restoration:

- restore the old homepage structure and visuals exactly enough to bring back the preferred premium experience
- keep the new product behavior intact
- then bring the rest of the app visually into that same premium shell

This gives the user the previous frontend they want without discarding the product improvements already made.
