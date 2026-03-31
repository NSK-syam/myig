# SearchOutfit TestFlight Notes for Build 1.0.0 (6)

Copy this into the internal TestFlight release notes field.

- Tighter iPhone-first home screen
- Better sign-in handoff back into the app
- More stable outfit analysis and clearer failure handling
- iPhone-only packaging for this release

Recommended internal test pass:

1. Fresh install from TestFlight on iPhone
2. Run 1 guest search with a public Instagram post
3. Run 1 guest search with an uploaded outfit screenshot or photo
4. Confirm guest limit still blocks after 3 total guest searches
5. Sign in with email magic link and confirm the callback returns to the app
6. Confirm signed-in searching continues without the guest limit
7. Open Account and verify sign out and Delete account still work
