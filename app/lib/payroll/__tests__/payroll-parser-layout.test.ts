import { describe, expect, it } from "vitest";

import { resolveEmployerFromHistory } from "@/app/lib/payroll/payroll-employer";
import { parseAnnualEmploymentIncomeStatement } from "@/app/lib/payroll/annual-income-statement-parser";
import { parsePayrollText } from "@/app/lib/payroll/payroll-parser";

/** Textos no formato produzido pela leitura por posição (colunas separadas por 3 espaços). Dados fictícios. */
const monthlyBlock = [
  "ACME SOFTWARE LTDA",
  "CNPJ: 11.222.333/0001-81   CC: ENGENHARIA   Folha Mensal",
  "Mensalista   Setembro de 2026",
  "Código   Nome do Funcionário   CBO   Departamento   Filial",
  "7   MARIA DA SILVA   212405   1   1",
  "ANALISTA   Admissão:   01/02/2024",
  "Código   Descrição   Referência   Vencimentos   Descontos",
  "1000 DIAS NORMAIS   30,00   5.000,00",
  "201 I.N.S.S.   8,00   400,00",
  "310 CONTRIBUIÇÃO ASSISTENCIAL - SINDICATO   1,50   75,00",
  "320 DESC.ADIANT.SALARIAL   2.000,00   2.000,00",
  "Total de Vencimentos   Total de Descontos",
  "5.000,00   2.475,00",
  "BANCO DO BRASIL 1",
  "conta corrente: 12345-6   Agência: 1234 - 5   Valor Líquido    2.525,00",
  "Salário Base   Sal. Contr. INSS   Base Cálc. FGTS   F.G.T.S do Mês   Base Cálc. IRRF   Faixa IRRF",
  "5.000,00   5.000,00   5.000,00   400,00   4.600,00   0,00",
].join("\n");

describe("holerite em tabela", () => {
  const parsed = parsePayrollText(`${monthlyBlock}\n${monthlyBlock}`);

  it("reconhece competência por extenso, empresa e funcionário", () => {
    expect(parsed).toMatchObject({
      documentType: "MONTHLY_PAYSLIP",
      paymentType: "REGULAR",
      month: 9,
      year: 2026,
      employerName: "ACME SOFTWARE LTDA",
      employerCnpj: "11.222.333/0001-81",
      employeeName: "MARIA DA SILVA",
    });
    expect(parsed.errors).toEqual([]);
  });

  it("lê totais e bases pela coluna, não pelo primeiro número depois do rótulo", () => {
    expect(parsed).toMatchObject({
      totalEarningsCents: 5_000_00,
      totalDeductionsCents: 2_475_00,
      netPaidCents: 2_525_00,
      salaryBaseCents: 5_000_00,
      fgtsBaseCents: 5_000_00,
      fgtsAmountCents: 400_00,
      irrfBaseCents: 4_600_00,
      inssCents: 400_00,
    });
  });

  it("ignora a segunda via idêntica na mesma página", () => {
    expect(parsed.earnings).toHaveLength(1);
    expect(parsed.deductions.map((item) => item.description)).toEqual([
      "I.N.S.S.",
      "CONTRIBUIÇÃO ASSISTENCIAL - SINDICATO",
      "DESC.ADIANT.SALARIAL",
    ]);
  });
});

describe("adiantamento em tabela", () => {
  const text = [
    "ACME SOFTWARE LTDA",
    "CNPJ: 11.222.333/0001-81   CC: ENGENHARIA   Adiantamento",
    "Mensalista   Outubro de 2026",
    "Código   Nome do Funcionário   CBO   Departamento   Filial",
    "7   MARIA DA SILVA   212405   1   1",
    "Código   Descrição   Referência   Vencimentos   Descontos",
    "350 ADIANTAMENTO SALARIAL   40,00   2.000,00",
    "351 IRRF ADIANTAMENTO   10,00   300,00",
    "Total de Vencimentos   Total de Descontos",
    "2.000,00   300,00",
    "conta corrente: 12345-6   Agência: 1234 - 5   Valor Líquido    1.700,00",
  ].join("\n");

  it("trata o adiantamento salarial como vencimento e o IRRF como desconto", () => {
    const parsed = parsePayrollText(text);
    expect(parsed).toMatchObject({ documentType: "PAYROLL_ADVANCE", paymentType: "ADVANCE", month: 10, year: 2026, netPaidCents: 1_700_00, irrfCents: 300_00 });
    expect(parsed.earnings.map((item) => item.description)).toEqual(["ADIANTAMENTO SALARIAL"]);
    expect(parsed.deductions.map((item) => item.description)).toEqual(["IRRF ADIANTAMENTO"]);
    expect(parsed.errors).toEqual([]);
  });
});

describe("aviso e recibo de férias", () => {
  const text = [
    "AVISO E RECIBO DE FÉRIAS",
    "Nome do empregado   Número Carteira Profissional   Série",
    "MARIA DA SILVA   12345   001",
    "PERÍODOS",
    "De Aquisição   De Gozo das Férias   De Gozo da Licença Remunerada   De Abono",
    "04/06/2025 A 03/06/2026   14/12/2026 A 18/12/2026 = 5 Dias",
    "BASE PARA CÁLCULO   PROVENTOS E DESCONTOS",
    "Faltas não justificadas:   0   Férias:   1.600,00 P",
    "Salário Base:   5.000,00   1/3 das Férias:   533,33 P",
    "Desconto da Previdência:   300,00 D",
    "Desconto do imposto de Renda:   0,00",
    "TO TA L  DOS PROVENT   OS:   2.133,33   P",
    "TO TA L  DOS DESCONT   OS:   300,00   D",
    "TO TA L  LIQUIDO:   1.833,33   P",
    "A parcela do 13º Salário será paga depois.",
    "MARIA DA SILVA   ACME SOFTWARE LTDA",
    "CIENTE,   Data: 13/11/2026",
  ].join("\n");

  it("classifica como férias mesmo citando o 13º e usa o período de gozo como competência", () => {
    const parsed = parsePayrollText(text);
    expect(parsed).toMatchObject({
      paymentType: "VACATION",
      month: 12,
      year: 2026,
      employeeName: "MARIA DA SILVA",
      employerName: "ACME SOFTWARE LTDA",
      totalEarningsCents: 2_133_33,
      totalDeductionsCents: 300_00,
      netPaidCents: 1_833_33,
      inssCents: 300_00,
      irrfCents: 0,
    });
    expect(parsed.earnings.map((item) => item.description)).toEqual(["Férias", "1/3 das Férias"]);
    expect(parsed.deductions.map((item) => item.description)).toEqual(["Desconto da Previdência"]);
    expect(parsed.errors).toEqual(["CNPJ da fonte pagadora não reconhecido."]);
  });

  it("reaproveita o CNPJ de uma fonte pagadora já importada com a mesma razão social", () => {
    const parsed = parsePayrollText(text);
    const resolved = resolveEmployerFromHistory(parsed, [{ employerName: "Acme  Software Ltda.", employerCnpj: "11.222.333/0001-81" }]);
    expect(resolved.employerCnpj).toBe("11.222.333/0001-81");
    expect(resolved.errors).toEqual([]);
    expect(resolved.warnings.at(-1)).toMatch(/não informa o CNPJ/);
  });

  it("mantém o erro e orienta quando não há fonte pagadora conhecida", () => {
    const parsed = parsePayrollText(text);
    const resolved = resolveEmployerFromHistory(parsed, [{ employerName: "OUTRA EMPRESA LTDA", employerCnpj: "99.888.777/0001-00" }]);
    expect(resolved.employerCnpj).toBe("");
    expect(resolved.errors).toEqual(["CNPJ da fonte pagadora não reconhecido."]);
    expect(resolved.warnings.at(-1)).toMatch(/Importe antes um holerite/);
  });
});

describe("comprovante anual de rendimentos (modelo da Receita)", () => {
  const text = [
    "MINISTÉRIO DA ECONOMIA   COMPROVANTE DE RENDIMENTOS PAGOS E DE",
    "SECRETARIA DA RECEITA FEDERAL DO BRASIL   IMPOSTO SOBRE A RENDA RETIDO NA FONTE",
    "EXERCÍCIO:   2026   ANO-CALENDÁRIO:   2025",
    "1. Fonte Pagadora Pessoa Jurídica ou Pessoa Física",
    "CNPJ/CPF   Nome Empresarial / Nome Completo",
    "11.222.333/0001-81   ACME SOFTWARE LTDA",
    "2. Pessoa Física Beneficiária dos Rendimentos",
    "CPF   Nome Completo",
    "123.456.789-09   MARIA DA SILVA   -   123456",
    "Natureza do Rendimento",
    "RENDIMENTO DO TRABALHO ASSALARIADO NO PAÍS",
    "3. Rendimentos Tributáveis, Deduções e Imposto sobre a Renda Retido na Fonte   Valores em Reais",
    "1. Total dos rendimentos (inclusive férias).   60.000,00",
    "2. Contribuição previdenciária oficial.   5.000,00",
    "5. Imposto sobre a Renda Retido na Fonte (IRRF).   7.000,00",
    "4. Rendimentos Isentos e Não Tributáveis   Valores em Reais",
    "1. Parcela isenta do 13º salário de aposentadoria, reserva remunerada, reforma e pensão (65 anos ou mais).   0,00",
    "9. Outros (especificar).Abono Pecuniário   1.000,00",
    "5. Rendimentos Sujeitos a Tributação Exclusiva (rendimento líquido)   Valores em Reais",
    "1. 13º (décimo terceiro) salário.   4.000,00",
    "2. Imposto sobre a Renda Retido na Fonte sobre 13º (décimo terceiro) salário.   600,00",
  ].join("\n");

  it("lê fonte pagadora e beneficiária das linhas abaixo dos cabeçalhos", () => {
    const parsed = parseAnnualEmploymentIncomeStatement(text);
    expect(parsed).toMatchObject({
      calendarYear: 2025,
      taxExercise: 2026,
      payerTaxId: "11.222.333/0001-81",
      payerName: "ACME SOFTWARE LTDA",
      beneficiaryTaxId: "123.456.789-09",
      beneficiaryName: "MARIA DA SILVA",
      incomeNature: "RENDIMENTO DO TRABALHO ASSALARIADO NO PAÍS",
      taxableIncomeCents: 60_000_00,
      officialPensionCents: 5_000_00,
      irrfCents: 7_000_00,
    });
    expect(parsed.errors).toEqual([]);
  });

  it("usa a linha do quadro de tributação exclusiva para o 13º, não a parcela isenta de aposentados", () => {
    const parsed = parseAnnualEmploymentIncomeStatement(text);
    expect(parsed.thirteenthSalaryCents).toBe(4_000_00);
    expect(parsed.thirteenthIrrfCents).toBe(600_00);
  });
});

describe("holerite com várias páginas, IR, férias e PLR", () => {
  const header = [
    "ACME SOFTWARE LTDA",
    "CNPJ: 11.222.333/0001-81   CC: ENGENHARIA   Folha Mensal",
    "Mensalista   Março de 2026",
    "Código   Nome do Funcionário   CBO   Departamento   Filial",
    "7   MARIA DA SILVA   212405   1   1",
  ];
  const page1 = [
    ...header,
    "Código   Descrição   Referência   Vencimentos   Descontos",
    "1000 DIAS NORMAIS   30,00   5.000,00",
    "999 IMPOSTO DE RENDA   15,00   127,62",
    "812 INSS FERIAS   11,18   100,00",
    "998 I.N.S.S.   8,02   50,00",
    "Total de Vencimentos   Total de Descontos",
    "A TRANSPORTAR   *********   *********",
    "Valor Líquido    *********",
  ].join("\n");
  const page2 = [
    ...header,
    "Código   Descrição   Referência   Vencimentos   Descontos",
    "266 CONVÊNIO ODONTOLÓGICO (INFORMATIVA)   30,82",
    "Total de Vencimentos   Total de Descontos",
    "5.000,00   277,62",
    "BANCO DO BRASIL 1",
    "conta corrente: 12345-6   Agência: 1234 - 5   Valor Líquido    4.722,38",
  ].join("\n");

  it("junta as páginas, ignora as vias repetidas e classifica o imposto de renda como desconto", () => {
    const parsed = parsePayrollText([page1, page1, page2, page2].join("\n"));

    expect(parsed).toMatchObject({
      totalEarningsCents: 5_000_00,
      totalDeductionsCents: 277_62,
      netPaidCents: 4_722_38,
      irrfCents: 127_62,
      inssCents: 150_00,
    });
    expect(parsed.deductions.map((item) => item.description)).toEqual(["IMPOSTO DE RENDA", "INSS FERIAS", "I.N.S.S."]);
    expect(parsed.errors).toEqual([]);
  });

  it("reconhece participação nos lucros pelo cabeçalho do documento", () => {
    const parsed = parsePayrollText(
      [
        "ACME SOFTWARE LTDA",
        "CNPJ: 11.222.333/0001-81   CC: ENGENHARIA   Participação de lucros",
        "Mensalista   Março de 2026",
        "Código   Nome do Funcionário   CBO   Departamento   Filial",
        "7   MARIA DA SILVA   212405   1   1",
        "Código   Descrição   Referência   Vencimentos   Descontos",
        "873 PARTICIPACAO LUCROS   832,46   832,46",
        "Total de Vencimentos   Total de Descontos",
        "832,46   0,00",
        "Valor Líquido    832,46",
      ].join("\n"),
    );

    expect(parsed.paymentType).toBe("PLR");
    expect(parsed.warnings).toEqual([]);
  });

  it("lê o total dos proventos do recibo de férias com dígitos separados pela fonte", () => {
    const parsed = parsePayrollText(
      [
        "AVISO E RECIBO DE FÉRIAS",
        "Nome do empregado   Número Carteira Profissional   Série",
        "MARIA DA SILVA   57464   386",
        "De Gozo das Férias",
        "10/03/2026 A 29/03/2026 = 20 Dias",
        "Férias:   5.059,02 P",
        "Desconto da Previdência:   753,93 D",
        "TOT AL  DOS PROVENTOS:   10.1 18,04 P",
        "TOT AL  DOS DESCONTOS:   1.737,45   D",
        "TOT AL  LIQUIDO:   8.380,59   P",
        "ACME SOFTWARE LTDA",
        "CNPJ: 11.222.333/0001-81",
        "Data: 07/03/2026",
      ].join("\n"),
    );

    expect(parsed.paymentType).toBe("VACATION");
    expect(parsed.totalEarningsCents).toBe(10_118_04);
  });
});
