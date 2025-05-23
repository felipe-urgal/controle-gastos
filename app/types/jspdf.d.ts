// src/types/jspdf.d.ts
import 'jspdf-autotable';

type RGBColor = [number, number, number];

declare module 'jspdf' {
  interface AutoTableStyles {
    fillColor?: RGBColor | false;
    textColor?: RGBColor;
    fontStyle?: 'normal' | 'bold' | 'italic' | 'bolditalic';
    halign?: 'left' | 'center' | 'right';
    cellPadding?: number;
    fontSize?: number;
    font?: string;
  }

  interface AutoTableColumnStyle extends AutoTableStyles {
    cellWidth?: number | 'auto' | 'wrap';
  }

  interface AutoTableOptions {
    head: (string | number)[][];
    body: (string | number)[][];
    startY?: number;
    styles?: AutoTableStyles;
    headStyles?: AutoTableStyles;
    bodyStyles?: AutoTableStyles;
    alternateRowStyles?: AutoTableStyles;
    columnStyles?: { [key: string]: AutoTableColumnStyle };
    theme?: 'striped' | 'grid' | 'plain';
  }

  interface jsPDF {
    autoTable: (options: AutoTableOptions) => jsPDF;
    lastAutoTable?: {
      finalY: number;
    };
  }
}