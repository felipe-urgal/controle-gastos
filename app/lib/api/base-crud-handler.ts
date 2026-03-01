import { ZodSchema, ZodError } from "zod";
import { success, failure } from "@/app/lib/apiResponse";
import { getAuthenticatedUserId } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";

type ModelDelegate = {
  create: Function;
  findMany: Function;
  findFirst: Function;
  update: Function;
  delete: Function;
  count: Function;
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
  afterUpdate?: (entity: any, userId: string) => Promise<void>;

  beforeDelete?: (entity: any, userId: string) => Promise<void>;
  afterDelete?: (entity: any, userId: string) => Promise<void>;

  customList?: (userId: string, request?: Request) => Promise<any>;
  customWhere?: (userId: string, request?: Request) => Promise<any>;

  useTransaction?: boolean;

  filterableFields?: string[];
  searchableFields?: string[];
  limit?: boolean;

  // ✅ NOVO
  selfRoute?: boolean;
};

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
    afterUpdate,
    beforeDelete,
    afterDelete,
    customList,
    customWhere,
    useTransaction,
    filterableFields,
    searchableFields,
    limit,
    selfRoute,
  } = config;

  const map = (data: any) => (mapper ? mapper(data) : data);
  const getModel = (db: typeof prisma) => model(db);

  async function resolveId(
    userId: string,
    context?: { params: Promise<any> }
  ) {
    if (selfRoute) return userId;

    if (!context) throw new Error("ID não fornecido");

    const { id } = await context.params;
    return id;
  }

  // =========================
  // CREATE
  // =========================
  async function create(request: Request) {
    try {
      const userId = await getAuthenticatedUserId();
      const body = await request.json();
      const parsed = createSchema.parse(body);

      if (beforeCreate) {
        const result = await beforeCreate(parsed, userId);
        return success(map(result), `${entityName} criada com sucesso`, 201);
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

      return success(map(created), `${entityName} criada com sucesso`, 201);
    } catch (err: any) {
      if (err instanceof ZodError)
        return failure(err.issues[0]?.message, 400);

      if (err.message === "UNAUTHORIZED")
        return failure("Não autenticado", 401);

      return failure(`Erro ao criar ${entityName}`, 500);
    }
  }

  // =========================
  // LIST
  // =========================
  async function list(request?: Request) {
    try {
      const userId = await getAuthenticatedUserId();

      if (customList) {
        const result = await customList(userId, request);
        return success(result, `${entityName}s carregadas com sucesso`);
      }

      let filters: Record<string, any> = selfRoute
        ? {}
        : { userId };

      let take: number | undefined;
      let skip: number | undefined;
      let page: number | undefined;
      let pageSize: number | undefined;

      let searchConditions: any[] = [];

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

        // 🎯 FILTERS
        if (filterableFields?.length) {
          filterableFields.forEach((field) => {
            const value = searchParams.get(field);
            if (value !== null) {
              if (value === "true") {
                filters[field] = true;
              } else if (value === "false") {
                filters[field] = false;
              } else if (!isNaN(Number(value))) {
                filters[field] = Number(value);
              } else {
                filters[field] = value;
              }
            }
          });
        }

        // 📄 PAGINATION
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

        // 🔢 LIMIT (quando não usa paginação)
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

      return success(
        {
          items: mapper ? items.map(mapper) : items,
          total,
          page,
          pageSize,
          totalPages:
            page && pageSize
              ? Math.ceil(total / pageSize)
              : undefined,
        },
        `${entityName}s carregadas com sucesso`
      );
    } catch (err: any) {
      if (err.message === "UNAUTHORIZED")
        return failure("Não autenticado", 401);

      return failure(`Erro ao buscar ${entityName}s`, 500);
    }
  }

  // =========================
  // GET BY ID
  // =========================
  async function getById(
    request: Request,
    context?: { params: Promise<any> }
  ) {
    try {
      const userId = await getAuthenticatedUserId();
      const id = await resolveId(userId, context);

      const entity = await getModel(prisma).findFirst({
        where: selfRoute
          ? { id }
          : { id, userId },
        include,
      });

      if (!entity)
        return failure(`${entityName} não encontrada`, 404);

      return success(map(entity));
    } catch (err: any) {
      if (err.message === "UNAUTHORIZED")
        return failure("Não autenticado", 401);

      return failure(`Erro ao buscar ${entityName}`, 500);
    }
  }

  // =========================
  // UPDATE
  // =========================
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
        where: selfRoute
          ? { id }
          : { id, userId },
      });

      if (!existing)
        return failure(`${entityName} não encontrada`, 404);

      const finalData = beforeUpdate
        ? await beforeUpdate(parsed, existing, userId)
        : parsed;

      const updated = await delegate.update({
        where: { id },
        data: finalData,
        include,
      });

      if (afterUpdate) await afterUpdate(updated, userId);

      return success(
        map(updated),
        `${entityName} atualizada com sucesso`
      );
    } catch (err: any) {
      if (err instanceof ZodError)
        return failure(err.issues[0]?.message, 400);

      if (err.message === "UNAUTHORIZED")
        return failure("Não autenticado", 401);

      return failure(`Erro ao atualizar ${entityName}`, 500);
    }
  }

  // =========================
  // DELETE
  // =========================
  async function remove(
    request: Request,
    context?: { params: Promise<any> }
  ) {
    try {
      const userId = await getAuthenticatedUserId();
      const id = await resolveId(userId, context);

      const delegate = getModel(prisma);

      const entity = await delegate.findFirst({
        where: selfRoute
          ? { id }
          : { id, userId },
        include,
      });

      if (!entity)
        return failure(`${entityName} não encontrada`, 404);

      if (checkBeforeDelete) {
        const errorMessage = checkBeforeDelete(entity);
        if (errorMessage)
          return failure(errorMessage, 400);
      }

      if (beforeDelete) await beforeDelete(entity, userId);

      await delegate.delete({ where: { id } });

      if (afterDelete) await afterDelete(entity, userId);

      return success(null, `${entityName} excluída com sucesso`);
    } catch (err: any) {
      if (err.message === "UNAUTHORIZED")
        return failure("Não autenticado", 401);

      return failure(`Erro ao excluir ${entityName}`, 500);
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
