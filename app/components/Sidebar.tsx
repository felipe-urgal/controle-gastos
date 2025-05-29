"use client"

import Link from "next/link";
import React, { useState } from "react";
import { usePathname } from "next/navigation";
import { FiHome, FiDollarSign, FiPieChart, FiSettings, FiTag, FiCreditCard } from "react-icons/fi";
import { HiOutlineLogout, HiOutlineUser } from "react-icons/hi";
import { useAuth } from "@/app/context/AuthContext";
import Modal from "@/app/components/Modal";

interface SidebarProps {
  onClose?: () => void;
}

export default function Sidebar({ onClose }: SidebarProps) {
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

  const handleNavigation = () => {
    if (onClose) onClose();
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
      <div className="h-full bg-gray-800 text-white flex flex-col border-r border-gray-700">
        <div className="p-1 flex justify-between items-center border-b border-gray-700">
          <div
            className="flex items-center gap-2 px-4 py-3 text-sm text-gray-100"
            aria-haspopup="true"
          >
            <div className="flex items-center justify-center w-7 h-7 rounded-full bg-gray-200 text-gray-700">
              {user?.name?.charAt(0).toUpperCase() || <HiOutlineUser size={20} />}
            </div>
            <span className="mr-3">{user?.name || "Usuário"}</span>
          </div>
        </div>
        
        <nav className="flex-1 overflow-y-auto py-4">
          <ul className="space-y-2 px-4">
            {menuItems.map((item) => (
              <li key={item.href}>
                <Link 
                  href={item.href} 
                  onClick={handleNavigation}
                  className={`flex items-center px-4 py-3 rounded-lg transition-colors
                    ${pathname.includes(item.href) ? 'bg-gray-900 text-white' : 'text-gray-400 hover:bg-gray-600 hover:text-white'}`}
                >
                  <span className="mr-3">{item.icon}</span>
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="mt-auto p-4 border-t border-gray-700">
          <button
            onClick={handleLogoutClick}
            disabled={isLoggingOut}
            className="cursor-pointer w-full flex items-center px-4 py-3 rounded-lg transition-colors text-gray-300 hover:bg-gray-700 hover:text-red-500"
          >
            {isLoggingOut ? (
              <span className="animate-spin mr-3">↻</span>
            ) : (
              <HiOutlineLogout className="mr-3" size={20} />
            )}
            Sair
          </button>
        </div>
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