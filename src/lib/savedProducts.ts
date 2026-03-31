import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";
import type { ProductResult } from "@/lib/outfitApi";

export const SAVED_PRODUCTS_KEY = "searchoutfit-saved";
const LEGACY_SAVED_PRODUCTS_KEYS = ["findfit-saved", "outfitlink-saved"];

export type SavedProduct = ProductResult & { _badge?: string; savedAt?: string };
type SavedProductRow = Tables<"saved_products">;
type SavedProductInsert = TablesInsert<"saved_products">;

export function isSavedProductRecord(value: unknown): value is SavedProduct {
  return typeof value === "object"
    && value !== null
    && "url" in value
    && typeof value.url === "string";
}

function readSavedItemsFromKey(key: string): unknown[] {
  try {
    const stored = localStorage.getItem(key);
    if (!stored) return [];
    const parsed: unknown = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function readSavedProductEntries(): unknown[] {
  const current = readSavedItemsFromKey(SAVED_PRODUCTS_KEY);
  if (current.length > 0 || localStorage.getItem(SAVED_PRODUCTS_KEY)) {
    return current;
  }

  for (const legacyKey of LEGACY_SAVED_PRODUCTS_KEYS) {
    const legacyItems = readSavedItemsFromKey(legacyKey);
    if (legacyItems.length > 0 || localStorage.getItem(legacyKey)) {
      return legacyItems;
    }
  }

  return [];
}

export function writeSavedProductEntries(items: unknown[]): void {
  localStorage.setItem(SAVED_PRODUCTS_KEY, JSON.stringify(items));
  for (const legacyKey of LEGACY_SAVED_PRODUCTS_KEYS) {
    localStorage.removeItem(legacyKey);
  }
}

export function clearSavedProductEntries(): void {
  localStorage.removeItem(SAVED_PRODUCTS_KEY);
  for (const legacyKey of LEGACY_SAVED_PRODUCTS_KEYS) {
    localStorage.removeItem(legacyKey);
  }
}

function getSavedLinkHost(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

function upgradeLegacySavedProduct(url: string): SavedProduct {
  const host = getSavedLinkHost(url);
  return {
    url,
    title: "Saved product link",
    source: host ?? "Saved link",
  };
}

export function getSavedProductUrls(): Set<string> {
  return new Set(
    readSavedProductEntries()
      .map((item) => (typeof item === "string" ? item : isSavedProductRecord(item) ? item.url : ""))
      .filter(Boolean),
  );
}

export function getSavedProducts(): SavedProduct[] {
  const rawItems = readSavedProductEntries();
  const upgraded = rawItems.flatMap((item) => {
    if (isSavedProductRecord(item)) return [item];
    if (typeof item === "string") return [upgradeLegacySavedProduct(item)];
    return [];
  });

  if (rawItems.length > 0) {
    writeSavedProductEntries(upgraded);
  }

  return upgraded;
}

export const getLocalSavedProducts = getSavedProducts;
export const writeLocalSavedProducts = (items: SavedProduct[]) => writeSavedProductEntries(items);
export const clearLocalSavedProducts = clearSavedProductEntries;

function mapSavedProductRow(row: SavedProductRow): SavedProduct {
  return {
    image: row.image ?? undefined,
    price: row.price ?? undefined,
    savedAt: row.saved_at,
    source: row.source ?? undefined,
    title: row.title,
    url: row.url,
    _badge: row.badge ?? undefined,
  };
}

function mapSavedProductInsert(product: SavedProduct, userId: string): SavedProductInsert {
  return {
    badge: product._badge ?? null,
    image: product.image ?? null,
    price: product.price ?? null,
    saved_at: product.savedAt ?? new Date().toISOString(),
    source: product.source ?? null,
    title: product.title,
    url: product.url,
    user_id: userId,
  };
}

export async function listSavedProductsForUser(userId: string): Promise<SavedProduct[]> {
  const { data, error } = await supabase
    .from("saved_products")
    .select("*")
    .eq("user_id", userId)
    .order("saved_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []).map(mapSavedProductRow);
}

export async function upsertSavedProduct(product: SavedProduct, userId: string): Promise<void> {
  const { error } = await supabase
    .from("saved_products")
    .upsert(mapSavedProductInsert(product, userId), { onConflict: "user_id,url" });

  if (error) {
    throw error;
  }
}

export async function deleteSavedProduct(url: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from("saved_products")
    .delete()
    .eq("user_id", userId)
    .eq("url", url);

  if (error) {
    throw error;
  }
}

export async function syncSavedProductsToAccount(userId: string): Promise<SavedProduct[]> {
  const localItems = getLocalSavedProducts();

  if (localItems.length > 0) {
    const { error } = await supabase
      .from("saved_products")
      .upsert(
        localItems.map((item) => mapSavedProductInsert(item, userId)),
        { onConflict: "user_id,url" },
      );

    if (error) {
      throw error;
    }
  }

  const remoteItems = await listSavedProductsForUser(userId);
  writeLocalSavedProducts(remoteItems);
  return remoteItems;
}
