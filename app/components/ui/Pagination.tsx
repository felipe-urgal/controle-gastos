import { FaAngleDoubleLeft, FaAngleLeft, FaAngleRight, FaAngleDoubleRight } from 'react-icons/fa';

type PaginationProps = {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
};

export const Pagination = ({
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
    const pages = [];
    const maxVisiblePages = 8;
    let startPage = 1;
    let endPage = totalPages;

    if (totalPages > maxVisiblePages) {
      const half = Math.floor(maxVisiblePages / 2);
      if (currentPage <= half) {
        endPage = maxVisiblePages;
      } else if (currentPage >= totalPages - half) {
        startPage = totalPages - maxVisiblePages + 1;
      } else {
        startPage = currentPage - half;
        endPage = currentPage + half;
      }
    }

    // Botão para a primeira página e ellipsis se necessário
    if (startPage > 1) {
      pages.push(
        <button
          key={1}
          onClick={() => onPageChange(1)}
          className="px-3 py-1 rounded-md text-gray-700 hover:bg-gray-100 transition-colors"
        >
          1
        </button>
      );
      if (startPage > 2) {
        pages.push(
          <span key="start-ellipsis" className="px-2 py-1">
            ...
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
          className={`p-2 px-4 rounded-md border border-gray-600 transition-colors ${
            currentPage === i
              ? "bg-gray-500 text-gray-100"
              : "text-gray-600 hover:text-gray-100 hover:bg-gray-700 transition-colors"
          }`}
        >
          {i}
        </button>
      );
    }

    // Botão para a última página e ellipsis se necessário
    if (endPage < totalPages) {
      if (endPage < totalPages - 1) {
        pages.push(
          <span key="end-ellipsis" className="px-2 py-1">
            ...
          </span>
        );
      }
      pages.push(
        <button
          key={totalPages}
          onClick={() => onPageChange(totalPages)}
          className="p-3 rounded-md border border-gray-600 text-gray-300 hover:bg-gray-100 transition-colors"
        >
          {totalPages}
        </button>
      );
    }

    return pages;
  };

  return (
    <div className="h-19 px-6 pt-4 fixed bottom-0 left-0 right-0 lg:left-64 bg-gray-800 border-t border-gray-700 transition-all duration-300 ease-in-out z-20">
      <div className="flex flex-col sm:flex-row items-center sm:items-center justify-between w-full">
        
        {/* Informação do intervalo de itens */}
        <div className="order-1 sm:order-1 w-full sm:w-auto text-center sm:text-right">
          <p className="text-sm text-gray-500">
            Mostrando <span className="font-medium">{firstItem}</span> a{" "}
            <span className="font-medium">{lastItem}</span> de{" "}
            <span className="font-medium">{totalItems}</span> itens
          </p>
        </div>

        {/* Navegação */}
        <div className="order-2 sm:order-2 w-full sm:w-auto flex justify-center sm:justify-center">
          <div className="flex items-center space-x-2">
            {/* Versão mobile */}
            <div className="flex sm:hidden space-x-2">
              <button
                onClick={() => onPageChange(Math.max(currentPage - 1, 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 rounded-md border border-gray-600 text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-700 transition-colors"
              >
                Anterior
              </button>
              <button
                onClick={() => onPageChange(Math.min(currentPage + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 rounded-md border border-gray-600 text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-700 transition-colors"
              >
                Próxima
              </button>
            </div>

            {/* Versão desktop */}
            <div className="hidden sm:flex items-center space-x-2">
              <button
                onClick={() => onPageChange(1)}
                disabled={currentPage === 1}
                className="p-3 rounded-md border border-gray-600 text-gray-600 hover:text-gray-100 hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-700 transition-colors"
                aria-label="Primeira página"
              >
                <FaAngleDoubleLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => onPageChange(Math.max(currentPage - 1, 1))}
                disabled={currentPage === 1}
                className="p-3 rounded-md border border-gray-600 text-gray-600 hover:text-gray-100 hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-700 transition-colors"
                aria-label="Página anterior"
              >
                <FaAngleLeft className="h-4 w-4" />
              </button>

              {renderPages()}

              <button
                onClick={() => onPageChange(Math.min(currentPage + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="p-3 rounded-md border border-gray-600 text-gray-600 hover:text-gray-100 hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-700 transition-colors"
                aria-label="Próxima página"
              >
                <FaAngleRight className="h-4 w-4" />
              </button>
              <button
                onClick={() => onPageChange(totalPages)}
                disabled={currentPage === totalPages}
                className="p-3 rounded-md border border-gray-600 text-gray-600 hover:text-gray-100 hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-700 transition-colors"
                aria-label="Última página"
              >
                <FaAngleDoubleRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

  );
};