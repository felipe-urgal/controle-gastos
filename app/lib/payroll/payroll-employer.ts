import type { ParsedPayrollDocument } from "@/app/lib/payroll/payroll-parser";

export const MISSING_EMPLOYER_CNPJ_ERROR = "CNPJ da fonte pagadora não reconhecido.";

export type KnownEmployer = { employerName: string; employerCnpj: string };

/** Compara razões sociais ignorando maiúsculas, acentos, pontuação e espaços (PDFs costumam quebrar palavras). */
function employerKey(name: string) {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

/**
 * Recibos de férias não trazem o CNPJ. Quando a razão social bate com uma fonte pagadora já importada
 * pelo usuário, reaproveita o CNPJ dela e avisa; sem correspondência nada é inferido e o erro permanece.
 */
export function resolveEmployerFromHistory(
  parsed: ParsedPayrollDocument,
  known: readonly KnownEmployer[],
): ParsedPayrollDocument {
  if (parsed.employerCnpj) return parsed;

  const key = employerKey(parsed.employerName);
  const match = key.length >= 4 ? known.find((item) => item.employerCnpj && employerKey(item.employerName) === key) : undefined;

  if (!match) {
    return {
      ...parsed,
      warnings: [...parsed.warnings, "O documento não informa o CNPJ. Importe antes um holerite da mesma fonte pagadora para que o CNPJ seja reaproveitado."],
    };
  }

  return {
    ...parsed,
    employerName: match.employerName,
    employerCnpj: match.employerCnpj,
    errors: parsed.errors.filter((error) => error !== MISSING_EMPLOYER_CNPJ_ERROR),
    warnings: [...parsed.warnings, `O documento não informa o CNPJ; foi usado o CNPJ de ${match.employerName}, já importado por você.`],
  };
}
