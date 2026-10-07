import { apiClient } from "@/app/services/api-client";
import { ApiResponse, createBaseService } from "@/app/services/base-service";
import { User } from "@/app/types/user";

export type DeleteAccountInput = {
  currentPassword: string;
  token?: string;
  recoveryCode?: string;
};

const baseUserService = createBaseService<User>("user");

export const userService = {
  ...baseUserService,

  async getCurrent(): Promise<ApiResponse<User>> {
    return apiClient<ApiResponse<User>>("/api/user", {
      method: "GET",
    });
  },

  async updateCurrent<TBody>(data: TBody): Promise<ApiResponse<User>> {
    return apiClient<ApiResponse<User>, TBody>("/api/user", {
      method: "PATCH",
      body: data,
    });
  },

  async deleteAccount(data: DeleteAccountInput): Promise<ApiResponse<null>> {
    return apiClient<ApiResponse<null>, DeleteAccountInput>("/api/user", {
      method: "DELETE",
      body: data,
    });
  },
};
