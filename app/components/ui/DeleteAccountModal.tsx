"use client";

import { useState } from 'react';
import { useAuth } from '@/app/context/AuthContext';
import { useRouter } from 'next/navigation';
import { FaExclamationTriangle, FaTrash, FaTimes } from 'react-icons/fa';

const DeleteAccountModal = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [confirmationText, setConfirmationText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState('');
  const { deleteAccount, logout } = useAuth();
  const router = useRouter();

  const handleDelete = async () => {
    if (confirmationText !== 'excluir minha conta') {
      setError('Por favor, digite "excluir minha conta" para confirmar');
      return;
    }

    setIsDeleting(true);
    setError('');

    try {
      const result = await deleteAccount();
      
      if (result.success) {
        await logout();
        router.push('/login');
      } else {
        setError(result.message || 'Erro ao excluir conta');
      }
    } catch (err) {
      console.error(err)
      setError('Erro ao excluir conta. Tente novamente.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center px-4 py-2 text-sm text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors duration-150"
      >
        <FaTrash className="mr-2" size={12} />
        Excluir Conta
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <FaExclamationTriangle className="text-red-500 mr-2" />
                Excluir Conta Permanentemente
              </h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <FaTimes size={18} />
              </button>
            </div>

            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-3">
                Esta ação é irreversível. Todos os seus dados serão permanentemente excluídos, incluindo:
              </p>
              <ul className="text-sm text-gray-600 list-disc list-inside space-y-1 mb-4">
                <li>Contas bancárias e cartões</li>
                <li>Transações e histórico</li>
                <li>Categorias personalizadas</li>
                <li>Relatórios e análises</li>
                <li>Configurações de usuário</li>
              </ul>
              
              <p className="text-sm text-gray-600 mb-4">
                Digite <span className="font-mono text-red-600">excluir minha conta</span> para confirmar:
              </p>
              
              <input
                type="text"
                value={confirmationText}
                onChange={(e) => setConfirmationText(e.target.value)}
                placeholder="excluir minha conta"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md text-sm">
                {error}
              </div>
            )}

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setIsOpen(false)}
                disabled={isDeleting}
                className="px-4 py-2 text-gray-700 hover:text-gray-900 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting || confirmationText !== 'excluir minha conta'}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {isDeleting ? (
                  <>Excluindo...</>
                ) : (
                  <>
                    <FaTrash className="mr-2" size={12} />
                    Excluir Conta
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default DeleteAccountModal;
