// updatePassword.ts
import bcrypt from "bcryptjs";
import { prisma } from '@/app/lib/prisma';

async function updateUserPassword() {
  const hashedPassword = await bcrypt.hash("123456", 10);
  
  await prisma.user.update({
    where: { email: "felipearantesurgal@gmail.com" },
    data: { password: hashedPassword }
  });
}

updateUserPassword()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());