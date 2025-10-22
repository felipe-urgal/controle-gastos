// app/components/import/BankSelector.tsx
'use client';

import { FaUniversity, FaCreditCard, FaPiggyBank } from 'react-icons/fa';

import { useThemeColors } from '@/app/hook';

import { BankFormat } from '@/app/types/import';

interface BankSelectorProps {
  onBankSelect: (bank: BankFormat) => void;
  selectedBank: BankFormat | null;
}

const bankOptions = [
  {
    id: BankFormat.NUBANK,
    name: 'NuBank',
    description: 'Extraído pelo site ou app',
    color: 'bg-purple-500',
    icon: FaCreditCard
  },
  {
    id: BankFormat.ITAU,
    name: 'Itaú',
    description: 'Extrato em CSV',
    color: 'bg-orange-500',
    icon: FaUniversity
  },
  {
    id: BankFormat.BRADESCO,
    name: 'Bradesco',
    description: 'Extrato em CSV',
    color: 'bg-red-500',
    icon: FaUniversity
  },
  {
    id: BankFormat.SANTANDER,
    name: 'Santander',
    description: 'Extrato em CSV',
    color: 'bg-red-600',
    icon: FaUniversity
  },
  {
    id: BankFormat.GENERIC,
    name: 'Outro/Genérico',
    description: 'Formato personalizado',
    color: 'bg-gray-500',
    icon: FaPiggyBank
  }
];

export default function BankSelector({ onBankSelect, selectedBank }: BankSelectorProps) {
  const colors = useThemeColors();

  const handleBankSelect = (bank: BankFormat) => {
    onBankSelect(bank);
  };

  return (
    <div className="space-y-4">
      <h4 className={`text-sm font-medium ${colors.text.primary}`}>
        Selecione o banco ou formato:
      </h4>
      
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {bankOptions.map((bank) => {
          const Icon = bank.icon;
          const isSelected = selectedBank === bank.id;
          
          return (
            <button
              key={bank.id}
              onClick={() => handleBankSelect(bank.id)}
              className={`
                flex flex-col items-center p-4 rounded-lg border-2 transition-all duration-200
                ${isSelected 
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                  : `${colors.border.primary} ${colors.bg.secondary} hover:border-blue-300`
                }
              `}
            >
              <div className={`
                w-12 h-12 rounded-full flex items-center justify-center text-white mb-2
                ${bank.color}
              `}>
                <Icon size={20} />
              </div>
              
              <span className={`text-sm font-medium text-center ${colors.text.primary}`}>
                {bank.name}
              </span>
              
              <span className={`text-xs text-center mt-1 ${colors.text.tertiary}`}>
                {bank.description}
              </span>
              
              {isSelected && (
                <div className="mt-2 w-3 h-3 bg-blue-500 rounded-full" />
              )}
            </button>
          );
        })}
      </div>

      {selectedBank && (
        <div className={`p-3 rounded-lg ${colors.bg.secondary} border ${colors.border.primary}`}>
          <p className={`text-sm ${colors.text.primary}`}>
            <strong>Formato selecionado:</strong> {
              bankOptions.find(b => b.id === selectedBank)?.name
            }
          </p>
          <p className={`text-xs mt-1 ${colors.text.secondary}`}>
            O mapeamento automático foi aplicado. Você pode ajustar manualmente se necessário.
          </p>
        </div>
      )}
    </div>
  );
}