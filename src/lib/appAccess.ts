import {
  SUPABASE_PUBLISHABLE_KEY,
  SUPABASE_URL,
  supabase,
} from "@/integrations/supabase/client";

const APP_TOKEN_HEADER = "x-searchoutfit-token";
const GUEST_TOKEN_HEADER = "x-searchoutfit-guest";
const APP_TOKEN_CACHE_KEY = "searchoutfit-app-token";
const GUEST_TOKEN_CACHE_KEY = "searchoutfit-guest-token";
const APP_TOKEN_REFRESH_BUFFER_MS = 30_000;
const GUEST_TOKEN_REFRESH_BUFFER_MS = 24 * 60 * 60 * 1000;

const DEFAULT_APP_SCOPES = [
  "guest-access-state",
  "upload-image",
  "extract-instagram",
  "analyze-outfit",
  "search-products",
  "ingest-analytics",
] as const;

const ISSUE_APP_TOKEN_ENDPOINT = SUPABASE_URL
  ? `${SUPABASE_URL}/functions/v1/issue-app-token`
  : "/functions/v1/issue-app-token";

type AppTokenCache = {
  token: string;
  expiresAt: string;
};

type GuestTokenCache = {
  expiresAt: string;
  guestId?: string;
  token: string;
};

type IssueAppTokenSuccess = {
  guestExpiresAt: string;
  guestId?: string;
  guestToken: string;
  success: true;
  token: string;
  expiresAt: string;
};

type IssueAppTokenChallenge = {
  error?: string;
  code: "challenge_required";
  challengeToken: string;
  difficulty: number;
  expiresAt: string;
};

let inMemoryToken: AppTokenCache | null = null;
let inMemoryGuestToken: GuestTokenCache | null = null;

type InvokeAppFunctionOptions = {
  body?: unknown;
  headers?: Record<string, string>;
};

function readCachedToken(): AppTokenCache | null {
  if (inMemoryToken) return inMemoryToken;
  if (typeof window === "undefined") return null;

  const raw = window.sessionStorage.getItem(APP_TOKEN_CACHE_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as AppTokenCache;
    if (!parsed?.token || !parsed?.expiresAt) {
      return null;
    }

    inMemoryToken = parsed;
    return parsed;
  } catch {
    return null;
  }
}

function writeCachedToken(value: AppTokenCache): void {
  inMemoryToken = value;
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(APP_TOKEN_CACHE_KEY, JSON.stringify(value));
}

function readCachedGuestToken(): GuestTokenCache | null {
  if (inMemoryGuestToken) return inMemoryGuestToken;
  if (typeof window === "undefined") return null;

  const raw = window.localStorage.getItem(GUEST_TOKEN_CACHE_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as GuestTokenCache;
    if (!parsed?.token || !parsed?.expiresAt) {
      return null;
    }

    inMemoryGuestToken = parsed;
    return parsed;
  } catch {
    return null;
  }
}

function writeCachedGuestToken(value: GuestTokenCache): void {
  inMemoryGuestToken = value;
  if (typeof window === "undefined") return;
  window.localStorage.setItem(GUEST_TOKEN_CACHE_KEY, JSON.stringify(value));
}

export function clearCachedAppToken(): void {
  inMemoryToken = null;
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(APP_TOKEN_CACHE_KEY);
}

function isUsable(cache: AppTokenCache | null): cache is AppTokenCache {
  if (!cache) return false;
  const expiry = new Date(cache.expiresAt).getTime();
  return Number.isFinite(expiry) && expiry - Date.now() > APP_TOKEN_REFRESH_BUFFER_MS;
}

function isGuestTokenUsable(cache: GuestTokenCache | null): cache is GuestTokenCache {
  if (!cache) return false;
  const expiry = new Date(cache.expiresAt).getTime();
  return Number.isFinite(expiry) && expiry - Date.now() > GUEST_TOKEN_REFRESH_BUFFER_MS;
}

async function sha256Hex(value: string): Promise<string> {
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(hash))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function solveProofOfWorkChallenge(challengeToken: string, difficulty: number): Promise<string> {
  if (!Number.isInteger(difficulty) || difficulty < 1 || difficulty > 6) {
    throw new Error("Unsupported app token challenge difficulty");
  }

  for (let candidate = 0; candidate < 5_000_000; candidate += 1) {
    const solution = candidate.toString(16);
    const digest = await sha256Hex(`${challengeToken}.${solution}`);
    if (digest.startsWith("0".repeat(difficulty))) {
      return solution;
    }
  }

  throw new Error("Could not solve the app token challenge");
}

function isChallengeResponse(payload: unknown): payload is IssueAppTokenChallenge {
  if (!payload || typeof payload !== "object") return false;
  return (payload as { code?: unknown }).code === "challenge_required"
    && typeof (payload as { challengeToken?: unknown }).challengeToken === "string"
    && typeof (payload as { difficulty?: unknown }).difficulty === "number";
}

async function requestAppToken(payload: Record<string, unknown>): Promise<{
  ok: boolean;
  data: IssueAppTokenSuccess | IssueAppTokenChallenge | { error?: string } | null;
}> {
  const response = await fetch(ISSUE_APP_TOKEN_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_PUBLISHABLE_KEY ?? "",
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => null) as IssueAppTokenSuccess | IssueAppTokenChallenge | { error?: string } | null;
  return { ok: response.ok, data };
}

async function issueAppToken(guestToken?: string): Promise<IssueAppTokenSuccess> {
  const basePayload: Record<string, unknown> = {
    scopes: [...DEFAULT_APP_SCOPES],
  };

  if (guestToken) {
    basePayload.guestToken = guestToken;
  }

  let response = await requestAppToken(basePayload);
  if (!response.ok && isChallengeResponse(response.data)) {
    const challengeSolution = await solveProofOfWorkChallenge(
      response.data.challengeToken,
      response.data.difficulty,
    );

    response = await requestAppToken({
      ...basePayload,
      challengeSolution,
      challengeToken: response.data.challengeToken,
    });
  }

  if (!response.ok || !response.data || !("success" in response.data) || response.data.success !== true) {
    const errorMessage = response.data && "error" in response.data && typeof response.data.error === "string"
      ? response.data.error
      : "Could not issue an app token";
    throw new Error(errorMessage);
  }

  return response.data;
}

export async function getAppFunctionHeaders(): Promise<Record<string, string>> {
  const cached = readCachedToken();
  const cachedGuest = readCachedGuestToken();
  if (isUsable(cached) && isGuestTokenUsable(cachedGuest)) {
    return {
      [APP_TOKEN_HEADER]: cached.token,
      [GUEST_TOKEN_HEADER]: cachedGuest.token,
    };
  }

  const data = await issueAppToken(cachedGuest?.token);
  if (!data?.success || !data?.token || !data?.expiresAt || !data?.guestToken || !data?.guestExpiresAt) {
    throw new Error("Could not issue an app token");
  }

  writeCachedToken({
    token: data.token as string,
    expiresAt: data.expiresAt as string,
  });
  writeCachedGuestToken({
    expiresAt: data.guestExpiresAt as string,
    guestId: typeof data.guestId === "string" ? data.guestId : undefined,
    token: data.guestToken as string,
  });

  return {
    [APP_TOKEN_HEADER]: data.token as string,
    [GUEST_TOKEN_HEADER]: data.guestToken as string,
  };
}

function getFunctionErrorStatus(error: unknown): number | null {
  if (!error || typeof error !== "object") return null;

  const context = (error as { context?: { status?: unknown } }).context;
  if (context && typeof context === "object" && typeof context.status === "number") {
    return context.status;
  }

  return null;
}

function isRetryableAppTokenFailure(error: unknown): boolean {
  const status = getFunctionErrorStatus(error);
  if (status === 401) return true;

  const message = error && typeof error === "object" && "message" in error
    ? String((error as { message?: unknown }).message ?? "")
    : "";

  return /unauthorized|app token|failed to send a request to the edge function/i.test(message);
}

export async function invokeAppFunction<T = unknown>(
  functionName: string,
  options: InvokeAppFunctionOptions = {},
) {
  const invokeWithFreshHeaders = async () => {
    const headers = await getAppFunctionHeaders();
    return supabase.functions.invoke<T>(functionName, {
      ...options,
      headers: {
        ...(options.headers ?? {}),
        ...headers,
      },
    });
  };

  let response = await invokeWithFreshHeaders();
  if (!isRetryableAppTokenFailure(response.error)) {
    return response;
  }

  clearCachedAppToken();
  response = await invokeWithFreshHeaders();
  return response;
}
