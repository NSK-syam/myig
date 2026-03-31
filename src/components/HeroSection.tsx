import { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Link2, Image, Shield, Lock, Heart, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/components/ui/use-toast";
import { analyzeOutfitFromImage, analyzeOutfitFromImageUrl, analyzeOutfitFromBase64, isNotFashion, isInstagramUrl, extractInstagramImages, uploadImageToStorage, uploadBase64ToStorage } from "@/lib/outfitApi";
import { fireAndForgetAnalyticsEvent } from "@/lib/analytics";
import CountrySelect from "@/components/CountrySelect";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getPreferredMarket, persistPreferredMarket, type SearchMarketCode } from "@/lib/market";
import heroOutfit from "@/assets/hero-outfit.jpg";
import heroOutfit2 from "@/assets/hero-outfit-2.jpg";
import heroOutfit3 from "@/assets/hero-outfit-3.jpg";
import productBlazer from "@/assets/product-blazer.jpg";
import productTrousers from "@/assets/product-trousers.jpg";
import productMules from "@/assets/product-mules.jpg";

const heroImages = [
  { src: heroOutfit, alt: "Street style outfit with neutral tones, blazer and wide-leg trousers" },
  { src: heroOutfit2, alt: "Elegant pink flowing midi dress in Mediterranean garden" },
  { src: heroOutfit3, alt: "Colorful floral dress with green tweed jacket in boutique" },
];

const transition = { duration: 0.6, ease: [0.2, 0, 0, 1] as const };
const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "Could not analyze the outfit. Please try again.";

const floatingProducts = [
  {
    alt: "Blazer",
    brand: "Totême",
    image: productBlazer,
    match: "✓ High match",
    matchClassName: "text-green-700",
    name: "Relaxed Linen Blazer",
    price: "$495",
  },
  {
    alt: "Mules",
    brand: "Mango",
    image: productMules,
    match: "~ Medium",
    matchClassName: "text-amber-700",
    name: "Square-Toe Mules",
    price: "$79",
  },
  {
    alt: "Trousers",
    brand: "Arket",
    image: productTrousers,
    match: "✓ High match",
    matchClassName: "text-green-700",
    name: "Wide-Leg Trousers",
    price: "$129",
  },
];

type HeroPreviewProps = {
  compact?: boolean;
  currentSlide: number;
  onSelectSlide: (index: number) => void;
};

const HeroPreview = ({ compact = false, currentSlide, onSelectSlide }: HeroPreviewProps) => {
  const aspectClassName = compact ? "aspect-[5/6] rounded-[28px]" : "aspect-[4/5] rounded-lg";
  const badgeClassName = compact
    ? "absolute top-3 left-3 bg-card/95 backdrop-blur-sm rounded-2xl px-3 py-2 shadow-lg z-10"
    : "absolute top-4 left-4 bg-card/95 backdrop-blur-sm rounded-sm px-3 py-2 shadow-lg z-10";
  const dotClassName = compact
    ? "absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 gap-1.5"
    : "absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 gap-1.5";
  const cardBaseClassName = compact
    ? "absolute bg-card/95 backdrop-blur-sm rounded-2xl p-2.5 shadow-lg flex items-center gap-2 z-10"
    : "absolute bg-card/95 backdrop-blur-sm rounded-sm p-2 shadow-lg flex items-center gap-2 cursor-pointer z-10";
  const imageClassName = compact ? "h-11 w-11 rounded-xl object-cover" : "w-10 h-10 rounded-sm object-cover";
  const nameClassName = compact ? "text-[11px] font-medium leading-tight text-foreground" : "text-xs font-medium text-foreground";
  const metaClassName = compact ? "text-[10px] text-muted-foreground" : "text-[10px] text-muted-foreground";
  const matchClassName = compact ? "text-[10px] font-medium" : "text-[9px] font-medium";

  return (
    <div
      aria-label={compact ? "SearchOutfit mobile preview" : undefined}
      className={compact ? "mx-auto w-full max-w-[23rem]" : ""}
      role={compact ? "img" : undefined}
    >
      <div className={`relative overflow-hidden ${aspectClassName}`}>
        <AnimatePresence mode="wait">
          <motion.img
            key={currentSlide}
            src={heroImages[currentSlide].src}
            alt={heroImages[currentSlide].alt}
            className="absolute inset-0 h-full w-full object-cover"
            initial={{ opacity: 0, scale: 1.05 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.8, ease: [0.2, 0, 0, 1] as const }}
          />
        </AnimatePresence>

        <div className={dotClassName}>
          {heroImages.map((_, index) => (
            <button
              key={index}
              type="button"
              onClick={() => onSelectSlide(index)}
              className={`h-2 rounded-full transition-all duration-300 ${
                index === currentSlide ? "bg-card w-5" : "w-2 bg-card/50"
              }`}
            />
          ))}
        </div>

        <motion.div
          className={badgeClassName}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...transition, delay: 0.8 }}
        >
          <div className="flex items-center gap-2">
            <span className={compact ? "text-xs" : "text-sm"}>🎯</span>
            <div>
              <p className={compact ? "text-[11px] font-semibold text-foreground" : "text-xs font-semibold text-foreground"}>5 items matched</p>
              <p className={compact ? "text-[10px] text-muted-foreground" : "text-[10px] text-muted-foreground"}>94% confidence</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          className={`${cardBaseClassName} ${compact ? "right-0 top-[24%] max-w-[11.75rem] translate-x-1" : "top-1/4 right-0 translate-x-2"}`}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: compact ? 4 : 2 }}
          whileHover={{ scale: 1.08, y: -2 }}
          whileTap={{ scale: 0.97 }}
          transition={{ ...transition, delay: 1.0 }}
        >
          <img src={floatingProducts[0].image} alt={floatingProducts[0].alt} className={imageClassName} />
          <div>
            <p className={nameClassName}>{floatingProducts[0].name}</p>
            <p className={metaClassName}>{floatingProducts[0].brand} · {floatingProducts[0].price}</p>
            <span className={`${matchClassName} ${floatingProducts[0].matchClassName}`}>{floatingProducts[0].match}</span>
          </div>
        </motion.div>

        <motion.div
          className={`${cardBaseClassName} ${compact ? "bottom-[30%] left-0 max-w-[11rem] -translate-x-1" : "bottom-1/3 left-0 -translate-x-2"}`}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: compact ? -4 : -2 }}
          whileHover={{ scale: 1.08, y: -2 }}
          whileTap={{ scale: 0.97 }}
          transition={{ ...transition, delay: 1.2 }}
        >
          <img src={floatingProducts[1].image} alt={floatingProducts[1].alt} className={imageClassName} />
          <div>
            <p className={nameClassName}>{floatingProducts[1].name}</p>
            <p className={metaClassName}>{floatingProducts[1].brand} · {floatingProducts[1].price}</p>
            <span className={`${matchClassName} ${floatingProducts[1].matchClassName}`}>{floatingProducts[1].match}</span>
          </div>
        </motion.div>

        <motion.div
          className={`${cardBaseClassName} ${compact ? "bottom-4 right-0 max-w-[11.5rem] translate-x-1" : "bottom-12 right-0 translate-x-2"}`}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: compact ? 4 : 2 }}
          whileHover={{ scale: 1.08, y: -2 }}
          whileTap={{ scale: 0.97 }}
          transition={{ ...transition, delay: 1.4 }}
        >
          <img src={floatingProducts[2].image} alt={floatingProducts[2].alt} className={imageClassName} />
          <div>
            <p className={nameClassName}>{floatingProducts[2].name}</p>
            <p className={metaClassName}>{floatingProducts[2].brand} · {floatingProducts[2].price}</p>
            <span className={`${matchClassName} ${floatingProducts[2].matchClassName}`}>{floatingProducts[2].match}</span>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

interface PendingInstagramSelection {
  sourceUrl: string;
  images: string[];
  imageBase64?: string;
}

function buildInstagramSelectionUrl(input: string, index: number): string {
  try {
    const url = new URL(input);
    url.searchParams.set("img_index", String(index + 1));
    return url.toString();
  } catch {
    return input;
  }
}

function getRequestedInstagramImageIndex(input: string): number | null {
  try {
    const url = new URL(input);
    const rawValue = url.searchParams.get("img_index");
    if (!rawValue) return null;

    const parsedIndex = Number.parseInt(rawValue, 10);
    if (!Number.isInteger(parsedIndex) || parsedIndex < 1) {
      return null;
    }

    return parsedIndex - 1;
  } catch {
    return null;
  }
}

const HeroSection = () => {
  const [url, setUrl] = useState("");
  const [market, setMarket] = useState<SearchMarketCode>(() => getPreferredMarket());
  const [isLoading, setIsLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [pendingInstagramSelection, setPendingInstagramSelection] = useState<PendingInstagramSelection | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    persistPreferredMarket(market);
  }, [market]);

  const trackEvent = useCallback(
    (eventName: Parameters<typeof fireAndForgetAnalyticsEvent>[0], metadata: Record<string, unknown> = {}) => {
      fireAndForgetAnalyticsEvent(eventName, {
        market,
        page: "/",
        metadata,
      });
    },
    [market],
  );

  const finalizeInstagramAnalysis = useCallback(async (
    sourceUrl: string,
    selectedImageUrl: string,
    imageBase64?: string,
  ) => {
    const result = imageBase64
      ? await analyzeOutfitFromBase64(imageBase64)
      : await analyzeOutfitFromImageUrl(selectedImageUrl);

    if (isNotFashion(result)) {
      toast({ title: "Not a Fashion Post", description: result.message });
      return false;
    }

    let displayUrl = selectedImageUrl;
    if (!displayUrl && imageBase64) {
      try {
        displayUrl = await uploadBase64ToStorage(imageBase64);
      } catch {
        displayUrl = `data:image/jpeg;base64,${imageBase64}`;
      }
    }

    trackEvent("analysis_completed", {
      sourceType: "instagram_url",
      totalItems: result.total_items,
      detectedBrand: result.detected_brand || "",
    });
    navigate("/results", { state: { analysis: result, source: sourceUrl, imageUrl: displayUrl, market } });
    return true;
  }, [market, navigate, toast, trackEvent]);

  const handleInstagramSelection = useCallback(async (index: number) => {
    if (!pendingInstagramSelection) return;

    setIsLoading(true);
    try {
      let selectedImageUrl = pendingInstagramSelection.images[index] || "";
      let selectedImageBase64 = index === 0 ? pendingInstagramSelection.imageBase64 : undefined;
      const selectionSourceUrl = buildInstagramSelectionUrl(pendingInstagramSelection.sourceUrl, index);

      if (!selectedImageBase64) {
        try {
          const refreshedSelection = await extractInstagramImages(selectionSourceUrl);
          selectedImageUrl = refreshedSelection.images[index] || refreshedSelection.images[0] || selectedImageUrl;
          selectedImageBase64 = refreshedSelection.imageBase64 || selectedImageBase64;
        } catch (error) {
          if (!selectedImageUrl) {
            throw error;
          }

          console.warn("Selected Instagram image refresh failed, using extracted image URL fallback", error);
        }
      }

      const completed = await finalizeInstagramAnalysis(
        selectionSourceUrl,
        selectedImageUrl,
        selectedImageBase64,
      );

      if (completed) {
        setPendingInstagramSelection(null);
      }
    } catch (err: unknown) {
      toast({
        title: "Analysis Failed",
        description: getErrorMessage(err),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [finalizeInstagramAnalysis, pendingInstagramSelection, toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    const trimmedUrl = url.trim();
    const sourceType = isInstagramUrl(trimmedUrl) ? "instagram_url" : "image_url";

    setPendingInstagramSelection(null);

    trackEvent("search_link_submitted", {
      sourceType,
      urlHost: (() => {
        try {
          return new URL(trimmedUrl).hostname.toLowerCase();
        } catch {
          return "unknown";
        }
      })(),
    });

    setIsLoading(true);
    try {
      // If it's an Instagram URL, extract the image first then analyze
      if (sourceType === "instagram_url") {
        const { images, imageBase64, caption } = await extractInstagramImages(trimmedUrl);
        if ((!images || images.length === 0) && !imageBase64) {
          toast({ title: "No Images Found", description: "Could not extract images from this post. Try uploading a screenshot instead." });
          return;
        }
        trackEvent("instagram_extract_succeeded", {
          sourceType,
          imageCount: images?.length ?? 0,
          hasCaption: Boolean(caption),
        });

        const requestedImageIndex = getRequestedInstagramImageIndex(trimmedUrl);
        if (
          requestedImageIndex !== null &&
          requestedImageIndex >= 0 &&
          requestedImageIndex < (images?.length ?? 0)
        ) {
          const selectedImageUrl = images[requestedImageIndex] || "";
          const shouldUseBase64 = requestedImageIndex === 0 && Boolean(imageBase64);
          await finalizeInstagramAnalysis(
            trimmedUrl,
            selectedImageUrl,
            shouldUseBase64 ? imageBase64 : undefined,
          );
          return;
        }

        if ((images?.length ?? 0) > 1) {
          setPendingInstagramSelection({
            sourceUrl: trimmedUrl,
            images,
            imageBase64,
          });
          return;
        }

        await finalizeInstagramAnalysis(trimmedUrl, images[0] || "", imageBase64);
        return;
      }

      // For direct image URLs
      const result = await analyzeOutfitFromImageUrl(trimmedUrl);
      if (isNotFashion(result)) {
        toast({ title: "Not a Fashion Post", description: result.message });
        return;
      }
      trackEvent("analysis_completed", {
        sourceType,
        totalItems: result.total_items,
        detectedBrand: result.detected_brand || "",
      });
      navigate("/results", { state: { analysis: result, source: trimmedUrl, imageUrl: trimmedUrl, market } });
    } catch (err: unknown) {
      toast({
        title: "Analysis Failed",
        description: getErrorMessage(err),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileDrop = useCallback(async (input: FileList | File[] | null, sourceType: "screenshot_upload" | "screenshot_paste" = "screenshot_upload") => {
    if (!input || input.length === 0) return;
    const file = input[0];
    if (!file.type.startsWith("image/")) {
      toast({ title: "Invalid file", description: "Please upload an image file (PNG, JPG)", variant: "destructive" });
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "File too large", description: "Please upload an image under 10MB", variant: "destructive" });
      return;
    }

    trackEvent(sourceType === "screenshot_paste" ? "screenshot_pasted" : "screenshot_uploaded", {
      sourceType,
      fileType: file.type,
      fileSize: file.size,
    });

    setIsLoading(true);
    try {
      // Upload through the edge function and use the returned signed URL for downstream search.
      const publicUrl = await uploadImageToStorage(file);
      
      const result = await analyzeOutfitFromImage(file);
      if (isNotFashion(result)) {
        toast({
          title: "Not a Fashion Post",
          description: result.message,
        });
        return;
      }
      trackEvent("analysis_completed", {
        sourceType,
        totalItems: result.total_items,
        detectedBrand: result.detected_brand || "",
      });
      navigate("/results", { state: { analysis: result, source: file.name, imageUrl: publicUrl, market } });
    } catch (err: unknown) {
      toast({
        title: "Analysis Failed",
        description: getErrorMessage(err),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [navigate, toast, trackEvent, market]);

  // Clipboard paste handler — right-click Copy Image on Instagram, then Ctrl+V here
  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    for (const item of Array.from(items)) {
      if (item.type.startsWith("image/")) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) {
          handleFileDrop([file], "screenshot_paste");
        }
        return;
      }
    }
  }, [handleFileDrop]);

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = () => setIsDragging(false);
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileDrop(e.dataTransfer.files);
  };

  return (
    <section
      id="discover"
      className="relative pt-24 pb-4 md:pt-28 md:pb-8 px-6 overflow-hidden"
      onPaste={handlePaste}
    >
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-16 items-center">
          {/* Left content */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...transition, delay: 0.1 }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1.5 border border-border rounded-sm mb-8">
              <span className="w-1.5 h-1.5 rounded-full bg-gold" />
              <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                Instagram Shopping, Simplified
              </span>
            </div>

            <h1 className="font-editorial text-6xl md:text-7xl lg:text-[6.75rem] leading-[0.88] text-foreground mb-6 tracking-[-0.045em]">
              <span className="font-medium">Find the</span>
              <br />
              <span className="italic text-gold-dark font-normal">exact look</span>
              <br />
              <span className="font-medium">you saw.</span>
            </h1>

            <p className="text-base md:text-[1.05rem] text-muted-foreground leading-relaxed max-w-lg mb-10">
              Paste a public Instagram post URL or upload a screenshot. SearchOutfit identifies every piece and surfaces shoppable matches without asking you to create an account.
            </p>

            <div className="mb-8 md:hidden">
              <HeroPreview compact currentSlide={currentSlide} onSelectSlide={setCurrentSlide} />
            </div>

            {/* Search input */}
            <form id="hero-search" onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 mb-4">
              <div className="relative flex-1">
                <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  aria-label="Instagram or image URL"
                  placeholder="Paste any image URL or Instagram link..."
                  disabled={isLoading}
                  className="w-full pl-10 pr-4 py-3.5 bg-card border border-border rounded-sm text-base md:text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
                />
              </div>
              <button 
                type="submit"
                disabled={isLoading || !url.trim()}
                className="flex items-center justify-center gap-2 px-6 py-3.5 bg-foreground text-background rounded-sm text-sm font-medium hover:opacity-90 transition-opacity whitespace-nowrap disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    Find the Look
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Divider */}
            <div className="flex items-center gap-4 mb-4">
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs text-muted-foreground">or upload screenshot</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            {/* Upload area */}
            <label
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border border-dashed rounded-sm p-6 flex flex-col items-center gap-2 mb-6 cursor-pointer transition-colors ${
                isDragging ? "border-gold bg-warm-50" : "border-warm-300 hover:border-warm-400"
              } ${isLoading ? "opacity-50 pointer-events-none" : ""}`}
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />
              ) : (
                <Image className="w-5 h-5 text-muted-foreground" />
              )}
              <span className="text-sm font-medium text-foreground">
                {isDragging ? "Drop screenshot here" : "Drop screenshot here"}
              </span>
              <span className="text-xs text-muted-foreground">PNG, JPG up to 10MB · Or paste a screenshot</span>
              <input
                type="file"
                accept="image/png,image/jpeg,image/jpg"
                className="hidden"
                disabled={isLoading}
                onChange={(e) => handleFileDrop(e.target.files, "screenshot_upload")}
              />
            </label>

            {/* Trust badges */}
            <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5" />
                No account needed
              </span>
              <span className="flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5" />
                Public posts only
              </span>
              <span className="flex items-center gap-1.5">
                <Heart className="w-3.5 h-3.5" />
                Save your favorites
              </span>
            </div>

            <div className="mt-5 max-w-[16rem]">
              <CountrySelect value={market} onChange={setMarket} />
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed mt-4 max-w-xl">
              By submitting a link or screenshot, you confirm you have the rights or permission to use that content. SearchOutfit processes submitted images through third-party analysis and shopping providers.
            </p>
          </motion.div>

          {/* Right - Hero image with floating cards */}
          <motion.div
            className="relative hidden md:block"
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ ...transition, delay: 0.3 }}
          >
            <HeroPreview currentSlide={currentSlide} onSelectSlide={setCurrentSlide} />
          </motion.div>
        </div>

        {/* Scroll indicator */}
        <div className="flex flex-col items-center mt-4 md:mt-6 gap-2">
          <span className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">Scroll</span>
          <div className="w-px h-8 bg-border animate-scroll-bounce" />
        </div>
      </div>

      <Dialog
        open={pendingInstagramSelection !== null}
        onOpenChange={(open) => {
          if (!open && !isLoading) {
            setPendingInstagramSelection(null);
          }
        }}
      >
        <DialogContent className="max-h-[85vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Choose the photo to analyze</DialogTitle>
            <DialogDescription>
              This Instagram post has multiple images. Pick the one with the outfit you want to shop.
            </DialogDescription>
          </DialogHeader>

          <div className="grid max-h-[60vh] grid-cols-2 gap-4 overflow-y-auto pr-1 md:grid-cols-3">
            {pendingInstagramSelection?.images.map((image, index) => (
              <button
                key={image}
                type="button"
                onClick={() => void handleInstagramSelection(index)}
                disabled={isLoading}
                aria-label={`Analyze photo ${index + 1}`}
                className="touch-manipulation overflow-hidden rounded-sm border border-border bg-card text-left transition hover:border-foreground/30 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <img
                  src={image}
                  alt={`Instagram photo ${index + 1}`}
                  className="aspect-square w-full object-cover"
                />
                <div className="flex items-center justify-between px-3 py-2">
                  <span className="text-sm font-medium text-foreground">Photo {index + 1}</span>
                  <span className="text-xs text-muted-foreground">
                    {isLoading ? "Analyzing..." : "Select"}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
};

export default HeroSection;
