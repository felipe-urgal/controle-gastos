"use client";

// Hooks
import { useState } from "react";
import { saveAs } from "file-saver";
import { jsPDF } from "jspdf";
import autoTable, { UserOptions } from 'jspdf-autotable';

// Context
import { useAuth } from "@/app/context/AuthContext";

// Services
import { reportsService } from "@/app/services/reportsService";

// Icons
import {
  FaDownload,
  FaClock,
  FaCalendarAlt,
  FaFileAlt,
} from "react-icons/fa";

// Utils
import { formatCurrency } from "@/app/utils/format";

// Components
import { Select } from "@/app/components/ui/Select";
import ProtectedRoute from "@/app/components/ProtectedRoute";
import Breadcrumb from "@/app/components/Breadcrumb";


interface jsPDFWithAutoTable extends jsPDF {
  lastAutoTable: { finalY: number };
  autoTable: (options: UserOptions) => jsPDF;
};

// Define types for your report data
interface SummaryReportData {
  income: number;
  expense: number;
  balance: number;
  investments: {
    buys: number;
    sells: number;
    net: number;
  };
  categories: {
    categoryName: string;
    type: "INCOME" | "EXPENSE";
    amount: number;
  }[];
}

interface AccountReportData {
  accounts: {
    accountId: string;
    accountName: string;
    currency: string;
    income: number;
    expense: number;
    balance: number;
    investments: {
      buys: number;
      sells: number;
      net: number;
    };
  }[];
  totals: {
    income: number;
    expense: number;
    balance: number;
    investments: {
      buys: number;
      sells: number;
      net: number;
    };
  };
}

interface AccountCategoryReportData {
  accounts: {
    accountId: string;
    accountName: string;
    currency: string;
    income: number;
    expense: number;
    balance: number;
    investments: {
      buys: number;
      sells: number;
      net: number;
    };
    categories: {
      categoryId: string | null;
      categoryName: string | undefined;
      income: number;
      expense: number;
    }[];
  }[];
}

interface AccountTypeCategoryReportData {
  year: number;
  month: number;
  accounts: {
    accountId: string;
    accountName: string;
    currency: string;
    income: number;
    expense: number;
    balance: number;
    investments: {
      buys: number;
      sells: number;
      net: number;
    };
    types: {
      type: "INCOME" | "EXPENSE";
      total: number;
      categories: {
        categoryId: string | null;
        categoryName: string | undefined;
        amount: number;
      }[];
    }[];
  }[];
}

interface InvestmentReportData {
  accounts: {
    accountId: string;
    accountName: string;
    balance: number;
    currency: string;
    totalInvested: number;
    currentValue: number;
    return: {
      absolute: number;
      percentage: number;
    };
    tickers: {
      ticker: string;
      quantity: number;
      totalInvested: number;
      currentValue: number;
      avgPrice: number;
      currentPrice: number;
      operations: {
        buy: {
          date: string;
          quantity: number;
          unitPrice: number;
          totalAmount: number;
        }[];
        sell: {
          date: string;
          quantity: number;
          unitPrice: number;
          totalAmount: number;
        }[];
        other: {
          date: string;
          quantity: number;
          unitPrice: number;
          totalAmount: number;
        }[];
      };
    }[];
  }[];
  totalInvested: number;
  totalCurrentValue: number;
  totalReturn: {
    absolute: number;
    percentage: number;
  };
}

interface AnnualAccountReportData {
  year: number;
  accounts: {
    accountId: string;
    accountName: string;
    currency: string;
    monthlyData: {
      month: number;
      income: number;
      expense: number;
      balance: number;
    }[];
    investments: {
      buys: number;
      sells: number;
      net: number;
    };
    annualTotals: {
      income: number;
      expense: number;
      balance: number;
      investmentNet: number;
    };
  }[];
  annualTotals: {
    income: number;
    expense: number;
    balance: number;
    investments: {
      buys: number;
      sells: number;
      net: number;
    };
  };
}

interface AnnualAccountTypeCategoryReportData {
  year: number;
  accounts: {
    accountId: string;
    accountName: string;
    currency: string;
    monthlyData: {
      month: number;
      income: number;
      expense: number;
      balance: number;
      types: {
        type: string;
        total: number;
        categories: {
          categoryId: string | null;
          categoryName: string | undefined;
          amount: number;
        }[];
      }[];
    }[];
    investments: {
      buys: number;
      sells: number;
      net: number;
    };
    annualTotals: {
      income: number;
      expense: number;
      balance: number;
      investmentNet: number;
    };
    annualTypes: {
      type: string;
      total: number;
      categories: {
        categoryId: string | null;
        categoryName: string | undefined;
        amount: number;
      }[];
    }[];
  }[];
  annualTotals: {
    income: number;
    expense: number;
    balance: number;
    investments: {
      buys: number;
      sells: number;
      net: number;
    };
  };
}

type ReportData = SummaryReportData | AccountReportData | 
                  AccountCategoryReportData | AccountTypeCategoryReportData | 
                  InvestmentReportData | AnnualAccountReportData |
                  AnnualAccountTypeCategoryReportData;

export default function ReportsPage() {
  const { user } = useAuth();
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [reportType, setReportType] = useState<string>("summary");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const types = [
    { value: "summary", label: "Resumo Geral" },
    { value: "by-account", label: "Por Conta" },
    { value: "annual-by-account", label: "Por Conta (Anual)" },
    { value: "annual-by-account-type-category", label: "Por Conta/Tipo/Categoria (Anual)" },
    { value: "by-account-category", label: "Por Conta/Categoria" },
    { value: "by-account-type-category", label: "Por Conta/Tipo/Categoria" },
    { value: "investment", label: "Relatório de Investimentos" },
  ];

  // CSV

  const generateCSV = async () => {
    if (!user?.id) return;
    
    setIsLoading(true);
    setError(null);

    try {
      let data: { data: ReportData } | undefined;
      let filename = "";
      
      switch (reportType) {
        case "summary":
          data = await reportsService.getSummaryReport(user.id, year, month);
          filename = `resumo-${year}-${month}.csv`;
          break;
        case "by-account":
          data = await reportsService.getAccountReport(user.id, year, month);
          filename = `contas-${year}-${month}.csv`;
          break;
        case "by-account-category":
          data = await reportsService.getAccountCategoryReport(user.id, year, month);
          filename = `contas-categorias-${year}-${month}.csv`;
          break;
        case "by-account-type-category":
          data = await reportsService.getAccountTypeCategoryReport(user.id, year, month);
          filename = `contas-tipo-categorias-${year}-${month}.csv`;
          break;
        case "investment":
          data = await reportsService.getInvestmentReport(user.id, year, month);
          filename = `investimentos-${year}-${month}.csv`;
          break;
        case "annual-by-account":
          data = await reportsService.getAnnualByAccount(user.id, year, month);
          filename = `contas-anual-${year}.csv`;
          break;
        case "annual-by-account-type-category":
          data = await reportsService.getAnnualAccountTypeCategoryReport(user.id, year, month);
          filename = `contas-tipo-categorias-anual-${year}.csv`;
          break;
      }

      if (data) {
        const csvContent = convertToCSV(data.data);
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        saveAs(blob, filename);
      }
    } catch (err) {
      setError("Erro ao gerar CSV. Tente novamente.");
      console.error("Error generating CSV:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const convertToCSV = (data: ReportData): string => {
    switch (reportType) {
      case "summary":
        return summaryToCSV(data as SummaryReportData);
      case "by-account":
        return accountsToCSV(data as AccountReportData);
      case "by-account-category":
        return accountsCategoriesToCSV(data as AccountCategoryReportData);
      case "by-account-type-category":
        return accountsTypeCategoriesToCSV(data as AccountTypeCategoryReportData);
      case "investment":
        return investmentsToCSV(data as InvestmentReportData);
      case "annual-by-account":
        return annualAccountsToCSV(data as AnnualAccountReportData);
      case "annual-by-account-type-category":
        return annualAccountsTypeCategoriesToCSV(data as AnnualAccountTypeCategoryReportData);
      default:
        return "";
    }
  };

  const summaryToCSV = (data: SummaryReportData): string => {
    let csv = "Resumo Financeiro\n\n";
    csv += "Tipo;Valor\n";
    csv += `Receitas;${formatCurrency(data.income)}\n`;
    csv += `Despesas;${formatCurrency(data.expense)}\n`;
    csv += `Saldo;${formatCurrency(data.balance)}\n\n`;
    
    csv += "Investimentos\n";
    csv += `Compras;${formatCurrency(data.investments.buys)}\n`;
    csv += `Vendas;${formatCurrency(data.investments.sells)}\n`;
    csv += `Resultado Líquido;${formatCurrency(data.investments.net)}\n\n`;
    
    csv += "Detalhamento por Categoria\n";
    csv += "Categoria;Tipo;Valor\n";
    
    data.categories.forEach((item) => {
      csv += `${item.categoryName};${item.type === "INCOME" ? "Receita" : "Despesa"};${formatCurrency(item.amount)}\n`;
    });

    return csv;
  };

  const accountsToCSV = (data: AccountReportData): string => {
    let csv = "Conta;Moeda;Receitas;Despesas;Saldo;Invest. Compras;Invest. Vendas;Invest. Líquido\n";
    
    data.accounts.forEach((account) => {
      csv += `${account.accountName};${account.currency};` +
             `${formatCurrency(account.income)};${formatCurrency(account.expense)};` +
             `${formatCurrency(account.balance)};${formatCurrency(account.investments.buys)};` +
             `${formatCurrency(account.investments.sells)};${formatCurrency(account.investments.net)}\n`;
    });

    // Totais
    csv += `\nTotal;;${formatCurrency(data.totals.income)};${formatCurrency(data.totals.expense)};` +
           `${formatCurrency(data.totals.balance)};${formatCurrency(data.totals.investments.buys)};` +
           `${formatCurrency(data.totals.investments.sells)};${formatCurrency(data.totals.investments.net)}\n`;
    
    return csv;
  };

  const accountsCategoriesToCSV = (data: AccountCategoryReportData): string => {
    let csv = "";
    
    data.accounts.forEach((account) => {
      csv += `Conta: ${account.accountName} (${account.currency})\n`;
      csv += "Categoria;Receitas;Despesas\n";
      
      account.categories?.forEach((category) => {
        csv += `${category.categoryName};${formatCurrency(category.income)};${formatCurrency(category.expense)}\n`;
      });

      csv += `\nTotal;${formatCurrency(account.income)};${formatCurrency(account.expense)}\n`;
      
      // Adicionar seção de investimentos
      csv += `\nInvestimentos:\n`;
      csv += `Compras: ${formatCurrency(account.investments.buys)}\n`;
      csv += `Vendas: ${formatCurrency(account.investments.sells)}\n`;
      csv += `Resultado Líquido: ${formatCurrency(account.investments.net)}\n\n`;
    });

    return csv;
  };

  const accountsTypeCategoriesToCSV = (data: AccountTypeCategoryReportData): string => {
    let csv = "";
    
    // Filtrar contas que têm pelo menos um tipo com categorias
    const accountsWithTransactions = data.accounts.filter(account => 
      account.types.some(type => type.categories.length > 0) ||
      account.investments.buys > 0 ||
      account.investments.sells > 0
    );

    accountsWithTransactions.forEach((account) => {
      csv += `Conta: ${account.accountName} (${account.currency})\n`;
      
      // Transações normais (income/expense) por categoria
      const typesWithCategories = account.types.filter(type => type.categories.length > 0);
      
      typesWithCategories.forEach((type) => {
        const typeName = type.type === 'INCOME' ? 'Receitas' : 'Despesas';
        
        csv += `\n${typeName} (Total: ${formatCurrency(type.total)})\n`;
        csv += "Categoria;Valor\n";
        
        type.categories.forEach((category) => {
          csv += `${category.categoryName || 'Sem categoria'};${formatCurrency(category.amount)}\n`;
        });
      });

      // Seção de investimentos
      if (account.investments.buys > 0 || account.investments.sells > 0) {
        csv += `\nInvestimentos:\n`;
        csv += `Compras: ${formatCurrency(account.investments.buys)}\n`;
        csv += `Vendas: ${formatCurrency(account.investments.sells)}\n`;
        csv += `Resultado Líquido: ${formatCurrency(account.investments.net)}\n`;
      }

      // Resumo da conta
      csv += `\nResumo da Conta\n`;
      csv += `Receitas: ${formatCurrency(account.income)}\n`;
      csv += `Despesas: ${formatCurrency(account.expense)}\n`;
      csv += `Saldo: ${formatCurrency(account.balance)}\n`;
      csv += `\n`;
    });

    return csv;
  };

  const investmentsToCSV = (data: InvestmentReportData): string => {
    let csv = "Resumo Geral de Investimentos\n";
    csv += `Total Investido;${formatCurrency(data.totalInvested)}\n`;
    csv += `Saldo Atual;${formatCurrency(data.totalCurrentValue)}\n`;
    csv += `Retorno Absoluto;${formatCurrency(data.totalReturn.absolute)}\n`;
    csv += `Retorno Percentual;${data.totalReturn.percentage.toFixed(2)}%\n\n`;

    // Detalhamento por conta
    data.accounts.forEach(account => {
      csv += `Conta: ${account.accountName}\n`;
      csv += `Saldo: ${formatCurrency(account.balance)} ${account.currency}\n`;
      csv += `Investido: ${formatCurrency(account.totalInvested)}\n`;
      csv += `Retorno: ${formatCurrency(account.return.absolute)} (${account.return.percentage.toFixed(2)}%)\n\n`;

      // Ativos (tickers)
      if (account.tickers && account.tickers.length > 0) {
        csv += "Ticker;Quantidade;Investido;Valor Atual;% da Conta;Preço Médio;Ganho/Perda\n";

        const totalDaConta = account.totalInvested > 0 ? account.totalInvested : 1;

        account.tickers.forEach(ticker => {
          const unrealizedGain = ticker.currentValue - ticker.totalInvested;
          const percentageOfAccount = (ticker.totalInvested / totalDaConta) * 100;

          csv += `${ticker.ticker};${ticker.quantity};${formatCurrency(ticker.totalInvested)};${formatCurrency(ticker.currentValue)};${percentageOfAccount.toFixed(2)}%;${formatCurrency(ticker.avgPrice)};${formatCurrency(unrealizedGain)}\n`;
        });

        csv += "\n";
      }
    });

    // Transações recentes não incluídas, a não ser que você tenha esse campo adicional

    return csv;
  };


  const annualAccountsToCSV = (data: AnnualAccountReportData): string => {
    let csv = `Relatório Anual por Conta - ${data.year}\n\n`;
    
    data.accounts.forEach(account => {
      csv += `Conta: ${account.accountName} (${account.currency})\n`;
      csv += `Mês;Receitas;Despesas;Saldo\n`;
      
      // Dados mensais (transações regulares)
      account.monthlyData.forEach(month => {
        csv += `${month.month};${formatCurrency(month.income)};${formatCurrency(month.expense)};${formatCurrency(month.balance)}\n`;
      });
      
      // Totais anuais da conta
      csv += `\nTotais Anuais:\n`;
      csv += `Receitas:;${formatCurrency(account.annualTotals.income)}\n`;
      csv += `Despesas:;${formatCurrency(account.annualTotals.expense)}\n`;
      csv += `Saldo:;${formatCurrency(account.annualTotals.balance)}\n`;
      
      // Investimentos
      csv += `\nInvestimentos:\n`;
      csv += `Compras:;${formatCurrency(account.investments.buys)}\n`;
      csv += `Vendas:;${formatCurrency(account.investments.sells)}\n`;
      csv += `Resultado Líquido:;${formatCurrency(account.investments.net)}\n\n`;
    });

    // Totais gerais
    csv += `\nTotais Gerais\n`;
    csv += `Receitas:;${formatCurrency(data.annualTotals.income)}\n`;
    csv += `Despesas:;${formatCurrency(data.annualTotals.expense)}\n`;
    csv += `Saldo:;${formatCurrency(data.annualTotals.balance)}\n\n`;
    
    csv += `Investimentos Gerais:\n`;
    csv += `Compras:;${formatCurrency(data.annualTotals.investments.buys)}\n`;
    csv += `Vendas:;${formatCurrency(data.annualTotals.investments.sells)}\n`;
    csv += `Resultado Líquido:;${formatCurrency(data.annualTotals.investments.net)}\n`;

    return csv;
  };

  const annualAccountsTypeCategoriesToCSV = (data: AnnualAccountTypeCategoryReportData): string => {
    let csv = `Relatório Anual por Conta, Tipo e Categoria - ${data.year}\n\n`;
    
    data.accounts.forEach(account => {
      csv += `Conta: ${account.accountName} (${account.currency})\n`;
      
      // Annual summary
      csv += `Resumo Anual:\n`;
      csv += `Receitas: ${formatCurrency(account.annualTotals.income)}\n`;
      csv += `Despesas: ${formatCurrency(account.annualTotals.expense)}\n`;
      csv += `Saldo: ${formatCurrency(account.annualTotals.balance)}\n\n`;
      
      // Investments summary
      csv += `Investimentos:\n`;
      csv += `Compras: ${formatCurrency(account.investments.buys)}\n`;
      csv += `Vendas: ${formatCurrency(account.investments.sells)}\n`;
      csv += `Resultado Líquido: ${formatCurrency(account.investments.net)}\n\n`;
      
      // Annual by type and category (only income/expense)
      account.annualTypes.forEach(typeData => {
        const typeName = typeData.type === 'INCOME' ? 'Receitas' : 'Despesas';
        
        csv += `${typeName} (Total: ${formatCurrency(typeData.total)})\n`;
        csv += `Categoria;Valor\n`;
        
        typeData.categories.forEach(category => {
          csv += `${category.categoryName || 'Sem categoria'};${formatCurrency(category.amount)}\n`;
        });
        
        csv += `\n`;
      });
      
      // Monthly breakdown (without investments)
      csv += `Detalhamento Mensal:\n`;
      account.monthlyData.forEach(month => {
        csv += `Mês ${month.month}:\n`;
        csv += `Receitas: ${formatCurrency(month.income)}\n`;
        csv += `Despesas: ${formatCurrency(month.expense)}\n`;
        csv += `Saldo: ${formatCurrency(month.balance)}\n\n`;
      });
      
      csv += `\n`;
    });

    // Global totals
    csv += `Totais Gerais:\n`;
    csv += `Receitas: ${formatCurrency(data.annualTotals.income)}\n`;
    csv += `Despesas: ${formatCurrency(data.annualTotals.expense)}\n`;
    csv += `Saldo: ${formatCurrency(data.annualTotals.balance)}\n\n`;
    
    csv += `Investimentos Gerais:\n`;
    csv += `Compras: ${formatCurrency(data.annualTotals.investments.buys)}\n`;
    csv += `Vendas: ${formatCurrency(data.annualTotals.investments.sells)}\n`;
    csv += `Resultado Líquido: ${formatCurrency(data.annualTotals.investments.net)}\n`;

    return csv;
  };

  // PDF

  const generatePDF = async () => {
    if (!user?.id) return;
    
    setIsLoading(true);
    setError(null);

    try {
      let data: { data: ReportData } | undefined;
      let title = "";
      
      switch (reportType) {
        case "summary":
          data = await reportsService.getSummaryReport(user.id, year, month);
          title = `Resumo Financeiro - ${month}/${year}`;
          break;
        case "by-account":
          data = await reportsService.getAccountReport(user.id, year, month);
          title = `Relatório por Conta - ${month}/${year}`;
          break;
        case "by-account-category":
          data = await reportsService.getAccountCategoryReport(user.id, year, month);
          title = `Relatório por Conta e Categoria - ${month}/${year}`;
          break;
        case "by-account-type-category":
          data = await reportsService.getAccountTypeCategoryReport(user.id, year, month);
          title = `Relatório por Conta, Tipo e Categoria - ${month}/${year}`;
          break;
        case "investment":
          data = await reportsService.getInvestmentReport(user.id, year, month);
          title = `Relatório de Investimentos - ${month}/${year}`;
          break;
        case "annual-by-account":
          data = await reportsService.getAnnualByAccount(user.id, year, month);
          title = `Relatório Anual por Conta - ${year}`;
          break;
        case "annual-by-account-type-category":
          data = await reportsService.getAnnualAccountTypeCategoryReport(user.id, year, month);
          title = `Relatório Anual por Conta/Tipo/Categoria - ${year}`;
          break;
      }

      if (data) {
        generatePDFDocument(data.data, title);
      }
    } catch (err) {
      setError("Erro ao gerar PDF. Tente novamente.");
      console.error("Error generating PDF:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const generatePDFDocument = (data: ReportData, title: string) => {
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
    
    doc.save(`${title.toLowerCase().replace(/ /g, "-")}.pdf`);
  };

  const addSummaryToPDF = (doc: jsPDF, data: SummaryReportData) => {
    // Summary section
    doc.setFontSize(14);
    doc.text("Resumo Financeiro", 14, 35);
    
    const summaryData = [
      ["Receitas", formatCurrency(data.income)],
      ["Despesas", formatCurrency(data.expense)],
      ["Saldo", formatCurrency(data.balance)]
    ];

    autoTable(doc, {
      startY: 40,
      head: [["Tipo", "Valor"]],
      body: summaryData,
      theme: "grid",
      headStyles: { fillColor: [22, 160, 133] },
      didParseCell: (cellData) => {
        if (cellData.section === 'body' && cellData.column.index === 1) {
          const rowType = (cellData.row.raw as string[])[0];
          const value = rowType === "Saldo" ? data.balance : undefined;
          cellData.cell.styles.textColor = 
            rowType === "Receitas" ? [39, 174, 96] :
            rowType === "Despesas" ? [231, 76, 60] :
            (value !== undefined && value >= 0) ? [39, 174, 96] : [231, 76, 60];
          cellData.cell.styles.fontStyle = "bold";
        }
      }
    });
    
    // Investments section
    let finalY = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 40;
    doc.setFontSize(14);
    doc.text("Investimentos", 14, finalY + 15);
    
    const investmentsData = [
      ["Compras", formatCurrency(data.investments.buys)],
      ["Vendas", formatCurrency(data.investments.sells)],
      ["Resultado Líquido", formatCurrency(data.investments.net)]
    ];
    
    autoTable(doc, {
      startY: finalY + 20,
      head: [["Tipo", "Valor"]],
      body: investmentsData,
      theme: "grid",
      headStyles: { fillColor: [41, 128, 185] },
      didParseCell: (cellData) => {
        if (cellData.section === 'body') {
          switch(cellData.column.index) {
            case 0: // Tipo
              cellData.cell.styles.fontStyle = "bold";
              break;
            case 1: // Valor
              if (cellData.row.index === 0) {
                cellData.cell.styles.textColor = [41, 128, 185] as [number, number, number]; // Azul para compras
              } else if (cellData.row.index === 1) {
                cellData.cell.styles.textColor = [142, 68, 173] as [number, number, number]; // Roxo para vendas
              } else {
                // Verde/vermelho para resultado líquido
                const color: [number, number, number] = data.investments.net >= 0 
                  ? [39, 174, 96] 
                  : [231, 76, 60];
                cellData.cell.styles.textColor = color;
              }
              cellData.cell.styles.fontStyle = "bold";
              break;
          }
        }
      }
    });

    // Categories section
    if (data.categories.length > 0) {
      finalY = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 40;
      doc.setFontSize(14);
      doc.text("Por Categoria", 14, finalY + 15);
      
      const categoriesData = data.categories.map((item) => [
        item.categoryName,
        item.type === "INCOME" ? "Receita" : "Despesa",
        formatCurrency(item.amount)
      ]);

      autoTable(doc, {
        startY: finalY + 20,
        head: [["Categoria", "Tipo", "Valor"]],
        body: categoriesData,
        theme: "grid",
        headStyles: { fillColor: [22, 160, 133] },
        didParseCell: (cellData) => {
          if (cellData.section === 'body' && cellData.column.index === 2) {
            const type = (cellData.row.raw as string[])[1];
            cellData.cell.styles.textColor = 
              type === "Receita" ? [39, 174, 96] : [231, 76, 60];
            cellData.cell.styles.fontStyle = "bold";
          }
        }
      });
    }
  };

  const addAccountsToPDF = (doc: jsPDF, data: AccountReportData) => {
    // Dados das contas (transações normais)
    const accountsData = data.accounts.map((account) => [
      account.accountName,
      account.currency,
      formatCurrency(account.income),
      formatCurrency(account.expense),
      formatCurrency(account.balance)
    ]);

    // Dados de investimentos
    const investmentsData = data.accounts.map((account) => [
      account.accountName,
      formatCurrency(account.investments.buys),
      formatCurrency(account.investments.sells),
      formatCurrency(account.investments.net)
    ]);

    // Configuração de cores (as RGB tuples)
    const colorIncome: [number, number, number] = [39, 174, 96];    // Verde
    const colorExpense: [number, number, number] = [231, 76, 60];   // Vermelho
    const colorBuy: [number, number, number] = [41, 128, 185];      // Azul
    const colorSell: [number, number, number] = [142, 68, 173];     // Roxo
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

    // Posição para próxima tabela
    let startY = (doc as jsPDFWithAutoTable).lastAutoTable?.finalY || 35;
    startY += 15;

    // Título investimentos
    doc.setFontSize(14);
    doc.text("Investimentos", 14, startY);
    startY += 10;

    // Tabela de investimentos
    autoTable(doc, {
      startY: startY,
      head: [["Conta", "Compras", "Vendas", "Resultado Líquido"]],
      body: investmentsData,
      theme: "grid",
      headStyles: { 
        fillColor: colorNeutral,
        textColor: [255, 255, 255],
        fontStyle: 'bold'
      },
      foot: [
        [
          "Total", 
          formatCurrency(data.totals.investments.buys),
          formatCurrency(data.totals.investments.sells),
          formatCurrency(data.totals.investments.net)
        ]
      ],
      footStyles: { 
        fillColor: colorNeutral,
        textColor: [255, 255, 255],
        fontStyle: 'bold'
      },
      didParseCell: (cellData) => {
        if (cellData.section === 'body') {
          switch(cellData.column.index) {
            case 1: // Compras
              cellData.cell.styles.textColor = colorBuy;
              break;
            case 2: // Vendas
              cellData.cell.styles.textColor = colorSell;
              break;
            case 3: // Resultado Líquido
              const net = data.accounts[cellData.row.index].investments.net;
              cellData.cell.styles.textColor = net >= 0 ? colorSell : colorBuy;
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
      doc.text(`${account.accountName} (${account.currency})`, 14, startY);
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
      
      // Tabela de investimentos
      doc.setFontSize(12);
      doc.text("Investimentos:", 14, startY);
      startY += 5;
      
      const investmentsData = [
        ["Compras", formatCurrency(account.investments.buys)],
        ["Vendas", formatCurrency(account.investments.sells)],
        ["Resultado Líquido", formatCurrency(account.investments.net)]
      ];
      
      autoTable(doc, {
        startY: startY,
        head: [["Tipo", "Valor"]],
        body: investmentsData,
        theme: "grid",
        headStyles: { 
          fillColor: [41, 128, 185] as [number, number, number],
          textColor: [255, 255, 255] as [number, number, number],
          fontStyle: 'bold'
        },
        didParseCell: (cellData) => {
          if (cellData.section === 'body') {
            switch(cellData.column.index) {
              case 0: // Tipo
                cellData.cell.styles.fontStyle = "bold";
                break;
              case 1: // Valor
                if (cellData.row.index === 0) {
                  cellData.cell.styles.textColor = [41, 128, 185] as [number, number, number]; // Azul
                } else if (cellData.row.index === 1) {
                  cellData.cell.styles.textColor = [142, 68, 173] as [number, number, number]; // Roxo
                } else {
                  // Verde/vermelho para resultado líquido
                  const color: [number, number, number] = account.investments.net >= 0 
                    ? [39, 174, 96] 
                    : [231, 76, 60];
                  cellData.cell.styles.textColor = color;
                }
                cellData.cell.styles.fontStyle = "bold";
                break;
            }
          }
        }
      });

      startY = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 15;
    });
  };

  const addAccountsTypeCategoriesToPDF = (doc: jsPDF, data: AccountTypeCategoryReportData) => {
    let startY = 35;
    
    // Filtrar contas que têm transações
    const accountsWithTransactions = data.accounts.filter(account => 
      account.types.some(type => type.categories.length > 0) ||
      account.investments.buys > 0 ||
      account.investments.sells > 0
    );

    accountsWithTransactions.forEach((account) => {
      // Cabeçalho da conta
      doc.setFontSize(14);
      doc.text(`${account.accountName} (${account.currency})`, 14, startY);
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

      // Seção de investimentos
      if (account.investments.buys > 0 || account.investments.sells > 0) {
        doc.setFontSize(12);
        doc.text("Investimentos", 14, startY);
        startY += 8;
        
        const investmentsData = [
          ["Compras", formatCurrency(account.investments.buys)],
          ["Vendas", formatCurrency(account.investments.sells)],
          ["Resultado Líquido", formatCurrency(account.investments.net)]
        ];
        
        autoTable(doc, {
          startY: startY,
          head: [["Tipo", "Valor"]],
          body: investmentsData,
          theme: "grid",
          headStyles: { 
            fillColor: [41, 128, 185],
            textColor: [255, 255, 255],
            fontStyle: 'bold'
          },
          didParseCell: (cellData) => {
            if (cellData.section === 'body') {
              switch(cellData.column.index) {
                case 0: // Tipo
                  cellData.cell.styles.fontStyle = "bold";
                  break;
                case 1: // Valor
                  if (cellData.row.index === 0) {
                    cellData.cell.styles.textColor = [41, 128, 185]; // Azul para compras
                  } else if (cellData.row.index === 1) {
                    cellData.cell.styles.textColor = [142, 68, 173]; // Roxo para vendas
                  } else {
                    // Verde/vermelho para resultado líquido
                    cellData.cell.styles.textColor = (account.investments.net >= 0 
                      ? [39, 174, 96] 
                      : [231, 76, 60]) as [number, number, number];
                  }
                  cellData.cell.styles.fontStyle = "bold";
                  break;
              }
            }
          }
        });

        startY = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 15;
      }

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
            formatCurrency(ticker.currentValue),
            `${percentage.toFixed(2)}%`,
            formatCurrency(ticker.avgPrice),
            formatCurrency(unrealizedGain),
            unrealizedGain >= 0 ? "▲" : "▼"
          ];
        });

        autoTable(doc, {
          startY: finalY + 30,
          head: [["Ativo", "Qtd", "Investido", "Valor Atual", "%", "Preço Médio", "Ganho/Perda", ""]],
          body: tickersTable,
          theme: "grid",
          headStyles: { fillColor: [52, 73, 94] },
          columnStyles: {
            6: { cellWidth: 'wrap' },
            7: { cellWidth: 10 }
          },
          didParseCell: (data) => {
            if (data.column.index === 6 && data.section === "body") {
              const cellValue = tickersTable[data.row.index][6];
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

    // Se quiser adicionar transações recentes, vai precisar incluir isso no backend
    // ou passar como propriedade separada no front.
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
      ["Investimentos - Compras", formatCurrency(data.annualTotals.investments.buys)],
      ["Investimentos - Vendas", formatCurrency(data.annualTotals.investments.sells)],
      ["Resultado Líquido", formatCurrency(data.annualTotals.investments.net)]
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
      doc.text(`${account.accountName} (${account.currency})`, 14, startY + 10);
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
      
      // Tabela de investimentos da conta
      autoTable(doc, {
        startY: startY + 10,
        head: [["Investimentos", "Valor"]],
        body: [
          ["Compras", formatCurrency(account.investments.buys)],
          ["Vendas", formatCurrency(account.investments.sells)],
          ["Resultado Líquido", formatCurrency(account.investments.net)]
        ],
        theme: "grid",
        headStyles: { fillColor: [142, 68, 173] }
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
    
    // Global investments summary
    doc.setFontSize(14);
    doc.text("Investimentos - Resumo Anual", 14, startY);
    
    const investmentsSummaryData = [
      ["Compras", formatCurrency(data.annualTotals.investments.buys)],
      ["Vendas", formatCurrency(data.annualTotals.investments.sells)],
      ["Resultado Líquido", formatCurrency(data.annualTotals.investments.net)]
    ];
    
    autoTable(doc, {
      startY: startY + 5,
      head: [["Tipo", "Valor"]],
      body: investmentsSummaryData,
      theme: "grid",
      headStyles: { fillColor: [142, 68, 173] }
    });
    
    startY = (doc as jsPDFWithAutoTable).lastAutoTable?.finalY || startY + 30;
    
    // Accounts details
    data.accounts.forEach(account => {
      doc.setFontSize(14);
      doc.text(`${account.accountName} (${account.currency})`, 14, startY + 7);
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
      
      // Account investments
      doc.setFontSize(12);
      doc.text("Investimentos:", 14, startY + 7);
      
      const accountInvestmentsData = [
        ["Compras", formatCurrency(account.investments.buys)],
        ["Vendas", formatCurrency(account.investments.sells)],
        ["Resultado Líquido", formatCurrency(account.investments.net)]
      ];
      
      autoTable(doc, {
        startY: startY + 10,
        head: [["Tipo", "Valor"]],
        body: accountInvestmentsData,
        theme: "grid",
        headStyles: { fillColor: [142, 68, 173] }
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

  const years = Array.from({ length: 11 }, (_, i) => {
    const year = new Date().getFullYear() - 5 + i;
    return { value: String(year), label: String(year) };
  });

  const months = Array.from({ length: 12 }, (_, i) => {
    const monthName = new Date(2000, i, 1).toLocaleString('default', { month: 'long' });
    return {
      value: i + 1, // Months as 1-12 instead of 0-11
      label: monthName.charAt(0).toUpperCase() + monthName.slice(1) // Capitalized
    };
  });

  return (
    <ProtectedRoute>
      <div className="">
        <Breadcrumb />
        
        <div className="bg-gray-800 p-3 border-b border-gray-700">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 mb-6">
            <Select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              placeholder="Selecione um ano"
              label="Ano"
              options={years}
              disabled={isLoading}
              loading={isLoading}
              name="year"
              icon={<FaClock />}
              required
            />

            <Select
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
              placeholder="Selecione um mês"
              label="Mês"
              options={months}
              disabled={isLoading}
              loading={isLoading}
              name="month"
              icon={<FaCalendarAlt />}
              required
            />

            <Select
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
              placeholder="Selecione o tipo"
              label="Tipo de Relatório"
              options={types}
              disabled={isLoading}
              loading={isLoading}
              name="reportType"
              icon={<FaFileAlt />}
              required
            />
            
            <div className="flex items-end space-x-2">
              <button
                onClick={generatePDF}
                disabled={isLoading || (!reportType || !month || !year)}
                className="flex items-center justify-center px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:opacity-50"
              >
                <FaDownload size={20} className="mr-2" />
                {isLoading ? "Gerando..." : "PDF"}
              </button>
              
              <button
                onClick={generateCSV}
                disabled={isLoading || (!reportType || !month || !year)}
                className="flex items-center justify-center px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50"
              >
                <FaDownload size={20} className="mr-2" />
                {isLoading ? "Gerando..." : "CSV"}
              </button>
            </div>
          </div>
          
          {error && (
            <div className="p-4 mb-6 text-sm text-red-700 bg-red-100 rounded-lg">
              {error}
            </div>
          )}
          
          <div className="">
            <p className="text-gray-400/70">
              Selecione o período e o tipo de relatório desejado, depois clique em um dos botões para baixar.
            </p>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}