import { baseCrudHandler } from '@/app/lib/api/base-crud-handler';
import { HttpError } from '@/app/lib/http-error';
import { prisma } from '@/app/lib/prisma';
import { transactionTemplateCreateSchema, transactionTemplateUpdateSchema } from '@/app/lib/templates/transaction-template-schema';

const include = {
  account: { select: { id: true, name: true, currency: true } },
  category: { select: { id: true, name: true, type: true } },
} as const;

async function validateReferences(
  data: { type?: 'INCOME' | 'EXPENSE'; accountId?: string | null; categoryId?: string | null },
  userId: string,
  current?: { type: 'INCOME' | 'EXPENSE'; accountId: string | null; categoryId: string | null },
) {
  const type = data.type ?? current?.type;
  const accountId = data.accountId === undefined ? current?.accountId : data.accountId;
  const categoryId = data.categoryId === undefined ? current?.categoryId : data.categoryId;

  if (accountId) {
    const account = await prisma.account.findFirst({ where: { id: accountId, userId, isActive: true }, select: { id: true } });
    if (!account) throw new HttpError('Conta inválida ou inativa', 400);
  }
  if (categoryId) {
    const category = await prisma.category.findFirst({ where: { id: categoryId, userId, isActive: true }, select: { id: true, type: true } });
    if (!category || category.type !== type) throw new HttpError('Categoria inválida para o tipo do template', 400);
  }
  return data;
}

export const transactionTemplateCrud = baseCrudHandler({
  model: (db) => db.transactionTemplate,
  entityName: 'Template',
  createSchema: transactionTemplateCreateSchema,
  updateSchema: transactionTemplateUpdateSchema,
  include,
  orderBy: [{ isFavorite: 'desc' }, { position: 'asc' }, { updatedAt: 'desc' }],
  filterableFields: ['type', 'isFavorite'],
  searchableFields: ['name', 'description'],
  limit: true,
  beforeCreate: async (data, userId) => {
    await validateReferences(data, userId);
    return prisma.transactionTemplate.create({ data: { ...data, userId }, include });
  },
  beforeUpdate: async (data, entity, userId) => validateReferences(data, userId, {
    type: entity.type, accountId: entity.accountId, categoryId: entity.categoryId,
  }),
});
