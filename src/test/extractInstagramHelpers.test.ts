import { describe, expect, it } from "vitest";

import {
  buildFinalImageRefs,
  canServeRequestedIndexFromCache,
  extractImagesFromHtml,
  getSelectedImageRef,
  getRequestedCarouselImageIndex,
  hasCachedInstagramImages,
  isPrivateOrUnavailablePostHtml,
  isPlausibleInstagramImageCount,
  pickRicherImageSet,
  parseInstagramPostUrl,
  salvageCachedImageRefsByByteSize,
  filterDominantCachedInstagramRefs,
  shouldUseCachedInstagramImages,
  shouldAttemptEmbedFallback,
} from "../../supabase/functions/extract-instagram/helpers";

describe("parseInstagramPostUrl", () => {
  it("canonicalizes shared Instagram post URLs with igsh params", () => {
    expect(
      parseInstagramPostUrl("https://www.instagram.com/p/DRZ66oTDdZa/?igsh=MXlyZ2M4ODh4dQ=="),
    ).toEqual({
      shortcode: "DRZ66oTDdZa",
      normalizedUrl: "https://www.instagram.com/p/DRZ66oTDdZa/",
      requestedIndex: null,
    });
  });

  it("canonicalizes reel URLs to a clean normalized URL", () => {
    expect(
      parseInstagramPostUrl("https://www.instagram.com/reel/ABC123xyz/?utm_source=ig_web_copy_link"),
    ).toEqual({
      shortcode: "ABC123xyz",
      normalizedUrl: "https://www.instagram.com/reel/ABC123xyz/",
      requestedIndex: null,
    });
  });

  it("trims mobile share tokens appended to the shortcode path segment", () => {
    expect(
      parseInstagramPostUrl("https://www.instagram.com/p/DUc72HFATNdnjLrtkh6TA9pCGnVxW6kGYBbxag0/?igsh=cGZiZXBxb2NwZGIw"),
    ).toEqual({
      shortcode: "DUc72HFATNd",
      normalizedUrl: "https://www.instagram.com/p/DUc72HFATNd/",
      requestedIndex: null,
    });
  });

  it("parses the requested carousel image index from the URL", () => {
    expect(
      parseInstagramPostUrl("https://www.instagram.com/p/DROSybYkTsD/?img_index=2"),
    ).toEqual({
      shortcode: "DROSybYkTsD",
      normalizedUrl: "https://www.instagram.com/p/DROSybYkTsD/",
      requestedIndex: 1,
    });
  });
});

describe("extractImagesFromHtml", () => {
  it("extracts image URLs from current embed HTML fields", () => {
    const html = `
      <html>
        <head>
          <meta property="og:description" content="Caption text here" />
          <meta property="og:image:secure_url" content="https://cdn.example.com/secure.jpg" />
        </head>
        <body>
          <script>
            window.__DATA__ = {
              "thumbnail_src":"https:\\/\\/cdn.example.com\\/thumb.jpg",
              "display_url":"https:\\/\\/cdn.example.com\\/display.jpg",
              "display_resources":[{"src":"https:\\/\\/cdn.example.com\\/resource.jpg"}]
            };
          </script>
        </body>
      </html>
    `;

    expect(extractImagesFromHtml(html)).toEqual({
      images: [
        "https://cdn.example.com/display.jpg",
        "https://cdn.example.com/thumb.jpg",
        "https://cdn.example.com/resource.jpg",
        "https://cdn.example.com/secure.jpg",
      ],
      caption: "Caption text here",
    });
  });

  it("extracts carousel images from Instagram's escaped embed payload", () => {
    const html = `
      <html>
        <head>
          <meta property="og:description" content="Escaped embed caption" />
        </head>
        <body>
          <script>
            window.__EMBED_DATA__ = "{\\"items\\":[{\\"__typename\\":\\"GraphImage\\",\\"display_url\\":\\"https:\\\\\\/\\\\\\/cdn.example.com\\\\\\/look-1.jpg\\"},{\\"__typename\\":\\"GraphImage\\",\\"display_url\\":\\"https:\\\\\\/\\\\\\/cdn.example.com\\\\\\/look-2.jpg\\"},{\\"__typename\\":\\"GraphImage\\",\\"display_url\\":\\"https:\\\\\\/\\\\\\/cdn.example.com\\\\\\/look-3.jpg\\"}]}";
          </script>
        </body>
      </html>
    `;

    expect(extractImagesFromHtml(html)).toEqual({
      images: [
        "https://cdn.example.com/look-1.jpg",
        "https://cdn.example.com/look-2.jpg",
        "https://cdn.example.com/look-3.jpg",
      ],
      caption: "Escaped embed caption",
    });
  });

  it("extracts bare scontent reel poster URLs from current Instagram HTML", () => {
    const html = `
      <html>
        <head>
          <meta property="og:description" content="Reel caption" />
        </head>
        <body>
          <script>
            window.__REEL_DATA__ = {
              "best_image":"scontent-dfw5-3.cdninstagram.com/v/t51.71878-15/656346072_1679012336560196_6916736843517422306_n.jpg?stp=cmp1_dst-jpg_e35_s640x640_tt6&amp;_nc_cat=1&amp;_nc_ht=scontent-dfw5-3.cdninstagram.com&amp;oe=69CA18E3"
            };
          </script>
        </body>
      </html>
    `;

    expect(extractImagesFromHtml(html)).toEqual({
      images: [
        "https://scontent-dfw5-3.cdninstagram.com/v/t51.71878-15/656346072_1679012336560196_6916736843517422306_n.jpg?stp=cmp1_dst-jpg_e35_s640x640_tt6&_nc_cat=1&_nc_ht=scontent-dfw5-3.cdninstagram.com&oe=69CA18E3",
      ],
      caption: "Reel caption",
    });
  });

  it("ignores incidental cdninstagram image urls outside Instagram media fields", () => {
    const html = `
      <html>
        <head>
          <meta property="og:description" content="Zendaya post" />
        </head>
        <body>
          <script>
            window.__MEDIA__ = {
              "display_url":"https:\\/\\/cdn.example.com\\/zendaya-main.jpg",
              "thumbnail_src":"https:\\/\\/cdn.example.com\\/zendaya-thumb.jpg"
            };
          </script>
          <img src="https://scontent-ord5-2.cdninstagram.com/v/t51.2885-19/avatar_150x150.jpg?_nc_ht=scontent-ord5-2.cdninstagram.com" />
          <div data-preview="scontent-ord5-2.cdninstagram.com/v/t51.2885-15/random-preview.jpg?_nc_ht=scontent-ord5-2.cdninstagram.com"></div>
        </body>
      </html>
    `;

    expect(extractImagesFromHtml(html)).toEqual({
      images: [
        "https://cdn.example.com/zendaya-main.jpg",
        "https://cdn.example.com/zendaya-thumb.jpg",
      ],
      caption: "Zendaya post",
    });
  });
});

describe("buildFinalImageRefs", () => {
  it("preserves every extracted image when only some images are proxied", () => {
    expect(
      buildFinalImageRefs(
        [
          "https://cdn.example.com/look-1.jpg",
          "https://cdn.example.com/look-2.jpg",
          "https://cdn.example.com/look-3.jpg",
        ],
        ["instagram/ABC123/0.jpg", null, "instagram/ABC123/2.jpg"],
      ),
    ).toEqual([
      "instagram/ABC123/0.jpg",
      "https://cdn.example.com/look-2.jpg",
      "instagram/ABC123/2.jpg",
    ]);
  });
});

describe("pickRicherImageSet", () => {
  it("prefers the fallback image set when it contains more carousel images", () => {
    expect(
      pickRicherImageSet(
        ["https://cdn.example.com/look-1.jpg"],
        [
          "https://cdn.example.com/look-1.jpg",
          "https://cdn.example.com/look-2.jpg",
          "https://cdn.example.com/look-3.jpg",
        ],
      ),
    ).toEqual([
      "https://cdn.example.com/look-1.jpg",
      "https://cdn.example.com/look-2.jpg",
      "https://cdn.example.com/look-3.jpg",
    ]);
  });
});

describe("cache selection helpers", () => {
  it("still inspects cached instagram images when a specific slide was requested", () => {
    expect(
      hasCachedInstagramImages([
        "instagram/CpeEJ57LAF9/0.jpg",
        "instagram/CpeEJ57LAF9/1.jpg",
      ]),
    ).toBe(true);
  });

  it("refuses to use polluted cached instagram image sets with impossible slide counts", () => {
    expect(
      shouldUseCachedInstagramImages(
        Array.from({ length: 25 }, (_, index) => `instagram/CpeEJ57LAF9/${index}.jpg`),
      ),
    ).toBe(false);
  });

  it("refuses to use salvaged cached instagram image refs with non-contiguous slide indexes", () => {
    expect(
      shouldUseCachedInstagramImages([
        "instagram/CpeEJ57LAF9/20_1774643610710.jpg",
        "instagram/CpeEJ57LAF9/16_1774643610709.jpg",
        "instagram/CpeEJ57LAF9/22_1774643610706.jpg",
      ]),
    ).toBe(false);
  });

  it("rejects cached image counts that exceed Instagram's maximum slide count", () => {
    expect(isPlausibleInstagramImageCount(27)).toBe(false);
    expect(isPlausibleInstagramImageCount(20)).toBe(true);
  });

  it("salvages polluted cached image sets by keeping only the large plausible media files", () => {
    expect(
      salvageCachedImageRefsByByteSize([
        { ref: "instagram/DUtUXjsDgh_/0.jpg", byteLength: 46_140 },
        { ref: "instagram/DUtUXjsDgh_/1.jpg", byteLength: 4_188 },
        { ref: "instagram/DUtUXjsDgh_/2.jpg", byteLength: 241_691 },
        { ref: "instagram/DUtUXjsDgh_/3.jpg", byteLength: 4_188 },
        { ref: "instagram/DUtUXjsDgh_/4.jpg", byteLength: 1_526 },
      ]),
    ).toEqual(["instagram/DUtUXjsDgh_/2.jpg"]);
  });

  it("drops much smaller incidental thumbnails when dominant Instagram post media is present", () => {
    expect(
      salvageCachedImageRefsByByteSize([
        { ref: "instagram/CpeEJ57LAF9/0.jpg", byteLength: 138_545 },
        { ref: "instagram/CpeEJ57LAF9/1.jpg", byteLength: 145_420 },
        { ref: "instagram/CpeEJ57LAF9/2.jpg", byteLength: 131_512 },
        { ref: "instagram/CpeEJ57LAF9/3.jpg", byteLength: 56_470 },
        { ref: "instagram/CpeEJ57LAF9/4.jpg", byteLength: 12_256 },
        { ref: "instagram/CpeEJ57LAF9/5.jpg", byteLength: 9_808 },
      ]),
    ).toEqual([
      "instagram/CpeEJ57LAF9/0.jpg",
      "instagram/CpeEJ57LAF9/1.jpg",
      "instagram/CpeEJ57LAF9/2.jpg",
    ]);
  });

  it("filters polluted cached Instagram refs down to the dominant slide set", () => {
    expect(
      filterDominantCachedInstagramRefs(
        [
          "instagram/CpeEJ57LAF9/0.jpg",
          "instagram/CpeEJ57LAF9/1.jpg",
          "instagram/CpeEJ57LAF9/2.jpg",
          "instagram/CpeEJ57LAF9/3.jpg",
          "instagram/CpeEJ57LAF9/4.jpg",
          "instagram/CpeEJ57LAF9/5.jpg",
        ],
        [
          { ref: "instagram/CpeEJ57LAF9/0.jpg", byteLength: 138_545 },
          { ref: "instagram/CpeEJ57LAF9/1.jpg", byteLength: 145_420 },
          { ref: "instagram/CpeEJ57LAF9/2.jpg", byteLength: 131_512 },
          { ref: "instagram/CpeEJ57LAF9/3.jpg", byteLength: 56_470 },
          { ref: "instagram/CpeEJ57LAF9/4.jpg", byteLength: 12_256 },
          { ref: "instagram/CpeEJ57LAF9/5.jpg", byteLength: 9_808 },
        ],
      ),
    ).toEqual([
      "instagram/CpeEJ57LAF9/0.jpg",
      "instagram/CpeEJ57LAF9/1.jpg",
      "instagram/CpeEJ57LAF9/2.jpg",
    ]);
  });

  it("keeps the cached instagram refs unchanged when no dominant subset is detected", () => {
    expect(
      filterDominantCachedInstagramRefs(
        [
          "instagram/ABC123/0.jpg",
          "instagram/ABC123/1.jpg",
          "instagram/ABC123/2.jpg",
        ],
        [
          { ref: "instagram/ABC123/0.jpg", byteLength: 138_545 },
          { ref: "instagram/ABC123/1.jpg", byteLength: 145_420 },
          { ref: "instagram/ABC123/2.jpg", byteLength: 131_512 },
        ],
      ),
    ).toEqual([
      "instagram/ABC123/0.jpg",
      "instagram/ABC123/1.jpg",
      "instagram/ABC123/2.jpg",
    ]);
  });

  it("treats cached carousel images as usable when the requested slide already exists", () => {
    expect(
      canServeRequestedIndexFromCache(
        [
          "instagram/ABC123/0.jpg",
          "instagram/ABC123/1.jpg",
          "instagram/ABC123/2.jpg",
        ],
        1,
      ),
    ).toBe(true);
  });

  it("returns the cached image ref for the requested slide", () => {
    expect(
      getSelectedImageRef(
        [
          "instagram/ABC123/0.jpg",
          "instagram/ABC123/1.jpg",
          "instagram/ABC123/2.jpg",
        ],
        2,
      ),
    ).toBe("instagram/ABC123/2.jpg");
  });

  it("falls back to the first cached image when no specific slide was requested", () => {
    expect(
      getSelectedImageRef(
        [
          "instagram/ABC123/0.jpg",
          "instagram/ABC123/1.jpg",
        ],
        null,
      ),
    ).toBe("instagram/ABC123/0.jpg");
  });
});

describe("shouldAttemptEmbedFallback", () => {
  it("keeps searching when only one carousel image is available", () => {
    expect(
      shouldAttemptEmbedFallback(["https://cdn.example.com/look-1.jpg"], 0),
    ).toBe(true);
  });

  it("keeps searching when the requested slide index is still missing", () => {
    expect(
      shouldAttemptEmbedFallback(
        [
          "https://cdn.example.com/look-1.jpg",
          "https://cdn.example.com/look-2.jpg",
        ],
        2,
      ),
    ).toBe(true);
  });

  it("stops fallback when enough carousel images are available", () => {
    expect(
      shouldAttemptEmbedFallback(
        [
          "https://cdn.example.com/look-1.jpg",
          "https://cdn.example.com/look-2.jpg",
          "https://cdn.example.com/look-3.jpg",
        ],
        1,
      ),
    ).toBe(false);
  });
});

describe("getRequestedCarouselImageIndex", () => {
  it("returns the requested image index when that slide exists", () => {
    expect(
      getRequestedCarouselImageIndex(
        [
          "https://cdn.example.com/look-1.jpg",
          "https://cdn.example.com/look-2.jpg",
          "https://cdn.example.com/look-3.jpg",
        ],
        2,
      ),
    ).toBe(2);
  });

  it("falls back to the first image when the requested slide is missing", () => {
    expect(
      getRequestedCarouselImageIndex(
        [
          "https://cdn.example.com/look-1.jpg",
          "https://cdn.example.com/look-2.jpg",
        ],
        5,
      ),
    ).toBe(0);
  });
});

describe("isPrivateOrUnavailablePostHtml", () => {
  it("detects Instagram's logged-out private post shell", () => {
    const html = `
      <html>
        <body>
          <script type="application/json">
            {
              "routeName":"PolarisLoggedOutPrivateDesktopPostRoute",
              "pageID":"privatePostPage",
              "username":"_durga_prasanna_",
              "gql_data":null
            }
          </script>
        </body>
      </html>
    `;

    expect(isPrivateOrUnavailablePostHtml(html)).toBe(true);
  });
});
