import jwt from "jsonwebtoken";
import { beforeEach, describe, expect, it } from "vitest";

import { signAuthToken, verifyAuthToken } from "@/app/lib/auth-token";
import {
  signMfaChallenge,
  verifyMfaChallenge,
} from "@/app/lib/security/mfa-challenge";

const JWT_SECRET = "test-jwt-secret-with-sufficient-length";

describe("MFA challenge token", () => {
  beforeEach(() => {
    process.env.JWT_SECRET = JWT_SECRET;
  });

  it("signs a short purpose-restricted challenge with stable identity", () => {
    const token = signMfaChallenge("user-123", "challenge-456");

    expect(verifyMfaChallenge(token)).toEqual({
      userId: "user-123",
      challengeId: "challenge-456",
    });
  });

  it("does not accept a normal authenticated session token as an MFA challenge", () => {
    const authToken = signAuthToken("user-123");

    expect(() => verifyMfaChallenge(authToken)).toThrow();
  });

  it("does not accept an MFA challenge as a normal authenticated session token", () => {
    const challenge = signMfaChallenge("user-123", "challenge-456");

    expect(() => verifyAuthToken(challenge)).toThrow();
  });

  it("rejects a forged challenge with the wrong purpose even under the MFA issuer/audience", () => {
    const token = jwt.sign(
      { sub: "user-123", purpose: "password-reset" },
      JWT_SECRET,
      {
        algorithm: "HS256",
        expiresIn: "5m",
        issuer: "controle-gastos-mfa",
        audience: "controle-gastos-mfa-login",
        jwtid: "challenge-456",
      }
    );

    expect(() => verifyMfaChallenge(token)).toThrow("INVALID_MFA_CHALLENGE");
  });

  it("rejects expired challenges", () => {
    const token = jwt.sign(
      { sub: "user-123", purpose: "mfa-login" },
      JWT_SECRET,
      {
        algorithm: "HS256",
        expiresIn: -1,
        issuer: "controle-gastos-mfa",
        audience: "controle-gastos-mfa-login",
        jwtid: "challenge-456",
      }
    );

    expect(() => verifyMfaChallenge(token)).toThrow();
  });

  it("requires subject and challenge identity before signing", () => {
    expect(() => signMfaChallenge("", "challenge-456")).toThrow(
      "MFA_CHALLENGE_INPUT_INVALID"
    );
    expect(() => signMfaChallenge("user-123", "")).toThrow(
      "MFA_CHALLENGE_INPUT_INVALID"
    );
  });
});
