import React from "react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  mensagem: string;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, onConfirm, mensagem }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-[rgba(0,0,0,0.5)] z-50">
      <div className="bg-white p-6 rounded-lg shadow-lg w-100">
        <h2 className="text-lg font-semibold mb-4 text-center text-gray-500">{mensagem}</h2>
        <div className="flex justify-between">
          <button
            onClick={onConfirm}
            className="cursor-pointer bg-red-500 text-white py-2 px-4 rounded-lg hover:bg-red-600"
          >
            Confirmar
          </button>
          <button
            onClick={onClose}
            className="cursor-pointer bg-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-400"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
};

export default Modal;
