import jwt from "jsonwebtoken";
import { beforeEach, describe, expect, it } from "vitest";
import { signAuthToken, verifyAuthToken } from "@/app/lib/auth/auth-token";

const JWT_SECRET = "test-jwt-secret-with-sufficient-length";

describe("auth token", () => {
  beforeEach(() => {
    process.env.JWT_SECRET = JWT_SECRET;
  });

  it("signs and verifies a token with the expected subject", () => {
    const token = signAuthToken("user-123");

    expect(verifyAuthToken(token)).toEqual({ userId: "user-123" });
  });

  it("includes the authentication version in new session tokens", () => {
    const token = (
      signAuthToken as unknown as (userId: string, authVersion: number) => string
    )("user-123", 7);

    expect(jwt.decode(token)).toMatchObject({
      sub: "user-123",
      authVersion: 7,
    });
  });

  it("returns the authentication version after verification", () => {
    const token = jwt.sign(
      { sub: "user-123", authVersion: 3 },
      JWT_SECRET,
      {
        expiresIn: "1h",
        issuer: "seu-app",
        audience: "seu-app-users",
      }
    );

    expect(verifyAuthToken(token)).toEqual({
      userId: "user-123",
      authVersion: 3,
    });
  });

  it("rejects session tokens without an authentication version", () => {
    const token = jwt.sign({ sub: "user-123" }, JWT_SECRET, {
      expiresIn: "1h",
      issuer: "seu-app",
      audience: "seu-app-users",
    });

    expect(() => verifyAuthToken(token)).toThrow();
  });

  it("rejects tokens with an unexpected issuer", () => {
    const token = jwt.sign({ sub: "user-123", authVersion: 0 }, JWT_SECRET, {
      expiresIn: "1h",
      issuer: "other-app",
      audience: "seu-app-users",
    });

    expect(() => verifyAuthToken(token)).toThrow();
  });

  it("rejects tokens with an unexpected audience", () => {
    const token = jwt.sign({ sub: "user-123", authVersion: 0 }, JWT_SECRET, {
      expiresIn: "1h",
      issuer: "seu-app",
      audience: "other-audience",
    });

    expect(() => verifyAuthToken(token)).toThrow();
  });

  it("rejects expired tokens", () => {
    const token = jwt.sign({ sub: "user-123", authVersion: 0 }, JWT_SECRET, {
      expiresIn: -1,
      issuer: "seu-app",
      audience: "seu-app-users",
    });

    expect(() => verifyAuthToken(token)).toThrow();
  });
});
