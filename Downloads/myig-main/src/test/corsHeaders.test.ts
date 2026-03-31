import { describe, expect, it } from "vitest";

import {
  APP_TOKEN_HEADER,
  GUEST_TOKEN_HEADER,
  buildAppCorsHeaders,
} from "../../supabase/functions/_shared/app-access.ts";

describe("app function cors headers", () => {
  it("allows both app and guest token headers for browser preflight requests", () => {
    const headers = buildAppCorsHeaders();

    expect(headers["Access-Control-Allow-Origin"]).toBe("*");
    expect(headers["Access-Control-Allow-Headers"]).toContain(APP_TOKEN_HEADER);
    expect(headers["Access-Control-Allow-Headers"]).toContain(GUEST_TOKEN_HEADER);
  });
});
