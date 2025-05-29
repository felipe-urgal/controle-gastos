"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/app/context/AuthContext";
import ProtectedRoute from "@/app/components/ProtectedRoute";
import { fetchTransacoes, Transacao } from "@/app/services/transacoesService";
import { processarTransacoes } from "@/app/utils/processarTransacoes";
import { MesResumo } from "@/app/types/mes_resumo";
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import Breadcrumb from "@/app/components/Breadcrumb";
import { formatCurrency } from "@/app/utils/format";
import { 
  DashboardFilters,
  DashboardExportButtons,
  DashboardYearlySummary,
  DashboardMonthlyCards,
  DashboardAnnualSummary,
  DashboardError,
  DashboardLoading
} from "@/app/components/dashboard";

type JsPDFWithAutoTable = jsPDF & {
  lastAutoTable: { finalY: number };
};

export default function ContasPage() {
  const { user } = useAuth();
  const [saldoTotal, setSaldoTotal] = useState(0);
  const [investimentoTotal, setInvestimentoTotal] = useState(0);
  const [meses, setMeses] = useState<MesResumo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const anoAtual = new Date().getFullYear();
  const [anoSelecionado, setAnoSelecionado] = useState<number>(anoAtual);
  const TODOS_OPTION = -1;
  const [transacoes, setTransacoes] = useState<Transacao[]>([]);

  const carregarDados = useCallback(async () => {
    if (!user) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const transacoesData = await fetchTransacoes(user.id);
      const { mesesData, saldoAnual, investimentoAnual } = 
        processarTransacoes(transacoesData, anoSelecionado === TODOS_OPTION ? null : anoSelecionado);
      
      console.log(transacoesData)
      setTransacoes(transacoesData);
      setMeses(mesesData);
      setSaldoTotal(saldoAnual);
      setInvestimentoTotal(investimentoAnual);
    } catch (err) {
      console.error("Erro ao carregar dados:", err);
      setError("Falha ao carregar dados financeiros. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }, [user, anoSelecionado, TODOS_OPTION]);

  useEffect(() => {
    carregarDados();
  }, [carregarDados]);

  const exportToExcel = () => {
    const data = anoSelecionado === TODOS_OPTION
      ? getYearlyExcelData()
      : getMonthlyExcelData();

    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Relatório");
    XLSX.writeFile(wb, `relatorio_financeiro_${anoSelecionado === TODOS_OPTION ? 'todos_anos' : anoSelecionado}.xlsx`);
  };

  const exportToPDF = () => {
    const doc = new jsPDF() as JsPDFWithAutoTable;
    const title = `Relatório Financeiro ${anoSelecionado === TODOS_OPTION ? '- Todos os Anos' : `- Ano ${anoSelecionado}`}`;
    
    doc.setFontSize(16);
    doc.text(title, 14, 15);

    const tableData = anoSelecionado === TODOS_OPTION
      ? getYearlyTableData()
      : getMonthlyTableData();

    autoTable(doc, {
      head: [tableData.headers],
      body: tableData.rows,
      startY: 25,
      theme: 'grid' as const,
      headStyles: {
        fillColor: [41, 128, 185],
        textColor: [255, 255, 255],
        fontStyle: 'bold'
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245]
      }
    });

    const finalY = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Gerado em ${new Date().toLocaleDateString()}`, 14, finalY + 10);

    doc.save(`relatorio_${anoSelecionado === TODOS_OPTION ? 'todos_anos' : anoSelecionado}.pdf`);
  };

  // Funções auxiliares para exportação
  const getYearlyExcelData = () => {
    const data = [['Ano', 'Renda', 'Despesas', 'Investimentos', 'Saldo']];

    Array.from(new Set(transacoes.map(t => new Date(t.data).getFullYear())))
      .sort((a, b) => b - a)
      .forEach(ano => {
        const transacoesAno = transacoes.filter(t => new Date(t.data).getFullYear() === ano);
        const resumoAno = processarTransacoes(transacoesAno, ano);
        const totalRenda = resumoAno.mesesData.reduce((a, b) => a + b.renda, 0);
        const totalDespesas = resumoAno.mesesData.reduce((a, b) => a + b.despesas, 0);
        
        data.push([
          ano.toString(),
          totalRenda.toString(),
          totalDespesas.toString(),
          resumoAno.investimentoAnual.toString(),
          (totalRenda - totalDespesas).toString()
        ]);
      });

    return data;
  };

  const getMonthlyExcelData = () => {
    const data: string[][] = [['Mês', 'Renda', 'Despesas', 'Investimentos', 'Saldo']];

    meses.forEach(({ name, renda, despesas, investimentos, saldo }) => {
      data.push([
        name,
        renda.toString(),
        despesas.toString(),
        investimentos.toString(),
        saldo.toString()
      ]);
    });

    data.push([
      'TOTAL',
      meses.reduce((sum, mes) => sum + mes.renda, 0).toString(),
      meses.reduce((sum, mes) => sum + mes.despesas, 0).toString(),
      meses.reduce((sum, mes) => sum + mes.investimentos, 0).toString(),
      saldoTotal.toString()
    ]);

    return data;
  };

  const getYearlyTableData = () => {
    const headers = ['Ano', 'Renda', 'Despesas', 'Investimentos', 'Saldo'];
    const rows = Array.from(new Set(transacoes.map(t => new Date(t.data).getFullYear())))
      .sort((a, b) => b - a)
      .map(ano => {
        const transacoesAno = transacoes.filter(t => new Date(t.data).getFullYear() === ano);
        const resumoAno = processarTransacoes(transacoesAno, ano);
        const totalRenda = resumoAno.mesesData.reduce((a, b) => a + b.renda, 0);
        const totalDespesas = resumoAno.mesesData.reduce((a, b) => a + b.despesas, 0);
        
        return [
          ano.toString(),
          formatCurrency(totalRenda),
          formatCurrency(totalDespesas),
          formatCurrency(resumoAno.investimentoAnual),
          formatCurrency(totalRenda - totalDespesas)
        ];
      });

    return { headers, rows };
  };

  const getMonthlyTableData = () => {
    const headers = ['Mês', 'Renda', 'Despesas', 'Investimentos', 'Saldo'];
    const rows = meses.map(({ name, renda, despesas, investimentos, saldo }) => [
      name,
      formatCurrency(renda),
      formatCurrency(despesas),
      formatCurrency(investimentos),
      formatCurrency(saldo)
    ]);

    rows.push([
      'TOTAL',
      formatCurrency(meses.reduce((sum, mes) => sum + mes.renda, 0)),
      formatCurrency(meses.reduce((sum, mes) => sum + mes.despesas, 0)),
      formatCurrency(meses.reduce((sum, mes) => sum + mes.investimentos, 0)),
      formatCurrency(saldoTotal)
    ]);

    return { headers, rows };
  };

  if (!user) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="loader"></div>
      </div>
    );
  }

  return (
    <ProtectedRoute>
      <Breadcrumb />
      <div className="max-w-7xl mx-auto p-4">

        {/* Filtros e Exportação */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <DashboardFilters
              anoSelecionado={anoSelecionado}
              setAnoSelecionado={setAnoSelecionado}
              loading={loading}
              anoAtual={anoAtual}
              TODOS_OPTION={TODOS_OPTION}
            />

            <DashboardExportButtons
              onExportExcel={exportToExcel}
              onExportPDF={exportToPDF}
              loading={loading}
            />
          </div>
        </div>

        <DashboardError error={error} />

        {loading ? (
          <DashboardLoading />
        ) : (
          <>
            {anoSelecionado === TODOS_OPTION ? (
              <DashboardYearlySummary transacoes={transacoes} />
            ) : (
              <>
                <DashboardMonthlyCards meses={meses} anoSelecionado={anoSelecionado} />
                <DashboardAnnualSummary
                  anoSelecionado={anoSelecionado}
                  saldoTotal={saldoTotal}
                  investimentoTotal={investimentoTotal}
                  TODOS_OPTION={TODOS_OPTION}
                />
              </>
            )}
          </>
        )}
      </div>
    </ProtectedRoute>
  );
}