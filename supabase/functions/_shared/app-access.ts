export const APP_TOKEN_HEADER = "x-searchoutfit-token";
export const GUEST_TOKEN_HEADER = "x-searchoutfit-guest";
export const DEFAULT_CORS_ALLOWED_HEADERS = [
  "authorization",
  "x-client-info",
  "apikey",
  "content-type",
  "x-supabase-client-platform",
  "x-supabase-client-platform-version",
  "x-supabase-client-runtime",
  "x-supabase-client-runtime-version",
];

export const PUBLIC_APP_SCOPES = [
  "guest-access-state",
  "upload-image",
  "extract-instagram",
  "analyze-outfit",
  "search-products",
  "ingest-analytics",
] as const;

export const DEFAULT_ALLOWED_APP_ORIGINS = [
  "https://searchoutfit.com",
  "https://www.searchoutfit.com",
  "https://find-fit-app.pages.dev",
  "http://localhost:5173",
  "http://localhost:8080",
];

export const DEFAULT_ANALYTICS_ADMIN_EMAILS = [
  "syam31158@gmail.com",
];

export function buildAppCorsHeaders(): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": [
      ...DEFAULT_CORS_ALLOWED_HEADERS,
      APP_TOKEN_HEADER,
      GUEST_TOKEN_HEADER,
    ].join(", "),
  };
}

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

function normalizeOrigin(value: string): string | null {
  try {
    const parsed = new URL(value);
    if (!/^https?:$/.test(parsed.protocol)) {
      return null;
    }

    return `${parsed.protocol}//${parsed.host}`.toLowerCase();
  } catch {
    return null;
  }
}

export function parseAdminEmailAllowlist(
  value?: string | null,
  fallback: readonly string[] = DEFAULT_ANALYTICS_ADMIN_EMAILS,
): Set<string> {
  const source = (value?.trim() ? value.split(",") : [...fallback])
    .map((entry) => normalizeEmail(entry))
    .filter(Boolean);

  return new Set(source);
}

export function isAllowedAdminEmail(email: string | null | undefined, allowlist: Set<string>): boolean {
  if (!email) return false;
  return allowlist.has(normalizeEmail(email));
}

export function parseAllowedOrigins(
  value?: string | null,
  fallback: readonly string[] = DEFAULT_ALLOWED_APP_ORIGINS,
): Set<string> {
  const source = (value?.trim() ? value.split(",") : [...fallback])
    .map((entry) => normalizeOrigin(entry.trim()))
    .filter((entry): entry is string => Boolean(entry));

  return new Set(source);
}

export function getRequestOrigin(req: Request): string | null {
  const originHeader = req.headers.get("origin");
  if (originHeader) {
    return normalizeOrigin(originHeader);
  }

  const refererHeader = req.headers.get("referer");
  if (refererHeader) {
    return normalizeOrigin(refererHeader);
  }

  return null;
}

export function isAllowedOrigin(origin: string | null, allowedOrigins: Set<string>): boolean {
  if (!origin) return false;
  if (allowedOrigins.has(origin)) return true;

  let parsedOrigin: URL;
  try {
    parsedOrigin = new URL(origin);
  } catch {
    return false;
  }

  return Array.from(allowedOrigins).some((allowedOrigin) => {
    try {
      const parsedAllowedOrigin = new URL(allowedOrigin);
      if (parsedAllowedOrigin.protocol !== parsedOrigin.protocol) return false;
      if (parsedAllowedOrigin.port !== parsedOrigin.port) return false;
      if (!parsedAllowedOrigin.hostname.endsWith(".pages.dev")) return false;

      return parsedOrigin.hostname.endsWith(`.${parsedAllowedOrigin.hostname}`);
    } catch {
      return false;
    }
  });
}

type AppTokenPayload = {
  sub: string;
  scopes: string[];
  exp: number;
  origin?: string;
};

type GuestTokenPayload = {
  guestId: string;
  exp: number;
  origin?: string;
};

function bytesToBase64Url(bytes: Uint8Array): string {
  const binary = Array.from(bytes, (byte) => String.fromCharCode(byte)).join("");
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function stringToBase64Url(value: string): string {
  return bytesToBase64Url(new TextEncoder().encode(value));
}

function base64UrlToString(value: string): string {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4 || 4)) % 4);
  return atob(padded);
}

async function signPayload(secret: string, encodedPayload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(encodedPayload));
  return bytesToBase64Url(new Uint8Array(signature));
}

function parseTokenPayload(token: string): { encodedPayload: string; signature: string; payload: AppTokenPayload } {
  const [encodedPayload, signature] = token.split(".");
  if (!encodedPayload || !signature) {
    throw new Error("App token is malformed");
  }

  const decoded = base64UrlToString(encodedPayload);
  const payload = JSON.parse(decoded) as AppTokenPayload;
  if (!payload.sub || !Array.isArray(payload.scopes) || !payload.exp) {
    throw new Error("App token payload is invalid");
  }

  return { encodedPayload, signature, payload };
}

function parseGuestTokenPayload(token: string): { encodedPayload: string; signature: string; payload: GuestTokenPayload } {
  const [encodedPayload, signature] = token.split(".");
  if (!encodedPayload || !signature) {
    throw new Error("Guest token is malformed");
  }

  const decoded = base64UrlToString(encodedPayload);
  const payload = JSON.parse(decoded) as GuestTokenPayload;
  if (!payload.guestId || !payload.exp) {
    throw new Error("Guest token payload is invalid");
  }

  return { encodedPayload, signature, payload };
}

export async function createScopedAppToken({
  secret,
  clientIp,
  scopes,
  ttlSeconds,
  now = new Date(),
  origin,
}: {
  secret: string;
  clientIp: string;
  scopes: string[];
  ttlSeconds: number;
  now?: Date;
  origin?: string | null;
}): Promise<string> {
  const payload: AppTokenPayload = {
    sub: clientIp,
    scopes: Array.from(new Set(scopes.filter(Boolean))),
    exp: Math.floor(now.getTime() / 1000) + ttlSeconds,
  };

  const normalizedOrigin = origin ? normalizeOrigin(origin) : null;
  if (normalizedOrigin) {
    payload.origin = normalizedOrigin;
  }

  const encodedPayload = stringToBase64Url(JSON.stringify(payload));
  const signature = await signPayload(secret, encodedPayload);
  return `${encodedPayload}.${signature}`;
}

export async function createGuestToken({
  secret,
  guestId,
  ttlSeconds,
  now = new Date(),
  origin,
}: {
  secret: string;
  guestId: string;
  ttlSeconds: number;
  now?: Date;
  origin?: string | null;
}): Promise<string> {
  const payload: GuestTokenPayload = {
    guestId,
    exp: Math.floor(now.getTime() / 1000) + ttlSeconds,
  };

  const normalizedOrigin = origin ? normalizeOrigin(origin) : null;
  if (normalizedOrigin) {
    payload.origin = normalizedOrigin;
  }

  const encodedPayload = stringToBase64Url(JSON.stringify(payload));
  const signature = await signPayload(secret, encodedPayload);
  return `${encodedPayload}.${signature}`;
}

export async function verifyScopedAppToken({
  token,
  secret,
  clientIp,
  requiredScope,
  now = new Date(),
  origin,
}: {
  token: string;
  secret: string;
  clientIp: string;
  requiredScope: string;
  now?: Date;
  origin?: string | null;
}): Promise<true> {
  const { encodedPayload, signature, payload } = parseTokenPayload(token);
  const expectedSignature = await signPayload(secret, encodedPayload);

  if (signature !== expectedSignature) {
    throw new Error("App token signature is invalid");
  }

  if (payload.exp <= Math.floor(now.getTime() / 1000)) {
    throw new Error("App token has expired");
  }

  if (payload.sub !== clientIp) {
    throw new Error("App token is invalid for this client");
  }

  const normalizedOrigin = origin ? normalizeOrigin(origin) : null;
  if (payload.origin && payload.origin !== normalizedOrigin) {
    throw new Error("App token is invalid for this origin");
  }

  if (!payload.scopes.includes(requiredScope)) {
    throw new Error("App token is missing required scope");
  }

  return true;
}

export async function verifyGuestToken({
  token,
  secret,
  now = new Date(),
  origin,
}: {
  token: string;
  secret: string;
  now?: Date;
  origin?: string | null;
}): Promise<string> {
  const { encodedPayload, signature, payload } = parseGuestTokenPayload(token);
  const expectedSignature = await signPayload(secret, encodedPayload);

  if (signature !== expectedSignature) {
    throw new Error("Guest token signature is invalid");
  }

  if (payload.exp <= Math.floor(now.getTime() / 1000)) {
    throw new Error("Guest token has expired");
  }

  const normalizedOrigin = origin ? normalizeOrigin(origin) : null;
  if (payload.origin && payload.origin !== normalizedOrigin) {
    throw new Error("Guest token is invalid for this origin");
  }

  return payload.guestId;
}
