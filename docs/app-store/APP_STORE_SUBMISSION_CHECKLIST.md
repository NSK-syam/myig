# App Store Submission Checklist

Use this before every iOS submission. The goal is not to guarantee approval. The goal is to remove obvious review risk before Apple sees the build.

## Hard Rules

- Do not ship a WebView-first shell.
- Do not require personal data unless it is essential.
- Do not expose a broken login button.
- Do not submit a build you have not tested on both iPhone and iPad if iPad is supported.
- Do not keep deploying OTA or web behavior changes during review.

## Product Shape

- Core experience must feel native, not like a wrapped website.
- Main user loop must work without the user feeling dropped into a browser container.
- Navigation, loading states, auth, settings, and account management should be native-feeling and complete.
- If web content exists, keep it secondary.

## Authentication

- If the app offers Google, Facebook, or any third-party login on iOS, also offer Sign in with Apple.
- Sign in with Apple must appear anywhere equivalent third-party login appears.
- Every visible auth option must work end to end on a real device.
- Email login, signup, and password reset must work if they are shown in the UI.
- Review screenshots and review notes must match the exact auth UI in the submitted build.
- No placeholder auth buttons.

## Personal Data

- Only require fields essential to core functionality.
- Mark everything non-essential as optional.
- Typical fields that should usually be optional:
  - date of birth
  - gender
  - marital status
  - profile extras
- Privacy policy and UI copy must clearly reflect what is optional.

## Account Deletion

- If users can create an account, they must be able to start deletion inside the app.
- The deletion entry point should be easy to find in account, profile, or settings.
- Do not force support email as the only deletion path unless the category requires it.
- If Sign in with Apple exists, revoke Apple tokens during deletion where applicable.
- Delete user-linked data unless there is a legal retention requirement.
- Put the exact deletion path in App Review notes.

## Privacy And Legal

- Privacy policy must be live and accurate.
- App Privacy answers in App Store Connect must match the shipped build exactly.
- Support URL must work.
- Privacy Policy and Terms links should be reachable from signup and account areas where appropriate.
- If tracking is not used, answer tracking questions as `No`.

## UGC, Social, And Chat Safety

If the app includes user-generated content, messaging, or social features, it should include:

- in-app block user
- in-app report user
- in-app report content or message
- moderation or objectionable-content handling
- support/contact path
- consistent enforcement across all user surfaces

## Metadata

- App name is clear and truthful.
- Subtitle is specific and accurate.
- Description matches the current build, not future plans.
- Promotional text does not promise missing features.
- Category is accurate.
- Age rating answers reflect actual app behavior.
- Screenshots match the current UI, icon, and flow.
- If iPad is supported, include iPad screenshots.

## Runtime And Release Management

- Freeze behavior during review.
- Do not keep shipping web or OTA changes that can change reviewer experience.
- If using OTA updates, lock the review build to the embedded JS or use a runtime policy that prevents drift.
- The selected App Store Connect build must be the exact build tested on device.

## QA Matrix

Run this on physical devices:

- at least one iPhone
- at least one iPad if iPad is supported

For each device, test:

- fresh install
- launch
- signup
- login
- Sign in with Apple if present
- every other visible login method
- password reset if present
- main navigation
- core user loop
- save/remove core entity
- account deletion
- logout
- kill and relaunch
- offline or bad-network behavior
- deep links if used
- external links

## Review Packet

Prepare before submission:

- review account credentials if needed
- exact steps to reach the main feature
- exact steps to delete account
- exact statement of which login methods exist
- physical-device screen recording
- region-specific notes if behavior varies by region
- explicit statement if no paid features exist

## Native MVP Bias

For first launch, the lowest-risk scope is:

- native auth
- native core feed/list
- native detail screen
- native save/favorites
- native profile/settings/delete account

Defer until after approval if needed:

- chat
- groups
- social graph
- non-essential sharing layers
- complex hybrid web/native flows

## Blockers

Do not submit if any of these are true:

- app is mostly a WebView shell
- any visible login button is broken
- account deletion is missing or hidden
- non-essential personal data is required
- App Privacy answers are guesses
- screenshots do not match the build
- iPad is supported but untested
- current build differs from review recording
- OTA can change review behavior after upload
- chat or UGC exists without report and block controls

## Final Gate

Use this final yes/no pass:

- Native-first app, not a site wrapper
- Apple and any third-party login both work
- No broken auth states
- Non-essential personal data is optional
- Delete account exists inside the app
- Apple token revocation is implemented if needed
- Report and block tools exist if UGC exists
- Privacy policy matches real data collection
- App Privacy labels match real data collection
- Screenshots match the current build
- iPad is tested if supported
- Review build is frozen
- Review notes are explicit
- Physical-device recording is attached
