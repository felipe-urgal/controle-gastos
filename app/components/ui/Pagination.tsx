import { 
  FaAngleDoubleLeft, 
  FaAngleLeft, 
  FaAngleRight, 
  FaAngleDoubleRight,
  FaEllipsisH 
} from 'react-icons/fa';

type PaginationProps = {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  className?: string;
};

const Pagination = ({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onPageChange,
  className = ""
}: PaginationProps) => {
  if (totalPages <= 1) return null;

  const firstItem = (currentPage - 1) * itemsPerPage + 1;
  const lastItem = Math.min(currentPage * itemsPerPage, totalItems);

  const renderPages = () => {
    const pages: React.ReactElement[] = [];
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    // Ajusta o início se estiver perto do final
    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    // Botão para a primeira página (mostrar apenas se não for a página 1)
    if (startPage > 1) {
      pages.push(
        <button
          key={1}
          onClick={() => onPageChange(1)}
          className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-lg text-slate-600 hover:bg-slate-100 transition-all duration-200 text-sm sm:text-base"
          aria-label="Primeira página"
        >
          1
        </button>
      );
      
      // Ellipsis após a primeira página
      if (startPage > 2) {
        pages.push(
          <span 
            key="start-ellipsis" 
            className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 text-slate-400"
          >
            <FaEllipsisH className="text-xs sm:text-sm" />
          </span>
        );
      }
    }

    // Páginas visíveis
    for (let i = startPage; i <= endPage; i++) {
      pages.push(
        <button
          key={i}
          onClick={() => onPageChange(i)}
          className={`flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-lg transition-all duration-200 text-sm sm:text-base ${
            currentPage === i
              ? "bg-blue-500 text-white shadow-md shadow-blue-500/30 font-semibold"
              : "text-slate-600 hover:bg-slate-100"
          }`}
          aria-label={`Página ${i}`}
          aria-current={currentPage === i ? 'page' : undefined}
        >
          {i}
        </button>
      );
    }

    // Botão para a última página (mostrar apenas se não for a última página visível)
    if (endPage < totalPages) {
      // Ellipsis antes da última página
      if (endPage < totalPages - 1) {
        pages.push(
          <span 
            key="end-ellipsis" 
            className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 text-slate-400"
          >
            <FaEllipsisH className="text-xs sm:text-sm" />
          </span>
        );
      }
      
      pages.push(
        <button
          key={totalPages}
          onClick={() => onPageChange(totalPages)}
          className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-lg text-slate-600 hover:bg-slate-100 transition-all duration-200 text-sm sm:text-base"
          aria-label="Última página"
        >
          {totalPages}
        </button>
      );
    }

    return pages;
  };

  return (
    <div className={`flex flex-col xs:flex-row items-center justify-between gap-4 transition-all duration-300 ${className}`}>
      
      {/* Informação do intervalo de itens */}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-slate-600 font-medium text-center xs:text-left whitespace-nowrap truncate">
          Mostrando <span className="text-slate-800 font-semibold">{firstItem}</span> a{" "}
          <span className="text-slate-800 font-semibold">{lastItem}</span> de{" "}
          <span className="text-slate-800 font-semibold">{totalItems}</span> {totalItems === 1 ? 'item' : 'itens'}
        </p>
      </div>

      {/* Navegação */}
      <div className="flex items-center justify-center xs:justify-end w-full xs:w-auto">
        {/* Botões de navegação para mobile */}
        <div className="flex sm:hidden items-center space-x-2">
          <button
            onClick={() => onPageChange(Math.max(currentPage - 1, 1))}
            disabled={currentPage === 1}
            className="px-3 py-2 text-xs rounded-lg bg-slate-100 text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-200 transition-colors duration-200 font-medium min-w-[70px]"
          >
            ← Anterior
          </button>
          
          {/* Indicador de página atual em mobile */}
          <div className="flex items-center mx-1">
            <span className="text-sm text-slate-600 font-medium">
              Pág. <span className="text-blue-500 font-semibold">{currentPage}</span> de {totalPages}
            </span>
          </div>

          <button
            onClick={() => onPageChange(Math.min(currentPage + 1, totalPages))}
            disabled={currentPage === totalPages}
            className="px-3 py-2 text-xs rounded-lg bg-slate-100 text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-200 transition-colors duration-200 font-medium min-w-[70px]"
          >
            Próxima →
          </button>
        </div>

        {/* Botões de navegação para desktop */}
        <div className="hidden sm:flex items-center space-x-1">
          {/* Botões de navegação rápida */}
          <button
            onClick={() => onPageChange(1)}
            disabled={currentPage === 1}
            className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-lg text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200"
            aria-label="Primeira página"
          >
            <FaAngleDoubleLeft size={12} className="sm:w-3.5 sm:h-3.5" />
          </button>
          
          <button
            onClick={() => onPageChange(Math.max(currentPage - 1, 1))}
            disabled={currentPage === 1}
            className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-lg text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200"
            aria-label="Página anterior"
          >
            <FaAngleLeft size={12} className="sm:w-3.5 sm:h-3.5" />
          </button>

          {/* Páginas numeradas */}
          {renderPages()}

          <button
            onClick={() => onPageChange(Math.min(currentPage + 1, totalPages))}
            disabled={currentPage === totalPages}
            className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-lg text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200"
            aria-label="Próxima página"
          >
            <FaAngleRight size={12} className="sm:w-3.5 sm:h-3.5" />
          </button>
          
          <button
            onClick={() => onPageChange(totalPages)}
            disabled={currentPage === totalPages}
            className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-lg text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200"
            aria-label="Última página"
          >
            <FaAngleDoubleRight size={12} className="sm:w-3.5 sm:h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Pagination;