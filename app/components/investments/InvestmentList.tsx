// components
import { InvestmentItem } from "./InvestmentItem";

// types
import { InvestmentModel } from "@/app/types/investment";

type InvestmentListProps = {
  investments: InvestmentModel[];
  onDelete: (id: string) => void;
};

export const InvestmentList = ({ investments, onDelete }: InvestmentListProps) => {

  return (
    <div className="flex-1 overflow-y-auto">
      <table className="w-full">

        <thead className="bg-gray-800 sticky top-0">
          <tr>
            <th className="hidden lg:table-cell px-4 py-3 text-left text-gray-400 text-xs lg:text-sm">Data</th>
            <th className="px-4 py-3 text-left text-gray-400 text-xs lg:text-sm">Descrição</th>
            <th className="hidden lg:table-cell px-4 py-3 text-left text-gray-400 text-xs lg:text-sm">Conta</th>
            <th className="px-4 py-3 text-right text-gray-400 text-xs lg:text-sm">Valor</th>
            <th className="px-3 text-right text-gray-400 text-xs lg:text-sm"></th>
          </tr>
        </thead>

        <tbody>
          {investments.length === 0 ? (
            <tr>
              <td colSpan={6} className="text-center text-gray-600 py-5">
                Nenhum investimento encontrado
              </td>
            </tr>
          ) : (
            investments.map(investment => (
              <InvestmentItem 
                key={investment.id} 
                investment={investment} 
                onDelete={onDelete}
              />
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};
