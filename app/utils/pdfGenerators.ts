import autoTable, { UserOptions } from 'jspdf-autotable';
import { jsPDF } from 'jspdf';
import {
  ReportData,
  SummaryReportData,
  AccountReportData,
  AccountCategoryReportData,
  AccountTypeCategoryReportData,
  InvestmentReportData,
  AnnualAccountReportData,
  AnnualAccountTypeCategoryReportData
} from '@/app/types/reports';
import { formatReportValue } from '@/app/utils/formatters';
import { formatCurrency } from "@/app/utils/format";

interface jsPDFWithAutoTable extends jsPDF {
  lastAutoTable: { finalY: number };
  autoTable: (options: UserOptions) => jsPDF;
}

export const generatePDF = async (data: ReportData, reportType: string, title: string) => {
  const { default: jsPDF } = await import('jspdf');
  const doc = new jsPDF() as jsPDFWithAutoTable;
  
  // Document title
  doc.setFontSize(18);
  doc.text(title, 14, 15);
  
  // Generation date
  doc.setFontSize(10);
  doc.text(`Gerado em: ${new Date().toLocaleDateString()}`, 14, 22);
  
  // Content based on report type
  switch (reportType) {
    case "summary":
      addSummaryToPDF(doc, data as SummaryReportData);
      break;
    case "by-account":
      addAccountsToPDF(doc, data as AccountReportData);
      break;
    case "by-account-category":
      addAccountsCategoriesToPDF(doc, data as AccountCategoryReportData);
      break;
    case "by-account-type-category":
      addAccountsTypeCategoriesToPDF(doc, data as AccountTypeCategoryReportData);
      break;
    case "investment":
      addInvestmentsToPDF(doc, data as InvestmentReportData);
      break;
    case "annual-by-account":
      addAnnualAccountsToPDF(doc, data as AnnualAccountReportData);
      break;
    case "annual-by-account-type-category":
      addAnnualAccountsTypeCategoriesToPDF(doc, data as AnnualAccountTypeCategoryReportData);
      break;
  }
  
  return doc;
};

const addSummaryToPDF = (doc: jsPDFWithAutoTable, data: SummaryReportData) => {
  // Verificação básica dos dados
  if (!data || (data.income === undefined && data.expense === undefined && data.balance === undefined)) {
    console.error("Dados inválidos para o relatório:", data);
    return doc;
  }

  // Configuração de cores (consistente com addAccountsToPDF)
  const colorIncome: [number, number, number] = [39, 174, 96];    // Verde
  const colorExpense: [number, number, number] = [231, 76, 60];   // Vermelho
  const colorNeutral: [number, number, number] = [52, 73, 94];    // Cinza escuro

  try {
    // Tabela de Resumo Financeiro
    autoTable(doc, {
      startY: 35,
      head: [["Tipo", "Valor"]],
      body: [
        ["Receitas", formatReportValue(data.income || 0, "INCOME")],
        ["Despesas", formatReportValue(data.expense || 0, "EXPENSE")],
        ["Saldo", formatReportValue(data.balance || 0)]
      ] as string[][],
      theme: "grid",
      headStyles: {
        fillColor: colorNeutral,
        textColor: [255, 255, 255],
        fontStyle: 'bold'
      },
      didParseCell: (cellData) => {
        if (cellData.section === 'body' && cellData.column.index === 1) {
          const rowType = (cellData.row.raw as string[])[0];
          const value = rowType === "Saldo" ? data.balance : undefined;
          
          cellData.cell.styles.textColor =
            rowType === "Receitas" ? colorIncome :
            rowType === "Despesas" ? colorExpense :
            (value !== undefined && value >= 0) ? colorIncome : colorExpense;

          cellData.cell.styles.fontStyle = "bold";
        }
      }
    });

    // Obter a posição Y após a primeira tabela
    const finalY = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 70

    // Tabela de Categorias (se houver dados)
    if (data.categories && data.categories.length > 0) {
      autoTable(doc, {
        startY: finalY + 10,
        head: [["Categoria", "Tipo", "Valor"]],
        body: data.categories.map((item) => [
          item.categoryName || "Sem nome",
          item.type === "INCOME" ? "Receita" : "Despesa",
          formatReportValue(item.amount || 0, item.type)
        ]),
        theme: "grid",
        headStyles: {
          fillColor: colorNeutral,
          textColor: [255, 255, 255],
          fontStyle: 'bold'
        },
        didParseCell: (cellData) => {
          if (cellData.section === 'body' && cellData.column.index === 2) {
            const type = (cellData.row.raw as string[])[1]; // <- Aqui é o ponto
            cellData.cell.styles.textColor = type === "Receita" ? colorIncome : colorExpense;
            cellData.cell.styles.fontStyle = "bold";
          }
        }
      });
    }

    return doc;
  } catch (error) {
    console.error("Erro ao gerar relatório PDF:", error);
    return doc;
  }
};

const addAccountsToPDF = (doc: jsPDF, data: AccountReportData) => {
  // Dados das contas (transações normais)
  const accountsData = data.accounts.map((account) => [
    account.accountName,
    formatCurrency(account.income),
    formatCurrency(account.expense),
    formatCurrency(account.balance)
  ]);

  // Configuração de cores (as RGB tuples)
  const colorIncome: [number, number, number] = [39, 174, 96];    // Verde
  const colorExpense: [number, number, number] = [231, 76, 60];   // Vermelho
  const colorNeutral: [number, number, number] = [52, 73, 94];    // Cinza escuro

  // Dados e tabelas permanecem iguais...

  // Tabela de transações normais
  autoTable(doc, {
    startY: 35,
    head: [["Conta", "Moeda", "Receitas", "Despesas", "Saldo"]],
    body: accountsData,
    theme: "grid",
    headStyles: { 
      fillColor: colorNeutral,
      textColor: [255, 255, 255] as [number, number, number],
      fontStyle: 'bold'
    },
    foot: [
      [
        "Total", 
        "", 
        formatCurrency(data.totals.income), 
        formatCurrency(data.totals.expense), 
        formatCurrency(data.totals.balance)
      ]
    ],
    footStyles: { 
      fillColor: colorNeutral,
      textColor: [255, 255, 255] as [number, number, number],
      fontStyle: 'bold'
    },
    didParseCell: (cellData) => {
      if (cellData.section === 'body') {
        switch(cellData.column.index) {
          case 2: // Receitas
            cellData.cell.styles.textColor = colorIncome;
            break;
          case 3: // Despesas
            cellData.cell.styles.textColor = colorExpense;
            break;
          case 4: // Saldo
            const balance = data.accounts[cellData.row.index].balance;
            cellData.cell.styles.textColor = balance >= 0 ? colorIncome : colorExpense;
            break;
        }
        cellData.cell.styles.fontStyle = "bold";
      }
    }
  });
};

const addAccountsCategoriesToPDF = (doc: jsPDF, data: AccountCategoryReportData) => {
  let startY = 35;
  
  data.accounts.forEach((account) => {
    doc.setFontSize(14);
    doc.text(`${account.accountName}`, 14, startY);
    startY += 10;
    
    // Tabela de categorias (transações normais)
    if (account.categories && account.categories.length > 0) {
      const categoriesData = account.categories.map((category) => [
        category.categoryName || 'Sem categoria',
        formatCurrency(category.income),
        formatCurrency(category.expense)
      ]);

      autoTable(doc, {
        startY: startY,
        head: [["Categoria", "Receitas", "Despesas"]],
        body: categoriesData,
        theme: "grid",
        headStyles: { 
          fillColor: [22, 160, 133],
          textColor: [255, 255, 255],
          fontStyle: 'bold'
        },
        foot: [
          [
            "Total", 
            formatCurrency(account.income), 
            formatCurrency(account.expense)
          ]
        ],
        footStyles: { 
          fillColor: [52, 73, 94],
          textColor: [255, 255, 255],
          fontStyle: 'bold'
        },
        didParseCell: (cellData) => {
          if (cellData.section === 'body') {
            switch(cellData.column.index) {
              case 1: // Receitas
                cellData.cell.styles.textColor = [39, 174, 96];
                break;
              case 2: // Despesas
                cellData.cell.styles.textColor = [231, 76, 60];
                break;
            }
            cellData.cell.styles.fontStyle = "bold";
          }
        }
      });

      startY = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 10;
    }
  });
};

const addAccountsTypeCategoriesToPDF = (doc: jsPDF, data: AccountTypeCategoryReportData) => {
  let startY = 35;
  
  // Filtrar contas que têm transações
  const accountsWithTransactions = data.accounts.filter(account => 
    account.types.some(type => type.categories.length > 0)
  );

  accountsWithTransactions.forEach((account) => {
    // Cabeçalho da conta
    doc.setFontSize(14);
    doc.text(`${account.accountName}`, 14, startY);
    startY += 10;

    // Transações normais (income/expense) por categoria
    const typesWithCategories = account.types.filter(type => type.categories.length > 0);
    
    typesWithCategories.forEach((type) => {
      const typeName = type.type === 'INCOME' ? 'Receitas' : 'Despesas';
      
      // Título do tipo
      doc.setFontSize(12);
      doc.text(`${typeName} (Total: ${formatCurrency(type.total)})`, 14, startY);
      startY += 8;
      
      // Tabela de categorias
      const categoriesData = type.categories.map(category => [
        category.categoryName || 'Sem categoria',
        formatCurrency(category.amount)
      ]);

      const COLORS = {
        income: [39, 174, 96] as [number, number, number],
        expense: [231, 76, 60] as [number, number, number],
        white: [255, 255, 255] as [number, number, number]
      };

      const color = type.type === 'INCOME' ? COLORS.income : COLORS.expense;

      autoTable(doc, {
        startY: startY,
        head: [["Categoria", "Valor"]],
        body: categoriesData,
        theme: "grid",
        headStyles: { 
          fillColor: color,
          textColor: COLORS.white,
          fontStyle: 'bold'
        },
        didParseCell: (cellData) => {
          if (cellData.section === 'body' && cellData.column.index === 1) {
            cellData.cell.styles.textColor = color;
            cellData.cell.styles.fontStyle = "bold";
          }
        }
      });

      startY = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 10;
    });

    // Resumo da conta
    doc.setFontSize(12);
    doc.text("Resumo da Conta", 14, startY);
    
    const summaryData = [
      ["Receitas", formatCurrency(account.income)],
      ["Despesas", formatCurrency(account.expense)],
      ["Saldo", formatCurrency(account.balance)]
    ];
    
    autoTable(doc, {
      startY: startY + 8,
      body: summaryData,
      theme: "grid",
      didParseCell: (cellData) => {
        if (cellData.section === 'body' && cellData.column.index === 1) {
          const rowType = (cellData.row.raw as string[])[0];
          const value = rowType === "Saldo" ? account.balance : undefined;
          cellData.cell.styles.textColor = 
            rowType === "Receitas" ? [39, 174, 96] :
            rowType === "Despesas" ? [231, 76, 60] :
            (value !== undefined && value >= 0) ? [39, 174, 96] : [231, 76, 60];
          cellData.cell.styles.fontStyle = "bold";
        }
      }
    });
    
    startY = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 20;
  });
};

const addInvestmentsToPDF = (doc: jsPDF, data: InvestmentReportData) => {
  doc.setFontSize(14);
  doc.text("Relatório de Investimentos", 14, 20);
  doc.setFontSize(12);
  doc.text(`Gerado em: ${new Date().toLocaleDateString()}`, 14, 30);

  // Resumo geral
  doc.setFontSize(14);
  doc.text("Resumo Geral", 14, 45);

  autoTable(doc, {
    startY: 50,
    head: [["Métrica", "Valor"]],
    body: [
      ["Total Investido", formatCurrency(data.totalInvested)],
      ["Valor Atual", formatCurrency(data.totalCurrentValue)],
      ["Dividendos Recebidos", formatCurrency(data.totalDividends)],
      ["Retorno Absoluto", formatCurrency(data.totalReturn.absolute)],
      ["Retorno Percentual", `${data.totalReturn.percentage.toFixed(2)}%`]
    ],
    theme: "grid",
    headStyles: { fillColor: [41, 128, 185] },
    styles: { fontSize: 10 }
  });

  let finalY = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 10;

  // Detalhamento por conta
  data.accounts.forEach(account => {
    doc.setFontSize(14);
    doc.text(`Conta: ${account.accountName}`, 14, finalY + 15);
    doc.setFontSize(10);
    doc.text(`Saldo: ${formatCurrency(account.balance)} ${account.currency}`, 14, finalY + 25);
    doc.text(`Dividendos: ${formatCurrency(account.totalDividends)}`, 14, finalY + 35);

    if (account.tickers && account.tickers.length > 0) {
      const tickersTable = account.tickers.map(ticker => {
        const unrealizedGain = ticker.currentValue - ticker.totalInvested;
        const percentage = ticker.totalInvested > 0
          ? (unrealizedGain / ticker.totalInvested) * 100
          : 0;

        return [
          ticker.ticker,
          ticker.quantity,
          formatCurrency(ticker.totalInvested),
          formatCurrency(ticker.totalDividends),
          formatCurrency(ticker.currentValue),
          `${percentage.toFixed(2)}%`,
          formatCurrency(ticker.avgPrice),
          formatCurrency(unrealizedGain),
          unrealizedGain >= 0 ? "▲" : "▼"
        ];
      });

      autoTable(doc, {
        startY: finalY + 40,
        head: [["Ativo", "Qtd", "Investido", "Dividendos", "Valor Atual", "%", "Preço Médio", "Ganho/Perda", ""]],
        body: tickersTable,
        theme: "grid",
        headStyles: { fillColor: [52, 73, 94] },
        columnStyles: {
          7: { cellWidth: 'wrap' },
          8: { cellWidth: 10 }
        },
        didParseCell: (data) => {
          if (data.column.index === 7 && data.section === "body") {
            const cellValue = tickersTable[data.row.index][7];
            // Ensure we're working with a string
            const valueString = typeof cellValue === 'number' ? cellValue.toString() : cellValue;
            const unrealizedGain = parseFloat(
              valueString.replace(/[^\d\.-]/g, '')
            );
            data.cell.styles.textColor = unrealizedGain >= 0 ? [0, 128, 0] : [220, 53, 69];
          }
        }
      });

      finalY = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 10;
    }
  });
};

const addAnnualAccountsToPDF = (doc: jsPDF, data: AnnualAccountReportData) => {
  let startY = 35;
  
  // Título
  doc.setFontSize(18);
  doc.text(`Relatório Anual por Conta - ${data.year}`, 14, startY);
  startY += 15;
  
  // Resumo Geral
  doc.setFontSize(14);
  doc.text("Resumo Anual", 14, startY);
  
  const summaryData = [
    ["Receitas", formatCurrency(data.annualTotals.income)],
    ["Despesas", formatCurrency(data.annualTotals.expense)],
    ["Saldo", formatCurrency(data.annualTotals.balance)],
  ];
  
  autoTable(doc, {
    startY: startY + 5,
    head: [["Item", "Valor"]],
    body: summaryData,
    theme: "grid",
    headStyles: { fillColor: [41, 128, 185] }
  });
  
  startY = (doc as jsPDFWithAutoTable).lastAutoTable?.finalY || startY + 30;
  
  // Detalhes por conta
  data.accounts.forEach(account => {
    doc.setFontSize(14);
    doc.text(`${account.accountName}`, 14, startY + 10);
    startY += 10;
    
    // Tabela de dados mensais
    const monthlyData = account.monthlyData.map(month => [
      month.month.toString(),
      formatCurrency(month.income),
      formatCurrency(month.expense),
      formatCurrency(month.balance)
    ]);
    
    autoTable(doc, {
      startY: startY + 5,
      head: [["Mês", "Receitas", "Despesas", "Saldo"]],
      body: monthlyData,
      theme: "grid",
      headStyles: { fillColor: [22, 160, 133] },
      foot: [
        [
          "Total Anual",
          formatCurrency(account.annualTotals.income),
          formatCurrency(account.annualTotals.expense),
          formatCurrency(account.annualTotals.balance)
        ]
      ],
      footStyles: { 
        fillColor: [52, 73, 94],
        textColor: [255, 255, 255],
        fontStyle: 'bold'
      }
    });
    
    startY = (doc as jsPDFWithAutoTable).lastAutoTable?.finalY || startY + 20;
    startY += 15; // Espaço entre contas
  });
};

const addAnnualAccountsTypeCategoriesToPDF = (doc: jsPDF, data: AnnualAccountTypeCategoryReportData) => {
  let startY = 35;
  
  // Title
  doc.setFontSize(18);
  doc.text(`Relatório Anual por Conta, Tipo e Categoria - ${data.year}`, 14, startY);
  startY += 15;
  
  // Global summary
  doc.setFontSize(14);
  doc.text("Resumo Anual", 14, startY);
  
  const summaryData = [
    ["Receitas", formatCurrency(data.annualTotals.income)],
    ["Despesas", formatCurrency(data.annualTotals.expense)],
    ["Saldo", formatCurrency(data.annualTotals.balance)]
  ];
  
  autoTable(doc, {
    startY: startY + 5,
    head: [["Item", "Valor"]],
    body: summaryData,
    theme: "grid",
    headStyles: { fillColor: [41, 128, 185] }
  });
  
  startY = (doc as jsPDFWithAutoTable).lastAutoTable?.finalY || startY + 30;
  
  // Accounts details
  data.accounts.forEach(account => {
    doc.setFontSize(14);
    doc.text(`${account.accountName}`, 14, startY + 7);
    startY += 10;
    
    // Account summary
    doc.setFontSize(12);
    
    const accountSummaryData = [
      ["Receitas", formatCurrency(account.annualTotals.income)],
      ["Despesas", formatCurrency(account.annualTotals.expense)],
      ["Saldo", formatCurrency(account.annualTotals.balance)]
    ];
    
    autoTable(doc, {
      startY: startY,
      body: accountSummaryData,
      theme: "grid",
      headStyles: { fillColor: [22, 160, 133] }
    });
    
    startY = (doc as jsPDFWithAutoTable).lastAutoTable?.finalY || startY + 20;
    
    // Annual by type and category (only income/expense)
    account.annualTypes.forEach(typeData => {
      const typeName = typeData.type === 'INCOME' ? 'Receitas' : 'Despesas';
      
      doc.setFontSize(12);
      doc.text(`${typeName} (Total: ${formatCurrency(typeData.total)})`, 14, startY + 7);
      startY += 8;
      
      const categoriesData = typeData.categories.map(category => [
        category.categoryName || 'Sem categoria',
        formatCurrency(category.amount)
      ]);
      
      autoTable(doc, {
        startY: startY,
        head: [["Categoria", "Valor"]],
        body: categoriesData,
        theme: "grid",
        headStyles: { fillColor: [22, 160, 133] }
      });
      
      startY = (doc as jsPDFWithAutoTable).lastAutoTable?.finalY || startY + 15;
    });
    
    // Monthly breakdown (without investments)
    doc.setFontSize(12);
    doc.text("Detalhamento Mensal:", 14, startY + 7);
    startY += 8;
    
    const monthlySummaryData = account.monthlyData.map(month => [
      `Mês ${month.month}`,
      formatCurrency(month.income),
      formatCurrency(month.expense),
      formatCurrency(month.balance)
    ]);
    
    autoTable(doc, {
      startY: startY,
      head: [["Mês", "Receitas", "Despesas", "Saldo"]],
      body: monthlySummaryData,
      theme: "grid",
      headStyles: { fillColor: [22, 160, 133] }
    });
    
    startY = (doc as jsPDFWithAutoTable).lastAutoTable?.finalY || startY + 20;
    startY += 10; // Space between accounts
  });
};