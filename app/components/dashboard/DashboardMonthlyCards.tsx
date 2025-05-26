import Link from "next/link";
import { formatCurrency } from "@/app/utils/format";
import { AnimatePresence, motion } from "framer-motion";
import { MesResumo } from "@/app/types/mes_resumo";

interface DashboardMonthlyCardsProps {
  meses: MesResumo[];
  anoSelecionado: number;
}

export const DashboardMonthlyCards = ({ meses, anoSelecionado }: DashboardMonthlyCardsProps) => {
  const classSaldo = (valor: number) => {
    if (valor === 0) return "text-gray-500";
    return valor < 0 ? "text-red-500" : "text-green-500";
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      <AnimatePresence>
        {meses.map(({ mes, saldo, renda, despesas, investimentos, name }) => (
          <motion.div
            key={`${anoSelecionado}-${mes}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Link href={`/dashboard/${anoSelecionado}/${mes}`}>
              <div className="bg-white rounded-lg shadow overflow-hidden border border-gray-200 hover:shadow-md hover:border-blue-500 transition-all duration-300">
                <div className="p-4 cursor-pointer flex justify-between items-center">
                  <h3 className="font-medium text-gray-800">{name}</h3>
                  <span className={`font-semibold ${classSaldo(saldo)}`}>
                    {formatCurrency(saldo)}
                  </span>
                </div>

                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="px-4 pb-4"
                >
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Receitas</span>
                      <span className="text-sm font-medium text-green-600">
                        {formatCurrency(renda)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Despesas</span>
                      <span className="text-sm font-medium text-red-600">
                        {formatCurrency(despesas)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Investimentos</span>
                      <span className="text-sm font-medium text-blue-600">
                        {formatCurrency(investimentos)}
                      </span>
                    </div>
                  </div>
                </motion.div>
              </div>
            </Link>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};