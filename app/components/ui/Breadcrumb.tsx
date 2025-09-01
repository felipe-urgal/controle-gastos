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
  FaPiggyBank,
  FaEllipsisH
} from 'react-icons/fa';
import { useState, useEffect } from "react";

type BreadcrumbProps = {
  loading?: boolean;
};

const Breadcrumb = ({ loading = false }: BreadcrumbProps) => {
  const pathname = usePathname();
  const [windowWidth, setWindowWidth] = useState(0);
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    // Atualizar a largura da janela no montagem do componente
    setWindowWidth(window.innerWidth);
    
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
      setIsCollapsed(window.innerWidth < 1024);
    };

    window.addEventListener('resize', handleResize);
    handleResize(); // Chamar imediatamente para definir o estado inicial

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Função para obter o ícone baseado no caminho
  const getSectionIcon = (section: string) => {
    switch(section) {
      case 'transacoes': return <FaDollarSign className="text-white" />;
      case 'investimentos': return <FaPiggyBank className="text-white" />;
      case 'contas': return <FaCreditCard className="text-white" />;
      case 'categorias': return <FaTag className="text-white" />;
      case 'configuracoes': return <FaCog className="text-white" />;
      case 'relatorios': return <FaChartPie className="text-white" />;
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

  // Função para obter nome abreviado para mobile
  const getShortSectionName = (section: string) => {
    switch(section) {
      case 'transacoes': return 'Trans.';
      case 'investimentos': return 'Invest.';
      case 'contas': return 'Contas';
      case 'categorias': return 'Categ.';
      case 'configuracoes': return 'Config.';
      case 'relatorios': return 'Relat.';
      default: return section.length > 20 ? `${section.substring(0, 6)}...` : section;
    }
  };

  // Função para gerar os breadcrumbs dinamicamente
  const generateBreadcrumbs = () => {
    const paths = pathname.split('/').filter(path => path);
    
    // Se estivermos na página inicial
    if (paths.length === 0 || (paths.length === 1 && paths[0] === 'dashboard')) {
      return (
        <li className="flex items-center">
          <span className="flex items-center text-gray-700">
            <FaHome className="mr-2 text-indigo-500 text-sm md:text-base" />
            <span className="font-medium text-sm md:text-base">Dashboard</span>
          </span>
        </li>
      );
    }

    const breadcrumbs: React.ReactElement[] = [];
    const totalPaths = paths.length;
    
    // Processar cada parte do caminho
    for (let i = 0; i < totalPaths; i++) {
      const path = paths[i];
      const isLast = i === totalPaths - 1;
      const href = '/' + paths.slice(0, i + 1).join('/');
      
      // Separador (adicionar antes de cada item exceto o primeiro)
      if (i > 0) {
        breadcrumbs.push(
          <li key={`separator-${i}`} className="mx-2 text-gray-500 flex items-center">
            <FaChevronRight className="text-md" />
          </li>
        );
      }

      // Em telas pequenas, colapsar breadcrumbs intermediários
      if (isCollapsed && i > 0 && i < totalPaths - 1) {
        if (i === 1) { // Mostrar apenas uma ellipsis para todos os caminhos intermediários
          breadcrumbs.push(
            <li key="ellipsis" className="mx-1 text-gray-500 flex items-center">
              <FaEllipsisH className="text-xs" />
            </li>
          );
          breadcrumbs.push(
            <li key={`separator-ellipsis`} className="mx-2 text-gray-300 flex items-center">
              <FaChevronRight className="text-xs" />
            </li>
          );
        }
        continue;
      }

      if (isLast) {
        // Último item - página atual
        let displayText = '';
        let icon: React.ReactElement | null = null;
        
        // Verificar se é uma página de edição
        if (path === 'nova') {
          displayText = `Nova ${getSectionName(paths[i - 1])}`;
          icon = <FaPlus className="text-white" />;
        } else if (!isNaN(Number(path)) && i > 0) {
          // Se for um ID (número)
          displayText = `Editar ${getSectionName(paths[i - 1])}`;
          icon = <FaEdit className="text-white" />;
        } else {
          displayText = getSectionName(path);
          icon = getSectionIcon(path);
        }

        breadcrumbs.push(
          <li key={path} className="flex items-center">
            <span className="flex items-center text-gray-800 font-medium">
              {icon && (
                <span className="bg-gradient-to-r from-blue-500 to-indigo-600 p-2 md:p-2 rounded-lg md:rounded-xl shadow-md mr-2 md:mr-4">
                  {icon}
                </span>
              )}
              <h1 className="text-lg md:text-2xl lg:text-3xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                {windowWidth <= 992 ? getShortSectionName(displayText) : displayText}
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
              className="flex items-center text-blue-400 lg:text-gray-500 hover:text-blue-900 transition-colors duration-200"
            >
              {i === 0 && getSectionIcon(path) && (
                <span className="bg-gradient-to-r from-blue-500 to-indigo-600 p-2 md:p-3 rounded-lg md:rounded-xl shadow-md mr-2 md:mr-4 hidden sm:flex">
                  {getSectionIcon(path)}
                </span>
              )}
              <span className="text-lg">
                {windowWidth <= 992 ? getShortSectionName(getSectionName(path)) : getSectionName(path)}
              </span>
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
      case 'transacoes': return windowWidth <= 992 ? 'Nova' : 'Nova Transação';
      case 'investimentos': return windowWidth <= 992 ? 'Novo' : 'Novo Investimento';
      case 'contas': return windowWidth <= 992 ? 'Nova' : 'Nova Conta';
      case 'categorias': return windowWidth <= 992 ? 'Nova' : 'Nova Categoria';
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
    <nav className="flex flex-row justify-between items-start md:items-center gap-3 md:gap-0 mb-4" aria-label="Breadcrumb">
      <ol className="flex items-center flex-wrap gap-1 md:gap-2 text-sm p-2 bg-white/80 backdrop-blur-md rounded-2xl md:w-auto">
        {generateBreadcrumbs()}
      </ol>

      {shouldShowActionButton() && (
        <Link href={getActionButtonHref()} passHref className="md:w-auto">
          <Button
            size={windowWidth <= 992 ? 'lg' : 'lg'}
            icon={<FaPlus size={14} />}
            disabled={loading}
            variant='primary'
            // className="md:w-auto justify-center"
          >
            {getActionButtonText()}
          </Button>
        </Link>
      )}
    </nav>
  );
}

export default Breadcrumb;