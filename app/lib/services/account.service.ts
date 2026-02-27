import { prisma } from "@/app/lib/prisma";

export async function getAccountById(id: string) {
  return prisma.account.findUnique({
    where: { id },
  });
};
