import { Dispatch, SetStateAction } from "react";

interface DashboardFiltersProps {
  anoSelecionado: number;
  setAnoSelecionado: Dispatch<SetStateAction<number>>;
  loading: boolean;
  anoAtual: number;
  TODOS_OPTION: number;
}

export const DashboardFilters = ({
  anoSelecionado,
  setAnoSelecionado,
  loading,
  anoAtual,
  TODOS_OPTION
}: DashboardFiltersProps) => (
  <div className="w-full sm:w-auto">
    <label htmlFor="ano" className="block text-sm font-medium text-gray-700 mb-1">
      Ano
    </label>
    <select
      id="ano"
      value={anoSelecionado}
      onChange={(e) => setAnoSelecionado(Number(e.target.value))}
      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 py-2 px-3 border"
      disabled={loading}
    >
      <option value={TODOS_OPTION}>Todos os anos</option>
      {Array.from(
        { length: ((anoSelecionado === -1 ? anoAtual : anoSelecionado) + 5) - anoAtual },
        (_, i) => 2024 + i
      )
        .reverse()
        .map((ano) => (
          <option key={ano} value={ano}>
            {ano}
          </option>
        ))}
    </select>
  </div>
);