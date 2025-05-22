import React from "react";
import Link from "next/link";
import { HiOutlineLogout, HiOutlineHome, HiOutlineCalendar, HiOutlinePencil, HiOutlinePlusCircle } from "react-icons/hi";
import { MESES_NOME } from "@/app/utils/format";
import { useAuth } from "@/app/context/AuthContext";
import { useState } from "react";

interface BreadcrumbProps {
  anoSelecionado?: number;
  mesSelecionado?: number;
  diaSelecionado?: number;
  showMonthLink?: boolean;
  showMonthLink2?: boolean;
  newLink?: boolean;
  editLink?: boolean;
}

function Breadcrumb({ 
  anoSelecionado, 
  mesSelecionado, 
  diaSelecionado, 
  showMonthLink = false, 
  showMonthLink2 = false, 
  newLink = false, 
  editLink = false 
}: BreadcrumbProps) {
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const { logout } = useAuth();

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <nav className="bg-white rounded-lg shadow p-3 sm:p-4 mb-4 sm:mb-6 flex justify-between items-center" aria-label="Breadcrumb">
      <ol className="flex items-center flex-wrap gap-1 sm:gap-2 text-xs sm:text-sm">
        {/* Item Início/Dashboard */}
        <li className="flex items-center">
          {showMonthLink ? (
            <Link 
              href="/dashboard" 
              className="flex items-center gap-1 sm:gap-2 text-blue-600 hover:text-blue-800 transition-colors"
            >
              <HiOutlineHome size={18} className="hidden sm:block flex-shrink-0" />
              <span>Dashboard</span>
            </Link>
          ) : (
            <span className="flex items-center gap-1 sm:gap-2 text-gray-600">
              <HiOutlineHome size={18} className="hidden sm:block flex-shrink-0" />
              <span>Dashboard</span>
            </span>
          )}
        </li>
        
        {mesSelecionado && anoSelecionado && (
          <>
            {/* Separador */}
            <li className="text-gray-400">/</li>
            
            {/* Item Mês/Ano */}
            <li className="flex items-center">
              {showMonthLink2 ? (
                <Link 
                  href={`/dashboard/${anoSelecionado}/${mesSelecionado}`}
                  className="flex items-center gap-1 sm:gap-2 text-blue-600 hover:text-blue-800 transition-colors"
                >
                  <HiOutlineCalendar size={16} className="hidden sm:block flex-shrink-0" />
                  <span>{MESES_NOME[mesSelecionado - 1]} {anoSelecionado}</span>
                </Link>
              ) : (
                <span className="flex items-center gap-1 sm:gap-2 text-gray-600">
                  <HiOutlineCalendar size={16} className="hidden sm:block flex-shrink-0" />
                  <span>{MESES_NOME[mesSelecionado - 1]} {anoSelecionado}</span>
                </span>
              )}
            </li>
          </>
        )}
        
        {/* Item Dia (quando aplicável) */}
        {diaSelecionado && anoSelecionado && mesSelecionado && (
          <>
            <li className="text-gray-400">/</li>

            <li aria-current="page" className="flex items-center">
              {newLink || editLink ? (
                <Link 
                  href={`/dashboard/${anoSelecionado}/${mesSelecionado}/${diaSelecionado}`}
                  className="flex items-center gap-1 sm:gap-2 text-blue-600 hover:text-blue-800 transition-colors"
                >
                  <HiOutlineCalendar size={16} className="hidden sm:block flex-shrink-0" />
                  <span>Dia {diaSelecionado}</span>
                </Link>
              ) : (
                <span className="flex items-center gap-1 sm:gap-2 text-gray-600 font-medium">
                  <HiOutlineCalendar size={16} className="hidden sm:block flex-shrink-0" />
                  <span>Dia {diaSelecionado}</span>
                </span>
              )}
            </li>
          </>
        )}

        {/* Item Novo (quando aplicável) */}
        {newLink && (
          <>
            <li className="text-gray-400">/</li>

            <li aria-current="page" className="flex items-center">
              <span className="flex items-center gap-1 sm:gap-2 text-gray-600 font-medium">
                <HiOutlinePlusCircle size={16} className="hidden sm:block" />
                <span>Adicionar</span>
              </span>
            </li>
          </>
        )}

        {/* Item Editar (quando aplicável) */}
        {editLink && (
          <>
            <li className="text-gray-400">/</li>

            <li aria-current="page" className="flex items-center">
              <span className="flex items-center gap-1 sm:gap-2 text-gray-600 font-medium">
                <HiOutlinePencil size={16} className="hidden sm:block" />
                <span>Alterar</span>
              </span>
            </li>
          </>
        )}
      </ol>

      <button
        onClick={handleLogout}
        disabled={isLoggingOut}
        className="cursor-pointer flex items-center gap-1 sm:gap-2 text-xs sm:text-sm text-red-600 hover:text-red-800 transition-colors disabled:opacity-50"
      >
        {isLoggingOut ? (
          <span className="animate-spin">↻</span>
        ) : (
          <HiOutlineLogout size={18} className="hidden sm:block" />
        )}
        <span className="sm:hidden">Sair</span>
        <span className="hidden sm:inline">Sair</span>
      </button>
    </nav>
  );
}

export default Breadcrumb;