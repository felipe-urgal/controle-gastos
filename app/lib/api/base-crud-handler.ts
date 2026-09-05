import { ZodSchema, ZodError } from "zod";
import { success, failure } from "@/app/lib/api-response";
import { getAuthenticatedUserId } from "@/app/lib/auth";
import { isHttpError } from "@/app/lib/http-error";
import { prisma } from "@/app/lib/prisma";

type ModelDelegate = {
  create: (...args: any[]) => Promise<any>;
  findMany: (...args: any[]) => Promise<any>;
  findFirst: (...args: any[]) => Promise<any>;
  update: (...args: any[]) => Promise<any>;
  delete: (...args: any[]) => Promise<any>;
  count: (...args: any[]) => Promise<any>;
};

type CrudConfig<TCreate, TUpdate> = {
  model: (db: typeof prisma) => ModelDelegate;
  entityName: string;
  createSchema: ZodSchema<TCreate>;
  updateSchema: ZodSchema<TUpdate>;
  include?: any;
  orderBy?: any;

  checkBeforeDelete?: (entity: any) => string | null;
  mapper?: (entity: any) => any;

  beforeCreate?: (data: TCreate, userId: string) => Promise<any>;
  afterCreate?: (entity: any, userId: string) => Promise<void>;

  beforeUpdate?: (data: TUpdate, entity: any, userId: string) => Promise<any>;
  customUpdate?: (args: {
    data: any;
    entity: any;
    userId: string;
    include?: any;
  }) => Promise<any>;
  afterUpdate?: (entity: any, userId: string) => Promise<void>;

  beforeDelete?: (entity: any, userId: string) => Promise<void>;
  customDelete?: (entity: any, userId: string) => Promise<void>;
  afterDelete?: (entity: any, userId: string) => Promise<void>;

  customList?: (userId: string, request?: Request) => Promise<any>;
  customWhere?: (userId: string, request?: Request) => Promise<any>;

  useTransaction?: boolean;
  filterableFields?: string[];
  searchableFields?: string[];
  limit?: boolean;

  summary?: (args: { where: any; userId: string }) => Promise<any>;
  selfRoute?: boolean;

  afterRead?: (entity: any, userId: string) => Promise<any>;
  afterList?: (args: {
    items: any[];
    where: any;
    userId: string;
  }) => Promise<any[]>;
};

function apiFailureFromError(
  err: unknown,
  fallbackMessage: string,
  options: { zod?: boolean } = {}
) {
  if (options.zod && err instanceof ZodError) {
    return failure(err.issues[0]?.message ?? "Dados inválidos", 400);
  }

  if (isHttpError(err)) {
    return failure(err.message, err.status, err.code);
  }

  if (err instanceof Error && err.message === "UNAUTHORIZED") {
    return failure("Não autenticado", 401);
  }

  return failure(fallbackMessage, 500);
}

export function baseCrudHandler<TCreate, TUpdate>(
  config: CrudConfig<TCreate, TUpdate>
) {
  const {
    model,
    entityName,
    createSchema,
    updateSchema,
    include,
    orderBy,
    checkBeforeDelete,
    mapper,
    beforeCreate,
    afterCreate,
    beforeUpdate,
    customUpdate,
    afterUpdate,
    beforeDelete,
    customDelete,
    afterDelete,
    customList,
    customWhere,
    useTransaction,
    filterableFields,
    searchableFields,
    limit,
    selfRoute,
    summary,
    afterRead,
    afterList,
  } = config;

  const map = (data: any) => (mapper ? mapper(data) : data);
  const getModel = (db: typeof prisma) => model(db);
  const enrichRead = async (entity: any, userId: string) =>
    afterRead ? afterRead(entity, userId) : entity;

  async function resolveId(
    userId: string,
    context?: { params: Promise<any> }
  ) {
    if (selfRoute) return userId;
    if (!context) throw new Error("ID não fornecido");

    const { id } = await context.params;
    return id;
  }

  async function create(request: Request) {
    try {
      const userId = await getAuthenticatedUserId();
      const body = await request.json();
      const parsed = createSchema.parse(body);

      if (beforeCreate) {
        const result = await beforeCreate(parsed, userId);
        const enriched = await enrichRead(result, userId);
        return success(map(enriched), `${entityName} criada com sucesso`, 201);
      }

      const execute = async (db: typeof prisma) =>
        getModel(db).create({
          data: { ...parsed, userId },
          include,
        });

      const created = useTransaction
        ? await prisma.$transaction(async (tx) => execute(tx as any))
        : await execute(prisma);

      if (afterCreate) await afterCreate(created, userId);

      const enriched = await enrichRead(created, userId);
      return success(map(enriched), `${entityName} criada com sucesso`, 201);
    } catch (err: unknown) {
      return apiFailureFromError(err, `Erro ao criar ${entityName}`, { zod: true });
    }
  }

  async function list(request?: Request) {
    try {
      const userId = await getAuthenticatedUserId();

      if (customList) {
        const result = await customList(userId, request);
        return success(result, `${entityName}s carregadas com sucesso`);
      }

      const filters: Record<string, any> = selfRoute ? {} : { userId };
      let take: number | undefined;
      let skip: number | undefined;
      let page: number | undefined;
      let pageSize: number | undefined;
      const searchConditions: any[] = [];

      if (request) {
        const { searchParams } = new URL(request.url);
        const searchTerm = searchParams.get("search");

        if (searchTerm && searchableFields?.length) {
          searchConditions.push({
            OR: searchableFields.map((field) => ({
              [field]: {
                contains: searchTerm,
                mode: "insensitive",
              },
            })),
          });
        }

        if (filterableFields?.length) {
          filterableFields.forEach((field) => {
            const value = searchParams.get(field);
            if (value === null || value === "") return;

            if (value === "true") filters[field] = true;
            else if (value === "false") filters[field] = false;
            else if (!Number.isNaN(Number(value))) filters[field] = Number(value);
            else filters[field] = value;
          });
        }

        const pageParam = searchParams.get("page");
        const pageSizeParam = searchParams.get("pageSize");

        if (pageParam && pageSizeParam) {
          page = Number(pageParam);
          pageSize = Number(pageSizeParam);

          if (page > 0 && pageSize > 0) {
            take = pageSize;
            skip = (page - 1) * pageSize;
          }
        }

        if (!take && limit) {
          const limitParam = searchParams.get("limit");
          if (limitParam) {
            const parsedLimit = Number(limitParam);
            if (parsedLimit > 0) take = parsedLimit;
          }
        }
      }

      const where = customWhere
        ? await customWhere(userId, request)
        : {
            AND: [
              filters,
              ...(searchConditions.length ? searchConditions : []),
            ],
          };

      const delegate = getModel(prisma);
      const [items, total] = await Promise.all([
        delegate.findMany({
          where,
          orderBy,
          include,
          take,
          skip,
        }),
        delegate.count({ where }),
      ]);

      const summaryData = summary ? await summary({ where, userId }) : undefined;
      const finalItems = afterList
        ? await afterList({ items, where, userId })
        : items;

      return success(
        {
          items: mapper ? finalItems.map(mapper) : finalItems,
          total,
          page,
          pageSize,
          totalPages: page && pageSize ? Math.ceil(total / pageSize) : undefined,
          ...(summary ? { summary: summaryData } : {}),
        },
        `${entityName}s carregadas com sucesso`
      );
    } catch (err: unknown) {
      return apiFailureFromError(err, `Erro ao buscar ${entityName}s`);
    }
  }

  async function getById(
    request: Request,
    context?: { params: Promise<any> }
  ) {
    try {
      const userId = await getAuthenticatedUserId();
      const id = await resolveId(userId, context);

      const entity = await getModel(prisma).findFirst({
        where: selfRoute ? { id } : { id, userId },
        include,
      });

      if (!entity) return failure(`${entityName} não encontrada`, 404);

      const enriched = await enrichRead(entity, userId);
      return success(map(enriched));
    } catch (err: unknown) {
      return apiFailureFromError(err, `Erro ao buscar ${entityName}`);
    }
  }

  async function update(
    request: Request,
    context?: { params: Promise<any> }
  ) {
    try {
      const userId = await getAuthenticatedUserId();
      const id = await resolveId(userId, context);
      const body = await request.json();
      const parsed = updateSchema.parse(body);
      const delegate = getModel(prisma);

      const existing = await delegate.findFirst({
        where: selfRoute ? { id } : { id, userId },
      });

      if (!existing) return failure(`${entityName} não encontrada`, 404);

      const finalData = beforeUpdate
        ? await beforeUpdate(parsed, existing, userId)
        : parsed;

      const updated = customUpdate
        ? await customUpdate({ data: finalData, entity: existing, userId, include })
        : await delegate.update({
            where: selfRoute ? { id } : { id, userId },
            data: finalData,
            include,
          });

      if (afterUpdate) await afterUpdate(updated, userId);

      const enriched = await enrichRead(updated, userId);
      return success(map(enriched), `${entityName} atualizada com sucesso`);
    } catch (err: unknown) {
      return apiFailureFromError(err, `Erro ao atualizar ${entityName}`, { zod: true });
    }
  }

  async function remove(
    request: Request,
    context?: { params: Promise<any> }
  ) {
    try {
      const userId = await getAuthenticatedUserId();
      const id = await resolveId(userId, context);
      const delegate = getModel(prisma);

      const entity = await delegate.findFirst({
        where: selfRoute ? { id } : { id, userId },
        include,
      });

      if (!entity) return failure(`${entityName} não encontrada`, 404);

      if (checkBeforeDelete) {
        const errorMessage = checkBeforeDelete(entity);
        if (errorMessage) return failure(errorMessage, 400);
      }

      if (beforeDelete) await beforeDelete(entity, userId);
      if (customDelete) {
        await customDelete(entity, userId);
      } else {
        await delegate.delete({ where: selfRoute ? { id } : { id, userId } });
      }
      if (afterDelete) await afterDelete(entity, userId);

      return success(null, `${entityName} excluída com sucesso`);
    } catch (err: unknown) {
      return apiFailureFromError(err, `Erro ao excluir ${entityName}`);
    }
  }

  return {
    create,
    list,
    getById,
    update,
    remove,
  };
}