import { userCrud } from "@/app/lib/users/user-crud";

export const GET = userCrud.getById;
export const PUT = userCrud.update;
export const DELETE = userCrud.remove;
