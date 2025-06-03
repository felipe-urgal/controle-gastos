import { usePathname } from "next/navigation";
import Link from "next/link";
import { FiPlus, FiHome, FiEdit, FiDollarSign, FiSettings, FiCreditCard, FiTag } from 'react-icons/fi';
import { Button } from "./ui/Button";

type BreadcrumbProps = {
  loading?: boolean;
};

const Breadcrumb = ({ loading = false }: BreadcrumbProps) => {
  const pathname = usePathname();

  return (
    <nav className="border-b border-gray-700 bg-gray-800 flex justify-between items-center" aria-label="Breadcrumb">
      <ol className="flex items-center flex-wrap gap-1 text-xs sm:text-sm px-3 py-3">
        {/* Item Início/Dashboard */}
        <li className="flex items-center">
          {pathname !== '/dashboard' ? (
            <Link 
              href="/dashboard" 
              className="flex items-center justify-center gap-1 text-blue-600 hover:text-blue-800 transition-colors"
            >
              <FiHome size={14} className="hidden sm:block flex-shrink-0" />
              <span>Dashboard</span>
            </Link>
          ) : (
            <span className="flex items-center justify-center gap-1 text-gray-600">
              <FiHome size={14} className="hidden sm:block flex-shrink-0" />
              <span>Dashboard</span>
            </span>
          )}
        </li>

        {/* Item Novo (quando aplicável) */}
        {pathname.includes('/transacoes') && (
          <>
            <li className="text-gray-400 mx-2">/</li>

            {pathname.includes('/nova') ? (
              <>
                <Link 
                  href="/transacoes" 
                  className="flex items-center justify-center gap-1 text-blue-600 hover:text-blue-800 transition-colors"
                >
                  <FiDollarSign size={14} className="hidden sm:block flex-shrink-0" />
                  <span>Transaçõess</span>
                </Link>

                <li className="text-gray-400 mx-2">/</li>

                <li aria-current="page" className="flex items-center">
                  <span className="flex items-center justify-center gap-1 text-gray-600">
                    <FiPlus size={14} className="hidden sm:block" />
                    <span>Nova Transação</span>
                  </span>
                </li>
              </>
            ) : pathname.match(/\/transacoes\/[^/]+$/) ? (
              // Rota com ID (ex: /transacoes/123)
              <>
                <Link 
                  href="/transacoes" 
                  className="flex items-center justify-center gap-1 text-blue-600 hover:text-blue-800 transition-colors"
                >
                  <FiDollarSign size={14} className="hidden sm:block flex-shrink-0" />
                  <span>Transaçõess</span>
                </Link>

                <li className="text-gray-400 mx-2">/</li>

                <li aria-current="page" className="flex items-center">
                  <span className="flex items-center justify-center gap-1 text-gray-600">
                    <FiEdit size={14} className="hidden sm:block" />
                    <span>Editar Transação</span>
                  </span>
                </li>
              </>
            ) : (
              // Rota principal (/transacoes)
              <span className="flex items-center justify-center gap-1 text-gray-600">
                <FiDollarSign size={14} className="hidden sm:block flex-shrink-0" />
                <span>Transaçõess</span>
              </span>
            )}
          </>
        )}

        {pathname.includes('/contas') && (
          <>
            <li className="text-gray-400 mx-2">/</li>

            {pathname.includes('/nova') ? (
              <>
                <Link 
                  href="/contas" 
                  className="flex items-center justify-center gap-1 text-blue-600 hover:text-blue-800 transition-colors"
                >
                  <FiCreditCard size={14} className="hidden sm:block flex-shrink-0" />
                  <span>Contas</span>
                </Link>

                <li className="text-gray-400 mx-2">/</li>

                <li aria-current="page" className="flex items-center">
                  <span className="flex items-center justify-center gap-1 text-gray-600">
                    <FiPlus size={14} className="hidden sm:block" />
                    <span>Nova Conta</span>
                  </span>
                </li>
              </>
            ) : pathname.match(/\/contas\/[^/]+$/) ? (
              // Rota com ID (ex: /contas/123)
              <>
                <Link 
                  href="/contas" 
                  className="flex items-center justify-center gap-1 text-blue-600 hover:text-blue-800 transition-colors"
                >
                  <FiCreditCard size={14} className="hidden sm:block flex-shrink-0" />
                  <span>Contas</span>
                </Link>

                <li className="text-gray-400 mx-2">/</li>

                <li aria-current="page" className="flex items-center">
                  <span className="flex items-center justify-center gap-1 text-gray-600">
                    <FiEdit size={14} className="hidden sm:block" />
                    <span>Editar Conta</span>
                  </span>
                </li>
              </>
            ) : (
              // Rota principal (/contas)
              <span className="flex items-center justify-center gap-1 text-gray-600">
                <FiCreditCard size={14} className="hidden sm:block flex-shrink-0" />
                <span>Contas</span>
              </span>
            )}
          </>
        )}

        {pathname.includes('/categorias') && (
          <>
            <li className="text-gray-400 mx-2">/</li>

            {pathname.includes('/nova') ? (
              <>
                <Link 
                  href="/categorias" 
                  className="flex items-center justify-center gap-1 text-blue-600 hover:text-blue-800 transition-colors"
                >
                  <FiTag size={14} className="hidden sm:block flex-shrink-0" />
                  <span>Categorias</span>
                </Link>

                <li className="text-gray-400 mx-2">/</li>

                <li aria-current="page" className="flex items-center">
                  <span className="flex items-center justify-center gap-1 text-gray-600">
                    <FiPlus size={14} className="hidden sm:block" />
                    <span>Nova Categoria</span>
                  </span>
                </li>
              </>
            ) : pathname.match(/\/categorias\/[^/]+$/) ? (
              <>
                <Link 
                  href="/categorias" 
                  className="flex items-center justify-center gap-1 text-blue-600 hover:text-blue-800 transition-colors"
                >
                  <FiTag size={14} className="hidden sm:block flex-shrink-0" />
                  <span>Categorias</span>
                </Link>

                <li className="text-gray-400 mx-2">/</li>

                <li aria-current="page" className="flex items-center">
                  <span className="flex items-center justify-center gap-1 text-gray-600">
                    <FiEdit size={14} className="hidden sm:block" />
                    <span>Editar Categoria</span>
                  </span>
                </li>
              </>
            ) : (
              <span className="flex items-center justify-center gap-1 text-gray-600">
                <FiTag size={14} className="hidden sm:block flex-shrink-0" />
                <span>Categorias</span>
              </span>
            )}
          </>
        )}

        {pathname === '/configuracoes' && (
          <>
            <li className="text-gray-400 mx-2">/</li>

            <li aria-current="page" className="flex items-center">
              <span className="flex items-center justify-center gap-1 text-gray-600">
                <FiSettings size={14} className="hidden sm:block" />
                <span>Configuracões</span>
              </span>
            </li>
          </>
        )}
      </ol>

      {pathname === '/transacoes' && (
        <Link href={`/transacoes/nova`} passHref>
          <Button
            icon={<FiPlus size={14} />}
            disabled={loading}
            size='sm'
            variant='link'
            className='text-gray-300 hover:border-blue-600 hover:bg-blue-600 hover:text-gray-100 border border-gray-600 mr-3'
          >
            Nova Transação
          </Button>
        </Link>
      )}

      {pathname === '/contas' && (
        <Link href={`/contas/nova`} passHref>
          <Button
            icon={<FiPlus size={14} />}
            disabled={loading}
            size='sm'
            variant='link'
            className='text-gray-300 hover:border-blue-600 hover:bg-blue-600 hover:text-gray-100 border border-gray-600 mr-3'
          >
            Nova Conta
          </Button>
        </Link>
      )}

      {pathname === '/categorias' && (
        <Link href={`/categorias/nova`} passHref>
          <Button
            icon={<FiPlus size={14} />}
            disabled={loading}
            size='sm'
            variant='link'
            className='text-gray-300 hover:border-blue-600 hover:bg-blue-600 hover:text-gray-100 border border-gray-600 mr-3'
          >
            Nova Categoria
          </Button>
        </Link>
      )}
    </nav>
  );
}

export default Breadcrumb;