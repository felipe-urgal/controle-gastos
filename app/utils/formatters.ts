import { formatCurrency } from "@/app/utils/format";

export const formatReportValue = (value: number, type?: "INCOME" | "EXPENSE") => {
  const formatted = formatCurrency(value);
  
  if (type === "INCOME") return `+${formatted}`;
  if (type === "EXPENSE") return `-${formatted}`;
  return formatted;
};

export const buildCSVFromSections = (sections: Array<{
  title: string;
  headers: string[];
  rows: string[][];
}>) => {
  return sections.map(section => 
    [section.title, "", section.headers.join(";"), ...section.rows.map(row => row.join(";"))].join("\n")
  ).join("\n\n");
};