import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const indexHtml = fs.readFileSync(path.resolve(process.cwd(), "index.html"), "utf8");
const ogImagePath = path.resolve(process.cwd(), "public", "og-image.png");
const ogImageJpgPath = path.resolve(process.cwd(), "public", "og-image.jpg");

describe("homepage SEO entry HTML", () => {
  it("includes a static H1 for crawlers before client hydration", () => {
    expect(indexHtml).toMatch(
      /<h1[^>]*>\s*AI Outfit Search Tool — Find &amp; Shop Any Look Instantly\s*<\/h1>/,
    );
  });

  it("aligns the title and meta description with the outfit search keyword", () => {
    expect(indexHtml).toContain("<title>SearchOutfit | AI Outfit Search Tool — Find Any Look</title>");
    expect(indexHtml).toContain('content="SearchOutfit is an AI outfit search tool that turns any Instagram post, image URL, or screenshot into shoppable product matches in seconds."');
    expect(indexHtml).toContain('<link rel="canonical" href="https://searchoutfit.com/" />');
    expect(indexHtml).toContain('<link rel="icon" type="image/png" sizes="48x48" href="/searchoutfit-favicon-48x48.png" />');
    expect(indexHtml).toContain('<link rel="apple-touch-icon" href="/searchoutfit-apple-touch-icon.png" />');
    expect(indexHtml).toContain('<link rel="shortcut icon" href="/searchoutfit-favicon.ico" />');
    expect(indexHtml).toContain('<link rel="manifest" href="/site.webmanifest" />');
  });

  it("points og:image metadata at a real image asset", () => {
    expect(indexHtml).toContain('<meta property="og:image" content="https://searchoutfit.com/og-image.jpg" />');
    expect(indexHtml).toContain('<meta property="og:image:secure_url" content="https://searchoutfit.com/og-image.jpg" />');
    expect(indexHtml).toContain('<meta property="og:image:type" content="image/jpeg" />');
    expect(indexHtml).toContain('<meta name="twitter:image" content="https://searchoutfit.com/og-image.jpg" />');
    expect(fs.existsSync(ogImagePath)).toBe(true);
    expect(fs.statSync(ogImagePath).size).toBeGreaterThan(0);
    expect(fs.existsSync(ogImageJpgPath)).toBe(true);
    expect(fs.statSync(ogImageJpgPath).size).toBeGreaterThan(0);
  });

  it("includes crawler-visible secondary headings, internal links, and schema markup", () => {
    expect(indexHtml).toMatch(/<h2[^>]*>\s*How SearchOutfit works\s*<\/h2>/);
    expect(indexHtml).toMatch(/<h2[^>]*>\s*Why people use this outfit search tool\s*<\/h2>/);
    expect(indexHtml).toMatch(/<h2[^>]*>\s*Frequently asked questions\s*<\/h2>/);
    expect(indexHtml).toContain('href="/saved"');
    expect(indexHtml).toContain('href="/privacy"');
    expect(indexHtml).toContain('href="/terms"');
    expect(indexHtml).toContain('type="application/ld+json"');
    expect(indexHtml).toMatch(/"@type":\s*"Organization"/);
    expect(indexHtml).toMatch(/"@type":\s*"WebSite"/);
    expect(indexHtml).toMatch(/"@type":\s*"FAQPage"/);
  });
});
