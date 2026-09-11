import { apiClient } from "./api-client";
import type { User } from "./auth-service";

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface StartTotpEnrollmentResponse {
  enrollmentToken: string;
  expiresInSeconds: number;
  provisioningUri: string;
  secret: string;
}

export interface ConfirmTotpEnrollmentResponse {
  activatedAt: string;
  recoveryCodes: string[];
}

export interface VerifyMfaLoginRequest {
  challenge: string;
  token?: string;
  recoveryCode?: string;
}

export interface VerifyMfaLoginResponse {
  success: boolean;
  message: string;
  user: User;
}

export interface DisableTotpRequest {
  currentPassword: string;
  token?: string;
  recoveryCode?: string;
}

export const mfaService = {
  async startEnrollment(currentPassword: string) {
    const response = await apiClient<
      ApiEnvelope<StartTotpEnrollmentResponse>,
      { currentPassword: string }
    >("/api/auth/mfa/enrollment/start", {
      method: "POST",
      body: { currentPassword },
      credentials: "include",
    });

    return response.data;
  },

  async confirmEnrollment(input: {
    enrollmentToken: string;
    token: string;
  }) {
    const response = await apiClient<
      ApiEnvelope<ConfirmTotpEnrollmentResponse>,
      typeof input
    >("/api/auth/mfa/enrollment/confirm", {
      method: "POST",
      body: input,
      credentials: "include",
    });

    return response.data;
  },

  async verifyLogin(input: VerifyMfaLoginRequest) {
    return apiClient<VerifyMfaLoginResponse, VerifyMfaLoginRequest>(
      "/api/auth/mfa/verify",
      {
        method: "POST",
        body: input,
        credentials: "include",
      }
    );
  },

  async disable(input: DisableTotpRequest) {
    const response = await apiClient<
      ApiEnvelope<{ disabledAt: string }>,
      DisableTotpRequest
    >("/api/auth/mfa/settings", {
      method: "DELETE",
      body: input,
      credentials: "include",
    });

    return response.data;
  },
};
