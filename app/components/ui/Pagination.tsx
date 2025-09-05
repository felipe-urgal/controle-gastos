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
          className="flex items-center justify-center w-9 h-9 rounded-lg text-slate-600 hover:bg-slate-100 transition-all duration-200 text-sm"
        >
          1
        </button>
      );
      if (startPage > 2) {
        pages.push(
          <span key="start-ellipsis" className="flex items-center justify-center w-9 h-9 text-slate-400">
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
          className={`group flex items-center justify-center w-9 h-9 rounded-lg transition-all duration-200 text-sm font-medium
            ${
              currentPage === i
                ? "bg-blue-500 text-white shadow-md shadow-blue-500/20"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          aria-current={currentPage === i ? "page" : undefined}
        >
          <span
            className={`transition-transform duration-200 ${
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
          <span key="end-ellipsis" className="flex items-center justify-center w-9 h-9 text-slate-400">
            <FaEllipsisH className="text-xs" />
          </span>
        );
      }
      pages.push(
        <button
          key={totalPages}
          onClick={() => onPageChange(totalPages)}
          className="flex items-center justify-center w-9 h-9 rounded-lg text-slate-600 hover:bg-slate-100 transition-all duration-200 text-sm"
        >
          {totalPages}
        </button>
      );
    }

    return pages;
  };

  return (
    <div className={`flex flex-col xs:flex-row items-center justify-between gap-3 p-2 bg-white rounded-xl shadow-sm border border-slate-200 ${className}`}>
      {/* Navegação */}
      <div className="flex items-center space-x-1">
        <button
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1}
          className="flex items-center justify-center w-9 h-9 rounded-lg text-slate-600 hover:bg-slate-100 disabled:opacity-40 transition-all"
        >
          <FaAngleDoubleLeft size={12} />
        </button>
        <button
          onClick={() => onPageChange(Math.max(currentPage - 1, 1))}
          disabled={currentPage === 1}
          className="flex items-center justify-center w-9 h-9 rounded-lg text-slate-600 hover:bg-slate-100 disabled:opacity-40 transition-all"
        >
          <FaAngleLeft size={12} />
        </button>

        {renderPages()}

        <button
          onClick={() => onPageChange(Math.min(currentPage + 1, totalPages))}
          disabled={currentPage === totalPages}
          className="flex items-center justify-center w-9 h-9 rounded-lg text-slate-600 hover:bg-slate-100 disabled:opacity-40 transition-all"
        >
          <FaAngleRight size={12} />
        </button>
        <button
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage === totalPages}
          className="flex items-center justify-center w-9 h-9 rounded-lg text-slate-600 hover:bg-slate-100 disabled:opacity-40 transition-all"
        >
          <FaAngleDoubleRight size={12} />
        </button>
      </div>

      {/* Info */}
      <div className="text-xs sm:text-sm text-slate-500 font-medium">
        Mostrando <span className="text-slate-800 font-semibold">{firstItem}</span> –{" "}
        <span className="text-slate-800 font-semibold">{lastItem}</span> de{" "}
        <span className="text-slate-800 font-semibold">{totalItems}</span>{" "}
        {totalItems === 1 ? "item" : "itens"}
      </div>
    </div>
  );
};

export default Pagination;
