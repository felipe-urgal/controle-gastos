import { ZodSchema, ZodError } from "zod";
import { success, failure } from "@/app/lib/apiResponse";
import { getAuthenticatedUserId } from "@/app/lib/auth";

type CrudConfig<TCreate, TUpdate> = {
  model: any;
  entityName: string;
  createSchema: ZodSchema<TCreate>;
  updateSchema: ZodSchema<TUpdate>;
  include?: any;
  orderBy?: any;
  checkBeforeDelete?: (entity: any) => string | null;
  mapper?: (entity: any) => any;
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
  } = config;

  const map = (data: any) => (mapper ? mapper(data) : data);

  // CREATE
  async function create(request: Request) {
    try {
      const userId = await getAuthenticatedUserId();
      const body = await request.json();
      const parsed = createSchema.parse(body);

      const created = await model.create({
        data: { ...parsed, userId },
        include,
      });

      return success(
        map(created),
        `${entityName} criada com sucesso`,
        201
      );

    } catch (err: any) {
      if (err instanceof ZodError)
        return failure(err.issues[0]?.message, 400, "VALIDATION_ERROR");

      if (err.message === "UNAUTHORIZED")
        return failure("Não autenticado", 401);

      return failure(`Erro ao criar ${entityName}`, 500);
    }
  }

  // LIST
  async function list() {
    try {
      const userId = await getAuthenticatedUserId();

      const items = await model.findMany({
        where: { userId },
        orderBy,
        include,
      });

      return success(
        { items: mapper ? items.map(mapper) : items },
        `${entityName}s carregadas com sucesso`
      );

    } catch (err: any) {
      if (err.message === "UNAUTHORIZED")
        return failure("Não autenticado", 401);

      return failure(`Erro ao buscar ${entityName}s`, 500);
    }
  }

  // GET BY ID
  async function getById(
    request: Request,
    context: { params: Promise<{ id: string }> }
  ) {
    try {
      const userId = await getAuthenticatedUserId();
      const { id } = await context.params;

      const entity = await model.findFirst({
        where: { id, userId },
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

  // UPDATE
  async function update(
    request: Request,
    context: { params: Promise<{ id: string }> }
  ) {
    try {
      const userId = await getAuthenticatedUserId();
      const { id } = await context.params;

      const body = await request.json();
      const parsed = updateSchema.parse(body);

      const existing = await model.findFirst({
        where: { id, userId },
      });

      if (!existing)
        return failure(`${entityName} não encontrada`, 404);

      const updated = await model.update({
        where: { id },
        data: parsed,
        include,
      });

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

  // DELETE
  async function remove(
    request: Request,
    context: { params: Promise<{ id: string }> }
  ) {
    try {
      const userId = await getAuthenticatedUserId();
      const { id } = await context.params;

      const entity = await model.findFirst({
        where: { id, userId },
        include,
      });

      if (!entity)
        return failure(`${entityName} não encontrada`, 404);

      if (checkBeforeDelete) {
        const errorMessage = checkBeforeDelete(entity);
        if (errorMessage)
          return failure(errorMessage, 400);
      }

      await model.delete({ where: { id } });

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
};