import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Cloud, ExternalLink, Heart, ShoppingBag, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import AuthDialog from "@/components/AuthDialog";
import { useAuth } from "@/components/AuthProvider";
import Navbar from "@/components/Navbar";
import {
  type SavedProduct,
} from "@/lib/savedProducts";
import { useSavedProducts } from "@/hooks/use-saved-products";

const transition = { duration: 0.4, ease: [0.2, 0, 0, 1] as const };

const Saved = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const { clearAllProducts, items, loading, removeProduct, signedIn } = useSavedProducts();

  const removeItem = useCallback((url: string) => {
    void removeProduct(url).then(() => {
      toast({ description: "Removed from saved" });
    });
  }, [removeProduct, toast]);

  const clearAll = useCallback(() => {
    void clearAllProducts().then(() => {
      toast({ description: "All saved items cleared" });
    });
  }, [clearAllProducts, toast]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-28 pb-20 px-6">
        <div className="max-w-5xl mx-auto">
          <motion.div
            className="mb-10"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={transition}
          >
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mb-6"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back
            </button>

            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-foreground">
                  Saved Products
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                  {loading ? "Loading favorites..." : `${items.length} ${items.length === 1 ? "item" : "items"} saved`}
                </p>
              </div>
              {items.length > 0 && (
                <button
                  onClick={clearAll}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-destructive transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Clear all
                </button>
              )}
            </div>
          </motion.div>

          {!signedIn && (
            <motion.div
              className="mb-6 flex flex-col items-start gap-3 rounded-sm border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={transition}
            >
              <div className="flex items-start gap-3">
                <Cloud className="mt-0.5 h-4 w-4 text-foreground" />
                <div>
                  <p className="text-sm font-medium text-foreground">Sync your saved looks across devices</p>
                  <p className="text-xs text-muted-foreground">
                    Sign in with email to back up your favorites and access them anywhere.
                  </p>
                </div>
              </div>
              <AuthDialog triggerLabel="Sign in to sync" />
            </motion.div>
          )}

          {items.length === 0 ? (
            <motion.div
              className="text-center py-20"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={transition}
            >
              <Heart className="w-10 h-10 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-muted-foreground">No saved products yet.</p>
              {user && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Your favorites will sync to <span className="text-foreground">{user.email}</span>.
                </p>
              )}
              <button
                onClick={() => navigate("/")}
                className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 bg-foreground text-background rounded-sm text-sm font-medium hover:opacity-90 transition-opacity"
              >
                Start discovering
              </button>
            </motion.div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {items.map((product, i) => (
                <motion.div
                  key={product.url}
                  className="group flex flex-col rounded-sm border border-border overflow-hidden bg-card hover:border-foreground/20 hover:shadow-sm transition-all"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ ...transition, delay: i * 0.04 }}
                >
                  <a
                    href={product.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="aspect-[3/4] bg-warm-100 overflow-hidden relative flex items-center justify-center"
                  >
                    {product.image ? (
                      <img
                        src={product.image}
                        alt={product.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                    ) : (
                      <ShoppingBag className="w-8 h-8 text-muted-foreground/30" />
                    )}
                  </a>
                  <div className="p-4 flex flex-col gap-1.5 flex-1">
                    <a href={product.url} target="_blank" rel="noopener noreferrer">
                      <span className="text-sm font-medium text-foreground line-clamp-2 leading-snug hover:underline">
                        {product.title}
                      </span>
                    </a>
                    {product.source && (
                      <span className="text-xs text-muted-foreground">{product.source}</span>
                    )}
                    <div className="flex items-center justify-between mt-auto pt-2">
                      {product.price && (
                        <span className="text-base font-semibold text-foreground">{product.price}</span>
                      )}
                      <div className="flex items-center gap-2 ml-auto">
                        <button
                          onClick={() => removeItem(product.url)}
                          className="p-1 rounded-sm hover:bg-warm-100 transition-colors"
                          aria-label="Remove from saved"
                        >
                          <Heart className="w-4 h-4 fill-red-500 text-red-500" />
                        </button>
                        <a href={product.url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                        </a>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Saved;
