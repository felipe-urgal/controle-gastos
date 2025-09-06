// app/api/dev/create-categories/route.ts
import { prisma } from '@/app/lib/prisma';

const defaultCategories = [
  "Alimentação", "Transporte", "Moradia", "Saúde", "Educação",
  "Lazer", "Vestuário", "Serviços", "Impostos", "Presentes",
  "Doações", "Viagens", "Pet", "Cuidados Pessoais", "Assinaturas",
  "Manutenção", "Economias", "Investimentos", "Renda Extra", "Outros"
];

// async function createDefaultCategory() {
//   const user = await prisma.user.findUnique({
//     where: { email: "felipearantesurgal@gmail.com" },
//     select: { id: true }
//   });

//   if (!user) {
//     throw new Error("Account not found");
//   }

//   const existingCount = await prisma.category.count({
//     where: { userId: user.id }
//   });

//   if (existingCount > 0) {
//     await prisma.category.deleteMany({
//       where: { userId: user.id }
//     });
//   }

//   // Criar categorias
//   const categoriesData = defaultCategories.map(name => ({
//     name,
//     userId: user.id
//   }));

//   await prisma.category.createMany({
//     data: categoriesData
//   });
// }

// createDefaultCategory()
//   .catch(e => console.error(e))
//   .finally(() => prisma.$disconnect());