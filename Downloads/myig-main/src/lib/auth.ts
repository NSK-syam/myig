import { Capacitor } from "@capacitor/core";

export const AUTH_RETURN_TO_KEY = "searchoutfit-auth-return-to";
const LEGACY_AUTH_RETURN_TO_KEYS = ["findfit-auth-return-to"];

export function buildNativeAppUrl(path = "/auth/callback"): string {
  const normalizedPath = path.startsWith("/") ? path.slice(1) : path;

  if (typeof window !== "undefined") {
    const windowScheme = window.location.protocol.replace(/:$/, "");
    const scheme = windowScheme && !["http", "https"].includes(windowScheme) ? windowScheme : "searchoutfit";
    return `${scheme}://${normalizedPath}`;
  }

  return `searchoutfit://${normalizedPath}`;
}

export function buildAuthRedirectUrl(path = "/auth/callback"): string {
  const configuredRedirectUrl = import.meta.env.VITE_SUPABASE_AUTH_REDIRECT_URL;
  if (typeof configuredRedirectUrl === "string" && configuredRedirectUrl.trim()) {
    return configuredRedirectUrl.trim();
  }

  if (typeof window === "undefined") {
    return path;
  }

  if (Capacitor.isNativePlatform()) {
    return buildNativeAppUrl(path);
  }

  return new URL(path, window.location.origin).toString();
}

export function storeAuthReturnTo(path: string): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(AUTH_RETURN_TO_KEY, path);
  for (const legacyKey of LEGACY_AUTH_RETURN_TO_KEYS) {
    window.sessionStorage.removeItem(legacyKey);
  }
}

export function readAuthReturnTo(): string {
  if (typeof window === "undefined") return "/";
  const current = window.sessionStorage.getItem(AUTH_RETURN_TO_KEY);
  if (current) return current;

  for (const legacyKey of LEGACY_AUTH_RETURN_TO_KEYS) {
    const legacyValue = window.sessionStorage.getItem(legacyKey);
    if (legacyValue) return legacyValue;
  }

  return "/";
}

export function clearAuthReturnTo(): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(AUTH_RETURN_TO_KEY);
  for (const legacyKey of LEGACY_AUTH_RETURN_TO_KEYS) {
    window.sessionStorage.removeItem(legacyKey);
  }
}
