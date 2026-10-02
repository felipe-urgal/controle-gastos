import type { InvestmentAnnualTaxSupportReport } from "@/app/types/investment";

function csvCell(value: string | number | null | undefined) {
  const text = value == null ? "" : String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

function pushRow(rows: string[], values: Array<string | number | null | undefined>) {
  rows.push(values.map(csvCell).join(","));
}

export function annualTaxReportToCsv(report: InvestmentAnnualTaxSupportReport) {
  const rows: string[] = [];
  pushRow(rows, ["Relatório anual de apoio ao IR", report.year]);
  pushRow(rows, ["Status", report.status]);
  pushRow(rows, ["Aviso", report.disclaimer]);
  rows.push("");

  pushRow(rows, ["PATRIMÔNIO EM 31/12"]);
  pushRow(rows, [
    "Ativo",
    "Moeda",
    "Qtd. ano anterior",
    "Custo ano anterior",
    "Qtd. ano atual",
    "Custo ano atual",
    "Status",
  ]);
  for (const item of report.patrimony.comparison) {
    pushRow(rows, [
      item.symbol,
      item.currency,
      item.previousQuantity,
      item.previousCostBasisCents,
      item.currentQuantity,
      item.currentCostBasisCents,
      item.status,
    ]);
  }
  rows.push("");

  pushRow(rows, ["RENDIMENTOS"]);
  pushRow(rows, [
    "Ativo",
    "Tipo",
    "Instituição",
    "Moeda",
    "Eventos",
    "Valor líquido",
    "Status",
  ]);
  for (const item of report.incomes.items) {
    pushRow(rows, [
      item.symbol,
      item.incomeType,
      item.institutionName,
      item.currency,
      item.eventCount,
      item.netAmountCents,
      item.pending.length > 0 ? "PENDING" : "OK",
    ]);
  }
  rows.push("");

  pushRow(rows, ["VENDAS E RESULTADO REALIZADO"]);
  pushRow(rows, [
    "Mês",
    "Classe",
    "Moeda",
    "Vendas",
    "Venda líquida",
    "Custo alocado",
    "Resultado realizado",
    "Status",
  ]);
  for (const item of report.realized.monthlyGroups) {
    pushRow(rows, [
      item.month,
      item.assetType,
      item.currency,
      item.saleCount,
      item.netProceedsCents,
      item.allocatedCostCents,
      item.realizedResultCents,
      item.status,
    ]);
  }
  rows.push("");

  pushRow(rows, ["PREJUÍZOS ACUMULADOS"]);
  pushRow(rows, [
    "Mês",
    "Classe",
    "Moeda",
    "Saldo inicial",
    "Gerado",
    "Compensado",
    "Saldo final",
    "Status",
  ]);
  for (const item of report.taxLosses.rows) {
    pushRow(rows, [
      item.month,
      item.assetType,
      item.currency,
      item.openingLossCents,
      item.generatedLossCents,
      item.compensatedLossCents,
      item.closingLossCents,
      item.status,
    ]);
  }
  rows.push("");

  pushRow(rows, ["IRRF E DARF"]);
  pushRow(rows, [
    "Mês",
    "Classe",
    "Moeda",
    "Base após prejuízos",
    "IRRF",
    "DARF pago",
    "Imposto devido",
    "Saldo em aberto",
    "Status",
  ]);
  for (const item of report.taxes.rows) {
    pushRow(rows, [
      item.month,
      item.assetType,
      item.currency,
      item.taxableResultAfterCompensationCents,
      item.withholdingCents,
      item.paidDarfCents,
      item.taxDueCents,
      item.openTaxBalanceCents,
      item.status,
    ]);
  }
  rows.push("");

  pushRow(rows, ["PENDÊNCIAS"]);
  pushRow(rows, [
    "Categoria",
    "Título",
    "Status",
    "Mensagem",
    "Ação sugerida",
    "Justificativa",
  ]);
  for (const item of report.pendencies.items) {
    pushRow(rows, [
      item.category,
      item.title,
      item.status,
      item.message,
      item.suggestedAction,
      item.resolution?.justification ?? null,
    ]);
  }
  rows.push("");

  pushRow(rows, ["NOTAS DE AUDITORIA"]);
  pushRow(rows, ["Tipo", "Título", "Detalhe"]);
  for (const note of report.notes) {
    pushRow(rows, [note.type, note.title, note.detail]);
  }

  return "\uFEFF" + rows.join("\r\n");
}

function normalizePdfText(value: string) {
  return value
    .replaceAll("–", "-")
    .replaceAll("—", "-")
    .replaceAll("•", "-")
    .replaceAll("“", '"')
    .replaceAll("”", '"')
    .replaceAll("’", "'");
}

function wrap(text: string, max = 92) {
  const words = normalizePdfText(text).split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    if (!line) {
      line = word;
      continue;
    }
    if ((line + " " + word).length <= max) {
      line += " " + word;
    } else {
      lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  return lines.length > 0 ? lines : [""];
}

function money(cents: number | null, currency: string) {
  if (cents == null) return "pendente";
  return `${currency} ${(cents / 100).toFixed(2)}`;
}

function pdfLines(report: InvestmentAnnualTaxSupportReport) {
  const lines: Array<{ text: string; bold?: boolean; gapBefore?: number }> = [
    { text: `Relatorio anual de apoio ao IR - Ano-calendario ${report.year}`, bold: true },
    { text: report.disclaimer },
    { text: `Status: ${report.status}`, bold: true, gapBefore: 6 },
    {
      text: `Ativos: ${report.summary.assetCount} | Rendimentos: ${report.summary.incomeEventCount} | Vendas: ${report.summary.saleCount} | Pendencias ativas: ${report.summary.pendingActive}`,
    },
    { text: "Patrimonio em 31/12", bold: true, gapBefore: 10 },
  ];

  for (const item of report.patrimony.comparison) {
    lines.push({
      text: `${item.symbol} | ${item.previousQuantity} -> ${item.currentQuantity} un. | custo ${money(item.previousCostBasisCents, item.currency)} -> ${money(item.currentCostBasisCents, item.currency)} | ${item.status}`,
    });
  }

  lines.push({ text: "Rendimentos", bold: true, gapBefore: 10 });
  for (const item of report.incomes.items) {
    lines.push({
      text: `${item.symbol} | ${item.incomeType} | ${item.institutionName} | ${money(item.netAmountCents, item.currency)} | ${item.pending.length ? "PENDING" : "OK"}`,
    });
  }

  lines.push({ text: "Vendas e resultado realizado", bold: true, gapBefore: 10 });
  for (const item of report.realized.monthlyGroups) {
    lines.push({
      text: `${String(item.month).padStart(2, "0")}/${report.year} | ${item.assetType} | ${item.currency} | vendas ${item.saleCount} | resultado ${money(item.realizedResultCents, item.currency)} | ${item.status}`,
    });
  }

  lines.push({ text: "Prejuizos acumulados", bold: true, gapBefore: 10 });
  for (const item of report.taxLosses.rows) {
    lines.push({
      text: `${String(item.month).padStart(2, "0")}/${report.year} | ${item.assetType} | saldo final ${money(item.closingLossCents, item.currency)} | ${item.status}`,
    });
  }

  lines.push({ text: "IRRF e DARF", bold: true, gapBefore: 10 });
  for (const item of report.taxes.rows) {
    lines.push({
      text: `${String(item.month).padStart(2, "0")}/${report.year} | ${item.assetType} | IRRF ${money(item.withholdingCents, item.currency)} | DARF ${money(item.paidDarfCents, item.currency)} | imposto devido: pendente | ${item.status}`,
    });
  }

  lines.push({ text: "Pendencias", bold: true, gapBefore: 10 });
  for (const item of report.pendencies.items) {
    lines.push({
      text: `[${item.status}] ${item.title}: ${item.message}`,
    });
    if (item.resolution) {
      lines.push({ text: `Justificativa: ${item.resolution.justification}` });
    }
  }

  lines.push({ text: "Notas de auditoria", bold: true, gapBefore: 10 });
  for (const note of report.notes) {
    lines.push({ text: `${note.title}: ${note.detail}` });
  }

  return lines;
}

function latin1Bytes(value: string) {
  const bytes: number[] = [];
  for (const char of value) {
    const code = char.codePointAt(0) ?? 63;
    bytes.push(code <= 255 ? code : 63);
  }
  return Uint8Array.from(bytes);
}

function escapePdfString(value: string) {
  return normalizePdfText(value)
    .replaceAll("\\", "\\\\")
    .replaceAll("(", "\\(")
    .replaceAll(")", "\\)");
}

function joinBytes(parts: Uint8Array[]) {
  const length = parts.reduce((sum, part) => sum + part.length, 0);
  const output = new Uint8Array(length);
  let offset = 0;
  for (const part of parts) {
    output.set(part, offset);
    offset += part.length;
  }
  return output;
}

export function annualTaxReportToPdf(report: InvestmentAnnualTaxSupportReport) {
  const source = pdfLines(report);
  const logicalLines = source.flatMap((item) => {
    const wrapped = wrap(item.text);
    return wrapped.map((text, index) => ({
      text,
      bold: item.bold,
      gapBefore: index === 0 ? item.gapBefore ?? 0 : 0,
    }));
  });

  const pages: typeof logicalLines[] = [];
  let page: typeof logicalLines = [];
  let used = 0;
  const maxUnits = 49;

  for (const line of logicalLines) {
    const units = 1 + Math.ceil((line.gapBefore ?? 0) / 12);
    if (used + units > maxUnits && page.length > 0) {
      pages.push(page);
      page = [];
      used = 0;
    }
    page.push(line);
    used += units;
  }
  if (page.length > 0) pages.push(page);

  const objects: Uint8Array[] = [];
  const add = (value: string) => {
    objects.push(latin1Bytes(value));
    return objects.length;
  };

  const fontRegular = add(
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
  );
  const fontBold = add(
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>",
  );
  const pageObjectIds: number[] = [];
  const contentIds: number[] = [];

  const pagesRootId = objects.length + 1;
  objects.push(new Uint8Array());

  for (const lines of pages) {
    let y = 806;
    const commands: string[] = [];
    for (const line of lines) {
      y -= line.gapBefore ?? 0;
      const font = line.bold ? "F2" : "F1";
      const size = line.bold ? 11 : 9;
      commands.push(
        `BT /${font} ${size} Tf 42 ${y} Td (${escapePdfString(line.text)}) Tj ET`,
      );
      y -= line.bold ? 16 : 14;
    }

    const stream = commands.join("\n");
    const contentId = add(
      `<< /Length ${latin1Bytes(stream).length} >>\nstream\n${stream}\nendstream`,
    );
    contentIds.push(contentId);

    const pageId = add(
      `<< /Type /Page /Parent ${pagesRootId} 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 ${fontRegular} 0 R /F2 ${fontBold} 0 R >> >> /Contents ${contentId} 0 R >>`,
    );
    pageObjectIds.push(pageId);
  }

  objects[pagesRootId - 1] = latin1Bytes(
    `<< /Type /Pages /Count ${pageObjectIds.length} /Kids [${pageObjectIds
      .map((id) => `${id} 0 R`)
      .join(" ")}] >>`,
  );
  const catalogId = add(`<< /Type /Catalog /Pages ${pagesRootId} 0 R >>`);

  const header = latin1Bytes("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n");
  const bodyParts: Uint8Array[] = [header];
  const offsets: number[] = [0];
  let offset = header.length;

  for (let index = 0; index < objects.length; index += 1) {
    offsets.push(offset);
    const prefix = latin1Bytes(`${index + 1} 0 obj\n`);
    const suffix = latin1Bytes("\nendobj\n");
    bodyParts.push(prefix, objects[index]!, suffix);
    offset += prefix.length + objects[index]!.length + suffix.length;
  }

  const xrefOffset = offset;
  let xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let index = 1; index < offsets.length; index += 1) {
    xref += `${String(offsets[index]).padStart(10, "0")} 00000 n \n`;
  }
  xref += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
  bodyParts.push(latin1Bytes(xref));

  return joinBytes(bodyParts);
}
