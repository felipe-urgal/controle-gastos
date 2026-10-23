import { inflateSync } from "node:zlib";

/**
 * Extração de texto de PDFs com fontes compostas (Type0/CID, p.ex. gerados por conversores de impressão).
 * O texto vem como códigos de glifo em hexadecimal e cada letra pode ser posicionada à parte: o mapa
 * ToUnicode da fonte traduz os códigos e as larguras (`/W`) permitem juntar letras vizinhas em palavras e
 * as linhas são reconstruídas pela posição na página, como em um texto "em layout".
 */

type CidFont = {
  codeBytes: number;
  chars: Map<number, string>;
  defaultWidth: number;
  widths: Map<number, number>;
};

type PdfObject = { start: number; end: number; body: string };

type TextItem = { x: number; y: number; size: number; text: string; endX: number };

const SPACE_GAP_EM = 0.2;
const COLUMN_GAP_EM = 2.2;

function stripTrailingLineBreaks(buffer: Buffer) {
  let end = buffer.length;
  while (end > 0 && (buffer[end - 1] === 10 || buffer[end - 1] === 13)) end -= 1;
  return buffer.subarray(0, end);
}

function utf16HexToText(hex: string) {
  let text = "";
  for (let index = 0; index + 4 <= hex.length; index += 4) {
    text += String.fromCharCode(Number.parseInt(hex.slice(index, index + 4), 16));
  }
  return text;
}

function parseToUnicodeCMap(cmap: string) {
  const chars = new Map<number, string>();
  let codeBytes = 2;
  const space = /begincodespacerange\s*<([0-9A-Fa-f]+)>/.exec(cmap);
  if (space) codeBytes = Math.max(1, Math.round(space[1].length / 2));

  for (const block of cmap.matchAll(/beginbfchar([\s\S]*?)endbfchar/g)) {
    for (const pair of block[1].matchAll(/<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>/g)) {
      const text = utf16HexToText(pair[2]).replace(/\u0000/g, "");
      if (text) chars.set(Number.parseInt(pair[1], 16), text);
    }
  }

  for (const block of cmap.matchAll(/beginbfrange([\s\S]*?)endbfrange/g)) {
    for (const range of block[1].matchAll(
      /<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>\s*(<[0-9A-Fa-f]+>|\[[^\]]*\])/g,
    )) {
      const low = Number.parseInt(range[1], 16);
      const high = Math.min(Number.parseInt(range[2], 16), low + 0xffff);
      if (range[3].startsWith("[")) {
        [...range[3].matchAll(/<([0-9A-Fa-f]+)>/g)].forEach((item, offset) => {
          const text = utf16HexToText(item[1]).replace(/\u0000/g, "");
          if (text) chars.set(low + offset, text);
        });
      } else {
        const start = Number.parseInt(range[3].slice(1, -1), 16);
        for (let code = low; code <= high; code += 1) {
          if (start + (code - low) > 0) chars.set(code, String.fromCharCode(start + (code - low)));
        }
      }
    }
  }

  return { codeBytes, chars };
}

/** Larguras do descendente CID: `/DW` e `/W` (`c [w1 w2 ...]` ou `c1 c2 w`), em milésimos de em. */
function parseWidths(body: string) {
  const defaultWidth = Number(/\/DW\s+(\d+)/.exec(body)?.[1] ?? 1000);
  const widths = new Map<number, number>();
  const start = body.search(/\/W\s*\[/);
  if (start >= 0) {
    let depth = 0;
    let end = start;
    for (let index = body.indexOf("[", start); index < body.length; index += 1) {
      if (body[index] === "[") depth += 1;
      if (body[index] === "]") {
        depth -= 1;
        if (depth === 0) {
          end = index;
          break;
        }
      }
    }
    const content = body.slice(body.indexOf("[", start) + 1, end);
    const pattern = /(\d+)\s*\[([^\]]*)\]|(\d+)\s+(\d+)\s+(\d+(?:\.\d+)?)/g;
    for (const match of content.matchAll(pattern)) {
      if (match[2] !== undefined) {
        match[2].trim().split(/\s+/).forEach((value, offset) => {
          if (value) widths.set(Number(match[1]) + offset, Number(value));
        });
      } else {
        const low = Number(match[3]);
        const high = Math.min(Number(match[4]), low + 0xffff);
        for (let code = low; code <= high; code += 1) widths.set(code, Number(match[5]));
      }
    }
  }
  return { defaultWidth, widths };
}

function collectObjects(raw: string) {
  const objects = new Map<number, PdfObject>();
  for (const match of raw.matchAll(/(?:^|[\r\n\s])(\d+)\s+\d+\s+obj\b/g)) {
    const start = (match.index ?? 0) + match[0].length;
    const end = raw.indexOf("endobj", start);
    if (end < 0) continue;
    objects.set(Number(match[1]), { start, end, body: raw.slice(start, end) });
  }
  return objects;
}

function dictionaryOf(object: PdfObject) {
  const stream = /stream(\r\n|\n|\r)/.exec(object.body);
  return stream ? object.body.slice(0, stream.index) : object.body.slice(0, 4096);
}

function objectStreamText(buffer: Buffer, raw: string, object: PdfObject) {
  const open = /(?<!end)stream(\r\n|\n|\r)/.exec(object.body);
  if (!open) return null;
  const start = object.start + (open.index ?? 0) + open[0].length;
  const end = raw.indexOf("endstream", start);
  if (end < 0) return null;
  const dictionary = object.body.slice(0, open.index);
  if (/\/(?:ASCII85Decode|RunLengthDecode|DCTDecode|CCITTFaxDecode|JBIG2Decode|JPXDecode)\b/.test(dictionary)) return null;
  const bytes = stripTrailingLineBreaks(buffer.subarray(start, end));
  try {
    return (/\/FlateDecode\b/.test(dictionary) ? inflateSync(bytes) : bytes).toString("latin1");
  } catch {
    return null;
  }
}

function collectFonts(buffer: Buffer, raw: string, objects: Map<number, PdfObject>) {
  const fontsByObject = new Map<number, CidFont>();
  for (const [number, object] of objects) {
    const dictionary = dictionaryOf(object);
    if (!/\/Subtype\s*\/Type0\b/.test(dictionary)) continue;
    const toUnicode = /\/ToUnicode\s+(\d+)\s+\d+\s+R/.exec(dictionary);
    const cmapObject = toUnicode ? objects.get(Number(toUnicode[1])) : undefined;
    const cmapText = cmapObject ? objectStreamText(buffer, raw, cmapObject) : null;
    if (!cmapText) continue;
    const descendant = /\/DescendantFonts\s*\[\s*(\d+)\s+\d+\s+R/.exec(dictionary);
    const descendantObject = descendant ? objects.get(Number(descendant[1])) : undefined;
    const metrics = descendantObject ? parseWidths(dictionaryOf(descendantObject)) : { defaultWidth: 1000, widths: new Map<number, number>() };
    fontsByObject.set(number, { ...parseToUnicodeCMap(cmapText), ...metrics });
  }

  const byName = new Map<string, CidFont>();
  if (fontsByObject.size === 0) return byName;
  const addResources = (resources: string) => {
    for (const entry of resources.matchAll(/\/([^\s/<>\[\]()]+)\s+(\d+)\s+\d+\s+R/g)) {
      const font = fontsByObject.get(Number(entry[2]));
      if (font) byName.set(entry[1], font);
    }
  };
  for (const match of raw.matchAll(/\/Font\s*<<([^>]*(?:>(?!>)[^>]*)*)>>/g)) addResources(match[1]);
  for (const match of raw.matchAll(/\/Font\s+(\d+)\s+\d+\s+R/g)) {
    const object = objects.get(Number(match[1]));
    if (object) addResources(object.body);
  }
  return byName;
}

/** Streams de conteúdo de cada página, na ordem em que a página os lista. */
function pageContents(buffer: Buffer, raw: string, objects: Map<number, PdfObject>) {
  const pages: string[] = [];
  for (const object of objects.values()) {
    const dictionary = dictionaryOf(object);
    if (!/\/Type\s*\/Page\b(?!s)/.test(dictionary)) continue;
    const contents = /\/Contents\s*(\[[^\]]*\]|\d+\s+\d+\s+R)/.exec(dictionary);
    if (!contents) continue;
    const refs = [...contents[1].matchAll(/(\d+)\s+\d+\s+R/g)].map((ref) => Number(ref[1]));
    const text = refs
      .map((ref) => {
        const target = objects.get(ref);
        return target ? objectStreamText(buffer, raw, target) ?? "" : "";
      })
      .join("\n");
    pages.push(text);
  }
  return pages;
}

type Token =
  | { kind: "num"; value: number }
  | { kind: "name"; value: string }
  | { kind: "str"; value: string; hex: boolean }
  | { kind: "array"; value: Token[] }
  | { kind: "op"; value: string };

function decodeLiteral(value: string) {
  const replacements: Record<string, string> = { n: "\n", r: "\r", t: "\t", b: "\b", f: "\f", "(": "(", ")": ")", "\\": "\\" };
  return value
    .replace(/\\([nrtbf()\\])/g, (_, escaped: string) => replacements[escaped] ?? escaped)
    .replace(/\\([0-7]{1,3})/g, (_, octal: string) => String.fromCharCode(Number.parseInt(octal, 8)));
}

function tokenize(content: string) {
  const pattern = /\((?:\\.|[^\\()])*\)|<<|>>|<([0-9A-Fa-f\s]*)>|\[|\]|\/[^\s/<>\[\]()]*|[-+]?(?:\d+\.?\d*|\.\d+)|[A-Za-z'"*]+/g;
  const root: Token[] = [];
  const stack: Token[][] = [root];
  for (const match of content.matchAll(pattern)) {
    const text = match[0];
    const current = stack[stack.length - 1];
    if (text === "[") {
      const array: Token[] = [];
      current.push({ kind: "array", value: array });
      stack.push(array);
    } else if (text === "]") {
      if (stack.length > 1) stack.pop();
    } else if (text === "<<" || text === ">>") {
      continue;
    } else if (text.startsWith("(")) {
      current.push({ kind: "str", value: decodeLiteral(text.slice(1, -1)), hex: false });
    } else if (text.startsWith("<")) {
      current.push({ kind: "str", value: (match[1] ?? "").replace(/\s+/g, ""), hex: true });
    } else if (text.startsWith("/")) {
      current.push({ kind: "name", value: text.slice(1) });
    } else if (/^[-+.\d]/.test(text)) {
      current.push({ kind: "num", value: Number(text) });
    } else {
      current.push({ kind: "op", value: text });
    }
  }
  return root;
}

function interpretPage(content: string, fonts: Map<string, CidFont>) {
  const items: TextItem[] = [];
  const operands: Token[] = [];
  let matrix = [1, 0, 0, 1, 0, 0];
  let lineMatrix = [1, 0, 0, 1, 0, 0];
  let font: CidFont | undefined;
  let fontSize = 10;
  let charSpacing = 0;
  let wordSpacing = 0;
  let leading = 0;

  const numbers = () => operands.filter((token): token is Extract<Token, { kind: "num" }> => token.kind === "num").map((token) => token.value);

  const showString = (token: Extract<Token, { kind: "str" }>) => {
    const scale = Math.abs(matrix[3]) || 1;
    const size = fontSize * scale;
    let text = "";
    let width = 0;
    if (token.hex && font) {
      const digits = font.codeBytes * 2;
      for (let index = 0; index + digits <= token.value.length; index += digits) {
        const code = Number.parseInt(token.value.slice(index, index + digits), 16);
        text += font.chars.get(code) ?? "";
        width += ((font.widths.get(code) ?? font.defaultWidth) / 1000) * fontSize + charSpacing;
      }
    } else if (token.hex) {
      for (let index = 0; index + 2 <= token.value.length; index += 2) {
        text += String.fromCharCode(Number.parseInt(token.value.slice(index, index + 2), 16));
        width += 0.5 * fontSize + charSpacing;
      }
    } else {
      text = token.value;
      width = token.value.length * (0.5 * fontSize + charSpacing);
      width += (token.value.split(" ").length - 1) * wordSpacing;
    }
    const advance = width * matrix[0];
    // Texto girado (ex.: legenda vertical na margem) não pertence às linhas horizontais do documento.
    const rotated = Math.abs(matrix[1]) > 0.01 || Math.abs(matrix[2]) > 0.01;
    if (text.trim() && !rotated) items.push({ x: matrix[4], y: matrix[5], size, text, endX: matrix[4] + advance });
    matrix = [matrix[0], matrix[1], matrix[2], matrix[3], matrix[4] + advance, matrix[5]];
  };

  const move = (tx: number, ty: number) => {
    lineMatrix = [lineMatrix[0], lineMatrix[1], lineMatrix[2], lineMatrix[3], lineMatrix[4] + tx * lineMatrix[0] + ty * lineMatrix[2], lineMatrix[5] + tx * lineMatrix[1] + ty * lineMatrix[3]];
    matrix = [...lineMatrix];
  };

  for (const token of tokenize(content)) {
    if (token.kind !== "op") {
      operands.push(token);
      continue;
    }
    const values = numbers();
    switch (token.value) {
      case "BT":
        matrix = [1, 0, 0, 1, 0, 0];
        lineMatrix = [1, 0, 0, 1, 0, 0];
        break;
      case "Tf": {
        const name = operands.find((operand) => operand.kind === "name");
        if (name && name.kind === "name") font = fonts.get(name.value);
        fontSize = values.at(-1) ?? fontSize;
        break;
      }
      case "Tc": charSpacing = values.at(-1) ?? 0; break;
      case "Tw": wordSpacing = values.at(-1) ?? 0; break;
      case "TL": leading = values.at(-1) ?? 0; break;
      case "Tm":
        if (values.length >= 6) {
          matrix = values.slice(-6);
          lineMatrix = [...matrix];
        }
        break;
      case "Td": if (values.length >= 2) move(values[values.length - 2], values[values.length - 1]); break;
      case "TD":
        if (values.length >= 2) {
          leading = -values[values.length - 1];
          move(values[values.length - 2], values[values.length - 1]);
        }
        break;
      case "T*": move(0, -leading); break;
      case "Tj": {
        const string = operands.find((operand) => operand.kind === "str");
        if (string && string.kind === "str") showString(string);
        break;
      }
      case "'":
      case '"': {
        move(0, -leading);
        const string = operands.find((operand) => operand.kind === "str");
        if (string && string.kind === "str") showString(string);
        break;
      }
      case "TJ": {
        const array = operands.find((operand) => operand.kind === "array");
        if (array && array.kind === "array") {
          for (const element of array.value) {
            if (element.kind === "str") showString(element);
            else if (element.kind === "num") {
              matrix = [matrix[0], matrix[1], matrix[2], matrix[3], matrix[4] - (element.value / 1000) * fontSize * matrix[0], matrix[5]];
            }
          }
        }
        break;
      }
      default:
        break;
    }
    operands.length = 0;
  }
  return items;
}

/** Agrupa os itens por linha (mesma altura), ordena da esquerda para a direita e separa palavras e colunas pela distância. */
function layoutLines(items: TextItem[]) {
  const sorted = [...items].sort((left, right) => right.y - left.y || left.x - right.x);
  const lines: TextItem[][] = [];
  for (const item of sorted) {
    const line = lines.at(-1);
    const reference = line?.[0];
    if (line && reference && Math.abs(reference.y - item.y) <= Math.max(1.5, item.size * 0.45)) line.push(item);
    else lines.push([item]);
  }

  return lines.map((line) => {
    const ordered = line.sort((left, right) => left.x - right.x);
    let text = "";
    let previous: TextItem | null = null;
    for (const item of ordered) {
      if (previous) {
        const gap = item.x - previous.endX;
        const em = Math.max(item.size, 1);
        if (gap > COLUMN_GAP_EM * em) text += "   ";
        else if (gap > SPACE_GAP_EM * em) text += " ";
      }
      text += item.text;
      previous = item;
    }
    return text;
  });
}

/** Texto por layout de um PDF com fontes CID; `null` quando o PDF não usa esse tipo de fonte ou não rende texto. */
export function extractCidPdfText(buffer: Buffer, raw: string) {
  const objects = collectObjects(raw);
  const fonts = collectFonts(buffer, raw, objects);
  if (fonts.size === 0) return null;

  const pages = pageContents(buffer, raw, objects)
    .map((content) => layoutLines(interpretPage(content, fonts)).join("\n"))
    .filter((page) => page.trim());
  return pages.length > 0 ? pages.join("\n") : null;
}
