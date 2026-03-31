import { describe, expect, it, vi } from 'vitest';

vi.mock('@/integrations/supabase/client', () => ({
  SUPABASE_URL: 'https://uqrxaffgnmnaewaaqmmh.supabase.co',
}));

const { buildProductImageUrl } = await import('@/lib/productImages');

describe('buildProductImageUrl', () => {
  it('returns a proxied URL for standard merchant-hosted images', () => {
    const imageUrl = 'https://cdn.example.com/products/top.jpg';
    const merchantUrl = 'https://shop.example.com/products/top';

    expect(buildProductImageUrl(imageUrl, merchantUrl)).toContain('/functions/v1/proxy-product-image?');
  });

  it('bypasses the proxy for Google Shopping thumbnails', () => {
    const imageUrl = 'https://encrypted-tbn1.gstatic.com/shopping?q=tbn:ANd9GcTVqHC7x3W0gLLxZ1I6zrgzGURELGJWhIMgxcl_ESIuXJnRVYl97VuJW1jH8I6ROdpD-RMuacwDQN3Pl-9tZSVViJjuLf0M_A';
    const merchantUrl = 'https://www.google.com/search?ibp=oshop&q=women+burgundy+top&prds=productid:123';

    expect(buildProductImageUrl(imageUrl, merchantUrl)).toBe(imageUrl);
  });
});
