import { HttpError } from "@/app/lib/http-error";
import { prisma } from "@/app/lib/prisma";

export async function deleteUser(userId: string) {
  const deleted = await prisma.user.deleteMany({ where: { id: userId } });

  if (deleted.count !== 1) {
    throw new HttpError("Usuário não encontrado", 404, "USER_NOT_FOUND");
  }
}
