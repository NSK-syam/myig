# Search Outfit iOS V1 Design

## Summary

Convert the existing React/Vite outfit-search product into an App Store-ready iPhone app using Capacitor as the iOS shell. Reuse the current web frontend and Supabase-backed analysis/search functions, but redesign the product around a mobile-first flow with clear quota gating, Apple in-app subscriptions, and App Store compliance requirements.

This spec covers iPhone v1 only. It does not include Android, iPad-specific UX, web redesign beyond what is needed for the shared mobile app shell, or a full admin analytics product.

## Product Goals

- Let users identify outfit items from either an Instagram post URL or an uploaded screenshot/photo.
- Show product matches quickly with a focused mobile flow.
- Allow limited guest use before requiring signup.
- Convert signed-in users to monthly or yearly subscriptions after the signed-in free quota is exhausted.
- Ship an App Store-ready experience that is review-safe and operationally supportable.

## Confirmed V1 Decisions

- Platform: iPhone first, App Store-ready.
- App shell: Capacitor wrapping the current React codebase.
- Input methods on the first screen: Instagram URL and photo/screenshot upload, both visible immediately.
- Guest access: 3 free searches without an account.
- Signed-in free access: 5 searches after signup/sign-in.
- Monetization: Apple in-app subscriptions with monthly and yearly plans.
- Save/favorites: requires an account.
- Instagram support: dedicated URL input plus screenshot/photo upload fallback.

## Non-Goals

- Android app.
- Native SwiftUI rewrite.
- Social posting, creator tools, or faceless-video functionality.
- Desktop-first layout work unrelated to the shared iPhone app experience.
- Couponing, checkout, affiliate payout systems, or retailer integrations beyond linking out.
- Complex user-generated collections, social feeds, or style-board collaboration.

## User Personas

### Guest Explorer

Wants to try the app with minimal friction, usually from a screenshot or an Instagram link. Needs immediate value and low signup pressure.

### Registered Shopper

Wants more searches, saved items, and a persistent history across app reinstalls or device changes.

### Paying Subscriber

Uses the app repeatedly and expects quota limits to disappear or become effectively non-blocking while subscriptions stay active.

## User Experience Flow

### 1. Home

The app opens to a mobile-first home screen with:

- Instagram post URL input
- Photo/screenshot upload button
- Remaining search counter
- Short explanation of what the app does
- Clear primary action for each input type

The first screen must not force login. It should feel like an app, not a desktop landing page compressed onto a phone.

### 2. Search Submission

Users can start a search by:

- Pasting an Instagram post URL, which triggers Instagram extraction and then outfit analysis
- Uploading a local photo/screenshot, which triggers image upload and then outfit analysis

Before any backend search starts, the app checks access state:

- Guest with remaining quota: continue
- Guest with no remaining quota: show auth sheet
- Signed-in user with remaining quota: continue
- Signed-in user with no remaining quota and no active subscription: show paywall
- Active subscriber: continue

### 3. Results

The results screen shows:

- The analyzed source image
- Detected outfit items
- Product matches
- Save action for each product
- Open-retailer action for each product
- Search-state messaging when extraction, analysis, or visual search partially fails

The flow stays short. Results should not be buried under editorial sections or desktop-style marketing blocks.

### 4. Saving

Guests can view results but cannot save products. Tapping save as a guest opens auth. Signed-in users can save products to the existing saved-items system.

### 5. Limit Transitions

- Guest exhausts 3 searches: show auth sheet with clear copy about unlocking 5 signed-in searches.
- Signed-in user exhausts 5 searches: show paywall with monthly and yearly plans.
- Subscriber opens paywall manually from account: show current status, upgrade/restore controls, and plan comparison.

### 6. Account

The account screen includes:

- Sign in / sign up
- Current search entitlement state
- Active subscription status
- Restore purchases
- Sign out
- Delete account
- Links to privacy policy and terms

## Screen Inventory

### Home Screen

Primary consumer entry screen with both Instagram URL and upload entry points visible immediately. This replaces the current web-marketing-heavy homepage as the app default experience.

### Results Screen

Analysis and shopping output, optimized for narrow mobile layouts. This evolves the current `SearchResults` page into a phone-first screen.

### Saved Screen

Authenticated list of saved products. Existing saved-product logic is reused and tightened for mobile navigation.

### Account Screen

Settings, identity, entitlements, restore purchases, and account deletion.

### Paywall Screen

Monthly and yearly subscription plans using Apple in-app purchase, plus restore purchases and concise feature framing.

### Modal Sheets

- Auth sheet
- Search-limit sheet if needed as a separate presentation from auth/paywall
- Upload source picker if camera/photo-library choice is added

## Architecture

## Frontend Units

### Mobile App Shell

Capacitor iOS wrapper around the existing React app. Responsible for:

- iOS packaging
- native plugin access for photo selection and related device integrations
- handling app lifecycle and deep-link plumbing if needed later

### App Navigation Layer

Refactor routes and layout toward a mobile shell with:

- Home
- Results
- Saved
- Account

Marketing-only web sections become secondary or removed from the mobile app default path.

### Search Input Module

Encapsulates the two entry methods:

- Instagram URL validation and submission
- photo/screenshot selection and upload

This module owns only input gathering and handoff, not entitlement rules.

### Access and Entitlement Module

Single frontend source of truth for whether a search is allowed right now. It combines:

- guest quota state
- signed-in quota state
- subscription entitlement state

All user-facing gating decisions route through this module before analysis begins.

### Analysis and Results Module

Coordinates:

- Instagram extraction
- image upload
- outfit analysis
- product search
- mapping backend states to mobile-friendly loading/error UI

### Billing Module

Owns:

- fetching product offerings
- starting Apple purchase flows
- restoring purchases
- syncing purchase state into the app session

### Account Module

Owns:

- auth UI
- account status
- delete-account flow
- links to legal documents

## Backend Units

### Existing Analysis/Search Functions

Reuse these existing Supabase functions where possible:

- `extract-instagram`
- `upload-image`
- `analyze-outfit`
- `search-products`

They remain the functional core of the app.

### Access Service

A new backend capability is needed to answer:

- who is this user or guest
- how many searches remain
- can this request proceed
- when should a quota unit be consumed

This should be exposed as a focused API layer rather than scattered checks across multiple functions.

### Entitlement Sync Service

Stores and serves subscription state mirrored from Apple purchases so backend-enforced access can trust a durable entitlement record.

### User Data Service

Continues handling authenticated data such as saved products, while expanding to support account deletion and usage records.

## Data Model

### Guest Usage

V1 guest usage may start with on-device persistence plus a signed device/app instance identifier. The goal is lightweight enforcement, not perfect fraud prevention.

Required fields:

- local guest identifier
- searches used
- last updated timestamp

### Signed-In Usage

Must be server-side and tied to user identity so reinstalling the app does not reset access.

Required fields:

- user id
- free searches used
- free search limit
- current entitlement state
- updated at

### Subscription Entitlement

Required fields:

- user id
- active/inactive status
- product id
- renewal period type
- original purchase source
- expiration / renewal state
- updated at

### Search Attempt Tracking

Track enough metadata to audit access decisions and support customer support:

- actor id or guest id
- request type: instagram_url or image_upload
- request accepted/rejected
- rejection reason if blocked
- timestamps

## Quota and Billing Rules

### Guest Rule

Guests can run 3 searches. After that, new searches are blocked until signup/sign-in.

### Signed-In Free Rule

A signed-in user without an active subscription gets 5 searches. This quota is separate from guest usage and persists with the account.

### Subscription Rule

An active subscriber can continue searching after the signed-in free quota is exhausted. The implementation may treat this as unlimited access in v1.

### Consumption Rule

Consume quota when the backend accepts a search request for processing, not only when results succeed. This closes a straightforward abuse path where repeated retries would otherwise remain free.

Allowed exception: if the backend rejects the request before processing begins because of a verifiable internal fault, support logic may credit the usage back later.

### Purchase Options

- Monthly subscription
- Yearly subscription
- Restore purchases required

The app must not rely on web checkout for these in-app entitlements.

## Key Flows

### Instagram URL Flow

1. User pastes URL on Home.
2. App validates format locally.
3. App checks search entitlement.
4. If allowed, app sends URL to `extract-instagram`.
5. App uploads/normalizes the extracted image if needed.
6. App runs outfit analysis.
7. App runs product search.
8. App navigates to Results.

Failure cases:

- invalid URL
- extraction failure
- extraction succeeds but no usable image is returned
- downstream analysis/search failure

### Photo/Screenshot Flow

1. User opens upload flow.
2. App requests only the necessary photo access.
3. App checks search entitlement.
4. If allowed, app uploads the image.
5. App runs outfit analysis.
6. App runs product search.
7. App navigates to Results.

Failure cases:

- user denies permissions
- image upload failure
- analysis/search failure

### Save Flow

1. User taps save on a product.
2. If guest, open auth.
3. If signed in, persist saved product.
4. Update saved UI state optimistically where safe.

### Subscription Flow

1. User exhausts signed-in free searches or opens paywall manually.
2. App loads Apple products.
3. User selects monthly or yearly.
4. Purchase completes or fails.
5. App refreshes entitlement state.
6. User can continue searching.

### Restore Purchases Flow

1. User opens Account or Paywall.
2. Taps restore purchases.
3. Billing module refreshes Apple purchase history.
4. Backend entitlement state syncs.
5. UI updates with active/inactive status.

### Delete Account Flow

1. User opens Account.
2. Taps delete account.
3. App presents confirmation with clear consequences.
4. Backend deletes or anonymizes account-linked data per policy.
5. User session ends.

## Error Handling

### Home/Input Errors

- invalid Instagram URL
- unsupported image type
- missing network connectivity
- no searches remaining

### Processing Errors

- Instagram extraction failed
- upload failed
- analysis failed
- product search unavailable

The app should differentiate between:

- hard stop errors that prevent results
- partial-result warnings where outfit analysis succeeds but product search quality is degraded

### Billing Errors

- product metadata unavailable
- purchase cancelled
- purchase pending
- purchase verification/sync failure
- restore found no active purchases

### Account Errors

- auth failure
- session expired
- delete-account failure

Every failure state needs mobile-specific copy and retry behavior, not generic console-driven fallbacks.

## App Store and Policy Requirements

- Core search functionality must remain usable without login until guest quota is exhausted.
- Account deletion must be available inside the app if account creation is supported.
- Monthly and yearly plans must be implemented through Apple in-app purchase for iPhone app entitlements.
- Restore purchases must be present.
- Privacy policy and terms must be reachable inside the app.
- The app must request the minimum necessary photo permissions and continue offering non-photo paths where possible.

## Analytics

V1 app analytics should capture:

- home input method selected
- search started
- search blocked by guest limit
- search blocked by signed-in limit
- auth prompted
- auth completed
- paywall viewed
- purchase started
- purchase completed
- restore purchases attempted
- product opened
- product saved

This is product analytics only. The existing `/analytics` page is not part of the consumer iPhone experience.

## Testing Strategy

### Unit Tests

- input validation
- access decision logic
- quota transition logic
- paywall state mapping

### Integration Tests

- guest search flow
- guest limit to auth transition
- signed-in 5-search limit to paywall transition
- save flow with auth requirement
- restore purchases state refresh

### End-to-End Checks

- Instagram URL happy path
- photo upload happy path
- account signup/sign-in
- active subscription unlocking search access
- account deletion availability

### Release Verification

- iPhone layout sanity across current supported device sizes
- loading and empty states
- network failure handling
- legal links present
- purchase restore visible

## Implementation Sequence

1. Add Capacitor iOS shell and ensure current app runs as an iPhone app container.
2. Replace the current default homepage with a mobile-first Home screen exposing both input methods.
3. Introduce access-state plumbing and quota gating in frontend and backend.
4. Add signed-in usage persistence and guest usage tracking.
5. Add Apple subscription support for monthly/yearly plans and entitlement sync.
6. Build Account screen features required for App Store submission, including restore purchases and delete account.
7. Remove or hide consumer-irrelevant routes and desktop-oriented UI from the app shell.
8. Run mobile-focused verification and submission prep.

## Open Questions Intentionally Deferred

These are implementation details, not product blockers for this spec:

- exact subscription pricing
- whether guest quota also syncs server-side in v1 or remains device-local
- whether subscribers are strictly unlimited or simply assigned a very high cap internally
- whether camera capture is in v1 or only photo-library upload

These should be resolved during planning without changing the product contract defined here.
