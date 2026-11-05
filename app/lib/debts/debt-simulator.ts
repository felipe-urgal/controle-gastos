/**
 * Simulador de quitação de dívidas. Puro e determinístico: valores em centavos inteiros, uma moeda por vez.
 * Juros mensais entram em pontos-base (250 = 2,50% ao mês) e são arredondados em centavos a cada mês.
 * Juro não informado (`null`) não vira zero em silêncio: a dívida segue sem juros na conta, mas fica marcada
 * em `unknownRateDebtIds` para a tela avisar, e na estratégia "maior juro" ela entra por último.
 */

export type SimulatorDebt = {
  id: string;
  name: string;
  /** Saldo devedor, em centavos (> 0). */
  balance: number;
  /** Parcela mensal mínima. `null` = sem parcela conhecida: só recebe dinheiro do extra. */
  monthlyPayment: number | null;
  /** Juros ao mês em pontos-base, ou `null` se não informado. */
  monthlyRateBps: number | null;
};

export type DebtStrategy = 'INSTALLMENTS_ONLY' | 'AVALANCHE' | 'SNOWBALL';

export type SimulationInput = {
  debts: SimulatorDebt[];
  strategy: DebtStrategy;
  /** Valor extra por mês, além das parcelas (centavos, >= 0). Ignorado em `INSTALLMENTS_ONLY`. */
  extraMonthly: number;
  /** Pagamento único no mês 1, aplicado antes das parcelas, na ordem da estratégia (centavos, >= 0). */
  lumpSum: number;
};

export type DebtSimulationResult = {
  strategy: DebtStrategy;
  /** Meses até zerar tudo; `null` se não zera dentro do limite (parcela não cobre os juros, ou sem parcela). */
  monthsToPayoff: number | null;
  totalPaid: number;
  totalInterest: number;
  /** Mês em que cada dívida zerou (1 = primeiro mês). */
  payoffMonthByDebt: Record<string, number | null>;
  unknownRateDebtIds: string[];
};

export const MAX_SIMULATION_MONTHS = 600;

function monthlyInterest(balance: number, bps: number | null) {
  if (!bps) return 0;
  return Math.round((balance * bps) / 10_000);
}

function targetOrder(debts: SimulatorDebt[], strategy: DebtStrategy): SimulatorDebt[] {
  const list = [...debts];
  if (strategy === 'AVALANCHE') {
    // Maior juro primeiro; sem juro informado por último; empate pelo menor saldo e depois pelo id.
    list.sort((a, b) => {
      const rateA = a.monthlyRateBps ?? -1;
      const rateB = b.monthlyRateBps ?? -1;
      return rateB - rateA || a.balance - b.balance || a.id.localeCompare(b.id);
    });
  } else {
    list.sort((a, b) => a.balance - b.balance || a.id.localeCompare(b.id));
  }
  return list;
}

export function simulateDebtPayoff(input: SimulationInput): DebtSimulationResult {
  const { strategy } = input;
  const rollover = strategy !== 'INSTALLMENTS_ONLY';
  const extra = rollover ? Math.max(0, input.extraMonthly) : 0;
  let lump = rollover ? Math.max(0, input.lumpSum) : 0;

  const order = targetOrder(input.debts, strategy);
  const balances = new Map(input.debts.map((debt) => [debt.id, debt.balance]));
  const payoffMonthByDebt: Record<string, number | null> = Object.fromEntries(
    input.debts.map((debt) => [debt.id, null]),
  );
  const budget = input.debts.reduce((sum, debt) => sum + (debt.monthlyPayment ?? 0), 0) + extra;

  let totalPaid = 0;
  let totalInterest = 0;
  let month = 0;

  const remaining = () => [...balances.values()].reduce((sum, value) => sum + value, 0);

  while (remaining() > 0 && month < MAX_SIMULATION_MONTHS) {
    month += 1;

    for (const debt of order) {
      const current = balances.get(debt.id) ?? 0;
      if (current === 0) continue;
      const interest = monthlyInterest(current, debt.monthlyRateBps);
      totalInterest += interest;
      balances.set(debt.id, current + interest);
    }

    let available = rollover ? budget : 0;
    const pay = (debt: SimulatorDebt, wanted: number) => {
      const current = balances.get(debt.id) ?? 0;
      const amount = Math.min(current, wanted);
      if (amount <= 0) return 0;
      balances.set(debt.id, current - amount);
      totalPaid += amount;
      if (current - amount === 0) payoffMonthByDebt[debt.id] = month;
      return amount;
    };

    if (month === 1 && lump > 0) {
      for (const debt of order) {
        if (lump <= 0) break;
        lump -= pay(debt, lump);
      }
    }

    if (rollover) {
      // Parcelas mínimas primeiro; o que sobrar (extra + parcelas de dívidas já quitadas) vai para a ordem da estratégia.
      for (const debt of order) available -= pay(debt, Math.min(debt.monthlyPayment ?? 0, available));
      for (const debt of order) {
        if (available <= 0) break;
        available -= pay(debt, available);
      }
    } else {
      for (const debt of order) pay(debt, debt.monthlyPayment ?? 0);
    }
  }

  const paidOff = remaining() === 0;
  return {
    strategy,
    monthsToPayoff: paidOff ? month : null,
    totalPaid,
    totalInterest,
    payoffMonthByDebt,
    unknownRateDebtIds: input.debts.filter((debt) => debt.monthlyRateBps === null).map((debt) => debt.id),
  };
}

export type DebtSimulationComparison = {
  baseline: DebtSimulationResult;
  avalanche: DebtSimulationResult;
  snowball: DebtSimulationResult;
};

export function compareDebtStrategies(
  input: Omit<SimulationInput, 'strategy'>,
): DebtSimulationComparison {
  return {
    baseline: simulateDebtPayoff({ ...input, strategy: 'INSTALLMENTS_ONLY' }),
    avalanche: simulateDebtPayoff({ ...input, strategy: 'AVALANCHE' }),
    snowball: simulateDebtPayoff({ ...input, strategy: 'SNOWBALL' }),
  };
}

/** "2,5" ou "2.5" (% ao mês) → 250 pontos-base. Vazio ou inválido → `null` (não informado). */
export function parseMonthlyRateBps(value: string): number | null {
  const normalized = value.trim().replace('%', '').replace(',', '.');
  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) return null;
  const bps = Math.round(Number(normalized) * 100);
  return bps > 10_000 ? null : bps;
}
