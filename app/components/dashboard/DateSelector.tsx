// app/components/DateSelector.tsx
import { FaChevronLeft, FaChevronRight, FaCalendarAlt } from "react-icons/fa";

interface DateSelectorProps {
  currentDate: Date;
  onPrevious: () => void;
  onNext: () => void;
}

const DateSelector = ({ currentDate, onPrevious, onNext }: DateSelectorProps) => {
  const monthNames = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];

  return (
    <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
      <div className="flex items-center bg-white rounded-2xl shadow-md p-2 border border-gray-100">
        <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-3 rounded-xl shadow-md mr-4">
          <FaCalendarAlt size={24} className="text-white" />
        </div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
          Dashboard Financeiro
        </h1>
      </div>
      
      <div className="flex items-center bg-white rounded-2xl shadow-md p-2 border border-gray-100">
        <button
          onClick={onPrevious}
          className="p-3 rounded-xl hover:bg-gray-50 transition-all duration-300 group"
          aria-label="Mês anterior"
        >
          <FaChevronLeft 
            size={18} 
            className="text-gray-500 group-hover:text-indigo-600 transition-colors" 
          />
        </button>
        
        <div className="flex items-center mx-4 py-1 px-4 bg-gray-50 rounded-lg">
          <span className="text-lg font-semibold text-gray-800 min-w-[180px] text-center">
            {monthNames[currentDate.getMonth()]} de {currentDate.getFullYear()}
          </span>
        </div>
        
        <button
          onClick={onNext}
          className="p-3 rounded-xl hover:bg-gray-50 transition-all duration-300 group"
          aria-label="Próximo mês"
        >
          <FaChevronRight 
            size={18} 
            className="text-gray-500 group-hover:text-indigo-600 transition-colors" 
          />
        </button>
      </div>
    </div>
  );
};

export default DateSelector;