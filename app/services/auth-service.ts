import { apiClient } from "@/app/services/api-client";
import {
  getAuthToken,
  removeAuthToken,
  setAuthToken,
} from "@/app/lib/auth-token";

export interface User {
  id: string;
  name: string;
  email: string;
  showValues: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface SignupRequest {
  name: string;
  email: string;
  password: string;
}

export interface UpdateUserRequest {
  name?: string;
  email?: string;
  showValues?: boolean;
  currentPassword?: string;
  newPassword?: string;
}

interface ApiSuccessResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

interface LoginResponseData {
  token: string;
  user: User;
}

type RegisterResponseData = User;
type CurrentUserResponseData = User;
type UpdateUserResponseData = User;

export const authService = {
  async getCurrentUser(): Promise<User> {
    const token = getAuthToken();

    if (!token) {
      throw new Error("Não autenticado");
    }

    const response = await apiClient<ApiSuccessResponse<CurrentUserResponseData>>(
      "/api/v1/auth/me",
      { method: "GET" }
    );

    return response.data;
  },

  async login(data: LoginRequest): Promise<{ user: User }> {
    const response = await apiClient<ApiSuccessResponse<LoginResponseData>, LoginRequest>(
      "/api/v1/auth/login",
      {
        method: "POST",
        body: data,
      }
    );

    const token = response.data.token;
    const user = response.data.user;

    setAuthToken(token);

    return { user };
  },

  async logout(): Promise<void> {
    try {
      const token = getAuthToken();

      if (token) {
        await apiClient<ApiSuccessResponse<null>>("/api/v1/auth/logout", {
          method: "POST", // <- bate com teu routes.rb atual
        });
      }
    } finally {
      removeAuthToken();
    }
  },

  async signup(data: SignupRequest): Promise<User> {
    const response = await apiClient<ApiSuccessResponse<RegisterResponseData>, SignupRequest>(
      "/api/v1/auth/register",
      {
        method: "POST",
        body: data,
      }
    );

    return response.data;
  },

  async updateUser(data: UpdateUserRequest): Promise<User> {
    const response = await apiClient<ApiSuccessResponse<UpdateUserResponseData>, UpdateUserRequest>(
      "/api/v1/user",
      {
        method: "PATCH", // <- MUITO IMPORTANTE
        body: data,      // <- sem converter, teu Rails espera camelCase
      }
    );

    return response.data;
  },

  async deleteAccount(): Promise<void> {
    try {
      await apiClient<ApiSuccessResponse<null>>("/api/v1/user", {
        method: "DELETE",
      });
    } finally {
      removeAuthToken();
    }
  },

  async forgotPassword(email: string): Promise<{ success: boolean; message: string }> {
    void email;

    return {
      success: false,
      message: "Fluxo de recuperação de senha ainda não migrado para a API Rails.",
    };
  },

  async resetPassword(_token: string, _novaSenha: string): Promise<{ success: boolean; message: string }> {
    return {
      success: false,
      message: "Fluxo de redefinição de senha ainda não migrado para a API Rails.",
    };
  },
};
