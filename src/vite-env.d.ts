/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_REVENUECAT_APPLE_API_KEY?: string;
  readonly VITE_SUPABASE_AUTH_REDIRECT_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
