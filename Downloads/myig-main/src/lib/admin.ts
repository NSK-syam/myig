const DEFAULT_ANALYTICS_ADMIN_EMAILS = ["syam31158@gmail.com"];

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function isAnalyticsAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;

  const configured = import.meta.env.VITE_ANALYTICS_ADMIN_EMAILS;
  const allowlist = (configured?.trim() ? configured.split(",") : DEFAULT_ANALYTICS_ADMIN_EMAILS)
    .map((entry) => normalizeEmail(entry))
    .filter(Boolean);

  return allowlist.includes(normalizeEmail(email));
}
