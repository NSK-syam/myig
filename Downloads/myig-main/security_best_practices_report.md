# Security Best Practices Report

## Executive Summary

This codebase is a React + Supabase application that accepts public Instagram links and user-uploaded screenshots, then invokes Supabase Edge Functions backed by Anthropic and SerpAPI. The highest-risk issues are around unauthenticated access to expensive backend functionality, unrestricted public storage uploads, and a lax Instagram URL parser that can be used to make the backend fetch attacker-controlled URLs.

I found 5 concrete issues worth fixing. Two are high-priority abuse risks that can lead to cost exposure or infrastructure misuse, one is a high-priority server-side fetch issue, one is a high-priority merchant-domain spoofing issue, and one is a medium-priority data exposure issue in the cache table.

## Critical / High Severity

### SEC-001: Public anonymous uploads allow arbitrary file hosting and storage abuse

- Severity: High
- Location:
  - [supabase/migrations/20260315031143_d0330213-b17a-4b0e-80ea-0722e992efd6.sql](/Users/syam/Downloads/myig-main/supabase/migrations/20260315031143_d0330213-b17a-4b0e-80ea-0722e992efd6.sql):1-4
  - [supabase/migrations/20260315021146_9a131ed8-f9e5-4174-9006-4f74a58396ce.sql](/Users/syam/Downloads/myig-main/supabase/migrations/20260315021146_9a131ed8-f9e5-4174-9006-4f74a58396ce.sql):3-9
  - [src/lib/outfitApi.ts](/Users/syam/Downloads/myig-main/src/lib/outfitApi.ts):3-12
- Evidence:

```sql
CREATE POLICY "Allow public uploads to instagram-images"
ON storage.objects
FOR INSERT
TO anon, authenticated
WITH CHECK (bucket_id = 'instagram-images');
```

```sql
INSERT INTO storage.buckets (id, name, public) VALUES ('instagram-images', 'instagram-images', true);
```

- Impact: Any internet user with the project’s public Supabase credentials can upload arbitrary content into a public bucket. That creates an immediate storage-abuse and cost-exposure path, and it also means user screenshots are stored in a publicly readable bucket rather than a private object store.
- Fix: Remove anonymous direct uploads. Route uploads through an authenticated or signed backend path, or use short-lived signed upload URLs with file-type and size enforcement. If screenshots must remain private, make the bucket private and generate signed read URLs only for downstream services that need access.
- Mitigation: Add lifecycle cleanup for uploaded images and storage quotas, but do not rely on cleanup alone as the primary control.
- False positive notes: This finding assumes the frontend is shipped with a valid publishable key, which the repo structure and Supabase client setup indicate.

### SEC-002: Public AI-backed Edge Functions can be abused without auth or rate limits

- Severity: High
- Location:
  - [supabase/config.toml](/Users/syam/Downloads/myig-main/supabase/config.toml):3-7
  - [supabase/functions/analyze-outfit/index.ts](/Users/syam/Downloads/myig-main/supabase/functions/analyze-outfit/index.ts):13-19
  - [supabase/functions/analyze-outfit/index.ts](/Users/syam/Downloads/myig-main/supabase/functions/analyze-outfit/index.ts):124-139
  - [supabase/functions/extract-instagram/index.ts](/Users/syam/Downloads/myig-main/supabase/functions/extract-instagram/index.ts):162-164
- Evidence:

```toml
[functions.analyze-outfit]
verify_jwt = false

[functions.extract-instagram]
verify_jwt = false
```

```ts
const response = await fetch("https://api.anthropic.com/v1/messages", {
```

- Impact: There is no in-repo authentication, authorization, or rate-limiting visible for endpoints that spend Anthropic tokens and use a service-role Supabase client. An attacker can call these functions directly and burn paid API usage, scrape the extraction pipeline, or generate noisy load without ever using the intended UI.
- Fix: Require JWT verification for these functions unless truly public access is required. If the product must remain anonymous, move abuse controls to a signed application gateway with rate limits, request quotas, bot detection, and strict per-origin enforcement.
- Mitigation: Add per-IP and per-session rate limiting at the edge, plus request-size limits and usage monitoring/alerts for Anthropic and storage spend.
- False positive notes: Infrastructure-level rate limiting may exist outside this repo, but there is no evidence of it in application code or config.

### SEC-003: `extract-instagram` can fetch attacker-controlled URLs

- Severity: High
- Location:
  - [supabase/functions/extract-instagram/index.ts](/Users/syam/Downloads/myig-main/supabase/functions/extract-instagram/index.ts):14-18
  - [supabase/functions/extract-instagram/index.ts](/Users/syam/Downloads/myig-main/supabase/functions/extract-instagram/index.ts):58-68
  - [supabase/functions/extract-instagram/index.ts](/Users/syam/Downloads/myig-main/supabase/functions/extract-instagram/index.ts):214-218
- Evidence:

```ts
const match = url.match(
  /instagram\.com\/(?:[A-Za-z0-9_.]+\/)?(p|reels|reel|tv)\/([A-Za-z0-9-_]+)/
);
```

```ts
const response = await fetch(url, {
```

- Impact: The shortcode extractor accepts any string that merely contains `instagram.com/...`, not a canonical Instagram host. Because this function is public, an attacker can call it directly with a URL like `https://evil.example/instagram.com/p/test` or another non-Instagram host that embeds the pattern, force the GraphQL path to fail, and make the backend fetch that attacker-controlled URL during the `og:image` fallback.
- Fix: Parse the input with `new URL()`, require `https`, and allow only exact Instagram hosts such as `instagram.com` and `www.instagram.com` before any server-side fetch. Reject anything else before extracting the shortcode.
- Mitigation: Add outbound URL allowlisting for the fallback fetch and log rejected hostnames.
- False positive notes: The frontend helper is stricter, but it does not protect this public function from direct invocation.

### SEC-004: Retailer allowlist is vulnerable to domain-spoofing

- Severity: High
- Location:
  - [supabase/functions/search-products/index.ts](/Users/syam/Downloads/myig-main/supabase/functions/search-products/index.ts):56-59
- Evidence:

```ts
return ALLOWED_RETAIL_DOMAINS.some(r => domain.includes(r));
```

- Impact: Hostnames like `amazon.com.evil.example` or `best-farfetch.com` pass the current allowlist check and can be surfaced as if they were approved merchants. Because product URLs come from third-party search results, this weakens the core safeguard that is supposed to keep users on known retail domains.
- Fix: Match only exact hosts or true subdomains, for example `domain === allowed || domain.endsWith("." + allowed)`.
- Mitigation: Consider storing parsed hostnames separately and rejecting any non-HTTPS result before ranking or displaying it.
- False positive notes: None. The current predicate is a substring match.

## Medium Severity

### SEC-005: Cache table exposes extraction history to all anonymous clients

- Severity: Medium
- Location:
  - [supabase/migrations/20260315021146_9a131ed8-f9e5-4174-9006-4f74a58396ce.sql](/Users/syam/Downloads/myig-main/supabase/migrations/20260315021146_9a131ed8-f9e5-4174-9006-4f74a58396ce.sql):18-25
  - [supabase/migrations/20260315021146_9a131ed8-f9e5-4174-9006-4f74a58396ce.sql](/Users/syam/Downloads/myig-main/supabase/migrations/20260315021146_9a131ed8-f9e5-4174-9006-4f74a58396ce.sql):31-34
- Evidence:

```sql
CREATE TABLE public.instagram_extractions (
  ...
  original_url TEXT NOT NULL,
  images TEXT[] NOT NULL DEFAULT '{}',
  caption TEXT,
  ...
);
```

```sql
CREATE POLICY "Public read access for instagram extractions"
ON public.instagram_extractions FOR SELECT
TO public
USING (true);
```

- Impact: Anyone with the public Supabase client can read the full cache table, including every cached post URL and caption. Even if the underlying Instagram content is public, this still exposes usage history and centralizes it into an easily queryable dataset.
- Fix: Remove anonymous read access and expose only the minimal cache lookup needed by the application through a restricted function. If the cache must stay public, do not store original URLs and captions unless they are strictly necessary.
- Mitigation: Add retention limits and prune old cache rows aggressively.
- False positive notes: This assumes the table is reachable with the anon client, which is consistent with the published RLS policy.

## Lower-Risk Observations / Runtime Checks

These are worth verifying, but I did not treat them as confirmed vulnerabilities from repo evidence alone:

- No CSP, clickjacking, or other browser security headers are visible in this repo. If you rely on hosting/platform defaults, verify them at runtime on the deployed site.
- No explicit abuse controls are visible for the frontend upload path beyond a 10 MB client-side check. Server-side content-type and file-size enforcement should be verified in Supabase storage settings or upload proxy code.
- The compliance/privacy copy does not match the real data flow. That is not a direct exploit path, but it is still a trust and consent problem because screenshots are uploaded and sent to external processors.

## Recommended Fix Order

1. Lock down anonymous uploads to `instagram-images`.
2. Put auth and abuse controls in front of `analyze-outfit` and `extract-instagram`.
3. Fix Instagram URL validation before any server-side fetch.
4. Fix the retailer domain matcher.
5. Restrict read access to `instagram_extractions` and minimize what is stored there.
