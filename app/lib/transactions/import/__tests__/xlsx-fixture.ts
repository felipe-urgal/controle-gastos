import { Buffer } from "node:buffer";

type CellValue =
  | { kind: "text"; value: string }
  | { kind: "number"; value: string }
  | { kind: "formula"; formula: string; value?: string };

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function columnName(index: number) {
  let value = index + 1;
  let result = "";
  while (value > 0) {
    const remainder = (value - 1) % 26;
    result = String.fromCharCode(65 + remainder) + result;
    value = Math.floor((value - 1) / 26);
  }
  return result;
}

function worksheetXml(rows: readonly (readonly CellValue[])[]) {
  const body = rows.map((row, rowIndex) => {
    const cells = row.map((cell, columnIndex) => {
      const reference = `${columnName(columnIndex)}${rowIndex + 1}`;
      if (cell.kind === "text") {
        return `<c r="${reference}" t="inlineStr"><is><t>${escapeXml(cell.value)}</t></is></c>`;
      }
      if (cell.kind === "formula") {
        return `<c r="${reference}"><f>${escapeXml(cell.formula)}</f><v>${escapeXml(cell.value ?? "0")}</v></c>`;
      }
      return `<c r="${reference}"><v>${escapeXml(cell.value)}</v></c>`;
    }).join("");
    return `<row r="${rowIndex + 1}">${cells}</row>`;
  }).join("");

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${body}</sheetData></worksheet>`;
}

function uint16(value: number) {
  const buffer = Buffer.alloc(2);
  buffer.writeUInt16LE(value);
  return buffer;
}

function uint32(value: number) {
  const buffer = Buffer.alloc(4);
  buffer.writeUInt32LE(value >>> 0);
  return buffer;
}

function storedZip(entries: readonly { name: string; content: string }[]) {
  const localParts: Buffer[] = [];
  const centralParts: Buffer[] = [];
  let localOffset = 0;

  for (const entry of entries) {
    const name = Buffer.from(entry.name, "utf8");
    const data = Buffer.from(entry.content, "utf8");
    const localHeader = Buffer.concat([
      uint32(0x04034b50),
      uint16(20),
      uint16(0),
      uint16(0),
      uint16(0),
      uint16(0),
      uint32(0),
      uint32(data.length),
      uint32(data.length),
      uint16(name.length),
      uint16(0),
      name,
    ]);
    localParts.push(localHeader, data);

    const centralHeader = Buffer.concat([
      uint32(0x02014b50),
      uint16(20),
      uint16(20),
      uint16(0),
      uint16(0),
      uint16(0),
      uint16(0),
      uint32(0),
      uint32(data.length),
      uint32(data.length),
      uint16(name.length),
      uint16(0),
      uint16(0),
      uint16(0),
      uint16(0),
      uint32(0),
      uint32(localOffset),
      name,
    ]);
    centralParts.push(centralHeader);
    localOffset += localHeader.length + data.length;
  }

  const centralDirectory = Buffer.concat(centralParts);
  const end = Buffer.concat([
    uint32(0x06054b50),
    uint16(0),
    uint16(0),
    uint16(entries.length),
    uint16(entries.length),
    uint32(centralDirectory.length),
    uint32(localOffset),
    uint16(0),
  ]);

  return new Uint8Array(Buffer.concat([...localParts, centralDirectory, end]));
}

export function createXlsxFixture(params: {
  rows: readonly (readonly CellValue[])[];
  secondSheetRows?: readonly (readonly CellValue[])[];
}) {
  const hasSecondSheet = Boolean(params.secondSheetRows);
  const workbook = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Principal" sheetId="1" r:id="rId1"/>${hasSecondSheet ? '<sheet name="Secundaria" sheetId="2" r:id="rId2"/>' : ""}</sheets></workbook>`;
  const relationships = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>${hasSecondSheet ? '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet2.xml"/>' : ""}</Relationships>`;

  const entries = [
    {
      name: "[Content_Types].xml",
      content: '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"></Types>',
    },
    { name: "xl/workbook.xml", content: workbook },
    { name: "xl/_rels/workbook.xml.rels", content: relationships },
    { name: "xl/worksheets/sheet1.xml", content: worksheetXml(params.rows) },
  ];
  if (params.secondSheetRows) {
    entries.push({
      name: "xl/worksheets/sheet2.xml",
      content: worksheetXml(params.secondSheetRows),
    });
  }

  return storedZip(entries);
}

export const xlsxText = (value: string): CellValue => ({ kind: "text", value });
export const xlsxNumber = (value: string): CellValue => ({ kind: "number", value });
export const xlsxFormula = (formula: string, value?: string): CellValue => ({
  kind: "formula",
  formula,
  value,
});
