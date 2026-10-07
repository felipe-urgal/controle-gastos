import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import * as currentUserRoute from "@/app/api/user/route";

describe("account deletion route contract", () => {
  it("exposes account deletion only from /api/user", () => {
    expect(typeof currentUserRoute.DELETE).toBe("function");
    expect(
      existsSync(join(process.cwd(), "app/api/user/[id]/route.ts")),
    ).toBe(false);
  });
});
