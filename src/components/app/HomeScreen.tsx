import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, ImagePlus, Images, Link2, Loader2, ShieldCheck, Sparkles } from "lucide-react";

import SearchLimitSheet from "@/components/app/SearchLimitSheet";
import QuotaBadge from "@/components/app/QuotaBadge";
import CountrySelect from "@/components/CountrySelect";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useSearchAccess } from "@/hooks/use-search-access";
import { useToast } from "@/hooks/use-toast";
import { fireAndForgetAnalyticsEvent } from "@/lib/analytics";
import {
  analyzeOutfitFromBase64,
  analyzeOutfitFromImage,
  analyzeOutfitFromImageUrl,
  extractInstagramImages,
  isInstagramUrl,
  isNotFashion,
  uploadBase64ToStorage,
  uploadImageToStorage,
} from "@/lib/outfitApi";
import { getPreferredMarket, persistPreferredMarket, type SearchMarketCode } from "@/lib/market";

interface PendingInstagramSelection {
  imageBase64?: string;
  images: string[];
  sourceUrl: string;
}

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "Could not analyze the outfit. Please try again.";

const isGuestLimitError = (error: unknown) =>
  error instanceof Error && /guest search limit reached/i.test(error.message);

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

const HomeScreen = () => {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [limitMode, setLimitMode] = useState<"auth" | null>(null);
  const [market, setMarket] = useState<SearchMarketCode>(() => getPreferredMarket());
  const [pendingInstagramSelection, setPendingInstagramSelection] = useState<PendingInstagramSelection | null>(null);
  const [url, setUrl] = useState("");
  const { state, remainingSearches, consumeSignedInSearch, refresh, usage } = useSearchAccess();
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

  const consumeSearchAllowance = useCallback(async (input?: {
    metadata?: Record<string, unknown>;
    requestType?: "image_upload" | "instagram_url" | "unknown";
  }) => {
    if (usage.hasActiveSubscription) return true;
    if (usage.isSignedIn) {
      const result = await consumeSignedInSearch(input);
      return result.allowed;
    }

    return true;
  }, [consumeSignedInSearch, usage.hasActiveSubscription, usage.isSignedIn]);

  const requireSearchAllowance = useCallback(async (input?: {
    metadata?: Record<string, unknown>;
    requestType?: "image_upload" | "instagram_url" | "unknown";
  }) => {
    if (state.status === "allowed") {
      return consumeSearchAllowance(input);
    }

    setLimitMode("auth");
    return false;
  }, [consumeSearchAllowance, state.status]);

  const finalizeInstagramAnalysis = useCallback(async (
    sourceUrl: string,
    selectedImageUrl: string,
    imageBase64?: string,
  ) => {
    const result = imageBase64
      ? await analyzeOutfitFromBase64(imageBase64)
      : await analyzeOutfitFromImageUrl(selectedImageUrl);

    if (isNotFashion(result)) {
      toast({ description: result.message, title: "Not a Fashion Post" });
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
      detectedBrand: result.detected_brand || "",
      sourceType: "instagram_url",
      totalItems: result.total_items,
    });

    if (!usage.isSignedIn) {
      await refresh();
    }

    navigate("/results", {
      state: { analysis: result, imageUrl: displayUrl, market, source: sourceUrl },
    });
    return true;
  }, [market, navigate, refresh, toast, trackEvent, usage.isSignedIn]);

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
    } catch (error) {
      if (isGuestLimitError(error)) {
        await refresh();
        setLimitMode("auth");
        return;
      }

      toast({
        description: getErrorMessage(error),
        title: "Analysis Failed",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [finalizeInstagramAnalysis, pendingInstagramSelection, toast]);

  const handleSubmit = useCallback(async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedUrl = url.trim();
    if (!trimmedUrl) return;

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

    if (!(await requireSearchAllowance({ requestType: sourceType === "instagram_url" ? "instagram_url" : "image_upload" }))) {
      return;
    }

    setIsLoading(true);

    try {
      if (sourceType === "instagram_url") {
        const { caption, imageBase64, images } = await extractInstagramImages(trimmedUrl);
        if ((!images || images.length === 0) && !imageBase64) {
          toast({
            description: "Could not extract images from this post. Try uploading a screenshot instead.",
            title: "No Images Found",
          });
          return;
        }

        trackEvent("instagram_extract_succeeded", {
          hasCaption: Boolean(caption),
          imageCount: images?.length ?? 0,
          sourceType,
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
            imageBase64,
            images,
            sourceUrl: trimmedUrl,
          });
          return;
        }

        await finalizeInstagramAnalysis(trimmedUrl, images[0] || "", imageBase64);
        return;
      }

      const result = await analyzeOutfitFromImageUrl(trimmedUrl);
      if (isNotFashion(result)) {
        toast({ description: result.message, title: "Not a Fashion Post" });
        return;
      }

      trackEvent("analysis_completed", {
        detectedBrand: result.detected_brand || "",
        sourceType,
        totalItems: result.total_items,
      });
      if (!usage.isSignedIn) {
        await refresh();
      }
      navigate("/results", { state: { analysis: result, imageUrl: trimmedUrl, market, source: trimmedUrl } });
    } catch (error) {
      if (isGuestLimitError(error)) {
        await refresh();
        setLimitMode("auth");
        return;
      }

      toast({
        description: getErrorMessage(error),
        title: "Analysis Failed",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [finalizeInstagramAnalysis, market, navigate, requireSearchAllowance, toast, trackEvent, url]);

  const handleFileSelection = useCallback(async (input: FileList | File[] | null, sourceType: "screenshot_upload" | "screenshot_paste" = "screenshot_upload") => {
    if (!input || input.length === 0) return;
    const file = input[0];
    if (!file.type.startsWith("image/")) {
      toast({ description: "Please upload an image file (PNG or JPG).", title: "Invalid file", variant: "destructive" });
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast({ description: "Please upload an image under 10MB.", title: "File too large", variant: "destructive" });
      return;
    }

    if (!(await requireSearchAllowance({ requestType: "image_upload" }))) {
      return;
    }

    trackEvent(sourceType === "screenshot_paste" ? "screenshot_pasted" : "screenshot_uploaded", {
      fileSize: file.size,
      fileType: file.type,
      sourceType,
    });

    setIsLoading(true);
    try {
      const publicUrl = await uploadImageToStorage(file);
      const result = await analyzeOutfitFromImage(file);

      if (isNotFashion(result)) {
        toast({ description: result.message, title: "Not a Fashion Post" });
        return;
      }

      trackEvent("analysis_completed", {
        detectedBrand: result.detected_brand || "",
        sourceType,
        totalItems: result.total_items,
      });
      if (!usage.isSignedIn) {
        await refresh();
      }
      navigate("/results", { state: { analysis: result, imageUrl: publicUrl, market, source: file.name } });
    } catch (error) {
      if (isGuestLimitError(error)) {
        await refresh();
        setLimitMode("auth");
        return;
      }

      toast({
        description: getErrorMessage(error),
        title: "Analysis Failed",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [market, navigate, refresh, requireSearchAllowance, toast, trackEvent, usage.isSignedIn]);

  const handlePaste = useCallback((event: React.ClipboardEvent<HTMLDivElement>) => {
    const items = event.clipboardData.items;
    for (const item of Array.from(items)) {
      if (!item.type.startsWith("image/")) continue;
      event.preventDefault();
      const file = item.getAsFile();
      if (file) {
        void handleFileSelection([file], "screenshot_paste");
      }
      return;
    }
  }, [handleFileSelection]);

  const handleDrop = useCallback((event: React.DragEvent<HTMLButtonElement>) => {
    event.preventDefault();
    setIsDragging(false);
    void handleFileSelection(event.dataTransfer.files);
  }, [handleFileSelection]);

  const heroStats = useMemo(() => ([
    { label: "Inputs", value: "Instagram URLs and screenshots" },
    { label: "Guest access", value: "3 free searches" },
    { label: "Signed-in access", value: "Unlimited searches after sign-in" },
  ]), []);

  return (
    <section className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-5xl flex-col px-4 pb-10 pt-24 sm:px-6" onPaste={handlePaste}>
      <div className="grid gap-6 lg:grid-cols-[1.25fr_0.85fr]">
        <div className="rounded-[32px] border border-border bg-card/80 p-5 shadow-sm backdrop-blur sm:p-8">
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-2 rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
              <Sparkles className="h-3.5 w-3.5" />
              SearchOutfit for iPhone
            </span>
            <QuotaBadge remainingSearches={remainingSearches} state={state} />
          </div>

          <div className="mt-6 space-y-3">
            <h1 className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
              Find the exact look from an Instagram post or screenshot.
            </h1>
            <p className="max-w-xl text-sm leading-6 text-muted-foreground sm:text-base">
              Paste a public Instagram post URL or upload a screenshot. SearchOutfit analyzes the outfit and sends you to shoppable matches in minutes.
            </p>
          </div>

          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground" htmlFor="instagram-post-url">
                Instagram post URL
              </label>
              <div className="flex gap-3">
                <div className="relative flex-1">
                  <Link2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="instagram-post-url"
                    value={url}
                    onChange={(event) => setUrl(event.target.value)}
                    placeholder="https://www.instagram.com/p/..."
                    className="h-12 rounded-2xl border-border pl-10"
                    disabled={isLoading}
                  />
                </div>
                <Button className="h-12 rounded-2xl px-5" disabled={!url.trim() || isLoading} type="submit">
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Analyzing
                    </>
                  ) : (
                    <>
                      Analyze Instagram Link
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>
            </div>

            <div className="rounded-3xl border border-dashed border-border bg-background/80 p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-foreground">Screenshot or photo upload</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Drop, paste, or upload an image up to 10MB.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 rounded-2xl"
                  aria-label="Upload screenshot or photo"
                  disabled={isLoading}
                  onClick={() => inputRef.current?.click()}
                  onDragOver={(event) => {
                    event.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                >
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="mr-2 h-4 w-4" />}
                  Upload screenshot or photo
                </Button>
              </div>

              <input
                ref={inputRef}
                type="file"
                accept="image/png,image/jpeg,image/jpg"
                className="hidden"
                disabled={isLoading}
                onChange={(event) => {
                  void handleFileSelection(event.target.files, "screenshot_upload");
                  event.target.value = "";
                }}
              />

              <div className={`mt-3 rounded-2xl px-3 py-2 text-xs ${isDragging ? "bg-secondary text-secondary-foreground" : "bg-secondary/60 text-muted-foreground"}`}>
                Tip: you can also paste an image directly into this screen.
              </div>
            </div>
          </form>

          <div className="mt-5 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary/60 px-3 py-1">
              <ShieldCheck className="h-3.5 w-3.5" />
              No login required for the first 3 searches
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary/60 px-3 py-1">
              <Images className="h-3.5 w-3.5" />
              Public Instagram posts and screenshots supported
            </span>
          </div>

          <div className="mt-5">
            <CountrySelect value={market} onChange={setMarket} />
          </div>
        </div>

        <aside className="space-y-4">
          <div className="rounded-[28px] border border-border bg-background p-5 shadow-sm">
            <p className="text-sm font-medium text-foreground">How the app works</p>
            <ol className="mt-4 space-y-3 text-sm text-muted-foreground">
              <li>1. Paste an Instagram link or upload a screenshot.</li>
              <li>2. SearchOutfit detects the outfit pieces.</li>
              <li>3. Browse product matches and save favorites after signup.</li>
            </ol>
          </div>

          <div className="rounded-[28px] border border-border bg-background p-5 shadow-sm">
            <p className="text-sm font-medium text-foreground">What ships in v1</p>
            <div className="mt-4 space-y-3">
              {heroStats.map((item) => (
                <div key={item.label} className="rounded-2xl bg-secondary/40 px-4 py-3">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">{item.label}</p>
                  <p className="mt-1 text-sm font-medium text-foreground">{item.value}</p>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>

      <Dialog open={Boolean(pendingInstagramSelection)} onOpenChange={(open) => !open && setPendingInstagramSelection(null)}>
        <DialogContent className="max-h-[85vh] max-w-md overflow-y-auto rounded-3xl">
          <DialogHeader>
            <DialogTitle>Choose the photo to analyze</DialogTitle>
          </DialogHeader>
          <div className="grid max-h-[60vh] grid-cols-2 gap-3 overflow-y-auto pr-1">
            {pendingInstagramSelection?.images.map((imageUrl, index) => (
              <button
                key={imageUrl}
                type="button"
                className="touch-manipulation overflow-hidden rounded-2xl border border-border bg-card text-left"
                onClick={() => void handleInstagramSelection(index)}
              >
                <img alt={`Instagram option ${index + 1}`} className="aspect-square w-full object-cover" src={imageUrl} />
                <span className="block px-3 py-2 text-sm font-medium text-foreground">Analyze photo {index + 1}</span>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <SearchLimitSheet
        mode={limitMode}
        open={limitMode !== null}
        onOpenChange={(open) => {
          if (!open) setLimitMode(null);
        }}
      />
    </section>
  );
};

export default HomeScreen;
