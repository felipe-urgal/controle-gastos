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
  FaChevronRight,
  FaPiggyBank
} from 'react-icons/fa';

type BreadcrumbProps = {
  loading?: boolean;
};

const Breadcrumb = ({ loading = false }: BreadcrumbProps) => {
  const pathname = usePathname();

  // Função para obter o ícone baseado no caminho
  const getSectionIcon = (section: string) => {
    switch(section) {
      case 'transacoes': return <FaDollarSign size={24} className="text-white" />;
      case 'investimentos': return <FaPiggyBank size={24} className="text-white" />;
      case 'contas': return <FaCreditCard size={24} className="text-white" />;
      case 'categorias': return <FaTag size={24} className="text-white" />;
      case 'configuracoes': return <FaCog size={24} className="text-white" />;
      case 'relatorios': return <FaChartPie size={24} className="text-white" />;
      default: return null;
    }
  };

  // Função para obter o nome amigável da seção
  const getSectionName = (section: string) => {
    switch(section) {
      case 'transacoes': return 'Transações';
      case 'investimentos': return 'Investimentos';
      case 'contas': return 'Contas';
      case 'categorias': return 'Categorias';
      case 'configuracoes': return 'Configurações';
      case 'relatorios': return 'Relatórios';
      default: return section;
    }
  };

  // Função para gerar os breadcrumbs dinamicamente
  const generateBreadcrumbs = () => {
    const paths = pathname.split('/').filter(path => path);
    
    // Se estivermos na página inicial
    if (paths.length === 0 || (paths.length === 1 && paths[0] === 'dashboard')) {
      return (
        <li className="flex items-cente">
          <span className="flex items-center text-gray-700">
            <FaHome size={16} className="mr-2 text-indigo-500" />
            <span className="font-medium">Dashboard</span>
          </span>
        </li>
      );
    }

    const breadcrumbs: React.ReactElement[] = [];
    
    // Processar cada parte do caminho
    for (let i = 0; i < paths.length; i++) {
      const path = paths[i];
      const isLast = i === paths.length - 1;
      const href = '/' + paths.slice(0, i + 1).join('/');
      
      // Pular "nova" e IDs para tratamento especial
      // if (path === 'nova' || !isNaN(Number(path))) continue;
      
      // Separador
      if (i > 0) {
        breadcrumbs.push(
          <li key={`separator-${i}`} className="mx-2 text-gray-300">
            <FaChevronRight size={24} />
          </li>
        );
      }

      if (paths.length > 1 && isLast) {
        // Último item - página atual
        let displayText = '';
        let icon: React.ReactElement | null = null;
        
        // Verificar se é uma página de edição
        if (path === 'nova') {
          displayText = `Nova ${getSectionName(path)}`;
          icon = <FaPlus size={24} className="text-white" />;
        } else {
          displayText = `Editar ${getSectionName(paths[i - 1])}`;
          icon = <FaEdit size={24} className="text-white" />;
        }

        breadcrumbs.push(
          <li key={path} className="flex items-center">
            <span className="flex items-center text-gray-800 font-medium">
              {icon && <span className="bg-gradient-to-r from-blue-500 to-indigo-600 p-3 rounded-xl shadow-md mr-4">{icon}</span>}
              <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                {displayText}
              </h1>
            </span>
          </li>
        );
      } else {
        // Item intermediário - com link
        breadcrumbs.push(
          <li key={path} className="flex items-center">
            <Link 
              href={href} 
              className="flex items-center text-gray-500 hover:text-indigo-600 transition-colors duration-200"
            >
              {getSectionIcon(path) && <span className="bg-gradient-to-r from-blue-500 to-indigo-600 p-3 rounded-xl shadow-md mr-4">{getSectionIcon(path)}</span>}
              <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                {getSectionName(path)}
              </h1>
            </Link>
          </li>
        );
      }
    }

    return breadcrumbs;
  };

  // Verificar se devemos mostrar o botão de ação
  const shouldShowActionButton = () => {
    const paths = pathname.split('/').filter(path => path);
    const lastPath = paths[paths.length - 1];
    const validSections = ['transacoes', 'investimentos', 'contas', 'categorias'];
    
    return validSections.includes(lastPath) && 
           paths.length === 1 && // Apenas na página principal da seção
           !pathname.includes('nova') && 
           !pathname.match(/\/[0-9]+$/);
  };

  // Obter o texto do botão com base na seção
  const getActionButtonText = () => {
    const paths = pathname.split('/').filter(path => path);
    const section = paths[0];
    
    switch(section) {
      case 'transacoes': return 'Nova Transação';
      case 'investimentos': return 'Novo Investimento';
      case 'contas': return 'Nova Conta';
      case 'categorias': return 'Nova Categoria';
      default: return 'Novo';
    }
  };

  // Obter o href do botão com base na seção
  const getActionButtonHref = () => {
    const paths = pathname.split('/').filter(path => path);
    const section = paths[0];
    return `/${section}/nova`;
  };

  return (
    <nav className="flex justify-between items-center mb-4" aria-label="Breadcrumb">
      <ol className="flex items-center space-x-2 text-sm bg-white p-2 rounded-2xl">
        {generateBreadcrumbs()}
      </ol>

      {shouldShowActionButton() && (
        <Link href={getActionButtonHref()} passHref>
          <Button
            size='lg'
            icon={<FaPlus size={14} />}
            disabled={loading}
            variant='primary'
          >
            {getActionButtonText()}
          </Button>
        </Link>
      )}
    </nav>
  );
}

export default Breadcrumb;