import { supabase } from "@/integrations/supabase/client";

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

type AppTokenCache = {
  token: string;
  expiresAt: string;
};

type GuestTokenCache = {
  expiresAt: string;
  guestId?: string;
  token: string;
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

export async function getAppFunctionHeaders(): Promise<Record<string, string>> {
  const cached = readCachedToken();
  const cachedGuest = readCachedGuestToken();
  if (isUsable(cached) && isGuestTokenUsable(cachedGuest)) {
    return {
      [APP_TOKEN_HEADER]: cached.token,
      [GUEST_TOKEN_HEADER]: cachedGuest.token,
    };
  }

  const { data, error } = await supabase.functions.invoke("issue-app-token", {
    body: {
      guestToken: cachedGuest?.token,
      scopes: [...DEFAULT_APP_SCOPES],
    },
  });

  if (error) {
    throw new Error(error.message || "Could not issue an app token");
  }

  if (!data?.success || !data?.token || !data?.expiresAt || !data?.guestToken || !data?.guestExpiresAt) {
    throw new Error(data?.error || "Could not issue an app token");
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
