import { Button } from "../ui/Button";

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
        <Button
          onClick={() => onPageChange(Math.max(paginaAtual - 1, 1))}
          disabled={paginaAtual === 1}
          variant="secondary"
        >
          Anterior
        </Button>
        <Button
          onClick={() => onPageChange(Math.min(paginaAtual + 1, totalPaginas))}
          disabled={paginaAtual === totalPaginas}
          variant="secondary"
          className="ml-3"
        >
          Próxima
        </Button>
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
          <nav className="relative z-0 inline-flex rounded-md -space-x-px gap-1">
            <Button
              onClick={() => onPageChange(1)}
              disabled={paginaAtual === 1}
              variant="secondary"
              className="rounded-l-md"
              aria-label="Primeira página"
            >
              «
            </Button>
            <Button
              onClick={() => onPageChange(Math.max(paginaAtual - 1, 1))}
              disabled={paginaAtual === 1}
              variant="secondary"
              aria-label="Página anterior"
            >
              ‹
            </Button>
            {renderizarNumerosPagina()}
            <Button
              onClick={() => onPageChange(Math.min(paginaAtual + 1, totalPaginas))}
              disabled={paginaAtual === totalPaginas}
              variant="secondary"
              aria-label="Próxima página"
            >
              ›
            </Button>
            <Button
              onClick={() => onPageChange(totalPaginas)}
              disabled={paginaAtual === totalPaginas}
              variant="secondary"
              className="rounded-r-md"
              aria-label="Última página"
            >
              »
            </Button>
          </nav>
        </div>
      </div>
    </div>
  );
};