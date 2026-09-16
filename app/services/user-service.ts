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

  async deleteAccount(data: DeleteAccountInput): Promise<ApiResponse<null>> {
    return apiClient<ApiResponse<null>, DeleteAccountInput>("/api/user", {
      method: "DELETE",
      body: data,
    });
  },
};
