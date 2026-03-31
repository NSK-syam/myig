# SearchOutfit App Privacy Draft for Build 1.0.0 (6)

Use this as the source of truth when answering App Privacy questions in App Store Connect for build `1.0.0 (6)`.

This is a draft based on the current code and privacy-policy copy in the repo. Re-check before final submission if behavior changes.

## Data types clearly present in the current build

### Contact Info

- Email Address
  - Purpose: account authentication and account management
  - Linked to user: Yes, for signed-in accounts
  - Used for tracking: No

### User Content

- Photos or Videos
  - Includes uploaded screenshots, outfit photos, and submitted public Instagram post images/links used to derive images
  - Purpose: core outfit analysis functionality
  - Linked to user: Yes when signed in, otherwise it may be associated with a guest/app token during processing
  - Used for tracking: No

### Identifiers

- User ID / account identifier
  - Purpose: sign-in state, saved items, account deletion, search access tracking
  - Linked to user: Yes
  - Used for tracking: No

### Usage Data

- Product Interaction
  - Current analytics events include link submissions, screenshot uploads/pastes, Instagram extract success, analysis completion, and product results loaded
  - Purpose: analytics and product improvement
  - Linked to user: Not obviously by account in the event payload, but conservatively treat as app usage data collected by the app
  - Used for tracking: No

## Data types not evidenced in the current build

Unless behavior changes before submission, the current code does not show clear collection of:

- precise location
- contacts
- health
- financial info
- browsing history across third-party apps/sites
- diagnostics SDKs like Sentry
- advertising identifiers or third-party tracking

## Tracking

- Current draft answer: `No`, the app does not appear to use tracking as defined by Apple

## Notes

- The privacy policy currently states that the app collects email auth data, analytics events, saved items, and submitted images
- If App Store Connect asks whether data is used for third-party advertising or data brokerage, current draft answer is `No`
- If analytics implementation changes before review, update this file and the App Privacy answers together
