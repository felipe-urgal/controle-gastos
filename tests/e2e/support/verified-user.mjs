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


export async function seedPrivacyFinancialFixture({ email, amount = 12345 }) {
  return withPrisma(async (prisma) => {
    const user = await prisma.user.findUniqueOrThrow({ where: { email } });
    const suffix = Date.now().toString(36);
    const today = new Date();

    const account = await prisma.account.create({
      data: {
        name: `Conta Privada ${suffix}`,
        type: 'CREDIT_DEBIT',
        currency: 'BRL',
        userId: user.id,
      },
    });

    const category = await prisma.category.create({
      data: {
        name: `Privacidade ${suffix}`.slice(0, 50),
        type: 'EXPENSE',
        userId: user.id,
      },
    });

    const transaction = await prisma.transaction.create({
      data: {
        amount,
        year: today.getFullYear(),
        month: today.getMonth() + 1,
        day: today.getDate(),
        type: 'EXPENSE',
        description: 'Compra privacidade cross-module',
        status: 'COMPLETED',
        accountId: account.id,
        categoryId: category.id,
        userId: user.id,
      },
    });

    return {
      userId: user.id,
      accountId: account.id,
      transactionId: transaction.id,
    };
  });
}
