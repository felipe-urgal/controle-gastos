"use client"

import Link from "next/link";
import React, { useState } from "react";
import { usePathname } from "next/navigation";
import { FiHome, FiDollarSign, FiPieChart, FiSettings, FiTag, FiCreditCard } from "react-icons/fi";
import { HiOutlineLogout, HiOutlineUser } from "react-icons/hi";
import { useAuth } from "@/app/context/AuthContext";
import Modal from "@/app/components/Modal";

interface NavbarProps {
  onMobileMenuToggle: () => void;
  mobileMenuOpen: boolean;
}

export default function Navbar({ onMobileMenuToggle, mobileMenuOpen }: NavbarProps) {
  const pathname = usePathname();
  const { logout, user } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

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
    { href: "/dashboard", icon: <FiHome size={20} />, label: "Dashboard" },
    { href: "/contas", icon: <FiCreditCard size={20} />, label: "Contas" },
    { href: "/categorias", icon: <FiTag size={20} />, label: "Categorias" },
    { href: "/transacoes", icon: <FiDollarSign size={20} />, label: "Transações" },
    { href: "/relatorios", icon: <FiPieChart size={20} />, label: "Relatórios" },
    { href: "/configuracoes", icon: <FiSettings size={20} />, label: "Configurações" },
  ];

  return (
    <>
      <div className="bg-gray-800 text-white border-b border-gray-700">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Logo/Brand */}
            <div className="flex-shrink-0">
              <span className="text-xl font-semibold">Finanças</span>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-4">
              <nav className="flex space-x-1">
                {menuItems.map((item) => (
                  <Link 
                    href={item.href} 
                    key={item.href}
                    className={`px-3 py-2 rounded-md text-sm font-medium flex items-center
                      ${pathname.includes(item.href) ? 'bg-gray-900 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'}`}
                  >
                    <span className="mr-2">{item.icon}</span>
                    {item.label}
                  </Link>
                ))}
              </nav>

              {/* User Profile and Logout */}
              <div className="ml-4 flex items-center">
                <div className="flex items-center gap-2 px-3 py-2 text-sm text-gray-100">
                  <div className="flex items-center justify-center w-7 h-7 rounded-full bg-gray-200 text-gray-700">
                    {user?.name?.charAt(0).toUpperCase() || <HiOutlineUser size={20} />}
                  </div>
                  <span className="mr-3">{user?.name || "Usuário"}</span>
                </div>
                
                <button
                  onClick={handleLogoutClick}
                  disabled={isLoggingOut}
                  className="ml-2 px-3 py-2 rounded-md text-sm font-medium text-gray-300 hover:bg-gray-700 hover:text-red-500"
                >
                  {isLoggingOut ? (
                    <span className="animate-spin">↻</span>
                  ) : (
                    <HiOutlineLogout size={20} />
                  )}
                </button>
              </div>
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden flex items-center">
              <button
                onClick={onMobileMenuToggle}
                className="text-gray-300 hover:text-white focus:outline-none"
              >
                {mobileMenuOpen ? <FiX size={24} /> : <FiMenu size={24} />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-gray-800">
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
              {menuItems.map((item) => (
                <Link 
                  href={item.href} 
                  key={item.href}
                  className={`block px-3 py-2 rounded-md text-base font-medium flex items-center
                    ${pathname.includes(item.href) ? 'bg-gray-900 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'}`}
                >
                  <span className="mr-2">{item.icon}</span>
                  {item.label}
                </Link>
              ))}
            </div>
            <div className="pt-4 pb-3 border-t border-gray-700">
              <div className="flex items-center px-5">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-200 text-gray-700">
                    {user?.name?.charAt(0).toUpperCase() || <HiOutlineUser size={24} />}
                  </div>
                </div>
                <div className="ml-3">
                  <div className="text-base font-medium text-white">{user?.name || "Usuário"}</div>
                </div>
              </div>
              <div className="mt-3 px-2 space-y-1">
                <button
                  onClick={handleLogoutClick}
                  disabled={isLoggingOut}
                  className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-gray-300 hover:bg-gray-700 hover:text-red-500"
                >
                  {isLoggingOut ? (
                    <span className="animate-spin mr-3">↻</span>
                  ) : (
                    <HiOutlineLogout className="mr-3 inline" size={20} />
                  )}
                  Sair
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

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