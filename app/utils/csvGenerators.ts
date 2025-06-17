import {
  ReportData,
  SummaryReportData,
  AccountReportData,
  AccountCategoryReportData,
  AccountTypeCategoryReportData,
  InvestmentReportData,
  AnnualAccountReportData,
  AnnualAccountTypeCategoryReportData
} from "@/app/types/reports";
import { formatReportValue, buildCSVFromSections } from "@/app/utils/formatters";
import { formatCurrency } from "@/app/utils/format";

export const generateCSV = (data: ReportData, reportType: string): string => {
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
  return buildCSVFromSections([
    {
      title: "Resumo Financeiro",
      headers: ["Tipo", "Valor"],
      rows: [
        ["Receitas", formatReportValue(data.income, "INCOME")],
        ["Despesas", formatReportValue(data.expense, "EXPENSE")],
        ["Saldo", formatReportValue(data.balance)]
      ]
    },
    {
      title: "Detalhamento por Categoria",
      headers: ["Categoria", "Tipo", "Valor"],
      rows: data.categories.map(item => [
        item.categoryName,
        item.type === "INCOME" ? "Receita" : "Despesa",
        formatReportValue(item.amount, item.type)
      ])
    }
  ]);
};

const accountsToCSV = (data: AccountReportData): string => {
  return buildCSVFromSections([
    {
      title: "Relatório por Conta",
      headers: ["Conta", "Receitas", "Despesas", "Saldo"],
      rows: data.accounts.map(account => [
        account.accountName,
        formatReportValue(account.income, "INCOME"),
        formatReportValue(account.expense, "EXPENSE"),
        formatReportValue(account.balance)
      ])
    },
    {
      title: "Totais",
      headers: ["", "Receitas", "Despesas", "Saldo"],
      rows: [
        [
          "Total",
          formatReportValue(data.totals.income, "INCOME"),
          formatReportValue(data.totals.expense, "EXPENSE"),
          formatReportValue(data.totals.balance)
        ]
      ]
    }
  ]);
};

const accountsCategoriesToCSV = (data: AccountCategoryReportData): string => {
  let csv = "";
  
  data.accounts.forEach((account) => {
    csv += `Conta: ${account.accountName}\n`;
    csv += "Categoria;Receitas;Despesas\n";
    
    account.categories?.forEach((category) => {
      csv += `${category.categoryName};${formatCurrency(category.income)};${formatCurrency(category.expense)}\n`;
    });

    csv += `\nTotal;${formatCurrency(account.income)};${formatCurrency(account.expense)}\n`;
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
    csv += `Conta: ${account.accountName}\n`;
    
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
  csv += `Dividendos Recebidos;${formatCurrency(data.totalDividends)}\n`;
  csv += `Retorno Absoluto;${formatCurrency(data.totalReturn.absolute)}\n`;
  csv += `Retorno Percentual;${data.totalReturn.percentage.toFixed(2)}%\n\n`;

  // Detalhamento por conta
  data.accounts.forEach(account => {
    csv += `Conta: ${account.accountName}\n`;
    csv += `Saldo: ${formatCurrency(account.balance)} ${account.currency}\n`;
    csv += `Investido: ${formatCurrency(account.totalInvested)}\n`;
    csv += `Dividendos: ${formatCurrency(account.totalDividends)}\n`;
    csv += `Retorno: ${formatCurrency(account.return.absolute)} (${account.return.percentage.toFixed(2)}%)\n\n`;

    // Ativos (tickers)
    if (account.tickers && account.tickers.length > 0) {
      csv += "Ticker;Quantidade;Investido;Dividendos;Valor Atual;% da Conta;Preço Médio;Ganho/Perda\n";

      const totalDaConta = account.totalInvested > 0 ? account.totalInvested : 1;

      account.tickers.forEach(ticker => {
        const unrealizedGain = ticker.currentValue - ticker.totalInvested;
        const percentageOfAccount = (ticker.totalInvested / totalDaConta) * 100;

        csv += `${ticker.ticker};${ticker.quantity};${formatCurrency(ticker.totalInvested)};${formatCurrency(ticker.totalDividends)};${formatCurrency(ticker.currentValue)};${percentageOfAccount.toFixed(2)}%;${formatCurrency(ticker.avgPrice)};${formatCurrency(unrealizedGain)}\n`;
      });

      csv += "\n";
    }
  });

  return csv;
};

const annualAccountsToCSV = (data: AnnualAccountReportData): string => {
  let csv = `Relatório Anual por Conta - ${data.year}\n\n`;
  
  data.accounts.forEach(account => {
    csv += `Conta: ${account.accountName}\n`;
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
  });

  // Totais gerais
  csv += `\nTotais Gerais\n`;
  csv += `Receitas:;${formatCurrency(data.annualTotals.income)}\n`;
  csv += `Despesas:;${formatCurrency(data.annualTotals.expense)}\n`;
  csv += `Saldo:;${formatCurrency(data.annualTotals.balance)}\n\n`;

  return csv;
};

const annualAccountsTypeCategoriesToCSV = (data: AnnualAccountTypeCategoryReportData): string => {
  let csv = `Relatório Anual por Conta, Tipo e Categoria - ${data.year}\n\n`;
  
  data.accounts.forEach(account => {
    csv += `Conta: ${account.accountName}\n`;
    
    // Annual summary
    csv += `Resumo Anual:\n`;
    csv += `Receitas: ${formatCurrency(account.annualTotals.income)}\n`;
    csv += `Despesas: ${formatCurrency(account.annualTotals.expense)}\n`;
    csv += `Saldo: ${formatCurrency(account.annualTotals.balance)}\n\n`;
    
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

  return csv;
};