/**
 * Auxiliares para texto extraído de PDF "em layout": colunas separadas por 3 ou mais espaços e tabelas em que
 * os rótulos ficam em uma linha e os valores, na mesma ordem, na linha de baixo.
 */

export const MONEY_PATTERN = /-?\s*(?:R\$\s*)?-?\d{1,3}(?:\.\d{3})*,\d{2}|-?\s*(?:R\$\s*)?-?\d+,\d{2}/;

export function splitCells(line: string) {
  return line
    .split(/\s{3,}/)
    .map((cell) => cell.trim())
    .filter(Boolean);
}

export function textLines(text: string) {
  return text.replace(/\r/g, "\n").split("\n");
}

/** Valor da célula alinhada ao rótulo, na primeira linha não vazia abaixo (ex.: "Data pregão" → "21/10/2026"). */
export function valueBelowLabel(text: string, label: RegExp) {
  const lines = textLines(text);
  for (let index = 0; index < lines.length; index += 1) {
    const labels = splitCells(lines[index] ?? "");
    const position = labels.findIndex((cell) => label.test(cell));
    if (position < 0) continue;

    const next = lines.slice(index + 1).find((line) => line.trim());
    if (!next) continue;
    const values = splitCells(next);
    if (values.length === labels.length) return values[position] ?? null;
    // Colunas a menos na linha de valores: alinha pelo fim (rótulos à esquerda sem valor).
    const fromEnd = position - (labels.length - values.length);
    if (fromEnd >= 0 && fromEnd < values.length) return values[fromEnd] ?? null;
  }
  return null;
}

/** Converte "R$ 1.234,56", "-R$ 9,99" ou "9,99 D" em centavos absolutos. */
export function moneyCellToCents(cell: string | undefined) {
  if (!cell) return null;
  const match = /(\d{1,3}(?:\.\d{3})*|\d+),(\d{2})/.exec(cell);
  if (!match) return null;
  return Number(match[1].replace(/\./g, "")) * 100 + Number(match[2]);
}

/**
 * Valores monetários que seguem um rótulo na mesma linha (ex.: "Emolumentos   0,01 D"), um por ocorrência.
 * Rótulos sem valor depois deles ("Debêntures 0,00 Clearing") são ignorados. `label` é a fonte da expressão.
 */
export function moneyAfterLabel(text: string, label: string) {
  const pattern = new RegExp(`(?:^|[^\\p{L}])(?:${label})\\s+(?:-?\\s*R\\$\\s*)?-?(\\d{1,3}(?:\\.\\d{3})*,\\d{2}|\\d+,\\d{2})`, "giu");
  const values: number[] = [];
  for (const line of textLines(text)) {
    for (const match of line.matchAll(pattern)) {
      const cents = moneyCellToCents(match[1]);
      if (cents !== null) values.push(cents);
    }
  }
  return values;
}
