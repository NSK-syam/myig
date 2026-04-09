export function buildProductImageUrl(
  imageUrl?: string,
  _merchantUrl?: string,
  proxyImageUrl?: string,
): string | undefined {
  if (proxyImageUrl) {
    return proxyImageUrl;
  }

  if (!imageUrl) return undefined;

  return imageUrl;
}
