"use client"

// hooks
import React, { useState, useEffect } from "react";
import { usePathname } from "next/navigation";

// components
import Link from "next/link";
import Modal from "@/app/components/Modal";

// context
import { useAuth } from "@/app/context/AuthContext";

// icons
import {
  FaHome,
  FaDollarSign,
  FaChartPie,
  FaCog,
  FaTag,
  FaCreditCard,
  FaBars,
  FaTimes,
  FaSignOutAlt,
  FaUser,
} from "react-icons/fa";

interface NavbarProps {
  onMobileMenuToggle: () => void;
  mobileMenuOpen: boolean;
}

export default function Navbar({ onMobileMenuToggle, mobileMenuOpen }: NavbarProps) {
  const pathname = usePathname();
  const { logout, user } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [isMobileView, setIsMobileView] = useState(false);

  // Verificar tamanho da tela e scroll
  useEffect(() => {
    const handleResize = () => {
      setIsMobileView(window.innerWidth < 992);
    };

    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };

    // Verificar no carregamento inicial
    handleResize();
    handleScroll();

    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleScroll);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const handleLogoutClick = () => {
    setShowLogoutModal(true);
  };

  const handleLogoutConfirm = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
    } finally {
      setIsLoggingOut(false);
      setShowLogoutModal(false);
    }
  };

  const handleLogoutCancel = () => {
    setShowLogoutModal(false);
  };

  // Itens do menu
  const menuItems = [
    { href: "/dashboard", icon: <FaHome size={18} />, label: "Dashboard" },
    { href: "/contas", icon: <FaCreditCard size={18} />, label: "Contas" },
    { href: "/categorias", icon: <FaTag size={18} />, label: "Categorias" },
    { href: "/transacoes", icon: <FaDollarSign size={18} />, label: "Transações" },
    { href: "/investimentos", icon: <FaDollarSign size={18} />, label: "Investimentos" },
    { href: "/relatorios", icon: <FaChartPie size={18} />, label: "Relatórios" },
    { href: "/configuracoes", icon: <FaCog size={18} />, label: "Configurações" },
  ];

  return (
    <>
      <div className={`fixed w-full z-50 transition-all duration-300 ${scrolled ? 'bg-gray-800/95 backdrop-blur-sm' : 'bg-gray-900'} border-b border-gray-700`}>
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Logo/Brand - Visível apenas em desktop (>= 992px) */}
            <div className={`${isMobileView ? 'hidden' : 'flex'} items-center gap-2 px-3 py-2 text-sm text-gray-100`}>
              <div className="flex items-center justify-center w-7 h-7 rounded-full bg-gray-200 text-gray-700">
                {user?.name?.charAt(0).toUpperCase() || <FaUser size={18} />}
              </div>
              <span className="mr-3 font-medium">{user?.name || "Usuário"}</span>
            </div>

            {/* Desktop Navigation (>= 992px) */}
            <div className={`${isMobileView ? 'hidden' : 'flex'} items-center space-x-2`}>
              <nav className="flex space-x-1">
                {menuItems.map((item) => (
                  <Link 
                    href={item.href} 
                    key={item.href}
                    className={`px-3 py-2 rounded-md text-sm font-medium flex items-center transition-colors duration-200
                      ${pathname.includes(item.href) ? 'bg-gray-700 text-white' : 'text-gray-600 hover:bg-gray-700/50 hover:text-white'}`}
                  >
                    <span className="mr-2">{item.icon}</span>
                    {item.label}
                  </Link>
                ))}
              </nav>

              {/* Logout */}
              <button
                onClick={handleLogoutClick}
                disabled={isLoggingOut}
                className="ml-2 px-3 py-2 rounded-md text-sm font-medium text-gray-300 hover:bg-gray-700/50 hover:text-red-400 transition-colors duration-200"
                title="Sair"
              >
                {isLoggingOut ? (
                  <span className="animate-spin">↻</span>
                ) : (
                  <FaSignOutAlt size={18} />
                )}
              </button>
            </div>

            {/* Mobile - User info and menu button (< 992px) */}
            <div className={`${isMobileView ? 'flex' : 'hidden'} items-center justify-between w-full`}>
              <div className="flex items-center gap-2 text-sm text-gray-100">
                <div className="flex items-center justify-center w-7 h-7 rounded-full bg-gray-200 text-gray-700">
                  {user?.name?.charAt(0).toUpperCase() || <FaUser size={18} />}
                </div>
                <span className="font-medium">{user?.name || "Usuário"}</span>
              </div>
              
              <button
                onClick={onMobileMenuToggle}
                className="p-2 rounded-md text-gray-300 hover:text-white hover:bg-gray-700/50 focus:outline-none transition-colors duration-200"
                aria-label={mobileMenuOpen ? "Fechar menu" : "Abrir menu"}
              >
                {mobileMenuOpen ? <FaTimes size={24} /> : <FaBars size={24} />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation (< 992px) */}
        {mobileMenuOpen && isMobileView && (
          <div className="bg-gray-800/95 backdrop-blur-sm">
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
              {menuItems.map((item) => (
                <Link 
                  href={item.href} 
                  key={item.href}
                  onClick={onMobileMenuToggle}
                  className={`block px-3 py-3 rounded-md text-base font-medium flex items-center transition-colors duration-200
                    ${pathname === item.href ? 'bg-gray-700 text-white' : 'text-gray-300 hover:bg-gray-700/50 hover:text-white'}`}
                >
                  <span className="mr-3">{item.icon}</span>
                  {item.label}
                </Link>
              ))}
              
              <button
                onClick={handleLogoutClick}
                disabled={isLoggingOut}
                className="w-full text-left px-3 py-3 rounded-md text-base font-medium flex items-center text-gray-300 hover:bg-gray-700/50 hover:text-red-400 transition-colors duration-200"
              >
                {isLoggingOut ? (
                  <span className="animate-spin mr-3">↻</span>
                ) : (
                  <FaSignOutAlt className="mr-3" size={18} />
                )}
                Sair
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Espaço reservado para o navbar fixo */}
      <div className="h-16"></div>

      <Modal
        isOpen={showLogoutModal}
        onClose={handleLogoutCancel}
        onConfirm={handleLogoutConfirm}
        isLoading={isLoggingOut}
        mensagem="Deseja mesmo sair?"
        confirmText="Sim, sair"
        cancelText="Não, cancelar"
      />
    </>
  );
}