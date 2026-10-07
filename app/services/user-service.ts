import { apiClient } from "@/app/services/api-client";
import { ApiResponse } from "@/app/services/base-service";
import { User } from "@/app/types/user";

export type DeleteAccountInput = {
  currentPassword: string;
  token?: string;
  recoveryCode?: string;
};

export type UpdateCurrentUserResponse = ApiResponse<User> & {
  reauthRequired?: boolean;
};

export const userService = {
  async getCurrent(): Promise<ApiResponse<User>> {
    return apiClient<ApiResponse<User>>("/api/user", {
      method: "GET",
    });
  },

  async updateCurrent<TBody>(data: TBody): Promise<UpdateCurrentUserResponse> {
    return apiClient<UpdateCurrentUserResponse, TBody>("/api/user", {
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
