import { useEffect, useState } from "react";

import { useAuth } from "@/components/AuthProvider";
import {
  clearLocalSavedProducts,
  deleteSavedProduct,
  getLocalSavedProducts,
  syncSavedProductsToAccount,
  type SavedProduct,
  upsertSavedProduct,
  writeLocalSavedProducts,
} from "@/lib/savedProducts";

export type ToggleSaveResult = "saved" | "removed";

export function useSavedProducts() {
  const { user } = useAuth();
  const [items, setItems] = useState<SavedProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);

      if (!user) {
        const localItems = getLocalSavedProducts();
        if (!cancelled) {
          setItems(localItems);
          setLoading(false);
        }
        return;
      }

      try {
        const syncedItems = await syncSavedProductsToAccount(user.id);
        if (!cancelled) {
          setItems(syncedItems);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [user]);

  const persistItems = (nextItems: SavedProduct[]) => {
    setItems(nextItems);
    writeLocalSavedProducts(nextItems);
  };

  const toggleProduct = async (product: SavedProduct): Promise<ToggleSaveResult> => {
    const existing = items.some((item) => item.url === product.url);

    if (existing) {
      const nextItems = items.filter((item) => item.url !== product.url);
      if (user) {
        await deleteSavedProduct(product.url, user.id);
      }
      persistItems(nextItems);
      return "removed";
    }

    const nextProduct = { ...product, savedAt: new Date().toISOString() };
    const nextItems = [nextProduct, ...items.filter((item) => item.url !== product.url)];

    if (user) {
      await upsertSavedProduct(nextProduct, user.id);
    }

    persistItems(nextItems);
    return "saved";
  };

  const removeProduct = async (url: string) => {
    const nextItems = items.filter((item) => item.url !== url);
    if (user) {
      await deleteSavedProduct(url, user.id);
    }
    persistItems(nextItems);
  };

  const clearAllProducts = async () => {
    const currentItems = items;
    if (!user) {
      setItems([]);
      clearLocalSavedProducts();
      return;
    }

    await Promise.all(currentItems.map((item) => deleteSavedProduct(item.url, user.id)));
    setItems([]);
    clearLocalSavedProducts();
  };

  return {
    items,
    loading,
    savedUrls: new Set(items.map((item) => item.url)),
    signedIn: Boolean(user),
    toggleProduct,
    removeProduct,
    clearAllProducts,
  };
}
