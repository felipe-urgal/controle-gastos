import { formatCurrency } from "@/app/utils/format";

interface DashboardAnnualSummaryProps {
  anoSelecionado: number;
  saldoTotal: number;
  investimentoTotal: number;
  TODOS_OPTION: number;
}

export const DashboardAnnualSummary = ({
  anoSelecionado,
  saldoTotal,
  investimentoTotal,
  TODOS_OPTION
}: DashboardAnnualSummaryProps) => {
  const classSaldo = (valor: number) => {
    if (valor === 0) return "text-gray-500";
    return valor < 0 ? "text-red-500" : "text-green-500";
  };

  if (anoSelecionado === TODOS_OPTION) return null;

  return (
    <div className="mt-8 bg-white rounded-lg shadow p-6">
      <h2 className="text-lg font-semibold text-gray-800 mb-4">Resumo Anual {anoSelecionado}</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="border-l-4 border-green-500 pl-4 md:justify-self-start">
          <p className="text-sm text-gray-500">Saldo Total</p>
          <p className={`text-2xl font-bold ${classSaldo(saldoTotal)}`}>
            {formatCurrency(saldoTotal)}
          </p>
        </div>

        <div className="hidden lg:block"></div>

        <div className="border-l-4 border-blue-500 pl-4 md:justify-self-end lg:col-start-3">
          <p className="text-sm text-gray-500">Total Investido</p>
          <p className="text-2xl font-bold text-blue-600">
            {formatCurrency(investimentoTotal)}
          </p>
        </div>
      </div>
    </div>
  );
};