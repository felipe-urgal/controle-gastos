// updatePassword.ts
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function updateUserPassword() {
  const hashedPassword = await bcrypt.hash("123456", 10);
  
  await prisma.user.update({
    where: { email: "felipearantesurgal@gmail.com" },
    data: { password: hashedPassword }
  });

  console.log("Senha atualizada com sucesso!");
}

updateUserPassword()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());