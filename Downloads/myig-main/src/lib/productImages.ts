import { SUPABASE_URL } from "@/integrations/supabase/client";

function isGoogleShoppingProductUrl(url?: string): boolean {
  if (!url) return false;

  try {
    const parsed = new URL(url);
    const domain = parsed.hostname.replace(/^www\./, "").toLowerCase();
    if (!domain.includes("google.com")) return false;

    return parsed.searchParams.get("ibp") === "oshop"
      || parsed.searchParams.has("prds")
      || parsed.pathname.toLowerCase().includes("/shopping/product/");
  } catch {
    return false;
  }
}

function isGoogleHostedCommerceImage(url?: string): boolean {
  if (!url) return false;

  try {
    const parsed = new URL(url);
    const domain = parsed.hostname.replace(/^www\./, "").toLowerCase();

    const isGoogleImageHost =
      domain.endsWith("gstatic.com")
      || domain.endsWith("googleusercontent.com")
      || domain.endsWith("ggpht.com");

    return isGoogleImageHost
      && (parsed.pathname.toLowerCase().includes("/shopping") || parsed.searchParams.has("q"));
  } catch {
    return false;
  }
}

export function buildProductImageUrl(imageUrl?: string, merchantUrl?: string): string | undefined {
  if (!imageUrl) return undefined;

  // Google Shopping thumbnails already render cross-origin in the browser. Proxying them
  // through our merchant-image function fails because the "merchant" URL is often still a
  // Google Shopping detail page rather than a retailer domain.
  if (isGoogleShoppingProductUrl(merchantUrl) || isGoogleHostedCommerceImage(imageUrl)) {
    return imageUrl;
  }

  const params = new URLSearchParams({ url: imageUrl });
  if (merchantUrl) {
    params.set("merchantUrl", merchantUrl);
  }

  const baseUrl = SUPABASE_URL
    ? `${SUPABASE_URL}/functions/v1/proxy-product-image`
    : "/functions/v1/proxy-product-image";

  return `${baseUrl}?${params.toString()}`;
}
