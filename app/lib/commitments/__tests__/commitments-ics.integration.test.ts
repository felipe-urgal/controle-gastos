import { afterAll, afterEach, describe, expect, it, vi } from "vitest";

const authMocks = vi.hoisted(() => ({ getAuthenticatedUserId: vi.fn() }));
vi.mock("@/app/lib/auth", () => ({ getAuthenticatedUserId: authMocks.getAuthenticatedUserId }));

import { exportFinancialCommitmentsIcs } from "@/app/lib/commitments/financial-commitments-api";
import { addDaysToLogicalDate, todayLogicalDate } from "@/app/lib/date/logical-date";
import { prisma } from "@/app/lib/prisma";
import { FinancialTestFactory } from "@/tests/support/financial-test-factory";

const fixtures = new FinancialTestFactory();

afterEach(async () => {
  authMocks.getAuthenticatedUserId.mockReset();
  await fixtures.cleanup();
});

afterAll(async () => {
  await prisma.$disconnect();
});

async function pendingFor(userId: string, description: string, amount: number) {
  const account = await fixtures.account(userId, { name: `Conta ${description}`, currency: "BRL" });
  const category = await fixtures.category(userId, { name: `Despesas ${description}`, type: "EXPENSE" });
  const due = addDaysToLogicalDate(todayLogicalDate(), 3);
  return prisma.transaction.create({
    data: {
      userId,
      accountId: account.id,
      categoryId: category.id,
      amount,
      description,
      type: "EXPENSE",
      status: "PENDING",
      year: due.year,
      month: due.month,
      day: due.day,
    },
  });
}

const call = (query = "") => exportFinancialCommitmentsIcs(new Request(`http://localhost/api/commitments/ics${query}`));

describe("exportação de compromissos em .ics", () => {
  it("entrega só os pendentes do dono, como arquivo de calendário, sem cache", async () => {
    const owner = await fixtures.user({ name: "ICS Owner" });
    const other = await fixtures.user({ name: "ICS Other" });
    const mine = await pendingFor(owner.id, "Internet do dono", 15_000);
    await pendingFor(other.id, "Segredo de outro usuário", 99_000);
    authMocks.getAuthenticatedUserId.mockResolvedValue(owner.id);

    const response = await call("?days=30&currency=BRL");
    const body = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/calendar");
    expect(response.headers.get("content-disposition")).toBe('attachment; filename="compromissos-30-dias.ics"');
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(body).toContain(`UID:transaction-${mine.id}@controle-gastos`);
    expect(body).toContain("SUMMARY:Pagar: Internet do dono");
    expect(body).toMatch(/Valor: R\$\s150\\,00/);
    expect(body).not.toContain("Segredo de outro usuário");
    expect(body).not.toContain("990");
  });

  it("values=0 deixa os valores de fora", async () => {
    const owner = await fixtures.user({ name: "ICS Hidden" });
    await pendingFor(owner.id, "Aluguel", 123_456);
    authMocks.getAuthenticatedUserId.mockResolvedValue(owner.id);

    const body = await (await call("?values=0")).text();

    expect(body).toContain("SUMMARY:Pagar: Aluguel");
    expect(body).not.toMatch(/1\.?234/);
  });

  it("recusa moeda e horizonte inválidos e não autenticado", async () => {
    const owner = await fixtures.user({ name: "ICS Invalid" });
    authMocks.getAuthenticatedUserId.mockResolvedValue(owner.id);

    expect((await call("?currency=XXX")).status).toBe(400);
    expect((await call("?days=45")).status).toBe(400);

    const { UnauthorizedError } = await import("@/app/lib/auth/auth-errors");
    authMocks.getAuthenticatedUserId.mockRejectedValue(new UnauthorizedError());
    expect((await call()).status).toBe(401);
  });
});
