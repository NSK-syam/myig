# App Store Connect Template

Draft metadata for the current SearchOutfit iPhone release.

## Core listing

- App name: SearchOutfit
- Subtitle: Find outfit matches from Instagram and photos
- Primary category: Shopping
- Secondary category: Lifestyle
- Keywords: outfit finder, fashion search, instagram outfit, style match, clothing search, shopping

## Support links

- Privacy policy URL: https://find-fit-app.pages.dev/privacy
- Support URL: https://find-fit-app.pages.dev/
- Marketing URL: https://find-fit-app.pages.dev/

## Description

SearchOutfit helps you find clothing matches from the looks you discover online.

Paste a public Instagram post URL or upload a screenshot or photo, and SearchOutfit analyzes the outfit and shows product matches you can shop.

Use SearchOutfit to:
- paste a public Instagram post and pull the look into the app
- upload screenshots or photos from your camera roll
- browse outfit matches from multiple stores
- save favorites after you sign in

The app starts with 3 guest searches. After that, sign in to keep searching without limits.

## What’s New

Improved iPhone release with a tighter mobile home screen, better auth handoff back into the app, and more stable outfit analysis handling.

## Review notes

Review flow:
- guest users can complete 3 searches
- after 3 guest searches, the app asks the user to sign in
- signed-in users can continue searching without limits
- login method in this build: email magic link only
- there are no paid features or in-app purchases in this build

Account deletion:
- path: Home -> profile icon -> Account -> Delete account
- deleting the account removes the account, saved items, and search access history

Testing notes:
- this build is iPhone only
- please test with a public Instagram post URL or an outfit screenshot/photo
- if Instagram extraction fails for a specific post, screenshot upload remains available in the app

Permissions:
- camera access is used only for capturing outfit photos
- photo library access is used only for choosing screenshots or outfit images to analyze
