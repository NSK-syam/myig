import { invokeAppFunction } from "@/lib/appAccess";

function toBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== "string") {
        reject(new Error("Failed to encode image"));
        return;
      }

      resolve(result.split(",")[1] || "");
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

async function resolveFunctionError(error: unknown, fallbackMessage: string): Promise<Error> {
  const context = error && typeof error === "object" && "context" in error
    ? (error as { context?: unknown }).context
    : null;
  const response = context && typeof context === "object" && "json" in context
    && typeof (context as { json?: unknown }).json === "function"
    ? (context as Response)
    : null;

  if (response) {
    const payload = await response.json().catch(() => null) as Record<string, unknown> | null;
    const responseStatus = typeof response.status === "number" ? response.status : null;
    const payloadError = payload && typeof payload.error === "string" ? payload.error : "";
    const payloadDetails = payload && typeof payload.details === "string" ? payload.details : "";
    const payloadMessage = [payloadError, payloadDetails].join(" ");

    if (
      responseStatus === 529
      || /overloaded/i.test(payloadMessage)
      || /AI analysis error:\s*529/i.test(payloadMessage)
    ) {
      return new Error("SearchOutfit is busy right now. Please try again in a few seconds.");
    }

    if (payload && typeof payload.error === "string") {
      return new Error(payload.error);
    }
  }

  if (error && typeof error === "object" && "message" in error) {
    const message = String((error as { message?: unknown }).message ?? fallbackMessage);
    if (/Edge Function returned a non-2xx status code/i.test(message)) {
      if (/instagram/i.test(fallbackMessage)) {
        return new Error("Could not extract images from this Instagram post. Please try uploading a screenshot instead.");
      }

      return new Error("SearchOutfit hit a temporary server error. Please try again.");
    }

    return new Error(message);
  }

  return new Error(fallbackMessage);
}

export async function uploadImageToStorage(file: File): Promise<string> {
  const imageBase64 = await toBase64(file);
  const { data, error } = await invokeAppFunction("upload-image", {
    body: { imageBase64, contentType: file.type },
  });

  if (error) throw await resolveFunctionError(error, "Upload failed");
  if (!data?.success || !data?.signedUrl) {
    throw new Error(data?.error || "Upload failed");
  }

  return data.signedUrl as string;
}

export async function uploadBase64ToStorage(base64: string): Promise<string> {
  const { data, error } = await invokeAppFunction("upload-image", {
    body: { imageBase64: base64, contentType: "image/jpeg" },
  });

  if (error) throw await resolveFunctionError(error, "Upload failed");
  if (!data?.success || !data?.signedUrl) {
    throw new Error(data?.error || "Upload failed");
  }

  return data.signedUrl as string;
}

export interface OutfitItem {
  name: string;
  category: string;
  color: string;
  material: string;
  style: string;
  brand: string;
  brand_guess: string;
  price_estimate: string;
  confidence: "high" | "medium" | "low";
  gender: string;
  search_query: string;
  shopping_links: string[];
}

export interface OutfitAnalysis {
  items: OutfitItem[];
  overall_style: string;
  occasion: string;
  season: string;
  total_items: number;
  confidence_score: number;
  detected_brand: string;
  brand_domain: string;
  brand_direct_url: string;
  celebrity_name: string;
  celebrity_brand: string;
}

export interface NotFashionResult {
  not_fashion: true;
  content_type: string;
  message: string;
}

export interface ProductResult {
  title: string;
  url: string;
  image?: string;
  proxyImageUrl?: string;
  price?: string;
  originalPrice?: string;
  discount?: string;
  offer?: string;
  availability?: string;
  shipping?: string;
  source?: string;
  badge?: string;
}

export interface ProductSearchResults {
  [itemName: string]: ProductResult[];
}

export interface ProductSearchResponse {
  products: ProductResult[];
  itemResults?: ProductSearchResults;
  searchUnavailable?: boolean;
  warning?: string;
}

export interface SearchBrandContext {
  detectedBrand?: string;
  brandDomain?: string;
  brandDirectUrl?: string;
}

export type AnalysisResult = OutfitAnalysis | NotFashionResult;

export function isNotFashion(result: AnalysisResult): result is NotFashionResult {
  return "not_fashion" in result && result.not_fashion === true;
}

export function isInstagramUrl(url: string): boolean {
  try {
    const parsed = new URL(url.trim());
    if (parsed.protocol !== "https:") return false;
    if (!["instagram.com", "www.instagram.com"].includes(parsed.hostname.toLowerCase())) {
      return false;
    }

    return /^\/(?:[A-Za-z0-9_.]+\/)?(p|reels?|tv)\//.test(parsed.pathname);
  } catch {
    return false;
  }
}

export async function extractInstagramImages(instagramUrl: string): Promise<{ images: string[]; imageBase64?: string; caption?: string }> {
  const { data, error } = await invokeAppFunction("extract-instagram", {
    body: { instagramUrl },
  });

  if (error) throw await resolveFunctionError(error, "Failed to extract Instagram images");
  if (!data?.success) throw new Error(data?.error || "Instagram extraction failed");

  return { images: data.images, imageBase64: data.imageBase64, caption: data.caption };
}

export async function analyzeOutfitFromBase64(base64: string): Promise<AnalysisResult> {
  return invokeAnalysis({ imageBase64: base64 });
}

async function invokeAnalysis(body: Record<string, unknown>): Promise<AnalysisResult> {
  const { data, error } = await invokeAppFunction("analyze-outfit", { body });

  if (error) throw await resolveFunctionError(error, "Failed to analyze outfit");
  
  if (data?.not_fashion) {
    return {
      not_fashion: true,
      content_type: data.content_type || "unknown",
      message: data.message || "This doesn't appear to be a fashion post.",
    } as NotFashionResult;
  }

  if (!data?.success) throw new Error(data?.error || "Analysis failed");
  return data.data as OutfitAnalysis;
}

export async function analyzeOutfitFromImage(file: File): Promise<AnalysisResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64 = (reader.result as string).split(",")[1];
        resolve(await invokeAnalysis({ imageBase64: base64 }));
      } catch (e) {
        reject(e);
      }
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

export async function analyzeOutfitFromImageUrl(imageUrl: string): Promise<AnalysisResult> {
  return invokeAnalysis({ imageUrl });
}

export async function searchProductsByImage(
  imageUrl: string,
  items?: OutfitItem[],
  market?: string,
  brandContext?: SearchBrandContext,
): Promise<ProductSearchResponse> {
  const allItems = (items || []).map(item => ({
    item_name: item.name,
    brand: item.brand || "",
    search_query: item.search_query || `${item.brand || ""} ${item.color || ""} ${item.material || ""} ${item.name}`.trim(),
    color: item.color || "",
    material: item.material || "",
    style: item.style || "",
    category: item.category || "",
    gender: item.gender || "",
  }));

  const { data, error } = await invokeAppFunction("search-products", {
    body: {
      imageUrl,
      brandedItems: allItems,
      market,
      detectedBrand: brandContext?.detectedBrand,
      brandDomain: brandContext?.brandDomain,
      brandDirectUrl: brandContext?.brandDirectUrl,
    },
  });

  if (error) {
    throw await resolveFunctionError(error, "Visual product search failed");
  }

  if (!data?.success) {
    throw new Error(data?.error || "Visual product search failed");
  }

  return {
    products: data.products ?? [],
    itemResults: data.itemResults ?? undefined,
    searchUnavailable: data.searchUnavailable === true,
    warning: typeof data.warning === "string" ? data.warning : undefined,
  };
}
