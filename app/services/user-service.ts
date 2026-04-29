import { createBaseService } from "@/app/services/base-service";
import { User } from "@/app/types/user";

export const userService = createBaseService<User>("user");