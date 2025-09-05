"use client";

import { useState } from 'react';
import { useAuth } from '@/app/context/AuthContext';
import { useRouter } from 'next/navigation';
import { FaExclamationTriangle, FaTrash } from 'react-icons/fa';
import Modal from './Modal'; // Ajuste o caminho conforme necessário
import Button from './Button'; // Ajuste o caminho conforme necessário

const DeleteAccountModal = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [confirmationText, setConfirmationText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState('');
  const { deleteAccount, logout } = useAuth();
  const router = useRouter();

  const handleDelete = async () => {
    if (confirmationText.toLowerCase() !== 'excluir minha conta') {
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
      <Button
        onClick={() => setIsOpen(true)}
        variant="danger"
        size="sm"
        icon={<FaTrash size={12} />}
        className="gap-2"
      >
        Excluir Conta
      </Button>

      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onConfirm={handleDelete}
        type="warning"
        title="Excluir Conta Permanentemente"
        isLoading={isDeleting}
        confirmText="Excluir Conta"
        cancelText="Cancelar"
        size="md"
      >
        <div className="space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-700 font-medium">
              <FaExclamationTriangle className="inline mr-2" />
              Esta ação é irreversível
            </p>
          </div>

          <p className="text-sm text-gray-600">
            Todos os seus dados serão permanentemente excluídos, incluindo:
          </p>
          
          <ul className="text-sm text-gray-600 list-disc list-inside space-y-1 pl-2">
            <li>Contas bancárias e cartões</li>
            <li>Transações e histórico</li>
            <li>Categorias personalizadas</li>
            <li>Relatórios e análises</li>
            <li>Configurações de usuário</li>
          </ul>
          
          <div className="pt-2">
            <p className="text-sm text-gray-600 mb-3">
              Digite <span className="font-mono text-red-600 font-semibold">excluir minha conta</span> para confirmar:
            </p>
            
            <input
              type="text"
              value={confirmationText}
              onChange={(e) => {
                setConfirmationText(e.target.value);
                setError('');
              }}
              placeholder="excluir minha conta"
              className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
              disabled={isDeleting}
            />
          </div>

          {error && (
            <div className="p-3 bg-red-50 text-red-700 rounded-md text-sm border border-red-200">
              {error}
            </div>
          )}
        </div>
      </Modal>
    </>
  );
};

export default DeleteAccountModal;