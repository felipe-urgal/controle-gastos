"use client";

import { useState } from "react";
import { useAuth } from "@/app/context/AuthContext";
import ProtectedRoute from "@/app/components/ProtectedRoute";
import Breadcrumb from "@/app/components/Breadcrumb";
import { reportsService } from "@/app/services/reportsService";
import { DownloadSimple } from "@phosphor-icons/react";
import { saveAs } from "file-saver";
import { jsPDF } from "jspdf";
import autoTable, { UserOptions } from 'jspdf-autotable';
import { formatCurrency } from "@/app/utils/format";

interface jsPDFWithAutoTable extends jsPDF {
  lastAutoTable: { finalY: number };
  autoTable: (options: UserOptions) => jsPDF;
};

// Define types for your report data
interface SummaryReportData {
  income: number;
  expense: number;
  investment: number;
  balance: number;
  categories: {
    categoryName: string;
    type: "INCOME" | "EXPENSE" | "INVESTMENT";
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
    investment: number;
    balance: number;
  }[];
  totals: {
    income: number;
    expense: number;
    investment: number;
    balance: number;
  };
}

interface AccountCategoryReportData {
  accounts: {
    accountId: string;
    accountName: string;
    currency: string;
    income: number;
    expense: number;
    investment: number;
    balance: number;
    categories: {
      categoryId: string | null;
      categoryName: string;
      income: number;
      expense: number;
      investment: number;
    }[];
  }[];
}

interface AccountTypeCategoryReportData {
  accounts: {
    accountId: string;
    accountName: string;
    currency: string;
    income: number;
    expense: number;
    investment: number;
    balance: number;
    types: {
      type: "INCOME" | "EXPENSE" | "INVESTMENT" | string;
      total: number;
      categories: {
        categoryId: string | null;
        categoryName: string;
        amount: number;
      }[];
    }[];
  }[];
}

type ReportData = SummaryReportData | AccountReportData | AccountCategoryReportData | AccountTypeCategoryReportData;

export default function ReportsPage() {
  const { user } = useAuth();
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [reportType, setReportType] = useState<"summary" | "by-account" | "by-account-category" | "by-account-type-category">("summary");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateCSV = async () => {
    if (!user?.id) return;
    
    setIsLoading(true);
    setError(null);

    try {
      let data: { data: ReportData };
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
      }

      const csvContent = convertToCSV(data.data);
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      saveAs(blob, filename);
    } catch (err) {
      setError("Erro ao gerar CSV. Tente novamente.");
      console.error("Error generating CSV:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const generatePDF = async () => {
    if (!user?.id) return;
    
    setIsLoading(true);
    setError(null);

    try {
      let data: { data: ReportData };
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
      }

      generatePDFDocument(data.data, title);
    } catch (err) {
      setError("Erro ao gerar PDF. Tente novamente.");
      console.error("Error generating PDF:", err);
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
      default:
        return "";
    }
  };

  const summaryToCSV = (data: SummaryReportData): string => {
    let csv = "Tipo;Valor\n";
    csv += `Receitas;${formatCurrency(data.income)}\n`;
    csv += `Despesas;${formatCurrency(data.expense)}\n`;
    csv += `Investimentos;${formatCurrency(data.investment)}\n`;
    csv += `Saldo;${formatCurrency(data.balance)}\n\n`;
    csv += "Categoria;Tipo;Valor\n";
    
    data.categories.forEach((item) => {
      csv += `${item.categoryName};${item.type === "INCOME" ? "Receita" : item.type === "EXPENSE" ? "Despesa" : "Investimentos"};${formatCurrency(item.amount)}\n`;
    });

    return csv;
  };

  const accountsToCSV = (data: AccountReportData): string => {
    let csv = "Conta;Moeda;Receitas;Despesas;Investimentos;Saldo\n";
    
    data.accounts.forEach((account) => {
      csv += `${account.accountName};${account.currency};${formatCurrency(account.income)};${formatCurrency(account.expense)};${formatCurrency(account.investment)};${formatCurrency(account.balance)}\n`;
    });

    csv += `\nTotal;;${formatCurrency(data.totals.income)};${formatCurrency(data.totals.expense)};${formatCurrency(data.totals.investment)};${formatCurrency(data.totals.balance)}\n`;
    return csv;
  };

  const accountsCategoriesToCSV = (data: AccountCategoryReportData): string => {
    let csv = "";
    
    data.accounts.forEach((account) => {
      csv += `Conta: ${account.accountName} (${account.currency})\n`;
      csv += "Categoria;Receitas;Despesas;Investimentos\n";
      
      account.categories?.forEach((category) => {
        csv += `${category.categoryName};${formatCurrency(category.income)};${formatCurrency(category.expense)};${formatCurrency(category.investment)}\n`;
      });

      csv += `\nTotal;${formatCurrency(account.income)};${formatCurrency(account.expense)};${formatCurrency(account.investment)}\n\n`;
    });

    return csv;
  };

  const accountsTypeCategoriesToCSV = (data: AccountTypeCategoryReportData): string => {
    let csv = "";
    
    // Filtrar contas que têm pelo menos um tipo com categorias
    const accountsWithTransactions = data.accounts.filter(account => 
      account.types.some(type => type.categories.length > 0)
    );

    accountsWithTransactions.forEach((account) => {
      csv += `Conta: ${account.accountName} (${account.currency})\n`;
      
      // Filtrar tipos que têm categorias
      const typesWithCategories = account.types.filter(type => type.categories.length > 0);
      
      typesWithCategories.forEach((type) => {
        const typeName = type.type === 'INCOME' ? 'Receitas' : 
                        type.type === 'EXPENSE' ? 'Despesas' : 'Investimentos';
        
        csv += `\n${typeName} (Total: ${formatCurrency(type.total)})\n`;
        csv += "Categoria;Valor\n";
        
        type.categories.forEach((category) => {
          csv += `${category.categoryName};${formatCurrency(category.amount)}\n`;
        });
      });

      // Mostrar resumo apenas se a conta tiver transações
      if (typesWithCategories.length > 0) {
        csv += `\nResumo da Conta\n`;
        csv += `Receitas: ${formatCurrency(account.income)}\n`;
        csv += `Despesas: ${formatCurrency(account.expense)}\n`;
        csv += `Investimentos: ${formatCurrency(account.investment)}\n`;
        csv += `Saldo: ${formatCurrency(account.balance)}\n\n`;
      }
    });

    return csv;
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
      ["Investimentos", formatCurrency(data.investment)],
      ["Saldo", formatCurrency(data.balance)]
    ];

    const colorByType = (type: string, value?: number): [number, number, number] => {
      switch (type) {
        case "Receitas": return [39, 174, 96];
        case "Despesas": return [231, 76, 60];
        case "Investimentos": return [41, 128, 185];
        case "Saldo":
          return value !== undefined && value >= 0 ? [39, 174, 96] : [231, 76, 60];
        default: return [0, 0, 0];
      }
    };
    
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
          cellData.cell.styles.textColor = colorByType(rowType, value);
          cellData.cell.styles.fontStyle = "bold";
        }
      }
    });
    
    // Categories section
    if (data.categories.length > 0) {
      const finalY = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 40;
      doc.setFontSize(14);
      doc.text("Por Categoria", 14, finalY+15);
      
      const categoriesData = data.categories.map((item) => [
        item.categoryName,
        item.type === "INCOME" ? "Receita" : item.type === "EXPENSE" ? "Despesa" : "Investimentos",
        formatCurrency(item.amount)
      ]);

      const colorByCategory = (type: string): [number, number, number] => {
        switch (type) {
          case "Receita": return [39, 174, 96];
          case "Despesa": return [231, 76, 60];
          case "Investimentos": return [41, 128, 185];
          default: return [0, 0, 0];
        }
      };

      const startY = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 40;

      autoTable(doc, {
        startY: startY + 20,
        head: [["Categoria", "Tipo", "Valor"]],
        body: categoriesData,
        theme: "grid",
        headStyles: { fillColor: [22, 160, 133] },
        didParseCell: (cellData) => {
          if (cellData.section === 'body' && cellData.column.index === 2) {
            const type = (cellData.row.raw as string[])[1];
            cellData.cell.styles.textColor = colorByCategory(type);
            cellData.cell.styles.fontStyle = "bold";
          }
        }
      });
    }
  };

  const addAccountsToPDF = (doc: jsPDF, data: AccountReportData) => {
    // Account data
    const accountsData = data.accounts.map((account) => [
      account.accountName,
      account.currency,
      formatCurrency(account.income),
      formatCurrency(account.expense),
      formatCurrency(account.investment),
      formatCurrency(account.balance)
    ]);

    const colorByColumn = (columnIndex: number, value?: number): [number, number, number] => {
      switch (columnIndex) {
        case 2: return [39, 174, 96]; // Income
        case 3: return [231, 76, 60]; // Expense
        case 4: return [41, 128, 185]; // Investment
        case 5: // Balance
          return value !== undefined && value >= 0 ? [39, 174, 96] : [231, 76, 60];
        default: return [0, 0, 0];
      }
    };

    autoTable(doc, {
      startY: 35,
      head: [["Conta", "Moeda", "Receitas", "Despesas", "Investimentos", "Saldo"]],
      body: accountsData,
      theme: "grid",
      headStyles: { 
        fillColor: [22, 160, 133],
        textColor: [255, 255, 255],
        fontStyle: 'bold'
      },
      foot: [
        [
          "Total", 
          "", 
          formatCurrency(data.totals.income), 
          formatCurrency(data.totals.expense), 
          formatCurrency(data.totals.investment), 
          formatCurrency(data.totals.balance)
        ]
      ],
      footStyles: { 
        fillColor: [52, 73, 94],
        textColor: [255, 255, 255],
        fontStyle: 'bold'
      },
      didParseCell: (cellData) => {
        if (cellData.section === 'body' && [2, 3, 4, 5].includes(cellData.column.index)) {
          const value = cellData.column.index === 5 ? 
            data.accounts[cellData.row.index].balance : undefined;
          cellData.cell.styles.textColor = colorByColumn(cellData.column.index, value);
          cellData.cell.styles.fontStyle = "bold";
        }
      }
    });
  };

  const addAccountsCategoriesToPDF = (doc: jsPDF, data: AccountCategoryReportData) => {
    let startY = 35;
    
    data.accounts.forEach((account) => {
      doc.setFontSize(12);
      doc.text(`${account.accountName} (${account.currency})`, 14, startY);
      
      if (account.categories && account.categories.length > 0) {
        const categoriesData = account.categories.map((category) => [
          category.categoryName,
          formatCurrency(category.income),
          formatCurrency(category.expense),
          formatCurrency(category.investment),
        ]);

        const colorByColumn = (columnIndex: number): [number, number, number] => {
          switch (columnIndex) {
            case 1: return [39, 174, 96]; // Income
            case 2: return [231, 76, 60]; // Expense
            case 3: return [41, 128, 185]; // Investment
            default: return [0, 0, 0];
          }
        };
        
        autoTable(doc, {
          startY: startY + 5,
          head: [["Categoria", "Receitas", "Despesas", "Investimentos"]],
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
              formatCurrency(account.expense), 
              formatCurrency(account.investment)
            ]
          ],
          footStyles: { 
            fillColor: [52, 73, 94],
            textColor: [255, 255, 255],
            fontStyle: 'bold'
          },
          didParseCell: (cellData) => {
            if (cellData.section === 'body' && [1, 2, 3].includes(cellData.column.index)) {
              cellData.cell.styles.textColor = colorByColumn(cellData.column.index);
              cellData.cell.styles.fontStyle = "bold";
            }
          }
        });

        startY = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 40 + 15;
      }
    });
  };

  const addAccountsTypeCategoriesToPDF = (doc: jsPDF, data: AccountTypeCategoryReportData) => {
    let startY = 35;
    
    // Filtrar contas que têm pelo menos um tipo com categorias
    const accountsWithTransactions = data.accounts.filter(account => 
      account.types.some(type => type.categories.length > 0)
    );

    accountsWithTransactions.forEach((account) => {
      // Account header
      doc.setFontSize(12);
      doc.text(`${account.accountName} (${account.currency})`, 14, startY);

      // Filtrar tipos que têm categorias
      const typesWithCategories = account.types.filter(type => type.categories.length > 0);
      
      // Add each type section
      typesWithCategories.forEach((type) => {
        const typeName = type.type === 'INCOME' ? 'Receitas' : 
                        type.type === 'EXPENSE' ? 'Despesas' : 'Investimentos';
        
        // Type header
        doc.setFontSize(10);
        doc.text(`- ${typeName} (Total: ${formatCurrency(type.total)})`, 14, startY + 5);
        startY += 8;
        
        const categoriesData = type.categories.map((category) => [
          category.categoryName,
          formatCurrency(category.amount)
        ]);

        const textColor: [number, number, number] = 
          type.type === 'INCOME' ? [39, 174, 96] : 
          type.type === 'EXPENSE' ? [231, 76, 60] : 
          [41, 128, 185];
        
        autoTable(doc, {
          startY: startY,
          head: [["Categoria", "Valor"]],
          body: categoriesData,
          theme: "grid",
          headStyles: { 
            fillColor: [22, 160, 133],
            textColor: [255, 255, 255],
            fontStyle: 'bold'
          },
          didParseCell: (cellData) => {
            if (cellData.section === 'body' && cellData.column.index === 1) {
              cellData.cell.styles.textColor = textColor;
              cellData.cell.styles.fontStyle = "bold";
            }
          }
        });

        startY = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? startY + 15;
      });
      
      // Add account summary only if it has transactions
      if (typesWithCategories.length > 0) {
        doc.setFontSize(11);
        doc.text(`- Resumo da Conta`, 14, startY + 5);
        
        const summaryData = [
          ["Receitas", formatCurrency(account.income)],
          ["Despesas", formatCurrency(account.expense)],
          ["Investimentos", formatCurrency(account.investment)],
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
                rowType === "Investimentos" ? [41, 128, 185] :
                (value !== undefined && value >= 0) ? [39, 174, 96] : [231, 76, 60];
              cellData.cell.styles.fontStyle = "bold";
            }
          }
        });
        
        startY = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? startY + 20;
        startY += 10; // Add extra space between accounts
      }
    });
  };

  return (
    <ProtectedRoute>
      <div className="">
        <Breadcrumb />
        
        <div className="bg-gray-800 p-3 border-b border-gray-700">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 mb-6">
            <div>
              <label htmlFor="year" className="block text-sm font-medium text-gray-700 mb-1">
                Ano
              </label>
              <select
                id="year"
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className={`
                  focus:outline-none focus:ring-2 focus:border-transparent 
                  h-10 w-full px-3 border rounded bg-gray-900
                  ${year 
                    ? 'border-blue-900 focus:ring-blue-500 text-gray-300' 
                    : 'border-gray-700 focus:ring-blue-500 text-gray-500'
                  }
                `}
                // className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-900 focus:border-emerald-500"
              >
                {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i).map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label htmlFor="month" className="block text-sm font-medium text-gray-700 mb-1">
                Mês
              </label>
              <select
                id="month"
                value={month}
                onChange={(e) => setMonth(Number(e.target.value))}
                className={`
                  focus:outline-none focus:ring-2 focus:border-transparent 
                  h-10 w-full px-3 border rounded bg-gray-900
                  ${year 
                    ? 'border-blue-900 focus:ring-blue-500 text-gray-300' 
                    : 'border-gray-700 focus:ring-blue-500 text-gray-800'
                  }
                `}
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <option key={m} value={m}>
                    {new Date(2000, m - 1, 1).toLocaleString('default', { month: 'long' })}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label htmlFor="reportType" className="block text-sm font-medium text-gray-700 mb-1">
                Tipo de Relatório
              </label>
              <select
                id="reportType"
                value={reportType}
                onChange={(e) => setReportType(e.target.value as "summary" | "by-account" | "by-account-category")}
                className={`
                  focus:outline-none focus:ring-5 focus:border-transparent 
                  h-10 w-full px-3 border rounded bg-gray-900
                  ${reportType 
                    ? 'border-blue-900 focus:ring-blue-500 text-gray-300' 
                    : 'border-gray-700 focus:ring-blue-500 text-gray-800'
                  }
                `}
              >
                <option value="summary">Resumo Geral</option>
                <option value="by-account">Por Conta</option>
                <option value="by-account-category">Por Conta/Categoria</option>
                <option value="by-account-type-category">Por Conta/Tipo/Categoria</option>
              </select>
            </div>
            
            <div className="flex items-end space-x-2">
              <button
                onClick={generatePDF}
                disabled={isLoading}
                className="flex items-center justify-center px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:opacity-50"
              >
                <DownloadSimple size={20} className="mr-2" />
                {isLoading ? "Gerando..." : "PDF"}
              </button>
              
              <button
                onClick={generateCSV}
                disabled={isLoading}
                className="flex items-center justify-center px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50"
              >
                <DownloadSimple size={20} className="mr-2" />
                {isLoading ? "Gerando..." : "CSV"}
              </button>
            </div>
          </div>
          
          {error && (
            <div className="p-4 mb-6 text-sm text-red-700 bg-red-100 rounded-lg">
              {error}
            </div>
          )}
          
          <div className="bg-gray-800 p-4 rounded-md border border-gray-700">
            <p className="text-gray-300">
              Selecione o período e o tipo de relatório desejado, depois clique em um dos botões para baixar.
            </p>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}