# App Review Lessons

These are the recurring failure patterns we want to avoid on every new iOS app.

## Main Principle

You cannot guarantee zero rejections. You can materially reduce them by shipping a smaller, cleaner, fully working native product.

## BiB Lessons That Matter

### 1. WebView-first shells are high risk

Even when login, sharing, and push exist, Apple can still treat a WebView-first app as low functionality under minimum-functionality review.

Practical takeaway:

- if the app feels like a website inside a container, do not submit it
- core flows should feel native and self-contained

### 2. Broken auth creates immediate review risk

It is not enough to have auth options in the UI. Every visible auth option must work on a real device.

Practical takeaway:

- no broken Google button
- no broken Apple nonce flow
- no dead or hidden auth states
- if third-party auth exists, Sign in with Apple must exist too

### 3. Required personal data gets flagged fast

Apple will push back when non-essential profile data is required.

Practical takeaway:

- if DOB, gender, or profile extras are not required for core functionality, make them optional

### 4. Account deletion must be obvious

Apple expects deletion to be in-app and easy to find.

Practical takeaway:

- put account deletion in profile or settings
- describe the deletion path in review notes

### 5. Privacy docs drift easily

Privacy policy, App Privacy labels, and the actual build often diverge as product scope changes.

Practical takeaway:

- treat privacy docs as release-critical, not admin work
- update them every time features or data flows change

### 6. UGC safety must be complete

If the app has chat, social features, or user-generated content, safety tooling must be complete across all relevant contexts.

Practical takeaway:

- report and block must exist where interaction happens
- partial coverage is still review risk

### 7. Metadata drift causes avoidable problems

Screenshots, icon, age rating, and description must match the current build.

Practical takeaway:

- never submit with old screenshots
- never describe future features as if they ship today
- answer age rating honestly

### 8. Runtime drift can break review

If the build reviewers see is not the build you tested, you create avoidable uncertainty.

Practical takeaway:

- freeze app behavior during review
- do not keep pushing web or OTA changes into the same review window
- make sure the selected App Store Connect build is the exact one you tested

## Default Approval Strategy

For first launch, the safest strategy is:

- smaller scope
- native-feeling core flow
- complete auth
- complete settings
- complete deletion path
- accurate privacy posture

Everything else is secondary to reliability and reviewer clarity.

## Reviewer Cold-Start Rule

From a fresh install, a reviewer should be able to reach the main value of the app in under a minute without confusion.

That means:

- no broken screens
- no dead buttons
- no hidden required steps
- no ambiguous next action

## No Dead UI Rule

Do not ship any screen the reviewer can reach if it contains:

- placeholder buttons
- coming-soon sections
- empty broken states
- tabs that do nothing
- partially wired auth or purchase flows

## Working Operating Rule

Before every submission, ask:

`What is the smallest fully working native app we can honestly defend today?`

Submit that version, not the bigger roadmap version.
