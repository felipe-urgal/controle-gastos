interface InvestmentPerformanceProps {
  investments: Array<{
    ticker: string;
    buy: number;
    sell: number;
    net: number;
  }>;
  showValues?: boolean;
}

const InvestmentPerformance = ({ investments, showValues }: InvestmentPerformanceProps) => {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const calculatePercentage = (buy: number, net: number) => {
    return buy > 0 ? ((net / buy) * 100).toFixed(2) : '0.00';
  };

  return (
    <div className="bg-white/80 backdrop-blur-md rounded-2xl overflow-hidden">
      <div className="px-6 py-5 bg-gradient-to-r from-gray-50 to-white border-b border-gray-100">
        <h3 className="text-xl font-semibold text-gray-800 flex items-center">
          <span className="bg-gradient-to-r from-indigo-600 to-blue-500 w-3 h-3 rounded-full mr-3"></span>
          Desempenho por Ativo
        </h3>
        <p className="text-sm text-gray-500 mt-1">Análise detalhada dos investimentos</p>
      </div>
      
      <div className="divide-y divide-gray-100">
        {investments.map((investment, index) => {
          const percentage = calculatePercentage(investment.buy, investment.net);
          const isProfit = investment.net >= 0;
          
          return (
            <div key={index} className="px-6 py-4 flex justify-between items-center hover:bg-gray-50 transition-colors duration-200">
              <div className="flex items-center">
                <div>
                  <h4 className="font-semibold text-gray-900">{investment.ticker}</h4>
                  <div className="flex items-center space-x-3 mt-1">
                    {investment.buy > 0 && (
                      <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                        Compra: {showValues ? formatCurrency(investment.buy) : "******"}
                      </span>
                    )}
                    {investment.sell > 0 && (
                      <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                        Venda: {showValues ? formatCurrency(investment.sell) : "******"}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="text-right">
                <div className={`text-lg font-semibold ${
                  isProfit ? 'text-green-600' : 'text-red-600'
                }`}>
                  {showValues ? formatCurrency(investment.net) : "******"}
                </div>
                <div className={`text-xs font-medium px-2 py-1 rounded-full ${
                  isProfit 
                    ? 'bg-green-100 text-green-700' 
                    : 'bg-red-100 text-red-700'
                }`}>
                  {isProfit ? '↑' : '↓'} {showValues ? {percentage}+'%' : "******"}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {isProfit ? 'Lucro' : 'Prejuízo'}
                </p>
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Footer com resumo */}
      <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
        <div className="flex justify-between items-center text-sm">
          <span className="text-gray-600">Total de ativos: {investments.length}</span>
          <span className="font-medium text-gray-800">
            Resultado líquido: {showValues 
              ? formatCurrency(investments.reduce((total, inv) => total + inv.net, 0))
              : "******"}
          </span>
        </div>
      </div>
    </div>
  );
};

export default InvestmentPerformance;