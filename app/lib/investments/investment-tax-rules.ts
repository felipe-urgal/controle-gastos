export type InvestmentTaxGroup = "GENERAL" | "FII_FIAGRO";

export type InvestmentTaxRuleClass =
  | "STOCK"
  | "FII"
  | "ETF";

export type InvestmentTaxClassRule = {
  taxGroup: InvestmentTaxGroup;
  commonOperationRateBps: number;
  monthlySalesExemptionCents: number | null;
};

export type InvestmentTaxRuleSet = {
  calendarYear: number;
  taxExercise: number;
  darfCode: string;
  minimumDarfCents: number;
  classes: Partial<Record<InvestmentTaxRuleClass, InvestmentTaxClassRule>>;
  sources: Array<{
    title: string;
    url: string;
    note: string;
  }>;
};

const TAX_RULES: Record<number, InvestmentTaxRuleSet> = {
  2025: {
    calendarYear: 2025,
    taxExercise: 2026,
    darfCode: "6015",
    minimumDarfCents: 1_000,
    classes: {
      STOCK: {
        taxGroup: "GENERAL",
        commonOperationRateBps: 1_500,
        monthlySalesExemptionCents: 2_000_000,
      },
      ETF: {
        taxGroup: "GENERAL",
        commonOperationRateBps: 1_500,
        monthlySalesExemptionCents: null,
      },
      FII: {
        taxGroup: "FII_FIAGRO",
        commonOperationRateBps: 2_000,
        monthlySalesExemptionCents: null,
      },
    },
    sources: [
      {
        title: "Receita Federal — Bolsa de Valores",
        url: "https://www.gov.br/receitafederal/pt-br/assuntos/meu-imposto-de-renda/pagamento/renda-variavel/bolsa-de-valores-1/bolsa-de-valores",
        note: "Operações comuns: alíquota de 15%.",
      },
      {
        title: "Receita Federal — Isenções",
        url: "https://www.gov.br/receitafederal/pt-br/assuntos/meu-imposto-de-renda/pagamento/renda-variavel/bolsa-de-valores-1/isencoes",
        note: "Ações à vista: ganho isento quando o total mensal de vendas é <= R$ 20.000; ETF não possui essa isenção.",
      },
      {
        title: "Receita Federal — Fundos de Investimento no Brasil",
        url: "https://www.gov.br/receitafederal/pt-br/assuntos/meu-imposto-de-renda/pagamento/renda-variavel/fundos-de-investimento-no-brasil",
        note: "Ganhos líquidos na venda/resgate de cotas de FII: alíquota de 20%.",
      },
      {
        title: "Receita Federal — Manual do ReVar",
        url: "https://www.gov.br/receitafederal/pt-br/assuntos/meu-imposto-de-renda/pagamento/renda-variavel/manual",
        note: "Grupos de tributação separados para Geral e FII/FIAGRO; DARF mínimo de R$ 10,00.",
      },
      {
        title: "Receita Federal — Rendimentos do Capital",
        url: "https://www.gov.br/receitafederal/pt-br/assuntos/meu-imposto-de-renda/preenchimento/manual-mir/rendimentos/rendimentos-do-capital",
        note: "Renda variável informa IRRF e imposto pago via DARF 6015.",
      },
    ],
  },
};

export function getInvestmentTaxRuleSet(calendarYear: number) {
  return TAX_RULES[calendarYear] ?? null;
}

export function getInvestmentTaxClassRule(
  calendarYear: number,
  assetType: string,
) {
  const rules = getInvestmentTaxRuleSet(calendarYear);
  if (!rules) return null;
  if (
    assetType !== "STOCK" &&
    assetType !== "ETF" &&
    assetType !== "FII"
  ) {
    return null;
  }
  return rules.classes[assetType] ?? null;
}

export function supportedInvestmentTaxYears() {
  return Object.keys(TAX_RULES)
    .map(Number)
    .sort((left, right) => left - right);
}

export function calculateTaxFromBps(baseCents: number, rateBps: number) {
  if (baseCents <= 0) return 0;
  return Math.round((baseCents * rateBps) / 10_000);
}
