import { afterAll, afterEach, describe, expect, it, vi } from 'vitest';

const authMocks = vi.hoisted(() => ({ getAuthenticatedUserId: vi.fn() }));

vi.mock('@/app/lib/auth', () => ({
  getAuthenticatedUserId: authMocks.getAuthenticatedUserId,
}));

import { UnauthorizedError } from '@/app/lib/auth/auth-errors';
import { getIncomeProjection, getIncomeProjectionForUser } from '@/app/lib/investments/income-projection';
import { prisma } from '@/app/lib/prisma';
import { FinancialTestFactory } from '@/tests/support/financial-test-factory';

const fixtures = new FinancialTestFactory();
const UNIT = BigInt(100_000_000);

afterEach(async () => {
  authMocks.getAuthenticatedUserId.mockReset();
  await fixtures.cleanup();
});

afterAll(async () => {
  await prisma.$disconnect();
});

async function setup() {
  const owner = await fixtures.user({ name: 'Projection Owner' });
  const broker = await fixtures.account(owner.id, { name: 'Corretora projeção', type: 'INVESTMENT', currency: 'BRL' });
  const asset = (symbol: string, currency = 'BRL') =>
    prisma.investmentAsset.create({ data: { userId: owner.id, symbol, type: 'FII', currency, name: symbol } });
  const operation = (assetId: string, type: 'BUY' | 'SELL', units: number) =>
    prisma.investmentOperation.create({
      data: { userId: owner.id, accountId: broker.id, assetId, type, quantityUnits: BigInt(units) * UNIT, unitPriceCents: 1_000, year: 2025, month: 1, day: 10 },
    });
  const income = (assetId: string, year: number, month: number, net: number) =>
    prisma.investmentIncome.create({
      data: { userId: owner.id, accountId: broker.id, assetId, quantityUnits: BigInt(10) * UNIT, unitValueCents: net / 10, netAmountCents: net, year, month, day: 15 },
    });
  authMocks.getAuthenticatedUserId.mockResolvedValue(owner.id);
  return { owner, asset, operation, income };
}

describe('proventos projetados', () => {
  it('projeta só ativos ainda em carteira, na moeda pedida, pelo mês de um ano antes', async () => {
    const { owner, asset, operation, income } = await setup();
    const held = await asset('HELD11');
    const sold = await asset('SOLD11');
    const usd = await asset('USDETF', 'USD');
    await operation(held.id, 'BUY', 100);
    await operation(sold.id, 'BUY', 50);
    await operation(sold.id, 'SELL', 50);
    await operation(usd.id, 'BUY', 10);

    // "Hoje" fixo: nov/2026. A referência de dez/2026 é dez/2025.
    await income(held.id, 2025, 12, 7_000);
    await income(held.id, 2026, 3, 1_500);
    await income(sold.id, 2025, 12, 99_999);
    await income(usd.id, 2025, 12, 55_555);
    await income(held.id, 2024, 12, 88_888); // fora da janela de referência

    const brl = await getIncomeProjectionForUser(owner.id, 'BRL', new Date('2026-11-15T12:00:00Z'));
    expect(brl.openAssetCount).toBe(1);
    expect(brl.months[0]).toMatchObject({ year: 2026, month: 12, amountCents: 7_000, assetCount: 1 });
    expect(brl.months[3]).toMatchObject({ year: 2027, month: 3, amountCents: 1_500 });
    expect(brl.totalCents).toBe(8_500);

    const dollars = await getIncomeProjectionForUser(owner.id, 'USD', new Date('2026-11-15T12:00:00Z'));
    expect(dollars.totalCents).toBe(55_555);
  });

  it('sem posição ou sem proventos devolve zeros; sessão e moeda são validadas', async () => {
    const { owner } = await setup();
    const empty = await getIncomeProjectionForUser(owner.id, 'BRL');
    expect(empty).toMatchObject({ openAssetCount: 0, totalCents: 0, referenceMonthsWithIncome: 0 });

    expect((await getIncomeProjection(new Request('http://localhost/api/investments/income-projection?currency=XXX'))).status).toBe(400);
    authMocks.getAuthenticatedUserId.mockRejectedValue(new UnauthorizedError());
    expect((await getIncomeProjection(new Request('http://localhost/api/investments/income-projection'))).status).toBe(401);
  });
});
