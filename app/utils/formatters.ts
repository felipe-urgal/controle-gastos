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

export const formatCurrency = (amount: number | string, currency: string = 'BRL') => {
  const value = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: currency
  }).format(value);
};

export const formatDate = (date: Date) => {
  return date.toLocaleDateString('pt-BR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};