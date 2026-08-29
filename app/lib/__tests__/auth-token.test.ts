import jwt from "jsonwebtoken";
import { beforeEach, describe, expect, it } from "vitest";
import { signAuthToken, verifyAuthToken } from "@/app/lib/auth-token";

const JWT_SECRET = "test-jwt-secret-with-sufficient-length";

describe("auth token", () => {
  beforeEach(() => {
    process.env.JWT_SECRET = JWT_SECRET;
  });

  it("signs and verifies a token with the expected subject", () => {
    const token = signAuthToken("user-123");

    expect(verifyAuthToken(token)).toEqual({ userId: "user-123" });
  });

  it("rejects tokens with an unexpected issuer", () => {
    const token = jwt.sign({ sub: "user-123" }, JWT_SECRET, {
      expiresIn: "1h",
      issuer: "other-app",
      audience: "seu-app-users",
    });

    expect(() => verifyAuthToken(token)).toThrow();
  });

  it("rejects tokens with an unexpected audience", () => {
    const token = jwt.sign({ sub: "user-123" }, JWT_SECRET, {
      expiresIn: "1h",
      issuer: "seu-app",
      audience: "other-audience",
    });

    expect(() => verifyAuthToken(token)).toThrow();
  });

  it("rejects expired tokens", () => {
    const token = jwt.sign({ sub: "user-123" }, JWT_SECRET, {
      expiresIn: -1,
      issuer: "seu-app",
      audience: "seu-app-users",
    });

    expect(() => verifyAuthToken(token)).toThrow();
  });
});
