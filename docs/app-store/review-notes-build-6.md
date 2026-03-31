# SearchOutfit App Review Notes for Build 1.0.0 (6)

Copy this into the App Review notes field for the current submission.

SearchOutfit helps users find outfit matches from public Instagram posts and uploaded screenshots or photos.

Review flow:

1. Launch the app on iPhone.
2. On the home screen, paste a public Instagram post URL or upload an outfit screenshot/photo.
3. Guest users can complete 3 searches.
4. After 3 guest searches, the app asks the user to sign in with an email magic link.
5. Signed-in users can continue searching without limits.

Login methods in this build:

- Email magic link only
- No Google login
- No Facebook login
- No Sign in with Apple button is shown in this build because no third-party login provider is offered

Account deletion:

- Path: Home -> profile icon -> Account -> Delete account
- Deletion is initiated inside the app and removes the account, saved items, and search access history

Permissions:

- Camera access is used only for taking outfit photos to analyze
- Photo library access is used only for selecting screenshots or outfit photos to analyze

Other notes:

- This build is iPhone only
- There are no paid features or in-app purchases in this build
- If a specific Instagram post cannot be extracted, screenshot upload is available as a fallback in the app
