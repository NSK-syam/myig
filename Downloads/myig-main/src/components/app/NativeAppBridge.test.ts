import { describe, expect, it } from "vitest";

import { toAppPath } from "@/components/app/NativeAppBridge";

describe("toAppPath", () => {
  it("maps custom-scheme auth callbacks back into the in-app route", () => {
    expect(toAppPath("searchoutfit://auth/callback?code=abc123")).toBe("/auth/callback?code=abc123");
  });

  it("ignores the localhost host segment used by Capacitor web views", () => {
    expect(toAppPath("searchoutfit://localhost/auth/callback?code=abc123")).toBe("/auth/callback?code=abc123");
  });
});
