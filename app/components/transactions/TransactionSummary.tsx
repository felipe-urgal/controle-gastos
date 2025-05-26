import { Button } from "../ui/Button";
import { 
  HiOutlineDocumentDownload, 
  HiOutlineDocumentReport,
  HiOutlinePlus
} from "react-icons/hi";
import { formatCurrency } from "@/app/utils/format";
import Link from "next/link";
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useState } from "react";
import { Transacao, Categoria } from '@/app/types/transacao';
import type { AutoTableOptions } from 'jspdf';

type TransactionSummaryProps = {
  saldo: number;
  saldoRenda: number;
  saldoDespesa: number;
  saldoInvestimentos: number;
  transacoes: Transacao[];
  categorias: Categoria[];
  mes: number;
  ano: number;
  children: React.ReactNode;
};

interface jsPDFWithAutoTable extends jsPDF {
  lastAutoTable: { finalY: number };
  autoTable: (options: AutoTableOptions) => jsPDF;
}

export const TransactionSummary = ({
  saldo,
  saldoRenda,
  saldoDespesa,
  saldoInvestimentos,
  transacoes,
  categorias,
  mes,
  ano,
  children,
}: TransactionSummaryProps) => {
  const [isSummary, setIsSummary] = useState(false);

  const classSaldo = (saldo: number) =>
    saldo === 0 ? "text-gray-500" : saldo < 0 ? "text-red-500" : "text-green-500";

  const formatarDataParaBrasil = (data: Date): string => {
    const dia = String(data.getDate()).padStart(2, '0');
    const mes = String(data.getMonth() + 1).padStart(2, '0');
    const ano = data.getFullYear();
    return `${dia}/${mes}/${ano}`;
  };

  const exportToExcel = () => {
    // Preparar os dados
    const data = [
      ['Data', 'Tipo', 'Descrição', 'Valor', 'Categoria'],
      ...transacoes.map((transacao: Transacao) => [
        formatarDataParaBrasil(new Date(transacao.data)),
        transacao.tipo === 'renda' ? 'Renda' : 
          transacao.tipo === 'despesa' ? 'Despesa' : 'Investimento',
        transacao.descricao,
        formatCurrency(transacao.valor),
        categorias.find((c: Categoria) => c.id === transacao.categoriaId)?.nome || 'Sem categoria'
      ]),
      [], // Linha vazia
      ['Resumo do Mês', '', `${transacoes.length} transações`,''],
      ['Renda Total', '',formatCurrency(saldoRenda), ''],
      ['Despesas Total', '',formatCurrency(saldoDespesa), ''],
      ['Investimentos Total', '',formatCurrency(saldoInvestimentos), ''],
      ['Saldo Final', '', formatCurrency(saldo), '']
    ];

    // Criar a planilha
    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `Relatório ${mes}-${ano}`);

    // Baixar o arquivo
    XLSX.writeFile(wb, `relatorio_${mes}_${ano}.xlsx`);
  };

  const exportToPDF = () => {
    const doc = new jsPDF() as jsPDFWithAutoTable;
    const title = `Relatório Financeiro - ${mes}/${ano}`;
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 14;

    // Configurações do PDF
    doc.setFontSize(16);
    doc.text(title, 14, 15);
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Gerado em ${new Date().toLocaleDateString()}`, 14, 25);

    // Total de transações
    const totalText = `Total: ${transacoes.length} transações`;
    const fontSize = doc.getFontSize();
    const textWidth = doc.getStringUnitWidth(totalText) * fontSize / doc.internal.scaleFactor;
    doc.text(totalText, pageWidth - margin - textWidth, 25);

    // Dados da tabela
    const body = transacoes.map((transacao: Transacao) => [
      formatarDataParaBrasil(new Date(transacao.data)),
      transacao.tipo === 'renda' ? 'Renda' : 
        transacao.tipo === 'despesa' ? 'Despesa' : 'Investimento',
      transacao.descricao,
      formatCurrency(transacao.valor),
      categorias.find((c: Categoria) => c.id === transacao.categoriaId)?.nome || 'Sem categoria'
    ]);

    // Adicionar tabela
    autoTable(doc, {
      head: [['Data', 'Tipo', 'Descrição', 'Valor', 'Categoria']],
      body: body,
      startY: 30,
      theme: 'grid',
      headStyles: {
        fillColor: [41, 128, 185],
        textColor: 255,
        fontStyle: 'bold'
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245]
      }
    });

    // Adicionar resumo
    const finalY = doc.lastAutoTable.finalY + 10;
    doc.setFontSize(12);
    doc.text('Resumo do Mês', 14, finalY);
    
    autoTable(doc, {
      startY: finalY + 5,
      body: [
        ['Renda Total', formatCurrency(saldoRenda)],
        ['Despesas Total', formatCurrency(saldoDespesa)],
        ['Investimentos Total', formatCurrency(saldoInvestimentos)],
        ['Saldo Final', formatCurrency(saldo)]
      ],
      columnStyles: {
        0: { fontStyle: 'bold' },
        1: { halign: 'right' }
      },
      styles: {
        cellPadding: 5
      }
    });

    // Baixar o PDF
    doc.save(`relatorio_${mes}_${ano}.pdf`);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden mb-6">
      <div className="cursor-pointer px-4 sm:px-5 py-4 border-b border-gray-100" onClick={() => setIsSummary(!isSummary)}>
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
          <div>
            <h3 className="text-sm sm:text-base font-semibold text-gray-800">Resumo financeiro</h3>
            <p className="text-xs text-gray-500 mt-1">
              {new Date(ano, mes - 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
            </p>
          </div>
          <div className="flex flex-wrap gap-2 justify-end">
            <div className="flex flex-wrap gap-2 justify-end" onClick={(e) => e.stopPropagation()}>
              <Link href={`/dashboard/${ano}/${mes}/nova`} passHref>
                <Button
                  variant="primary"
                  icon={<HiOutlinePlus className="h-4 w-4" />}
                  className="whitespace-nowrap"
                >
                  Nova Transação
                </Button>
              </Link>
              
              <Button
                onClick={exportToExcel}
                variant="secondary"
                icon={<HiOutlineDocumentDownload className="h-4 w-4" />}
                className="hidden sm:flex"
              >
                <span className="hidden md:inline">Exportar</span> Excel
              </Button>
              
              <Button
                onClick={exportToPDF}
                variant="secondary"
                icon={<HiOutlineDocumentReport className="h-4 w-4" />}
                className="hidden sm:flex"
              >
                <span className="hidden md:inline">Exportar</span> PDF
              </Button>
            </div>
          </div>
        </div>
      </div>

      {isSummary &&
        <div className="p-4 sm:p-5 border-b border-gray-100">
          <div className="flex flex-col items-center mb-4 sm:mb-6">
            <span className="text-xs sm:text-sm font-medium text-gray-500 mb-1">Saldo do mês</span>
            <span className={`text-2xl sm:text-3xl font-bold ${classSaldo(saldo)}`}>
              {formatCurrency(saldo)}
            </span>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-gray-100 text-center">
            <div className="px-3 py-2 sm:py-2">
              <p className="text-xs sm:text-sm text-gray-500 mb-1">Renda</p>
              <p className="text-base sm:text-lg font-semibold text-green-600">
                {formatCurrency(saldoRenda)}
              </p>
              <p className="text-xs text-gray-500">
                {((saldoRenda / (saldoRenda + saldoDespesa + saldoInvestimentos)) * 100 || 0).toFixed(1)}%
              </p>
            </div>
            
            <div className="px-3 py-2 sm:py-2">
              <p className="text-xs sm:text-sm text-gray-500 mb-1">Despesas</p>
              <p className="text-base sm:text-lg font-semibold text-red-600">
                {formatCurrency(saldoDespesa)}
              </p>
              <p className="text-xs text-gray-500">
                {((saldoDespesa / (saldoRenda + saldoDespesa + saldoInvestimentos)) * 100 || 0).toFixed(1)}%
              </p>
            </div>
            
            <div className="px-3 py-2 sm:py-2">
              <p className="text-xs sm:text-sm text-gray-500 mb-1">Investimentos</p>
              <p className="text-base sm:text-lg font-semibold text-blue-600">
                {formatCurrency(saldoInvestimentos)}
              </p>
              <p className="text-xs text-gray-500">
                {((saldoInvestimentos / (saldoRenda + saldoDespesa + saldoInvestimentos)) * 100 || 0).toFixed(1)}%
              </p>
            </div>
          </div>
        </div>
      }

      {children}

    </div>
  );
};