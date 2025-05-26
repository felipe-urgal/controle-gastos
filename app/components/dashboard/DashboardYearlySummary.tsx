import { formatCurrency } from "@/app/utils/format";
import { Transacao } from "@/app/services/transacoesService";
import { processarTransacoes } from "@/app/utils/processarTransacoes";

interface DashboardYearlySummaryProps {
  transacoes: Transacao[];
}

export const DashboardYearlySummary = ({ transacoes }: DashboardYearlySummaryProps) => {
  const anosUnicos = Array.from(new Set(transacoes.map(t => new Date(t.data).getFullYear())))
    .sort((a, b) => b - a);

  const totais = anosUnicos.map(ano => {
    const transacoesAno = transacoes.filter(t => new Date(t.data).getFullYear() === ano);
    const resumoAno = processarTransacoes(transacoesAno, ano);
    const totalRenda = resumoAno.mesesData.reduce((a, b) => a + b.renda, 0);
    const totalDespesas = resumoAno.mesesData.reduce((a, b) => a + b.despesas, 0);
    return {
      ano,
      renda: totalRenda,
      despesas: totalDespesas,
      investimentos: resumoAno.investimentoAnual,
      saldo: totalRenda - totalDespesas
    };
  });

  const rendaTotal = totais.reduce((sum, item) => sum + item.renda, 0);
  const despesasTotal = totais.reduce((sum, item) => sum + item.despesas, 0);
  const investimentosTotal = totais.reduce((sum, item) => sum + item.investimentos, 0);

  return (
    <div className="bg-white rounded-lg shadow p-4 sm:p-6">
      <h3 className="text-lg font-semibold mb-4">Visão Geral por Ano</h3>
      <div className="space-y-4">
        {/* Cabeçalhos das colunas - escondido em mobile */}
        <div className="hidden sm:grid grid-cols-4 gap-4 font-medium border-b pb-2">
          <div>Ano</div>
          <div className="text-green-600">Renda</div>
          <div className="text-red-600">Despesas</div>
          <div className="text-blue-600">Investimentos</div>
        </div>

        {/* Dados por ano */}
        {totais.map(({ ano, renda, despesas, investimentos }) => (
          <div key={ano} className="flex flex-col sm:grid sm:grid-cols-4 gap-2 sm:gap-4 items-start sm:items-center border-b pb-3 last:border-b-0">
            <div className="font-medium w-full sm:w-auto bg-gray-50 sm:bg-transparent p-2 sm:p-0 rounded sm:rounded-none">{ano}</div>
            
            <div className="flex justify-between w-full sm:block sm:w-auto">
              <span className="sm:hidden text-sm text-gray-500">Renda:</span>
              <span className="text-green-600">+{formatCurrency(renda)}</span>
            </div>
            
            <div className="flex justify-between w-full sm:block sm:w-auto">
              <span className="sm:hidden text-sm text-gray-500">Despesas:</span>
              <span className="text-red-600">-{formatCurrency(despesas)}</span>
            </div>
            
            <div className="flex justify-between w-full sm:block sm:w-auto">
              <span className="sm:hidden text-sm text-gray-500">Investimentos:</span>
              <span className="text-blue-600">{formatCurrency(investimentos)}</span>
            </div>
          </div>
        ))}

        {/* Totais */}
        {transacoes.length > 0 && (
          <div className="flex flex-col sm:grid sm:grid-cols-4 gap-2 sm:gap-4 font-medium pt-3">
            <div className="font-semibold bg-gray-50 sm:bg-transparent p-2 sm:p-0 rounded sm:rounded-none">Total</div>
            
            <div className="flex justify-between w-full sm:block sm:w-auto">
              <span className="sm:hidden text-sm text-gray-500">Renda:</span>
              <span className="text-green-600 font-semibold">
                +{formatCurrency(rendaTotal)}
              </span>
            </div>
            
            <div className="flex justify-between w-full sm:block sm:w-auto">
              <span className="sm:hidden text-sm text-gray-500">Despesas:</span>
              <span className="text-red-600 font-semibold">
                -{formatCurrency(despesasTotal)}
              </span>
            </div>
            
            <div className="flex justify-between w-full sm:block sm:w-auto">
              <span className="sm:hidden text-sm text-gray-500">Investimentos:</span>
              <span className="text-blue-600 font-semibold">
                {formatCurrency(investimentosTotal)}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};