import { importRuleCrud } from "@/app/lib/crud/import-rule.crud";

export const GET = importRuleCrud.getById;
export const PUT = importRuleCrud.update;
export const DELETE = importRuleCrud.remove;
