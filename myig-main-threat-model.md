# SearchOutfit Threat Model

Date: 2026-03-31
Repository: `/Users/syam/Downloads/myig-main`

## Scope

This review covers the internet-facing SearchOutfit web app, its Supabase Edge Functions, public guest flows, image upload and proxy paths, Instagram extraction pipeline, analytics ingestion, and product search integrations.

## Assumptions

- Guest search flows are intentionally available to anonymous users, but only meant to be used through the SearchOutfit frontend.
- Cloudflare Pages preview URLs for this project are publicly reachable.
- This review is repo-grounded. It does not confirm runtime compromise or inspect production logs, database contents, or secret manager state.

## System Model

### Internet-facing entrypoints

- Frontend app on `searchoutfit.com` and `*.find-fit-app.pages.dev`
- Public/guest Supabase Edge Functions:
  - `issue-app-token`
  - `upload-image`
  - `extract-instagram`
  - `analyze-outfit`
  - `search-products`
  - `ingest-analytics`
  - `guest-access-state`
- Authenticated/admin Edge Functions:
  - `access-state`
  - `analytics-summary`
  - `delete-account`
  - `sync-entitlement`
- Public image fetch path:
  - `proxy-product-image`

### Sensitive assets

- Paid third-party API budget:
  - Anthropic
  - SerpApi
- Supabase service role capabilities
- Stored uploaded images and extracted Instagram image refs
- User data:
  - Supabase auth identities
  - saved products
  - subscription/search entitlement state
  - analytics events

### Trust boundaries

- Browser to Edge Functions
- Edge Functions to Supabase service-role client
- Edge Functions to third-party providers
- Edge Functions to arbitrary public merchant/image hosts

## Attacker Model

This review assumes an unauthenticated external attacker who can:

- send direct HTTP requests to public Edge Functions
- spoof `Origin` and related browser-like headers from a server
- repeatedly call public endpoints from their own infrastructure
- hotlink public URLs returned by the service

This review does **not** assume:

- stolen production secrets
- database shell access
- compromised deploy infrastructure

## Findings

### 1. Public app-token issuance can be abused off-site to consume paid APIs and compute

Severity: High

Files:

- `supabase/functions/issue-app-token/index.ts`
- `supabase/functions/_shared/security.ts`
- `supabase/functions/_shared/app-access.ts`
- `src/lib/appAccess.ts`

Why it matters:

- `issue-app-token` is intentionally public and only checks:
  - allowlisted origin
  - per-IP rate limiting
- downstream “protected” functions accept app tokens bound to:
  - client IP
  - origin
  - scope

That is not a browser-only control. A non-browser client can request a token directly, set `Origin: https://searchoutfit.com`, receive a valid token for its own IP, and then call all guest-protected functions from that same IP.

Relevant code:

- `issue-app-token` allows any request whose origin string matches the allowlist: `supabase/functions/issue-app-token/index.ts:32-38`
- token subject is just `clientIp`: `supabase/functions/issue-app-token/index.ts:96-103`
- token verification only checks signature, expiry, IP, origin, and scope: `supabase/functions/_shared/app-access.ts:259-299`
- frontend obtains these tokens automatically for all public scopes: `src/lib/appAccess.ts:108-147`

Impact:

- anonymous third parties can script your paid guest flows from outside your website
- third parties can burn:
  - SerpApi searches
  - Anthropic requests
  - storage
  - function invocations

Notes:

- I did not find evidence in the repo of a completed breach.
- I did find a confirmed design weakness that allows abuse.

### 2. `proxy-product-image` is a public unauthenticated fetch proxy

Severity: High

Files:

- `supabase/functions/proxy-product-image/index.ts`
- `supabase/functions/search-products/helpers.ts`

Why it matters:

`proxy-product-image`:

- accepts unauthenticated `GET`
- does not require app token or guest token
- does not rate limit
- fetches any public `http(s)` URL that passes `isProxySafePublicUrl`

Relevant code:

- no auth or rate limit before fetch: `supabase/functions/proxy-product-image/index.ts:17-90`
- safe-URL check only blocks local/private targets, not arbitrary public internet hosts: `supabase/functions/search-products/helpers.ts:161-174`

Impact:

- anyone can use this as a bandwidth and egress proxy
- attackers can hotlink your function as a generic image relay
- this can increase cost and degrade service quality

Notes:

- I did not find an internal-network SSRF from this path because localhost/private IPs are blocked.
- This is still an abuse surface even without internal SSRF.

### 3. Token signing falls back to the Supabase service role key

Severity: Medium

Files:

- `supabase/functions/_shared/security.ts`

Why it matters:

`getAppTokenSecret()` falls back to `SUPABASE_SERVICE_ROLE_KEY` when `SEARCHOUTFIT_APP_TOKEN_SECRET` is unset.

Relevant code:

- `supabase/functions/_shared/security.ts:32-41`

Impact:

- weak secret separation
- higher blast radius if token-signing logic is ever compromised
- operational mistakes involving token debugging/logging would expose a more privileged secret than necessary

This is not evidence of a breach. It is a containment and secret-hygiene problem.

### 4. Rate limiting and token binding depend on client IP, which is a weak identity primitive for public abuse control

Severity: Medium

Files:

- `supabase/functions/_shared/security.ts`
- `supabase/functions/issue-app-token/index.ts`

Why it matters:

The trust model for guest flows is based largely on `getClientIp(req)` and a signed token whose `sub` is that IP.

Relevant code:

- client IP extraction: `supabase/functions/_shared/security.ts:52-63`
- rate limit subject is that same IP: `supabase/functions/_shared/security.ts:71-138`
- app token `sub` is `clientIp`: `supabase/functions/_shared/app-access.ts:215-228`

Impact:

- users behind NAT share identity
- attackers can distribute abuse across IPs cheaply
- the system does not strongly distinguish “real browser session” from “headless scripted client”

This is a design limitation, not proof of compromise.

### 5. Broad `Access-Control-Allow-Origin: *` on multiple authenticated/admin endpoints increases future misconfiguration risk

Severity: Low

Files:

- `supabase/functions/access-state/index.ts`
- `supabase/functions/analytics-summary/index.ts`
- `supabase/functions/delete-account/index.ts`

Why it matters:

These endpoints still require authenticated Supabase bearer tokens or admin-email checks, so I did **not** find an auth bypass here. But the repo mixes:

- origin-gated app-token endpoints
- bearer-only endpoints with `*` CORS

That inconsistency makes the security model easier to misunderstand and easier to weaken in future changes.

## What I did not find

- No repo evidence of a confirmed breach or data exfiltration event
- No unauthenticated access to account deletion
- No direct unauthenticated access to owner-only analytics summary
- No direct internal-network SSRF in the image proxy path
- No hardcoded live secrets in the repo state I reviewed

## Recommended Fixes

### Highest priority

1. Replace the current public app-token model with a stronger abuse gate
   - Cloudflare Turnstile or similar bot gate on token issuance
   - tighter issuance quotas
   - optionally require signed server session for paid operations

2. Lock down `proxy-product-image`
   - require app token
   - add rate limiting
   - optionally scope it to URLs already returned by your search pipeline

3. Set a dedicated `SEARCHOUTFIT_APP_TOKEN_SECRET`
   - stop falling back to `SUPABASE_SERVICE_ROLE_KEY`

### Next priority

4. Add stronger identity controls for guest abuse
   - session-bound nonce
   - device/browser fingerprinting only as abuse friction, not identity
   - shorter scope/TTL where possible

5. Standardize CORS and auth patterns across functions
   - reduce confusion about which endpoints trust origin vs bearer auth

## Short Verdict

I did **not** find evidence in the codebase of an actual completed breach.

I **did** find two serious abuse paths:

- public app-token issuance can be scripted off-site
- `proxy-product-image` is an unauthenticated public proxy

Those are the highest-risk issues to fix first.
