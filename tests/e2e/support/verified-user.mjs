import bcrypt from 'bcryptjs';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';

async function withPrisma(callback) {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 1,
  });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

  try {
    return await callback(prisma);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

export async function createVerifiedUser({ name, email, password, showValues = true }) {
  return withPrisma((prisma) =>
    prisma.user.create({
      data: {
        name,
        email,
        password: bcrypt.hashSync(password, 12),
        emailVerifiedAt: new Date(),
        showValues,
      },
    }),
  );
}

export async function setPendingEmailChange({
  userId,
  email,
  pendingEmailVersion = 1,
  expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000),
}) {
  return withPrisma((prisma) =>
    prisma.user.update({
      where: { id: userId },
      data: {
        pendingEmail: email,
        pendingEmailRequestedAt: new Date(),
        pendingEmailExpiresAt: expiresAt,
        pendingEmailVersion,
      },
    }),
  );
}
