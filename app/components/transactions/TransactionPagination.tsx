// import { Button } from "../ui/Button";

// interface PaginationData {
//   currentPage: number;
//   totalPages: number;
//   totalItems: number;
//   itemsPerPage: number;
// }

type TransactionPaginationProps = {
  paginaAtual: number;
  totalPaginas: number;
  totalItens: number;
  itensPorPagina: number;
  onPageChange: (pagina: number) => void;
};

export const TransactionPagination = ({
  paginaAtual,
  totalPaginas,
  totalItens,
  itensPorPagina,
  onPageChange,
}: TransactionPaginationProps) => {
  if (totalPaginas <= 1) return null;

  const primeiroItem = (paginaAtual - 1) * itensPorPagina + 1;
  const ultimoItem = Math.min(paginaAtual * itensPorPagina, totalItens);

  const renderizarNumerosPagina = () => {
    const paginas = [];
    const maxPaginasVisiveis = 5;

    if (totalPaginas <= maxPaginasVisiveis) {
      for (let i = 1; i <= totalPaginas; i++) {
        paginas.push(i);
      }
    } else if (paginaAtual <= 3) {
      for (let i = 1; i <= maxPaginasVisiveis; i++) {
        paginas.push(i);
      }
    } else if (paginaAtual >= totalPaginas - 2) {
      for (let i = totalPaginas - maxPaginasVisiveis + 1; i <= totalPaginas; i++) {
        paginas.push(i);
      }
    } else {
      for (let i = paginaAtual - 2; i <= paginaAtual + 2; i++) {
        paginas.push(i);
      }
    }

    return paginas.map((pagina) => (
      <button
        key={pagina}
        onClick={() => onPageChange(pagina)}
        className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
          paginaAtual === pagina
            ? "z-10 bg-blue-50 border-blue-500 text-blue-600"
            : "bg-white border-gray-300 text-gray-500 hover:bg-gray-50"
        }`}
      >
        {pagina}
      </button>
    ));
  };

  return (
    <div className="px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
      {/* Versão mobile */}
      <div className="flex-1 flex justify-between sm:hidden">
        <button
          onClick={() => onPageChange(Math.max(paginaAtual - 1, 1))}
          disabled={paginaAtual === 1}
          className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
        >
          Anterior
        </button>
        <button
          onClick={() => onPageChange(Math.min(paginaAtual + 1, totalPaginas))}
          disabled={paginaAtual === totalPaginas}
          className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
        >
          Próxima
        </button>
      </div>

      {/* Versão desktop */}
      <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-gray-700">
            Mostrando <span className="font-medium">{primeiroItem}</span> a{" "}
            <span className="font-medium">{ultimoItem}</span> de{" "}
            <span className="font-medium">{totalItens}</span> resultados
          </p>
        </div>
        <div>
          <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
            <button
              onClick={() => onPageChange(1)}
              disabled={paginaAtual === 1}
              className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
            >
              <span className="sr-only">Primeira</span>
              «
            </button>
            <button
              onClick={() => onPageChange(Math.max(paginaAtual - 1, 1))}
              disabled={paginaAtual === 1}
              className="relative inline-flex items-center px-2 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
            >
              <span className="sr-only">Anterior</span>
              ‹
            </button>
            
            {renderizarNumerosPagina()}
            
            <button
              onClick={() => onPageChange(Math.min(paginaAtual + 1, totalPaginas))}
              disabled={paginaAtual === totalPaginas}
              className="relative inline-flex items-center px-2 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
            >
              <span className="sr-only">Próxima</span>
              ›
            </button>
            <button
              onClick={() => onPageChange(totalPaginas)}
              disabled={paginaAtual === totalPaginas}
              className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
            >
              <span className="sr-only">Última</span>
              »
            </button>
          </nav>
        </div>
      </div>
    </div>
  );
};