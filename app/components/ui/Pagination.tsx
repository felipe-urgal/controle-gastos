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
};

const Pagination = ({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onPageChange,
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

    // Botão para a primeira página
    if (startPage > 1) {
      pages.push(
        <button
          key={1}
          onClick={() => onPageChange(1)}
          className="flex items-center justify-center w-10 h-10 rounded-lg text-slate-600 hover:bg-slate-100 transition-all duration-200"
          aria-label="Primeira página"
        >
          1
        </button>
      );
      
      if (startPage > 2) {
        pages.push(
          <span 
            key="start-ellipsis" 
            className="flex items-center justify-center w-10 h-10 text-slate-400 dark:text-slate-500"
          >
            <FaEllipsisH />
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
          className={`flex items-center justify-center w-10 h-10 rounded-lg transition-all duration-200 ${
            currentPage === i
              ? "bg-blue-500 text-white shadow-md shadow-blue-500/30"
              : "text-slate-600 hover:bg-slate-100"
          }`}
          aria-label={`Página ${i}`}
          aria-current={currentPage === i ? 'page' : undefined}
        >
          {i}
        </button>
      );
    }

    // Botão para a última página
    if (endPage < totalPages) {
      if (endPage < totalPages - 1) {
        pages.push(
          <span 
            key="end-ellipsis" 
            className="flex items-center justify-center w-10 h-10 text-slate-400 dark:text-slate-500"
          >
            <FaEllipsisH />
          </span>
        );
      }
      
      pages.push(
        <button
          key={totalPages}
          onClick={() => onPageChange(totalPages)}
          className="flex items-center justify-center w-10 h-10 rounded-lg text-slate-600 hover:bg-slate-100 transition-all duration-200"
          aria-label="Última página"
        >
          {totalPages}
        </button>
      );
    }

    return pages;
  };

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between transition-all duration-300">
      
      {/* Informação do intervalo de itens */}
      <div className="mb-4 sm:mb-0 flex-1">
        <p className="text-sm text-slate-600 font-medium">
          Mostrando <span className="text-slate-800 font-semibold">{firstItem}</span> a{" "}
          <span className="text-slate-800 font-semibold">{lastItem}</span> de{" "}
          <span className="text-slate-800 font-semibold">{totalItems}</span> resultados
        </p>
      </div>

      {/* Navegação */}
      <div className="flex items-center space-x-1">
        {/* Botões de navegação para mobile */}
        <div className="flex sm:hidden space-x-2">
          <button
            onClick={() => onPageChange(Math.max(currentPage - 1, 1))}
            disabled={currentPage === 1}
            className="px-4 py-2 text-sm rounded-lg bg-slate-100 text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors duration-200"
          >
            Anterior
          </button>
          <button
            onClick={() => onPageChange(Math.min(currentPage + 1, totalPages))}
            disabled={currentPage === totalPages}
            className="px-4 py-2 text-sm rounded-lg bg-slate-100 text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors duration-200"
          >
            Próxima
          </button>
        </div>

        {/* Botões de navegação para desktop */}
        <div className="hidden sm:flex items-center space-x-1">
          <button
            onClick={() => onPageChange(1)}
            disabled={currentPage === 1}
            className="flex items-center justify-center w-10 h-10 rounded-lg text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200"
            aria-label="Primeira página"
          >
            <FaAngleDoubleLeft size={14} />
          </button>
          
          <button
            onClick={() => onPageChange(Math.max(currentPage - 1, 1))}
            disabled={currentPage === 1}
            className="flex items-center justify-center w-10 h-10 rounded-lg text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200"
            aria-label="Página anterior"
          >
            <FaAngleLeft size={14} />
          </button>

          {renderPages()}

          <button
            onClick={() => onPageChange(Math.min(currentPage + 1, totalPages))}
            disabled={currentPage === totalPages}
            className="flex items-center justify-center w-10 h-10 rounded-lg text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200"
            aria-label="Próxima página"
          >
            <FaAngleRight size={14} />
          </button>
          
          <button
            onClick={() => onPageChange(totalPages)}
            disabled={currentPage === totalPages}
            className="flex items-center justify-center w-10 h-10 rounded-lg text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200"
            aria-label="Última página"
          >
            <FaAngleDoubleRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Pagination;