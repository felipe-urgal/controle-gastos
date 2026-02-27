'use client';

// importing icons
import { FaCheckCircle, FaExclamationTriangle, FaInfoCircle, FaTimes } from 'react-icons/fa';

interface AlertProps {
  variant: 'success' | 'error' | 'info' | 'warning';
  message: string;
  onClose?: () => void;
};

export default function Alert({ variant, message, onClose }: AlertProps) {
  const variants = {
    success: {
      bg: 'bg-green-500/10',
      border: 'border-green-500/20',
      icon: <FaCheckCircle className="text-green-400" />,
      text: 'text-green-400'
    },
    error: {
      bg: 'bg-red-500/10',
      border: 'border-red-500/20',
      icon: <FaExclamationTriangle className="text-red-400" />,
      text: 'text-red-400'
    },
    warning: {
      bg: 'bg-yellow-500/10',
      border: 'border-yellow-500/20',
      icon: <FaExclamationTriangle className="text-yellow-400" />,
      text: 'text-yellow-400'
    },
    info: {
      bg: 'bg-blue-500/10',
      border: 'border-blue-500/20',
      icon: <FaInfoCircle className="text-blue-400" />,
      text: 'text-blue-400'
    }
  };

  const style = variants[variant];

  return (
    <div className={`flex items-center justify-between p-4 rounded-xl ${style.bg} border ${style.border}`}>
      <div className="flex items-center gap-3">
        {style.icon}
        <p className={`text-sm ${style.text}`}>{message}</p>
      </div>
      
      {onClose && (
        <button
          onClick={onClose}
          className="p-1 hover:bg-white/5 rounded-lg transition-colors"
        >
          <FaTimes size={14} className="text-slate-400" />
        </button>
      )}
    </div>
  );
};
