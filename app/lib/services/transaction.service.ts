import { prisma } from "@/app/lib/prisma";

export async function getTransactionById(id: string) {
  return prisma.transaction.findUnique({ where: { id }});
};
