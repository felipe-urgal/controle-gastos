import { prisma } from "@/app/lib/prisma";

export async function getCategoryById(id: string) {
  return prisma.category.findUnique({ where: { id }});
};
