import { prisma } from "@/app/lib/prisma";

export async function getUserById(id: string) {
  return prisma.user.findUnique({
    where: { id },
  });
};
