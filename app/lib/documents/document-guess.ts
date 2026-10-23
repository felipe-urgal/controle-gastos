/**
 * Identifica o tipo de documento a partir do texto extraído do PDF para orientar o usuário quando ele envia
 * o arquivo para a tela errada ou o formato não é reconhecido. Só descreve; nunca importa nada.
 */

export type DocumentKind =
  | "PAYSLIP"
  | "ANNUAL_EMPLOYMENT_INCOME"
  | "BROKERAGE_NOTE"
  | "FINANCIAL_INCOME_STATEMENT"
  | "CUSTODY_STATEMENT"
  | "BANK_ACCOUNT_STATEMENT"
  | "CARD_STATEMENT";

export type DocumentGuess = {
  kind: DocumentKind;
  label: string;
  /** Onde o app trata esse documento. */
  where: string;
};

const guesses: Array<{ kind: DocumentKind; label: string; where: string; test: (text: string) => boolean }> = [
  {
    kind: "ANNUAL_EMPLOYMENT_INCOME",
    label: "comprovante anual de rendimentos do trabalho",
    where: "Rendimentos do trabalho, na aba Anual / IR",
    test: (text) => /COMPROVANTE DE RENDIMENTOS PAGOS/.test(text),
  },
  {
    kind: "FINANCIAL_INCOME_STATEMENT",
    label: "informe de rendimentos financeiros",
    where: "Investimentos, na aba Informes / IR (Importar informe)",
    test: (text) => /INFORME DE RENDIMENTOS FINANCEIROS/.test(text),
  },
  {
    kind: "CUSTODY_STATEMENT",
    label: "extrato de custódia",
    where: "Investimentos, na aba Informes / IR (Conferir extrato de custódia)",
    test: (text) => /EXTRATO DE CUSTODIA/.test(text),
  },
  {
    kind: "BROKERAGE_NOTE",
    label: "nota de corretagem",
    where: "Investimentos, em Mais > Importar extrato",
    test: (text) => /NOTA DE CORRETAGEM|NOTA DE NEGOCIACAO|NOTA SINACOR/.test(text),
  },
  {
    kind: "PAYSLIP",
    label: "holerite ou recibo de pagamento",
    where: "Rendimentos do trabalho, na aba Mensal",
    test: (text) => /FOLHA MENSAL|AVISO E RECIBO DE FERIAS|RECIBO DE FERIAS|ADIANTAMENTO SALARIAL|TOTAL DE VENCIMENTOS/.test(text),
  },
  {
    kind: "CARD_STATEMENT",
    label: "fatura de cartão",
    where: "Transações, em Importar (envie o CSV ou o OFX da fatura)",
    test: (text) => /\bFATURA\b/.test(text) && /CARTAO|LIMITE|VENCIMENTO/.test(text),
  },
  {
    kind: "BANK_ACCOUNT_STATEMENT",
    label: "extrato de conta",
    where: "Transações, em Importar (baixe o mesmo extrato em CSV ou OFX)",
    test: (text) => /SALDO INICIAL/.test(text) && /TOTAL DE (?:ENTRADAS|SAIDAS)|MOVIMENTACOES/.test(text),
  },
];

function fold(text: string) {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase().replace(/\s+/g, " ");
}

export function guessDocument(text: string): DocumentGuess | null {
  const value = fold(text);
  const found = guesses.find((guess) => guess.test(value));
  return found ? { kind: found.kind, label: found.label, where: found.where } : null;
}

/** Mensagem para um PDF que não é do tipo esperado pela tela: diz o que foi reconhecido e onde enviar. */
export function wrongDocumentMessage(text: string, expectedLabel: string) {
  const guess = guessDocument(text);
  if (!guess) {
    return `O PDF não foi reconhecido como ${expectedLabel}. Confira se é o documento original, sem edição, e se o arquivo não é uma foto ou digitalização.`;
  }
  return `Este PDF parece ser um ${guess.label}, não ${expectedLabel}. Envie em: ${guess.where}.`;
}
