# SearchOutfit iOS Release Checklist

Reference docs:

- [App Store submission gate](./APP_STORE_SUBMISSION_CHECKLIST.md)
- [App review lessons](./APP_REVIEW_LESSONS.md)
- [Build 6 review notes](./review-notes-build-6.md)
- [Build 6 TestFlight notes](./testflight-notes-build-6.md)
- [Build 6 app privacy draft](./app-privacy-build-6.md)

## Current project state

- Bundle ID: `com.searchoutfit.ios`
- Marketing version: `1.0.0`
- Build number: `6`
- Supported iOS deployment target: `14.0`
- Device support: `iPhone only`
- Native plugins in use:
  - `@capacitor/app`
  - `@capacitor/camera`

## Before App Store Connect upload

1. Set the real Apple Developer team in Xcode.
2. Confirm the app icon in [`AppIcon.appiconset`](../../ios/App/App/Assets.xcassets/AppIcon.appiconset/Contents.json) is the final production icon.
3. Confirm splash assets in [`Splash.imageset`](../../ios/App/App/Assets.xcassets/Splash.imageset/Contents.json) are final.
4. Bump `MARKETING_VERSION` and `CURRENT_PROJECT_VERSION` in [`project.pbxproj`](../../ios/App/App.xcodeproj/project.pbxproj) for each new App Store submission.
5. Set `APPLE_TEAM_ID=<your_team_id>` in the shell before archiving, or replace `YOUR_TEAM_ID` in [`export-options-app-store.plist`](./export-options-app-store.plist).
6. Verify the live app points to the production Supabase project and auth redirect URL.
7. Re-run:
   - `npm run test`
   - `npm run build:ios`
8. Archive and export with:
   - `APPLE_TEAM_ID=<your_team_id> npm run archive:ios`

## App Store Connect metadata to fill

- App name
- Subtitle
- Keywords
- Description
- Privacy policy URL
- Support URL
- Marketing URL (optional)
- Age rating questionnaire
- App privacy nutrition labels

## Screenshots required

- iPhone 6.9" display set
- iPhone 6.5" display set

Recommended first screenshot set:

1. Home screen with Instagram URL and upload actions
2. Search result/product match screen
3. Saved items screen
4. Account/sign-in screen

## TestFlight pass

1. Install build `1.0.0 (6)` on a physical iPhone.
2. Verify:
   - photo upload permission flow
   - Instagram URL analysis flow
   - guest limit at 3 searches
   - sign-in unlocks unlimited search access
   - account deletion still works
3. Confirm the app opens from the Home Screen and auth callbacks return to the app, not the browser.
4. Confirm the current build is assigned to the internal TestFlight group.
4. Add release notes for testers.

## Submission pass

1. Complete App Review contact info.
2. Fill demo account details if review requires one.
3. Answer export compliance questions.
4. Attach screenshots and app preview if available.
5. Submit for review.
