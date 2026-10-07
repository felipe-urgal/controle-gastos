import { inflateRawSync } from "node:zlib";

import {
  IMPORT_MAX_ITEMS,
  ImportParseError,
  parseTabularImportRows,
} from "@/app/lib/transactions/import/parser";

const XLSX_MAX_SHEETS = 20;
const XLSX_MAX_EXPANDED_BYTES = 20 * 1024 * 1024;
const XLSX_MAX_ENTRY_BYTES = 8 * 1024 * 1024;

type ZipEntry = {
  name: string;
  data: Uint8Array;
};

function readUInt16(buffer: Uint8Array, offset: number) {
  return buffer[offset] | (buffer[offset + 1] << 8);
}

function readUInt32(buffer: Uint8Array, offset: number) {
  return (
    buffer[offset] |
    (buffer[offset + 1] << 8) |
    (buffer[offset + 2] << 16) |
    (buffer[offset + 3] << 24)
  ) >>> 0;
}

function decodeUtf8(bytes: Uint8Array) {
  return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
}

function findEndOfCentralDirectory(buffer: Uint8Array) {
  const minOffset = Math.max(0, buffer.length - 65_557);
  for (let offset = buffer.length - 22; offset >= minOffset; offset -= 1) {
    if (readUInt32(buffer, offset) === 0x06054b50) return offset;
  }
  return -1;
}

function readZipEntries(buffer: Uint8Array) {
  const endOffset = findEndOfCentralDirectory(buffer);
  if (endOffset < 0) throw new ImportParseError("XLSX inválido: diretório ZIP não encontrado.");

  const entryCount = readUInt16(buffer, endOffset + 10);
  const centralOffset = readUInt32(buffer, endOffset + 16);
  const entries = new Map<string, ZipEntry>();
  let offset = centralOffset;
  let expandedBytes = 0;

  for (let index = 0; index < entryCount; index += 1) {
    if (readUInt32(buffer, offset) !== 0x02014b50) {
      throw new ImportParseError("XLSX inválido: entrada ZIP corrompida.");
    }

    const flags = readUInt16(buffer, offset + 8);
    const compression = readUInt16(buffer, offset + 10);
    const compressedSize = readUInt32(buffer, offset + 20);
    const uncompressedSize = readUInt32(buffer, offset + 24);
    const nameLength = readUInt16(buffer, offset + 28);
    const extraLength = readUInt16(buffer, offset + 30);
    const commentLength = readUInt16(buffer, offset + 32);
    const localOffset = readUInt32(buffer, offset + 42);
    const name = decodeUtf8(buffer.slice(offset + 46, offset + 46 + nameLength));

    if ((flags & 0x1) !== 0) {
      throw new ImportParseError("XLSX protegido por senha não é suportado.");
    }
    if (uncompressedSize > XLSX_MAX_ENTRY_BYTES) {
      throw new ImportParseError("XLSX contém uma entrada interna grande demais.");
    }

    if (!name.endsWith("/")) {
      if (readUInt32(buffer, localOffset) !== 0x04034b50) {
        throw new ImportParseError("XLSX inválido: cabeçalho ZIP local corrompido.");
      }
      const localNameLength = readUInt16(buffer, localOffset + 26);
      const localExtraLength = readUInt16(buffer, localOffset + 28);
      const dataOffset = localOffset + 30 + localNameLength + localExtraLength;
      const compressed = buffer.slice(dataOffset, dataOffset + compressedSize);

      let data: Uint8Array;
      if (compression === 0) {
        data = compressed;
      } else if (compression === 8) {
        data = inflateRawSync(compressed);
      } else {
        throw new ImportParseError("XLSX usa uma compressão ZIP não suportada.");
      }

      if (data.length !== uncompressedSize) {
        throw new ImportParseError("XLSX inválido: tamanho interno inconsistente.");
      }
      expandedBytes += data.length;
      if (expandedBytes > XLSX_MAX_EXPANDED_BYTES) {
        throw new ImportParseError("XLSX excede o limite seguro de conteúdo descompactado.");
      }
      entries.set(name, { name, data });
    }

    offset += 46 + nameLength + extraLength + commentLength;
  }

  return entries;
}

function xmlText(value: string) {
  return value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

function xmlAttribute(tag: string, name: string) {
  const match = new RegExp(`\\b${name}="([^"]*)"`).exec(tag);
  return match ? xmlText(match[1]) : "";
}

function entryText(entries: Map<string, ZipEntry>, name: string, required = true) {
  const entry = entries.get(name);
  if (!entry) {
    if (!required) return "";
    throw new ImportParseError(`XLSX inválido: arquivo interno ausente (${name}).`);
  }
  try {
    return decodeUtf8(entry.data);
  } catch {
    throw new ImportParseError("XLSX contém XML com encoding inválido.");
  }
}

function normalizeZipPath(base: string, target: string) {
  const segments = (target.startsWith("/") ? target.slice(1) : `${base}/${target}`).split("/");
  const normalized: string[] = [];
  for (const segment of segments) {
    if (!segment || segment === ".") continue;
    if (segment === "..") normalized.pop();
    else normalized.push(segment);
  }
  return normalized.join("/");
}

type WorkbookSheet = {
  name: string;
  relationshipId: string;
};

function workbookSheets(entries: Map<string, ZipEntry>): WorkbookSheet[] {
  const workbook = entryText(entries, "xl/workbook.xml");
  const sheetTags = [...workbook.matchAll(/<sheet\b[^>]*>/gi)].map((match) => match[0]);
  if (sheetTags.length === 0) throw new ImportParseError("XLSX sem planilhas.");
  if (sheetTags.length > XLSX_MAX_SHEETS) {
    throw new ImportParseError(`XLSX excede o limite de ${XLSX_MAX_SHEETS} planilhas.`);
  }

  return sheetTags.map((tag, index) => {
    const relationshipId = xmlAttribute(tag, "r:id");
    if (!relationshipId) {
      throw new ImportParseError(
        `XLSX inválido: planilha ${index + 1} sem relacionamento.`,
      );
    }

    return {
      name: xmlAttribute(tag, "name") || `Planilha ${index + 1}`,
      relationshipId,
    };
  });
}

function worksheetPathForRelationship(
  entries: Map<string, ZipEntry>,
  relationshipId: string,
) {
  const relationships = entryText(entries, "xl/_rels/workbook.xml.rels");
  for (const match of relationships.matchAll(/<Relationship\b[^>]*>/gi)) {
    const tag = match[0];
    if (xmlAttribute(tag, "Id") !== relationshipId) continue;
    const target = xmlAttribute(tag, "Target");
    if (!target) break;
    return normalizeZipPath("xl", target);
  }

  throw new ImportParseError("XLSX inválido: não foi possível localizar a planilha selecionada.");
}

function firstWorksheetInfo(entries: Map<string, ZipEntry>) {
  const sheets = workbookSheets(entries);
  const first = sheets[0];

  return {
    path: worksheetPathForRelationship(entries, first.relationshipId),
    name: first.name,
    ignoredWorksheetNames: sheets.slice(1).map((sheet) => sheet.name),
  };
}

function parseSharedStrings(entries: Map<string, ZipEntry>) {
  const xml = entryText(entries, "xl/sharedStrings.xml", false);
  if (!xml) return [];

  return [...xml.matchAll(/<si\b[^>]*>([\s\S]*?)<\/si>/gi)].map((match) =>
    [...match[1].matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/gi)]
      .map((textMatch) => xmlText(textMatch[1]))
      .join(""),
  );
}

function columnIndexFromCellReference(reference: string) {
  const match = /^([A-Z]+)\d+$/i.exec(reference);
  if (!match) return -1;
  let value = 0;
  for (const character of match[1].toUpperCase()) {
    value = value * 26 + character.charCodeAt(0) - 64;
  }
  return value - 1;
}

function parseCellValue(cellTag: string, body: string, sharedStrings: readonly string[]) {
  if (/<f\b/i.test(body)) {
    throw new ImportParseError("XLSX com fórmulas não é aceito como fonte de dados.");
  }

  const type = xmlAttribute(cellTag, "t");
  if (type === "inlineStr") {
    return [...body.matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/gi)]
      .map((match) => xmlText(match[1]))
      .join("");
  }

  const valueMatch = /<v\b[^>]*>([\s\S]*?)<\/v>/i.exec(body);
  const raw = valueMatch ? xmlText(valueMatch[1]).trim() : "";
  if (type === "s") {
    const index = Number(raw);
    return Number.isInteger(index) && index >= 0 ? sharedStrings[index] ?? "" : "";
  }
  if (type === "b") return raw === "1" ? "TRUE" : "FALSE";
  return raw;
}

function parseWorksheetRows(xml: string, sharedStrings: readonly string[]) {
  const rows: string[][] = [];

  for (const rowMatch of xml.matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/gi)) {
    const row: string[] = [];
    for (const cellMatch of rowMatch[1].matchAll(/(<c\b[^>]*>)([\s\S]*?)<\/c>/gi)) {
      const cellTag = cellMatch[1];
      const reference = xmlAttribute(cellTag, "r");
      const columnIndex = columnIndexFromCellReference(reference);
      if (columnIndex < 0) continue;
      row[columnIndex] = parseCellValue(cellTag, cellMatch[2], sharedStrings);
    }
    if (row.some((cell) => (cell ?? "").trim() !== "")) rows.push(row);
    if (rows.length > IMPORT_MAX_ITEMS + 1) {
      throw new ImportParseError(`Arquivo excede o limite de ${IMPORT_MAX_ITEMS} transações.`);
    }
  }

  return rows;
}

function excelSerialToLogicalDate(raw: string) {
  if (!/^\d+(?:\.\d+)?$/.test(raw.trim())) return null;
  const serial = Number(raw);
  if (!Number.isFinite(serial) || serial <= 0 || serial > 100_000) return null;

  const wholeDays = Math.floor(serial);
  const adjustedDays = wholeDays >= 60 ? wholeDays - 1 : wholeDays;
  const value = new Date(Date.UTC(1899, 11, 31 + adjustedDays));
  const year = value.getUTCFullYear();
  if (year < 2000 || year > 2100) return null;

  return `${String(year).padStart(4, "0")}-${String(value.getUTCMonth() + 1).padStart(2, "0")}-${String(value.getUTCDate()).padStart(2, "0")}`;
}

function normalizeExcelDateColumn(rows: string[][]) {
  if (rows.length === 0) return rows;
  const normalizedHeaders = rows[0].map((value) =>
    (value ?? "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
      .toLowerCase()
      .replace(/[\s_-]+/g, ""),
  );
  const dateIndex = normalizedHeaders.findIndex((header) =>
    ["data", "date", "dtposted"].includes(header),
  );
  if (dateIndex < 0) return rows;

  return rows.map((row, index) => {
    if (index === 0) return row;
    const raw = row[dateIndex] ?? "";
    const converted = excelSerialToLogicalDate(raw);
    if (!converted) return row;
    const next = [...row];
    next[dateIndex] = converted;
    return next;
  });
}

function parseXlsxWorkbook(bytes: Uint8Array) {
  const entries = readZipEntries(bytes);

  if ([...entries.keys()].some((name) => /vbaProject\.bin$/i.test(name))) {
    throw new ImportParseError("Arquivos Excel com macros não são suportados.");
  }

  const worksheetInfo = firstWorksheetInfo(entries);
  const worksheet = entryText(entries, worksheetInfo.path);
  const sharedStrings = parseSharedStrings(entries);
  const rows = parseWorksheetRows(worksheet, sharedStrings);

  if (rows.length < 2) {
    throw new ImportParseError("XLSX sem linhas de dados.");
  }

  return {
    rows,
    worksheetName: worksheetInfo.name,
    ignoredWorksheetNames: worksheetInfo.ignoredWorksheetNames,
  };
}

export function parseXlsxRows(bytes: Uint8Array) {
  return parseXlsxWorkbook(bytes).rows;
}

export function parseXlsxImportWithMetadata(bytes: Uint8Array) {
  const parsed = parseXlsxWorkbook(bytes);
  return {
    items: parseTabularImportRows(
      normalizeExcelDateColumn(parsed.rows),
      "XLSX",
    ),
    worksheetName: parsed.worksheetName,
    ignoredWorksheetNames: parsed.ignoredWorksheetNames,
  };
}

export function parseXlsxImport(bytes: Uint8Array) {
  return parseXlsxImportWithMetadata(bytes).items;
}
