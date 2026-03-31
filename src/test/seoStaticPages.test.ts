import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const readPublicFile = (relativePath: string) =>
  fs.readFileSync(path.resolve(process.cwd(), "public", relativePath), "utf8");

describe("repo-managed SEO crawl assets", () => {
  it("adds a sitemap reference to robots.txt", () => {
    const robots = readPublicFile("robots.txt");
    expect(robots).toContain("Sitemap: https://searchoutfit.com/sitemap.xml");
  });

  it("ships repo-managed sitemap and llms crawl assets", () => {
    const sitemap = readPublicFile("sitemap.xml");
    const llms = readPublicFile("llms.txt");

    expect(sitemap).toContain("<loc>https://searchoutfit.com/</loc>");
    expect(sitemap).toContain("<loc>https://searchoutfit.com/instagram-outfit-search/</loc>");
    expect(sitemap).toContain("<loc>https://searchoutfit.com/screenshot-outfit-finder/</loc>");
    expect(sitemap).toContain("<loc>https://searchoutfit.com/find-clothes-from-photo/</loc>");
    expect(sitemap).toContain("<loc>https://searchoutfit.com/blog/how-to-find-clothes-from-instagram-posts/</loc>");

    expect(llms).toContain("SearchOutfit");
    expect(llms).toContain("https://searchoutfit.com/instagram-outfit-search/");
    expect(llms).toContain("https://searchoutfit.com/blog/how-to-find-clothes-from-instagram-posts/");
  });

  it("ships static intent pages and the blog post with canonical, h1, and internal links", () => {
    const instagramPage = readPublicFile("instagram-outfit-search/index.html");
    const screenshotPage = readPublicFile("screenshot-outfit-finder/index.html");
    const photoPage = readPublicFile("find-clothes-from-photo/index.html");
    const blogPage = readPublicFile("blog/how-to-find-clothes-from-instagram-posts/index.html");

    expect(instagramPage).toContain('<link rel="canonical" href="https://searchoutfit.com/instagram-outfit-search/" />');
    expect(instagramPage).toContain('<link rel="icon" type="image/png" sizes="48x48" href="/searchoutfit-favicon-48x48.png" />');
    expect(instagramPage).toContain('<link rel="manifest" href="/site.webmanifest" />');
    expect(instagramPage).toMatch(/<h1[^>]*>\s*Instagram Outfit Search Tool/i);
    expect(instagramPage).toContain('href="/screenshot-outfit-finder/"');

    expect(screenshotPage).toContain('<link rel="canonical" href="https://searchoutfit.com/screenshot-outfit-finder/" />');
    expect(screenshotPage).toContain('<link rel="icon" type="image/png" sizes="48x48" href="/searchoutfit-favicon-48x48.png" />');
    expect(screenshotPage).toContain('<link rel="manifest" href="/site.webmanifest" />');
    expect(screenshotPage).toMatch(/<h1[^>]*>\s*Screenshot Outfit Finder/i);
    expect(screenshotPage).toContain('href="/find-clothes-from-photo/"');

    expect(photoPage).toContain('<link rel="canonical" href="https://searchoutfit.com/find-clothes-from-photo/" />');
    expect(photoPage).toContain('<link rel="icon" type="image/png" sizes="48x48" href="/searchoutfit-favicon-48x48.png" />');
    expect(photoPage).toContain('<link rel="manifest" href="/site.webmanifest" />');
    expect(photoPage).toMatch(/<h1[^>]*>\s*Find Clothes From a Photo/i);
    expect(photoPage).toContain('type="application/ld+json"');

    expect(blogPage).toContain('<link rel="canonical" href="https://searchoutfit.com/blog/how-to-find-clothes-from-instagram-posts/" />');
    expect(blogPage).toContain('<link rel="icon" type="image/png" sizes="48x48" href="/searchoutfit-favicon-48x48.png" />');
    expect(blogPage).toContain('<link rel="manifest" href="/site.webmanifest" />');
    expect(blogPage).toMatch(/<h1[^>]*>\s*How to Find Clothes From Instagram Posts/i);
    expect(blogPage).toContain('href="/instagram-outfit-search/"');
    expect(blogPage).toContain('type="application/ld+json"');
  });
});
