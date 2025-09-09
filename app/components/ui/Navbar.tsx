"use client";

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';
import { 
  FaBars, 
  FaTimes, 
  FaHome, 
  FaChartLine, 
  FaMoneyBillWave, 
  FaSignOutAlt,
  FaUser,
  FaCog,
  FaCreditCard,
  FaTag,
  FaDollarSign,
  FaChevronDown,
  FaPiggyBank,
  FaEye, 
  FaEyeSlash
} from 'react-icons/fa';

interface NavbarProps {
  onMobileMenuToggle: () => void;
  mobileMenuOpen: boolean;
}

const Navbar = ({ onMobileMenuToggle, mobileMenuOpen }: NavbarProps) => {
  const { user, logout, toggleShowValues } = useAuth();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  // Efeito para detectar scroll e adicionar sombra
  useEffect(() => {
    const handleScroll = () => {
      const isScrolled = window.scrollY > 10;
      setScrolled(isScrolled);
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Fechar menu ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const navigation = [
    { href: "/dashboard", icon: FaHome, label: "Dashboard" },
    { href: "/contas", icon: FaCreditCard, label: "Contas" },
    { href: "/categorias", icon: FaTag, label: "Categorias" },
    { href: "/transacoes", icon: FaDollarSign, label: "Transações" },
    { href: "/investimentos", icon: FaPiggyBank, label: "Investimentos" },
    { href: "/relatorios", icon: FaChartLine, label: "Relatórios" },
  ];

  return (
    <nav className={`sticky top-0 z-40 transition-all duration-300 ${scrolled ? 'shadow-xl' : 'shadow-md'}`}>
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6">
        <div className="flex justify-between items-center h-10">
          {/* Logo e navegação principal */}
          <div className="flex items-center">
            <Link 
              href="/dashboard" 
              className="flex-shrink-0 flex items-center group"
            >
              <div className="h-6 w-6 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center mr-2 transition-all duration-300 group-hover:scale-105 group-hover:shadow-lg group-hover:shadow-purple-500/20">
                <FaMoneyBillWave className="text-white text-sm sm:text-base" />
              </div>
              <span className="text-white font-bold text-md bg-gradient-to-r from-purple-300 to-pink-300 bg-clip-text text-transparent group-hover:from-purple-200 group-hover:to-pink-200 transition-all duration-300">
                Finanças<span className="text-pink-400">.</span>
              </span>
            </Link>
            
            <div className="hidden md:ml-8 lg:ml-10 lg:flex md:space-x-1">
              {navigation.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    className={`relative px-3 py-1 rounded-lg text-sm font-medium transition-all duration-300 flex items-center group ${isActive 
                      ? 'text-white bg-gradient-to-r from-purple-600/30 to-pink-600/30 shadow-lg shadow-purple-500/10' 
                      : 'text-gray-300 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <item.icon 
                      className={`mr-1 lg:mr-2 ${isActive ? 'text-purple-300' : 'text-gray-400 group-hover:text-purple-300'}`} 
                      size={12} 
                    />
                    <span className="hidden lg:inline">{item.label}</span>
                    {isActive && (
                      <div className="absolute inset-x-0 -bottom-2 h-0.5 bg-gradient-to-r from-purple-400 to-pink-400 rounded-t-full" />
                    )}
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Menu do usuário */}
          <div className="flex items-center">
            <button 
              onClick={toggleShowValues}
              className="p-1 rounded-lg text-white bg-gradient-to-r from-purple-600/30 to-pink-600/30 shadow-lg shadow-purple-500/10"
              title={user?.showValues ? 'Ocultar valores' : 'Mostrar valores'}
            >
              {user?.showValues ? (
                <FaEyeSlash className="w-4 h-4 text-gray-200" />
              ) : (
                <FaEye className="w-4 h-4 text-gray-200" />
              )}
            </button>

            <div className="hidden lg:flex relative ml-3" ref={userMenuRef}>
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center text-sm rounded-full transition-all duration-200 hover:opacity-90"
                aria-expanded={userMenuOpen}
                aria-haspopup="true"
              >
                <div className="h-6 w-6 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center text-white font-semibold shadow-md text-sm">
                  {user?.name?.charAt(0).toUpperCase() || <FaUser size={12} />}
                </div>
                <FaChevronDown 
                  className={`ml-1 text-gray-400 transition-transform duration-200 ${userMenuOpen ? 'rotate-180' : ''}`} 
                  size={12} 
                />
              </button>

              {userMenuOpen && (
                <div className="origin-top-right absolute right-0 -bottom-2 w-56 h-0.5 bg-gradient-to-r from-purple-400 to-pink-400 rounded-t-full" />
              )}

              {/* Dropdown do usuário - CORRIGIDO */}
              <div 
                className={`origin-top-right absolute right-0 top-full mt-2 w-48 lg:w-56 rounded-b-xl shadow-b-xl py-2 bg-gray-800/95 backdrop-blur-xl border border-white/10 transition-all duration-200 z-50 ${userMenuOpen 
                  ? 'opacity-100 translate-y-0 visible' 
                  : 'opacity-0 -translate-y-2 invisible'
                }`}
              >
                
                <div className="px-3 py-2 lg:px-4 lg:py-3 border-b border-white/10">
                  <p className="text-sm font-medium text-white truncate">{user?.name}</p>
                  <p className="text-xs text-gray-400 truncate mt-1">{user?.email}</p>
                </div>
                <div className="py-1">
                  <Link
                    href="/configuracoes"
                    className="flex items-center px-3 py-2 lg:px-4 lg:py-2 text-sm text-gray-300 hover:bg-white/10 hover:text-white transition-colors duration-150"
                    onClick={() => setUserMenuOpen(false)}
                  >
                    <FaCog className="mr-2 lg:mr-3 text-purple-300" size={12} />
                    Configurações
                  </Link>
                  <div className="border-t border-white/10 my-1"></div>
                  <button
                    onClick={() => {
                      logout();
                      setUserMenuOpen(false);
                    }}
                    className="flex items-center w-full text-left px-3 py-2 lg:px-4 lg:py-2 text-sm text-gray-300 hover:bg-white/10 hover:text-white transition-colors duration-150"
                  >
                    <FaSignOutAlt className="mr-2 lg:mr-3 text-purple-300" size={12} />
                    Sair
                  </button>
                </div>
              </div>
            </div>

            {/* Botão menu mobile */}
            <button
              onClick={onMobileMenuToggle}
              className="ml-2 sm:ml-4 lg:hidden inline-flex items-center justify-center p-1.5 sm:p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-purple-500 transition-all duration-200"
              aria-label="Toggle menu"
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? (
                <FaTimes size={18} className="sm:w-5 sm:h-5" />
              ) : (
                <FaBars size={18} className="sm:w-5 sm:h-5" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Menu mobile */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-gray-800/98 backdrop-blur-xl border-t border-white/10 shadow-xl">
          <div className="px-2 pt-2 pb-3 space-y-1">
            {navigation.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className={`flex items-center px-3 py-3 rounded-lg text-base font-medium transition-all duration-200 mx-2 ${isActive 
                    ? 'text-white bg-gradient-to-r from-purple-600/30 to-pink-600/30' 
                    : 'text-gray-300 hover:text-white hover:bg-white/5'
                  }`}
                  onClick={onMobileMenuToggle}
                >
                  <item.icon 
                    className={`mr-3 ${isActive ? 'text-purple-300' : 'text-gray-400'}`} 
                    size={16} 
                  />
                  {item.label}
                </Link>
              );
            })}
            <Link
              href="/configuracoes"
              className="block rounded-lg text-base font-medium text-gray-300 hover:text-white hover:bg-white/5 transition-colors duration-150"
              onClick={onMobileMenuToggle}
            >
              <FaCog className="mr-2 lg:mr-3 text-gray-400" size={16} />
              Configurações
            </Link>
            <button
              onClick={() => {
                logout();
                onMobileMenuToggle();
              }}
              className="block w-full text-left px-3 py-2 rounded-lg text-base font-medium text-gray-300 hover:text-white hover:bg-white/5 transition-colors duration-150"
            >
              <FaSignOutAlt className="mr-2 lg:mr-3 text-gray-400" size={16} />
              Sair
            </button>
          </div>
          <div className="">
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
