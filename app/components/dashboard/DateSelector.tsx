// app/components/DateSelector.tsx
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";

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
    <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-4 w-full">      
      <div className="flex items-center bg-white/60 backdrop-blur-md rounded-2xl p-2 w-full md:w-auto">
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
        
        <div className="flex items-center rounded-lg flex-1 justify-center">
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