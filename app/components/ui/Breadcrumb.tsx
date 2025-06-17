"use client"

// hooks
import { usePathname } from "next/navigation";

// components
import Link from "next/link";
import { Button } from "@/app/components";

// icons
import {
  FaPlus,
  FaHome,
  FaEdit,
  FaDollarSign,
  FaCog,
  FaCreditCard,
  FaTag,
  FaChartPie,
} from 'react-icons/fa';

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
              <FaHome size={14} className="hidden sm:block flex-shrink-0" />
              <span>Dashboard</span>
            </Link>
          ) : (
            <span className="flex items-center justify-center gap-1 text-gray-600">
              <FaHome size={14} className="hidden sm:block flex-shrink-0" />
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
                  <FaDollarSign size={14} className="hidden sm:block flex-shrink-0" />
                  <span>Transações</span>
                </Link>

                <li className="text-gray-400 mx-2">/</li>

                <li aria-current="page" className="flex items-center">
                  <span className="flex items-center justify-center gap-1 text-gray-600">
                    <FaPlus size={14} className="hidden sm:block" />
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
                  <FaDollarSign size={14} className="hidden sm:block flex-shrink-0" />
                  <span>Transações</span>
                </Link>

                <li className="text-gray-400 mx-2">/</li>

                <li aria-current="page" className="flex items-center">
                  <span className="flex items-center justify-center gap-1 text-gray-600">
                    <FaEdit size={14} className="hidden sm:block" />
                    <span>Editar Transação</span>
                  </span>
                </li>
              </>
            ) : (
              // Rota principal (/transacoes)
              <span className="flex items-center justify-center gap-1 text-gray-600">
                <FaDollarSign size={14} className="hidden sm:block flex-shrink-0" />
                <span>Transações</span>
              </span>
            )}
          </>
        )}

        {pathname.includes('/investimentos') && (
          <>
            <li className="text-gray-400 mx-2">/</li>

            {pathname.includes('/nova') ? (
              <>
                <Link 
                  href="/investimentos" 
                  className="flex items-center justify-center gap-1 text-blue-600 hover:text-blue-800 transition-colors"
                >
                  <FaDollarSign size={14} className="hidden sm:block flex-shrink-0" />
                  <span>Investimentos</span>
                </Link>

                <li className="text-gray-400 mx-2">/</li>

                <li aria-current="page" className="flex items-center">
                  <span className="flex items-center justify-center gap-1 text-gray-600">
                    <FaPlus size={14} className="hidden sm:block" />
                    <span>Nova Investimento</span>
                  </span>
                </li>
              </>
            ) : pathname.match(/\/investimentos\/[^/]+$/) ? (
              // Rota com ID (ex: /investimentos/123)
              <>
                <Link 
                  href="/investimentos" 
                  className="flex items-center justify-center gap-1 text-blue-600 hover:text-blue-800 transition-colors"
                >
                  <FaDollarSign size={14} className="hidden sm:block flex-shrink-0" />
                  <span>Investimentos</span>
                </Link>

                <li className="text-gray-400 mx-2">/</li>

                <li aria-current="page" className="flex items-center">
                  <span className="flex items-center justify-center gap-1 text-gray-600">
                    <FaEdit size={14} className="hidden sm:block" />
                    <span>Editar Investimento</span>
                  </span>
                </li>
              </>
            ) : (
              // Rota principal (/investimentos)
              <span className="flex items-center justify-center gap-1 text-gray-600">
                <FaDollarSign size={14} className="hidden sm:block flex-shrink-0" />
                <span>Investimentos</span>
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
                  <FaCreditCard size={14} className="hidden sm:block flex-shrink-0" />
                  <span>Contas</span>
                </Link>

                <li className="text-gray-400 mx-2">/</li>

                <li aria-current="page" className="flex items-center">
                  <span className="flex items-center justify-center gap-1 text-gray-600">
                    <FaPlus size={14} className="hidden sm:block" />
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
                  <FaCreditCard size={14} className="hidden sm:block flex-shrink-0" />
                  <span>Contas</span>
                </Link>

                <li className="text-gray-400 mx-2">/</li>

                <li aria-current="page" className="flex items-center">
                  <span className="flex items-center justify-center gap-1 text-gray-600">
                    <FaEdit size={14} className="hidden sm:block" />
                    <span>Editar Conta</span>
                  </span>
                </li>
              </>
            ) : (
              // Rota principal (/contas)
              <span className="flex items-center justify-center gap-1 text-gray-600">
                <FaCreditCard size={14} className="hidden sm:block flex-shrink-0" />
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
                  <FaTag size={14} className="hidden sm:block flex-shrink-0" />
                  <span>Categorias</span>
                </Link>

                <li className="text-gray-400 mx-2">/</li>

                <li aria-current="page" className="flex items-center">
                  <span className="flex items-center justify-center gap-1 text-gray-600">
                    <FaPlus size={14} className="hidden sm:block" />
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
                  <FaTag size={14} className="hidden sm:block flex-shrink-0" />
                  <span>Categorias</span>
                </Link>

                <li className="text-gray-400 mx-2">/</li>

                <li aria-current="page" className="flex items-center">
                  <span className="flex items-center justify-center gap-1 text-gray-600">
                    <FaEdit size={14} className="hidden sm:block" />
                    <span>Editar Categoria</span>
                  </span>
                </li>
              </>
            ) : (
              <span className="flex items-center justify-center gap-1 text-gray-600">
                <FaTag size={14} className="hidden sm:block flex-shrink-0" />
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
                <FaCog size={14} className="hidden sm:block" />
                <span>Configuracões</span>
              </span>
            </li>
          </>
        )}

        {pathname === '/relatorios' && (
          <>
            <li className="text-gray-400 mx-2">/</li>

            <li aria-current="page" className="flex items-center">
              <span className="flex items-center justify-center gap-1 text-gray-600">
                <FaChartPie size={14} className="hidden sm:block" />
                <span>Relatórios</span>
              </span>
            </li>
          </>
        )}
      </ol>

      {pathname === '/transacoes' && (
        <Link href={`/transacoes/nova`} passHref>
          <Button
            icon={<FaPlus size={14} />}
            disabled={loading}
            size='sm'
            variant='link'
            className='text-gray-300 hover:border-gray-600 hover:bg-gray-600 hover:text-gray-100 border border-gray-600 mr-3'
          >
            Nova Transação
          </Button>
        </Link>
      )}

      {pathname === '/investimentos' && (
        <Link href={`/investimentos/nova`} passHref>
          <Button
            icon={<FaPlus size={14} />}
            disabled={loading}
            size='sm'
            variant='link'
            className='text-gray-300 hover:border-gray-600 hover:bg-gray-600 hover:text-gray-100 border border-gray-600 mr-3'
          >
            Nova Investimento
          </Button>
        </Link>
      )}

      {pathname === '/contas' && (
        <Link href={`/contas/nova`} passHref>
          <Button
            icon={<FaPlus size={14} />}
            disabled={loading}
            size='sm'
            variant='link'
            className='text-gray-300 hover:border-gray-600 hover:bg-gray-600 hover:text-gray-100 border border-gray-600 mr-3'
          >
            Nova Conta
          </Button>
        </Link>
      )}

      {pathname === '/categorias' && (
        <Link href={`/categorias/nova`} passHref>
          <Button
            icon={<FaPlus size={14} />}
            disabled={loading}
            size='sm'
            variant='link'
            className='text-gray-300 hover:border-gray-600 hover:bg-gray-600 hover:text-gray-100 border border-gray-600 mr-3'
          >
            Nova Categoria
          </Button>
        </Link>
      )}
    </nav>
  );
}

export default Breadcrumb;