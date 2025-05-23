import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { 
  HiOutlineLogout, 
  HiOutlineHome, 
  HiOutlineCalendar, 
  HiOutlinePlusCircle, 
  HiOutlineUser, 
  HiOutlineChevronDown,
  HiOutlinePencil
} from "react-icons/hi";
import { MESES_NOME } from "@/app/utils/format";
import { useAuth } from "@/app/context/AuthContext";

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
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { logout, user } = useAuth();

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
    } finally {
      setIsLoggingOut(false);
    }
  };

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <nav className="bg-white rounded-lg shadow p-3 sm:p-4 mb-4 sm:mb-6 flex justify-between items-center" aria-label="Breadcrumb">
      <ol className="flex items-center flex-wrap gap-1 text-xs sm:text-sm">
        {/* Item Início/Dashboard */}
        <li className="flex items-center">
          {showMonthLink ? (
            <Link 
              href="/dashboard" 
              className="flex items-center gap-1 text-blue-600 hover:text-blue-800 transition-colors"
            >
              <HiOutlineHome size={18} className="hidden sm:block flex-shrink-0" />
              <span>Dashboard</span>
            </Link>
          ) : (
            <span className="flex items-center gap-1 text-gray-600">
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
                  className="flex items-center gap-1 text-blue-600 hover:text-blue-800 transition-colors"
                >
                  <HiOutlineCalendar size={16} className="hidden sm:block flex-shrink-0" />
                  <span>{MESES_NOME[mesSelecionado - 1]} {anoSelecionado}</span>
                </Link>
              ) : (
                <span className="flex items-center gap-1 text-gray-600">
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
                  className="flex items-center gap-1 text-blue-600 hover:text-blue-800 transition-colors"
                >
                  <HiOutlineCalendar size={16} className="hidden sm:block flex-shrink-0" />
                  <span>Dia {diaSelecionado}</span>
                </Link>
              ) : (
                <span className="flex items-center gap-1 text-gray-600 font-medium">
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
              <span className="flex items-center gap-1 text-gray-600 font-medium">
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
              <span className="flex items-center gap-1 text-gray-600 font-medium">
                <HiOutlinePencil size={16} className="hidden sm:block" />
                <span>Alterar</span>
              </span>
            </li>
          </>
        )}
      </ol>

      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className="flex items-center gap-2 text-sm text-gray-700 hover:text-blue-600 transition-colors"
          aria-expanded={dropdownOpen}
          aria-haspopup="true"
        >
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-200 text-gray-700">
            {user?.name?.charAt(0).toUpperCase() || <HiOutlineUser size={18} />}
          </div>
          <span className="hidden sm:inline">{user?.name || "Usuário"}</span>
          <HiOutlineChevronDown 
            size={16} 
            className={`transition-transform ${dropdownOpen ? "transform rotate-180" : ""}`} 
          />
        </button>

        {dropdownOpen && (
          <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50">
            <Link
              href="/dashboard/usuario"
              className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              onClick={() => setDropdownOpen(false)}
            >
              <HiOutlineUser className="mr-2" size={16} />
              Meu Perfil
            </Link>
            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="w-full flex items-center px-4 py-2 text-sm text-red-600 hover:bg-gray-100 disabled:opacity-50"
            >
              {isLoggingOut ? (
                <span className="animate-spin mr-2">↻</span>
              ) : (
                <HiOutlineLogout className="mr-2" size={16} />
              )}
              Sair
            </button>
          </div>
        )}
      </div>

    </nav>
  );
}

export default Breadcrumb;