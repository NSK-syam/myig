import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const publicPath = (...parts: string[]) => path.resolve(process.cwd(), "public", ...parts);

const sha256 = (filePath: string) =>
  crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");

describe("site icon assets", () => {
  it("pins the generated icon set to the current SearchOutfit logo", () => {
    expect(sha256(publicPath("searchoutfit-favicon-48x48.png"))).toBe(
      "47a282ffdb52c07b028b6db3bdbfbe0c59eb77df4a5f5bc14863a390ba5d0e4c",
    );
    expect(sha256(publicPath("searchoutfit-apple-touch-icon.png"))).toBe(
      "b4d31b7041d027cc3983f760e570878b7166fe71d2db0c4247bc7a6cc509c5bd",
    );
    expect(sha256(publicPath("searchoutfit-android-chrome-192x192.png"))).toBe(
      "0c385595042516b62cf478ee55c68f2f7c31eb7d62a23e6a562c9f4670584b23",
    );
    expect(sha256(publicPath("searchoutfit-android-chrome-512x512.png"))).toBe(
      "eb5cba9f63e0db817fffbfde68c8e85d7ce7d0b79eac7b5fc8530f342ed95dae",
    );
    expect(sha256(publicPath("searchoutfit-favicon.ico"))).toBe(
      "13f1ea58ee05b00ff8f4cb78c0a0913cef8bc8014f6f287117e0b4c9e2637128",
    );
  });

  it("keeps the generic favicon names aligned with the namespaced assets", () => {
    expect(sha256(publicPath("favicon-48x48.png"))).toBe(sha256(publicPath("searchoutfit-favicon-48x48.png")));
    expect(sha256(publicPath("apple-touch-icon.png"))).toBe(sha256(publicPath("searchoutfit-apple-touch-icon.png")));
    expect(sha256(publicPath("android-chrome-192x192.png"))).toBe(
      sha256(publicPath("searchoutfit-android-chrome-192x192.png")),
    );
    expect(sha256(publicPath("android-chrome-512x512.png"))).toBe(
      sha256(publicPath("searchoutfit-android-chrome-512x512.png")),
    );
    expect(sha256(publicPath("favicon.ico"))).toBe(sha256(publicPath("searchoutfit-favicon.ico")));
  });
});
