import { deflateSync } from "node:zlib";
import { describe, expect, it } from "vitest";

import { extractPdfText } from "@/app/lib/transactions/import/pdf-experiment";

const ALPHABET = " ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.,:-/$";

function hex(text: string) {
  return [...text].map((char) => (ALPHABET.indexOf(char) + 1).toString(16).padStart(4, "0")).join("").toUpperCase();
}

function cmap() {
  const pairs = [...ALPHABET].map((char, index) => `<${(index + 1).toString(16).padStart(4, "0")}> <${char.charCodeAt(0).toString(16).padStart(4, "0")}>`);
  return [
    "/CIDInit /ProcSet findresource begin 12 dict begin begincmap",
    "1 begincodespacerange <0000> <FFFF> endcodespacerange",
    `${pairs.length} beginbfchar`,
    ...pairs,
    "endbfchar endcmap end end",
  ].join("\n");
}

/** PDF mínimo de uma página com fonte Type0/CID (Identity-H), ToUnicode e larguras `/W`. */
function cidPdf(content: string, separator = "\r\n") {
  const objects: Array<string | Buffer> = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
    `<< /Length ${content.length} >>\nstream${separator}${content}${separator}endstream`,
    "<< /Type /Font /Subtype /Type0 /BaseFont /Teste /Encoding /Identity-H /DescendantFonts [7 0 R] /ToUnicode 6 0 R >>",
    Buffer.concat([
      Buffer.from("<< /Filter /FlateDecode /Length 0 >>\nstream\r\n", "latin1"),
      deflateSync(Buffer.from(cmap(), "latin1")),
      Buffer.from("\r\nendstream", "latin1"),
    ]),
    "<< /Type /Font /Subtype /CIDFontType2 /BaseFont /Teste /DW 500 /W [ 1 [ 250 ] ] >>",
  ];
  const parts: Buffer[] = [Buffer.from("%PDF-1.4\n", "latin1")];
  objects.forEach((object, index) => {
    parts.push(Buffer.from(`${index + 1} 0 obj\n`, "latin1"));
    parts.push(typeof object === "string" ? Buffer.from(object, "latin1") : object);
    parts.push(Buffer.from("\nendobj\n", "latin1"));
  });
  parts.push(Buffer.from("trailer\n<< /Root 1 0 R >>\n%%EOF", "latin1"));
  return new Uint8Array(Buffer.concat(parts));
}

describe("extractPdfText com fontes CID", () => {
  it("traduz códigos de glifo pelo ToUnicode e monta as linhas pela posição", () => {
    // Itens fora de ordem na página: a leitura deve seguir a posição, não a ordem do stream.
    const content = [
      "BT /F1 10 Tf",
      `1 0 0 1 200 700 Tm <${hex("1.500,00")}> Tj`,
      `1 0 0 1 50 680 Tm <${hex("Segunda linha")}> Tj`,
      `1 0 0 1 50 700 Tm <${hex("Total")}> Tj`,
      "ET",
    ].join("\n");

    const { text } = extractPdfText(cidPdf(content));
    const lines = text.split("\n");

    expect(lines[0]).toMatch(/^Total {3}1\.500,00$/);
    expect(lines[1]).toBe("Segunda linha");
  });

  it("junta letras vizinhas em palavra e separa palavras pela distância", () => {
    // Largura de cada glifo: 5 pt (500/1000 de 10 pt). "Ve" termina em x=60.
    const content = [
      "BT /F1 10 Tf",
      `1 0 0 1 50 700 Tm <${hex("Ve")}> Tj`,
      `1 0 0 1 60.1 700 Tm <${hex("ncimentos")}> Tj`,
      `1 0 0 1 120 700 Tm <${hex("Descontos")}> Tj`,
      "ET",
    ].join("\n");

    expect(extractPdfText(cidPdf(content)).text).toBe("Vencimentos Descontos");
  });

  it("ignora texto girado e usa a largura do /W para decidir os espaços", () => {
    const content = [
      "BT /F1 10 Tf",
      `1 0 0 1 50 700 Tm <${hex("Visivel")}> Tj`,
      `0 1 -1 0 300 300 Tm <${hex("Margem")}> Tj`,
      // O espaço (código 1) mede 2,5 pt pelo /W, então "A" + espaço + "B" cabem sem lacuna extra.
      `1 0 0 1 50 680 Tm <${hex("A B")}> Tj`,
      "ET",
    ].join("\n");

    const { text } = extractPdfText(cidPdf(content));
    expect(text).not.toContain("Margem");
    expect(text.split("\n")).toEqual(["Visivel", "A B"]);
  });

  it("respeita a matriz da página (cm) quando o gerador inverte o eixo y", () => {
    // Skia/Chrome desenham com y para baixo: o texto de y=100 está acima do de y=140.
    const content = [
      "q 1 0 0 -1 0 800 cm",
      "BT /F1 10 Tf",
      `1 0 0 -1 50 140 Tm <${hex("Embaixo")}> Tj`,
      `1 0 0 -1 50 100 Tm <${hex("Em cima")}> Tj`,
      "ET Q",
    ].join("\n");

    expect(extractPdfText(cidPdf(content)).text.split("\n")).toEqual(["Em cima", "Embaixo"]);
  });

  it("decodifica strings literais com códigos de 2 bytes em fontes CID", () => {
    // Alguns geradores (openhtmltopdf) escrevem os códigos de glifo como (\000\001...) em vez de <0001...>.
    const literal = [...hex("Nota 12")]
      .reduce<string[]>((pairs, char, index) => (index % 2 === 0 ? [...pairs, char] : [...pairs.slice(0, -1), pairs.at(-1) + char]), [])
      .map((byte) => `\\${Number.parseInt(byte, 16).toString(8).padStart(3, "0")}`)
      .join("");
    const content = `BT /F1 10 Tf 1 0 0 1 50 700 Tm (${literal}) Tj ET`;
    expect(extractPdfText(cidPdf(content)).text).toBe("Nota 12");
  });

  it("usa os recursos de fonte de cada página quando os nomes se repetem", () => {
    const content = `BT /F1 10 Tf 1 0 0 1 50 700 Tm <${hex("Pagina")}> Tj ET`;
    expect(extractPdfText(cidPdf(content)).text).toBe("Pagina");
  });

  it("aceita CR sozinho após a palavra stream e vários Tj em um TJ", () => {
    const content = `BT /F1 10 Tf 1 0 0 1 50 700 Tm [<${hex("Ola")}> -2000 <${hex("Mundo")}>] TJ ET`;
    expect(extractPdfText(cidPdf(content, "\r")).text).toBe("Ola Mundo");
  });
});
