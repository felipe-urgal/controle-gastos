import { 
  FaChartPie, 
  FaDollarSign, 
  FaArrowUp, 
  FaArrowDown 
} from "react-icons/fa";
import { FaArrowTrendDown, FaArrowTrendUp } from "react-icons/fa6";

interface SummaryCardProps {
  title: string;
  value: number;
  type: "total" | "income" | "expense" | "investment";
  icon?: string;
  trend?: "up" | "down";
  subtitle?: string;
  trendValue?: number;
}

const SummaryCard = ({ title, value, type, icon, trend, subtitle, trendValue }: SummaryCardProps) => {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatPercentage = (value: number) => {
    return `${value > 0 ? '+' : ''}${value.toFixed(1)}%`;
  };

  const getIconComponent = () => {
    if (icon) {
      const iconMap: Record<string, React.ElementType> = {
        trending_up: FaArrowTrendUp,
        trending_down: FaArrowTrendDown,
        show_chart: FaChartPie,
        account_balance: FaDollarSign
      };
      const IconComponent = iconMap[icon] || FaDollarSign;
      return <IconComponent className="w-4 h-4" />;
    }
    
    switch(type) {
      case "income": return <FaArrowTrendUp className="w-4 h-4" />;
      case "expense": return <FaArrowTrendDown className="w-4 h-4" />;
      case "investment": return <FaChartPie className="w-4 h-4" />;
      default: return <FaDollarSign className="w-4 h-4" />;
    }
  };

  const getColorScheme = () => {
    switch(type) {
      case "income": 
        return {
          bg: "bg-green-50",
          icon: "text-green-600 bg-green-100",
          trend: "text-green-600",
          gradient: "from-green-500 to-emerald-500"
        };
      case "expense": 
        return {
          bg: "bg-red-50",
          icon: "text-red-600 bg-red-100",
          trend: "text-red-600",
          gradient: "from-red-500 to-orange-500"
        };
      case "investment": 
        return {
          bg: "bg-purple-50",
          icon: "text-purple-600 bg-purple-100",
          trend: "text-purple-600",
          gradient: "from-purple-500 to-indigo-500"
        };
      default: 
        return {
          bg: "bg-blue-50",
          icon: "text-blue-600 bg-blue-100",
          trend: "text-blue-600",
          gradient: "from-blue-500 to-cyan-500"
        };
    }
  };

  const getTrendIcon = () => {
    if (!trend) return null;
    
    return trend === "up" 
      ? <FaArrowUp className="w-3 h-3 text-green-500" />
      : <FaArrowDown className="w-3 h-3 text-red-500" />;
  };

  const colors = getColorScheme();

  return (
    <div className={`relative rounded-2xl p-6 transition-all duration-300 hover:shadow-lg ${colors.bg} group overflow-hidden`}>
      {/* Efeito de gradiente sutil */}
      <div className={`absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-5 transition-opacity duration-300 ${colors.gradient}`}></div>
      
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-medium text-gray-600">{title}</span>
          <div className={`p-3 rounded-xl ${colors.icon} transition-transform duration-300 group-hover:scale-110`}>
            {getIconComponent()}
          </div>
        </div>
        
        <div className="mb-2">
          <h3 className="text-2xl font-bold text-gray-800">
            {formatCurrency(value)}
          </h3>
        </div>

        {(trend || subtitle) && (
          <div className="flex items-center justify-between mt-4">
            <div className="flex items-center space-x-2">
              {trend && (
                <div className={`flex items-center space-x-1 text-sm font-medium ${colors.trend}`}>
                  {getTrendIcon()}
                  {trendValue && (
                    <span>{formatPercentage(trendValue)}</span>
                  )}
                </div>
              )}
              
              {subtitle && !trend && (
                <p className="text-xs text-gray-500">{subtitle}</p>
              )}
            </div>

            {subtitle && trend && (
              <p className="text-xs text-gray-500 text-right">{subtitle}</p>
            )}
          </div>
        )}

        {/* Barra de progresso sutil */}
        <div className="mt-4 h-1 bg-white rounded-full overflow-hidden">
          <div 
            className={`h-full bg-gradient-to-r ${colors.gradient} transition-all duration-1000 ease-out`}
            style={{ width: `${Math.min((value / 10000) * 100, 100)}%` }}
          ></div>
        </div>
      </div>
    </div>
  );
};

export default SummaryCard;