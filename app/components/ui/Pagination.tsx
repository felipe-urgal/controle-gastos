import { 
  FaAngleDoubleLeft, 
  FaAngleLeft, 
  FaAngleRight, 
  FaAngleDoubleRight,
  FaEllipsisH 
} from "react-icons/fa";

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

    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    if (startPage > 1) {
      pages.push(
        <button
          key={1}
          onClick={() => onPageChange(1)}
          className="flex items-center justify-center w-8 h-8 rounded-full text-slate-700 hover:bg-indigo-50 transition-all duration-200 text-sm font-medium"
        >
          1
        </button>
      );
      if (startPage > 2) {
        pages.push(
          <span key="start-ellipsis" className="flex items-center justify-center w-8 h-8 text-slate-400">
            <FaEllipsisH className="text-xs" />
          </span>
        );
      }
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(
        <button
          key={i}
          onClick={() => onPageChange(i)}
          className={`group flex items-center justify-center w-8 h-8 rounded-full transition-all duration-300 text-sm font-medium
            ${
              currentPage === i
                ? "bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg shadow-indigo-500/30"
                : "text-slate-700 hover:bg-indigo-50"
            }`}
          aria-current={currentPage === i ? "page" : undefined}
        >
          <span
            className={`transition-transform duration-300 ${
              currentPage === i ? "scale-110" : "group-hover:scale-110"
            }`}
          >
            {i}
          </span>
        </button>
      );
    }

    if (endPage < totalPages) {
      if (endPage < totalPages - 1) {
        pages.push(
          <span key="end-ellipsis" className="flex items-center justify-center w-8 h-8 text-slate-400">
            <FaEllipsisH className="text-xs" />
          </span>
        );
      }
      pages.push(
        <button
          key={totalPages}
          onClick={() => onPageChange(totalPages)}
          className="flex items-center justify-center w-8 h-8 rounded-full text-slate-700 hover:bg-indigo-50 transition-all duration-200 text-sm font-medium"
        >
          {totalPages}
        </button>
      );
    }

    return pages;
  };

  return (
    <div className={`flex flex-col xs:flex-row items-center justify-between gap-2 pt-2 bg-white rounded-lg shadow-lg border border-slate-100 ${className}`}>
      {/* Navegação */}
      <div className="flex items-center">
        <button
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1}
          className="flex items-center justify-center w-8 h-8 rounded-full text-slate-700 hover:bg-indigo-50 disabled:opacity-30 transition-all duration-200 group"
          aria-label="Primeira página"
        >
          <FaAngleDoubleLeft size={12} className="group-hover:-translate-x-0.5 transition-transform" />
        </button>
        <button
          onClick={() => onPageChange(Math.max(currentPage - 1, 1))}
          disabled={currentPage === 1}
          className="flex items-center justify-center w-8 h-8 rounded-full text-slate-700 hover:bg-indigo-50 disabled:opacity-30 transition-all duration-200 group"
          aria-label="Página anterior"
        >
          <FaAngleLeft size={12} className="group-hover:-translate-x-0.5 transition-transform" />
        </button>

        <div className="flex items-center space-x-1 mx-1">
          {renderPages()}
        </div>

        <button
          onClick={() => onPageChange(Math.min(currentPage + 1, totalPages))}
          disabled={currentPage === totalPages}
          className="flex items-center justify-center w-8 h-8 rounded-full text-slate-700 hover:bg-indigo-50 disabled:opacity-30 transition-all duration-200 group"
          aria-label="Próxima página"
        >
          <FaAngleRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
        </button>
        <button
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage === totalPages}
          className="flex items-center justify-center w-8 h-8 rounded-full text-slate-700 hover:bg-indigo-50 disabled:opacity-30 transition-all duration-200 group"
          aria-label="Última página"
        >
          <FaAngleDoubleRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>

      {/* Info */}
      <div className="text-xs text-slate-500 font-medium bg-slate-50 py-1 px-2 mb-2 rounded-lg">
        Mostrando <span className="text-indigo-600">{firstItem}</span> –{" "}
        <span className="text-indigo-600">{lastItem}</span> de{" "}
        <span className="text-indigo-600">{totalItems}</span>{" "}
        {totalItems === 1 ? "item" : "itens"}
      </div>
    </div>
  );
};

export default Pagination;