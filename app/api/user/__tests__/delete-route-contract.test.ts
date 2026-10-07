import { describe, expect, it } from "vitest";

import * as legacyUserRoute from "@/app/api/user/[id]/route";
import * as currentUserRoute from "@/app/api/user/route";

describe("account deletion route contract", () => {
  it("exposes DELETE only from /api/user", () => {
    expect(typeof currentUserRoute.DELETE).toBe("function");
    expect(legacyUserRoute).not.toHaveProperty("DELETE");
  });
});
