"use client";

import { useState } from 'react';
import { useAuth } from '@/app/context/AuthContext';
import { useRouter } from 'next/navigation';
import { FaExclamationTriangle, FaTrash } from 'react-icons/fa';
import Modal from './Modal'; // Ajuste o caminho conforme necessário
import Button from './Button'; // Ajuste o caminho conforme necessário

const DeleteAccountModal = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState('');
  const { deleteAccount, logout } = useAuth();
  const router = useRouter();

  const handleDelete = async () => {
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
        size="sm"
      >
        <div className="">
          <div className="bg-red-50 border border-red-200 rounded-lg p-2">
            <p className="text-sm text-red-700 font-medium">
              <FaExclamationTriangle className="inline mr-2" />
              Esta ação é irreversível. Todos os seus dados serão permanentemente excluídos!
            </p>
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