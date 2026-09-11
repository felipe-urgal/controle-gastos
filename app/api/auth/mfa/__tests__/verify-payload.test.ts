import { describe, expect, it } from "vitest";

import { POST as verifyMfa } from "@/app/api/auth/mfa/verify/route";

describe("MFA verify payload", () => {
  it("returns 400 for a valid JSON value that is not an object", async () => {
    const response = await verifyMfa(
      new Request("http://localhost/api/auth/mfa/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "null",
      })
    );

    expect(response.status).toBe(400);
  });
});
