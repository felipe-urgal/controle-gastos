"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, useMemo } from "react";
import { useParams } from "next/navigation";
import { formatCurrency } from "@/app/utils/format";
import { fetchTransacao, Transacao } from "@/app/services/transacoesService";
import { HiOutlineArrowUp, HiOutlineArrowDown, HiOutlineUpload, HiOutlineDocumentDownload, HiOutlineDocumentReport, HiOutlineRefresh } from "react-icons/hi";
import { useAuth } from "@/app/context/AuthContext";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";
import Breadcrumb from "@/app/components/Breadcrumb"; // Ajuste o caminho conforme sua estrutura
import ProtectedRoute from "@/app/components/ProtectedRoute";
// Adicione no início do arquivo, com os outros imports
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable, { UserOptions } from 'jspdf-autotable';
import { toast } from 'react-toastify';

// Adicione esta interface para estender o tipo jsPDF
interface jsPDFWithAutoTable extends jsPDF {
  lastAutoTable: { finalY: number };
  autoTable: (options: UserOptions) => jsPDF;
};

type TransacaoImportada = {
  data: Date;
  descricao: string;
  valor: number;
  valorUnitario?: number;
  quantidade?: number;
  tipo: 'renda' | 'despesa' | 'investimentos';
  mes: number;
  ano: number;
  nome?: string;
  userId: string;
};

interface Categoria {
  id: string;
  nome: string;
}

export default function Info() {
  const { mes, ano } = useParams();
  const mesSelecionado = Number(mes);
  const anoSelecionado = Number(ano);

  const ultimoDiaDoMes = new Date(anoSelecionado, mesSelecionado, 0);
  const totalDiasDoMes = ultimoDiaDoMes.getDate();

  const [transacoes, setTransacoes] = useState<Transacao[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [transacoesPorDia, setTransacoesPorDia] = useState<Record<number, Transacao[]>>({});
  const [loading, setLoading] = useState(true);
  const diaAtual = new Date().getDate();
  const mesAtual = new Date().getMonth() + 1;
  // const [openDia, setOpenDia] = useState<{ [key: number]: boolean }>({});

  const { user } = useAuth();

  // const toggleOpen = (dia: number) => {
  //   setOpenDia((prev) => ({
  //     ...prev,
  //     [dia]: !prev[dia],
  //   }));
  // };

  // Adicione estas funções dentro do componente, antes do return
  const exportToExcel = () => {
    // Preparar os dados
    const data = [
      ['Data', 'Tipo', 'Descrição', 'Valor', 'Categoria'],
      ...transacoes.map(transacao => [
        new Date(transacao.data).toLocaleDateString('pt-BR'),
        transacao.tipo === 'renda' ? 'Renda' : 
          transacao.tipo === 'despesa' ? 'Despesa' : 'Investimento',
        transacao.descricao,
        formatCurrency(transacao.valor),
        categorias.find((c: Categoria) => c.id === transacao.categoriaId)?.nome || 'Sem categoria'
      ]),
      [], // Linha vazia
      ['Resumo do Mês', '', `${transacoes.length} transacoes`,''],
      ['Renda Total', '',formatCurrency(saldoRenda), ''],
      ['Despesas Total', '',formatCurrency(saldoDespesa), ''],
      ['Investimentos Total', '',formatCurrency(saldoInvestimentos), ''],
      ['Saldo Final', '', formatCurrency(saldo), '']
    ];

    // Criar a planilha
    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `Relatório ${mesSelecionado}-${anoSelecionado}`);

    // Baixar o arquivo
    XLSX.writeFile(wb, `relatorio_${mesSelecionado}_${anoSelecionado}.xlsx`);
  };

  // const exportToExcelCategory = () => {
  //   // Preparar os dados
  //   const data = [
  //     ['id', 'nome'],
  //     ...categorias.map(categoria => [
  //       categoria.id,
  //       categoria.nome,
  //     ]),
  //   ];

  //   // Criar a planilha
  //   const ws = XLSX.utils.aoa_to_sheet(data);
  //   const wb = XLSX.utils.book_new();
  //   XLSX.utils.book_append_sheet(wb, ws, 'Categorias');

  //   // Baixar o arquivo
  //   XLSX.writeFile(wb, `Categorias.xlsx`);
  // };

  function formatarDataParaBrasil(data: Date): string {
    const dia = String(data.getDate()).padStart(2, '0');
    const mes = String(data.getMonth() + 1).padStart(2, '0'); // Mês é 0-indexed
    const ano = data.getFullYear();
    
    return `${dia}/${mes}/${ano}`;
  }

  // Atualize a função exportToPDF
  const exportToPDF = () => {
    const doc = new jsPDF() as jsPDFWithAutoTable;
    const title = `Relatório Financeiro - ${mesSelecionado}/${anoSelecionado}`;
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 14;

    // Configurações do PDF
    doc.setFontSize(16);
    doc.text(title, 14, 15);
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Gerado em ${new Date().toLocaleDateString()}`, 14, 25);

    // Total de transações (canto direito)
    const totalText = `Total: ${transacoes.length} transações`;
    const fontSize = doc.getFontSize();
    const textWidth = doc.getStringUnitWidth(totalText) * fontSize / doc.internal.scaleFactor;
    doc.text(totalText, pageWidth - margin - textWidth, 25);

    // Dados da tabela
    const body = transacoes.map(transacao => [
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
    doc.save(`relatorio_${mesSelecionado}_${anoSelecionado}.pdf`);
  };

  useEffect(() => {
    async function fetchDados() {
      if (!user) return;
      
      setLoading(true);
      try {
        const data = await fetchTransacao(user.id, mesSelecionado, anoSelecionado);
        const transacoesFiltradas = data.filter(
          (t) => t.mes === mesSelecionado && t.ano === anoSelecionado
        );

        const transacoesOrdenadas = transacoesFiltradas.sort(
          (a, b) => new Date(a.data).getTime() - new Date(b.data).getTime()
        );

        const transacoesPorDia: Record<number, Transacao[]> = transacoesOrdenadas.reduce(
          (acc, transacao) => {
            const dia = new Date(transacao.data).getDate();
            if (!acc[dia]) acc[dia] = [];
            acc[dia].push(transacao);
            return acc;
          },
          {} as Record<number, Transacao[]>
        );

        const categoriasRes = await fetch(`/api/categorias/todas?userId=${user.id}`);
        const cat = await categoriasRes.json();

        setCategorias(cat.categorias);

        setTransacoes(transacoesOrdenadas);
        setTransacoesPorDia(transacoesPorDia);
      } catch (error) {
        console.error("Erro ao carregar os dados:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchDados();
  }, [mesSelecionado, anoSelecionado, user]);

  const calcularSaldo = useMemo(() => (tipo: "investimentos" | "renda" | "despesa") => {
    return transacoes.reduce((total, { valor, tipo: tipoTransacao }) => 
      total + (tipoTransacao === tipo ? Number(valor) : 0)
    , 0);
  }, [transacoes]);

  const saldoInvestimentos = calcularSaldo("investimentos");
  const saldoRenda = calcularSaldo("renda");
  const saldoDespesa = calcularSaldo("despesa");

  const saldo = saldoRenda - saldoDespesa;

  const classSaldo = (saldo: number) => 
    saldo === 0 ? "text-gray-500" : saldo < 0 ? "text-red-500" : "text-green-500";

  const fetchDados = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    try {
      const data = await fetchTransacao(user.id, mesSelecionado, anoSelecionado);
      const transacoesFiltradas = data.filter(
        (t) => t.mes === mesSelecionado && t.ano === anoSelecionado
      );

      const transacoesOrdenadas = transacoesFiltradas.sort(
        (a, b) => new Date(a.data).getTime() - new Date(b.data).getTime()
      );

      const transacoesPorDia: Record<number, Transacao[]> = transacoesOrdenadas.reduce(
        (acc, transacao) => {
          const dia = new Date(transacao.data).getDate();
          if (!acc[dia]) acc[dia] = [];
          acc[dia].push(transacao);
          return acc;
        },
        {} as Record<number, Transacao[]>
      );

      setTransacoes(transacoesOrdenadas);
      setTransacoesPorDia(transacoesPorDia);
    } catch (error) {
      console.error("Erro ao carregar os dados:", error);
    } finally {
      setLoading(false);
    }
  }, [mesSelecionado, anoSelecionado, user]);

  // useEffect só chama a fetchDados
  useEffect(() => {
    fetchDados();
  }, [fetchDados]);

  const [isLoadingImport, setIsLoadingImport] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!user) {
      toast.error("Você precisa estar logado para importar dados");
      return;
    }

    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoadingImport(true);
    // Cria o toast inicial
    toast.loading("Processando arquivo...");

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      
      if (workbook.SheetNames.length === 0) {
        throw new Error("Nenhuma planilha encontrada");
      }
      
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet);

      // Atualiza o toast para validação (cria novo e descarta o anterior)
      if (jsonData.length > 20) {
        toast.dismiss();
        toast.loading(`Validando ${jsonData.length} transações...`);
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      // Processar transações...
      const results = await processTransactions(jsonData);
      
      if (results.errors.length > 0) {
        throw new Error(formatErrors(results.errors));
      }

      // Atualiza para mensagem de salvamento
      toast.dismiss();
      toast.loading(`Salvando ${results.validTransactions.length} transações...`);

      const res = await fetch("/api/transacoes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(results.validTransactions),
      });

      if (!res.ok) {
        throw new Error("Falha ao salvar transações");
      }
      
      // Mostra mensagem de sucesso
      toast.dismiss();
      toast.success(`${results.validTransactions.length} transações importadas com sucesso!`);
      await fetchDados();
      
    } catch (error) {
      console.error("Erro na importação:", error);
      toast.dismiss();
      toast.error(
        error instanceof Error ? error.message : "Erro ao processar arquivo"
      );
    } finally {
      setIsLoadingImport(false);
      e.target.value = '';
    }
  };

  // const handleUpdateCategories = async (e: React.ChangeEvent<HTMLInputElement>) => {
  //   if (!user) {
  //     toast.error("Você precisa estar logado para atualizar categorias");
  //     return;
  //   }

  //   const file = e.target.files?.[0];
  //   if (!file) return;

  //   setIsLoadingImport(true);
  //   toast.loading("Processando arquivo de atualização...");

  //   try {
  //     // Ler o arquivo Excel
  //     const data = await file.arrayBuffer();
  //     const workbook = XLSX.read(data, { type: 'array' });
      
  //     if (workbook.SheetNames.length === 0) {
  //       throw new Error("Nenhuma planilha encontrada no arquivo");
  //     }
      
  //     const worksheet = workbook.Sheets[workbook.SheetNames[0]];
  //     const jsonData = XLSX.utils.sheet_to_json<{idTransacao: string; idCategoria: string}>(worksheet);

  //     // Validar estrutura do arquivo
  //     if (!jsonData[0]?.idTransacao || !jsonData[0]?.idCategoria) {
  //       throw new Error("O arquivo deve conter as colunas 'idTransacao' e 'idCategoria'");
  //     }

  //     // Atualizar toast para mostrar progresso
  //     if (jsonData.length > 20) {
  //       toast.dismiss();
  //       toast.loading(`Processando ${jsonData.length} atualizações...`);
  //       await new Promise(resolve => setTimeout(resolve, 500));
  //     }

  //     // Preparar os dados para envio
  //     const updates = jsonData.map(item => ({
  //       id: item.idTransacao,
  //       categoriaId: item.idCategoria
  //     }));

  //     // Enviar para a API
  //     toast.dismiss();
  //     toast.loading(`Atualizando ${updates.length} transações...`);

  //     const res = await fetch("/api/transacoes/update-categories", {
  //       method: "PUT",
  //       headers: { "Content-Type": "application/json" },
  //       body: JSON.stringify({ updates }),
  //     });

  //     if (!res.ok) {
  //       const errorData = await res.json();
  //       throw new Error(errorData.message || "Falha ao atualizar categorias");
  //     }
      
  //     // Sucesso
  //     toast.dismiss();
  //     toast.success(`${updates.length} categorias atualizadas com sucesso!`);
  //     await fetchDados(); // Atualizar os dados exibidos
      
  //   } catch (error) {
  //     console.error("Erro na atualização:", error);
  //     toast.dismiss();
  //     toast.error(
  //       error instanceof Error ? error.message : "Erro ao processar arquivo"
  //     );
  //   } finally {
  //     setIsLoadingImport(false);
  //     e.target.value = '';
  //   }
  // };

  // Funções auxiliares
  async function processTransactions(data: Record<string, unknown>[]) {
    const errors: string[] = [];
    const validTransactions: TransacaoImportada[] = [];

    for (const [index, row] of data.entries()) {
      try {
        const transaction = validateTransaction(row, index + 2);
        validTransactions.push(transaction);
      } catch (error) {
        errors.push(error instanceof Error ? error.message : `Erro na linha ${index + 2}`);
      }
    }

    return { errors, validTransactions };
  }

  function validateTransaction(row: Record<string, unknown>, lineNumber: number): TransacaoImportada {
    // Validação do dia
    const dia = parseNumber(row.Dia, 'Dia', lineNumber);
    if (dia < 1 || dia > 31) {
      throw new Error(`Dia inválido (${dia}) na linha ${lineNumber}`);
    }

    // Validação do valor
    const valor = parseNumber(row.Valor, 'Valor', lineNumber);

    // Validação do tipo
    const tipo = String(row.Tipo).toLowerCase();
    if (!['renda', 'despesa', 'investimentos'].includes(tipo)) {
      throw new Error(`Tipo inválido (${tipo}) na linha ${lineNumber}`);
    }

    // Validação específica para investimentos
    if (tipo === 'investimentos') {
      const valorUnitario = parseNumber(row.ValorUnitario, 'ValorUnitario', lineNumber);
      const quantidade = parseNumber(row.Quantidade, 'Quantidade', lineNumber);
      
      if (quantidade <= 0) {
        throw new Error(`Quantidade inválida (${quantidade}) na linha ${lineNumber}`);
      }

      return {
        data: new Date(`${anoSelecionado}-${mesSelecionado}-${dia}`),
        descricao: String(row.Descricao || row.Descrição || 'Importação'),
        valor,
        valorUnitario,
        quantidade,
        tipo: tipo as 'renda' | 'despesa' | 'investimentos',
        mes: mesSelecionado,
        ano: anoSelecionado,
        userId: user!.id
      };
    }

    return {
      data: new Date(`${anoSelecionado}-${mesSelecionado}-${dia}`),
      descricao: String(row.Descricao || row.Descrição || 'Importação'),
      valor,
      tipo: tipo as 'renda' | 'despesa' | 'investimentos',
      mes: mesSelecionado,
      ano: anoSelecionado,
      userId: user!.id
    };
  }

  function parseNumber(value: unknown, field: string, lineNumber: number): number {
    const num = Number(String(value).replace(/[^\d,-]/g, '').replace(',', '.'));
    if (isNaN(num)) {
      throw new Error(`Valor inválido para ${field} na linha ${lineNumber}`);
    }
    return num;
  }

  function formatErrors(errors: string[]): string {
    const MAX_ERRORS = 5;
    if (errors.length <= MAX_ERRORS) {
      return `Erros encontrados:\n${errors.join('\n')}`;
    }
    return `Erros encontrados (mostrando ${MAX_ERRORS} de ${errors.length}):\n${
      errors.slice(0, MAX_ERRORS).join('\n')
    }\n...`;
  }

  const totalTransacoes = {
    renda: transacoes.filter(t => t.tipo === 'renda').length,
    despesas: transacoes.filter(t => t.tipo === 'despesa').length,
    investimentos: transacoes.filter(t => t.tipo === 'investimentos').length,
    total: transacoes.length
  };

  return (
    <ProtectedRoute>
      <div className="max-w-6xl mx-auto p-4">
        {/* Breadcrumb melhorado */}
        <Breadcrumb 
          anoSelecionado={anoSelecionado}
          mesSelecionado={mesSelecionado}
          showMonthLink={true}
        />

        {loading ? (
          <div>
            <Skeleton className="h-40 mb-6" />

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {Array.from({ length: totalDiasDoMes }).map((_, i) => (
                <Skeleton key={i} className="h-12" />
              ))}
            </div>
          </div>
        ) : (
          <>

            {/* Resumo do mês - Versão melhorada */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden mb-6">
              <div className="px-4 sm:px-5 py-4 border-b border-gray-100">
                {/* Cabeçalho e botões em coluna para mobile e linha para desktop */}
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                  <h3 className="text-sm sm:text-base font-semibold text-gray-800">Resumo financeiro</h3>

                  {/* Container dos botões com flex-wrap para quebrar linha quando necessário */}
                  <div className="flex flex-wrap gap-2 justify-end">
                    {/* Botão Exportar Excel - tamanho reduzido em mobile */}
                    <button
                      onClick={exportToExcel}
                      className="flex items-center gap-1 sm:gap-2 bg-green-600 hover:bg-green-700 text-white px-3 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium disabled:opacity-50 transition-colors"
                    >
                      <HiOutlineDocumentDownload className="h-3 w-3 sm:h-4 sm:w-4" />
                      <span className="hidden xs:inline">Exportar</span> Excel
                    </button>
                    {/* Botão Exportar PDF - tamanho reduzido em mobile */}
                    <button
                      onClick={exportToPDF}
                      className="flex items-center gap-1 sm:gap-2 bg-red-600 hover:bg-red-700 text-white px-3 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium disabled:opacity-50 transition-colors"
                    >
                      <HiOutlineDocumentReport className="h-3 w-3 sm:h-4 sm:w-4" />
                      <span className="hidden xs:inline">Exportar</span> PDF
                    </button>
                    
                    {/* Botão Importar - versão compacta para mobile */}
                    <label 
                      className="relative flex items-center gap-1 sm:gap-2 bg-blue-600 hover:bg-blue-700 text-white px-3 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium disabled:opacity-50 transition-colors"
                      aria-busy={isLoadingImport}
                      aria-disabled={isLoadingImport}
                    >
                      {isLoadingImport ? (
                        <>
                          <HiOutlineRefresh className="h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
                          <span className="hidden xs:inline">Importando...</span>
                        </>
                      ) : (
                        <>
                          <HiOutlineUpload className="h-3 w-3 sm:h-4 sm:w-4" />
                          <span className="hidden xs:inline">Importar</span> Transações
                        </>
                      )}
                      <input 
                        id="file-upload"
                        type="file"
                        accept=".xlsx,.xls,.csv"
                        className="sr-only"
                        onChange={handleFileUpload}
                        disabled={isLoadingImport}
                        aria-label="Importar transações"
                      />
                    </label>
                  </div>
                </div>
              </div>
              
              <div className="p-4 sm:p-5">
                {/* Saldo principal */}
                <div className="flex flex-col items-center mb-4 sm:mb-6">
                  <span className="text-xs sm:text-sm font-medium text-gray-500 mb-1">Saldo do mês</span>
                  <span className={`text-2xl sm:text-3xl font-bold ${classSaldo(saldo)}`}>
                    {formatCurrency(saldo)}
                  </span>
                </div>

                {/* Grid de métricas */}
                <div className="grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-gray-100 text-center">
                  <div className="px-3 py-2 sm:py-2">
                    <p className="text-xs sm:text-sm text-gray-500 mb-1">Renda</p>
                    <p className="text-base sm:text-lg font-semibold text-green-600">
                      {formatCurrency(saldoRenda)}
                    </p>
                  </div>
                  <div className="px-3 py-2 sm:py-2">
                    <p className="text-xs sm:text-sm text-gray-500 mb-1">Despesas</p>
                    <p className="text-base sm:text-lg font-semibold text-red-600">
                      {formatCurrency(saldoDespesa)}
                    </p>
                  </div>
                  <div className="px-3 py-2 sm:py-2">
                    <p className="text-xs sm:text-sm text-gray-500 mb-1">Investimentos</p>
                    <p className="text-base sm:text-lg font-semibold text-blue-600">
                      {formatCurrency(saldoInvestimentos)}
                    </p>
                  </div>
                  <div className="px-3 py-2 sm:py-2">
                    <p className="text-xs sm:text-sm text-gray-500 mb-1">Total Transações</p>
                    <p className="text-base sm:text-lg font-semibold text-purple-600">
                      {totalTransacoes.total}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Grid de dias com layout melhorado */}
            <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
              {Array.from({ length: totalDiasDoMes }, (_, index) => {
                const dia = index + 1;
                const transacoesDia = transacoesPorDia[dia] || [];
                const temTransacoes = transacoesDia.length > 0;

                const saldoDiaInvestimentos = transacoesDia.reduce((total, { valor, tipo }) =>
                  total + (tipo === "investimentos" ? Number(valor) : 0), 0);
                const saldoDiaRenda = transacoesDia.reduce((total, { valor, tipo }) =>
                  total + (tipo === "renda" ? Number(valor) : 0), 0);
                const saldoDiaDespesa = transacoesDia.reduce((total, { valor, tipo }) =>
                  total + (tipo === "despesa" ? Number(valor) : 0), 0);

                const saldoDia = saldoDiaRenda - saldoDiaDespesa;

                return (
                  <div key={`${anoSelecionado}-${mes}-${dia}`}>
                    <Link href={`/dashboard/${anoSelecionado}/${mes}/${dia}`}>
                      <div 
                        key={dia}
                        className={`
                          hover:border-gray-800
                          border rounded-lg transition-all duration-200 overflow-hidden border-gray-300 shadow-md
                          ${temTransacoes ? "bg-white" : "bg-gray-50"}
                        `}
                      >
                        <div 
                          className="p-3 cursor-pointer flex flex-col border-b border-gray-200"
                          // onClick={() => toggleOpen(dia)}
                        >
                          <div className="flex justify-between items-center">
                            <span className={`
                              font-medium 
                              ${temTransacoes ? "text-gray-800" : "text-gray-400"}
                              ${dia === diaAtual && mesAtual === mesSelecionado ? "font-bold text-blue-600" : ""}
                            `}>
                              {dia}
                            </span>
                            <div className="flex items-center space-x-1">
                              <span className={`text-sm font-semibold ${classSaldo(saldoDia)}`}>
                                {formatCurrency(saldoDia)}
                              </span>
                              {saldoDia < 0 ? (
                                <HiOutlineArrowDown className="h-4 w-4 text-red-500" />
                              ) : (
                                <HiOutlineArrowUp className="h-4 w-4 text-green-500" />
                              )}
                            </div>
                          </div>

                          {/*{openDia[dia] && (
                            <div className="border-t border-gray-200 pt-3 pb-2 px-3 sm:px-4">
                              <div className="space-y-2 sm:space-y-3 mb-2 sm:mb-3">
                                <div className="flex justify-between items-center">
                                  <span className="text-xs sm:text-sm text-gray-500">Renda</span>
                                  <span className="text-xs sm:text-sm font-medium text-green-600">
                                    {formatCurrency(saldoDiaRenda)}
                                  </span>
                                </div>
                              
                                <div className="flex justify-between items-center">
                                  <span className="text-xs sm:text-sm text-gray-500">Despesas</span>
                                  <span className="text-xs sm:text-sm font-medium text-red-600">
                                    {formatCurrency(saldoDiaDespesa)}
                                  </span>
                                </div>
                              
                                <div className="flex justify-between items-center">
                                  <span className="text-xs sm:text-sm text-gray-500">Investimentos</span>
                                  <span className="text-xs sm:text-sm font-medium text-gray-600">
                                    {formatCurrency(saldoDiaInvestimentos)}
                                  </span>
                                </div>
                              </div>

                              <Link 
                                href={`/dashboard/${anoSelecionado}/${mes}/${dia}`}
                                className="block w-full mt-2 sm:mt-3 py-1.5 text-center text-xs sm:text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors rounded-md hover:bg-blue-50"
                              >
                                Ver detalhes
                              </Link>
                            </div>
                          )}*/}

                          <div className="border-t border-gray-200 pt-3 pb-2">
                            <div className="space-y-2 sm:space-y-3 mb-2 sm:mb-3">
                              {/* Item Renda */}
                              <div className="flex justify-between items-center">
                                <span className="text-xs sm:text-sm text-gray-500">Renda</span>
                                <span className="text-xs sm:text-sm font-medium text-green-600">
                                  {formatCurrency(saldoDiaRenda)}
                                </span>
                              </div>
                              
                              {/* Item Despesas */}
                              <div className="flex justify-between items-center">
                                <span className="text-xs sm:text-sm text-gray-500">Despesas</span>
                                <span className="text-xs sm:text-sm font-medium text-red-600">
                                  {formatCurrency(saldoDiaDespesa)}
                                </span>
                              </div>
                              
                              {/* Item Investimentos */}
                              <div className="flex justify-between items-center">
                                <span className="text-xs sm:text-sm text-gray-500">Investimentos</span>
                                <span className="text-xs sm:text-sm font-medium text-gray-600">
                                  {formatCurrency(saldoDiaInvestimentos)}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </Link>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </ProtectedRoute>
  );
}