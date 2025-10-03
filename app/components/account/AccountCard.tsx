// app/components/AccountCard.tsx
'use client';

import { FaEye, FaEyeSlash, FaTrash } from 'react-icons/fa';
import { AccountModel } from '@/app/types/account';
import { Button, IconRenderer } from '@/app/components';
import { useThemeColors } from '@/app/hook/useThemeColors';
import { useAuth } from "@/app/context/AuthContext";

interface AccountCardProps {
  account: AccountModel;
  onEdit: (account: AccountModel) => void;
  onDelete?: (id: string) => void; // Torna opcional
  onToggleActive?: (account: AccountModel) => void; // Torna opcional
  loading?: boolean;
  clickable?: boolean;
  compact?: boolean;
}

export default function AccountCard({
  account,
  onEdit,
  onDelete,
  onToggleActive,
  loading,
  clickable = true,
  compact = false
}: AccountCardProps) {
  const { user } = useAuth();
  
  const handleClick = () => {
    if (clickable && onEdit) {
      onEdit(account);
    }
  };

  const colors = useThemeColors();

  const typeLabels: { [key: string]: string } = {
    CREDIT_DEBIT: 'Crédito/Débito',
    INVESTMENT: 'Investimento',
  };

  const formatCurrency = (amount: number, currency: string = 'BRL') => {
    if (!user?.showValues) return '*****';
    
    // Converter de centavos para reais
    const amountInReais = amount / 100;
    
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: currency
    }).format(amountInReais);
  };

  // Versão compacta para listas densas
  if (compact) {
    return (
      <div 
        className={`
          p-3 rounded-xl border-l-4 transition-all relative
          ${clickable ? 'cursor-pointer active:scale-95' : ''}
          ${account.isActive 
            ? account.type === 'CREDIT_DEBIT' 
              ? 'border-l-blue-500 bg-blue-50 dark:bg-blue-900/10' 
              : 'border-l-purple-500 bg-purple-50 dark:bg-purple-900/10'
            : 'border-l-gray-400 bg-gray-100 dark:bg-gray-800'
          }
          ${colors.state.hover}
        `}
        onClick={handleClick}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div 
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white flex-shrink-0 shadow-sm"
              style={{ backgroundColor: account.color || '#3B82F6' }}
            >
              <IconRenderer 
                iconName={account.icon || 'wallet'} 
                size={14}
              />
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className={`font-semibold truncate ${colors.text.primary}`}>
                  {account.name}
                </span>
                {!account.isActive && (
                  <span className="text-xs px-2 py-1 bg-gray-500 text-white rounded-full flex-shrink-0">
                    Inativa
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className={`text-xs px-2 py-1 rounded-full ${
                  account.type === 'CREDIT_DEBIT' 
                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300'
                    : 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300'
                }`}>
                  {typeLabels[account.type] || account.type}
                </span>
                <span className={`text-xs ${colors.text.tertiary}`}>
                  {account.currency}
                </span>
              </div>
            </div>
          </div>

          {/* Saldo e Ações compactas */}
          <div className="flex items-center gap-2 flex-shrink-0 ml-2">
            <span className={`text-sm font-semibold ${
              account.balance >= 0 
                ? 'text-green-600 dark:text-green-400' 
                : 'text-red-600 dark:text-red-400'
            }`}>
              {formatCurrency(account.balance, account.currency)}
            </span>
            
            {/* CORREÇÃO: Verifica se as funções existem */}
            {(onToggleActive || onDelete) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => { 
                  e.stopPropagation(); 
                  onToggleActive?.(account); 
                }}
                icon={account.isActive ? <FaEyeSlash size={14} /> : <FaEye size={14} />}
                className="!p-2"
                title={account.isActive ? 'Desativar' : 'Ativar'}
              />
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className={`
        p-4 rounded-2xl border-l-6 transition-all relative border-l-4
        ${clickable ? 'cursor-pointer active:scale-[0.98]' : ''}
        ${colors.state.hover} shadow-sm hover:shadow-md
      `}
      style={{ borderColor: account.color }}
      onClick={handleClick}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          {/* Ícone com cor */}
          <div 
            className="w-12 h-12 rounded-2xl flex items-center justify-center text-white flex-shrink-0 shadow-lg"
            style={{ backgroundColor: account.color || '#3B82F6' }}
          >
            <IconRenderer 
              iconName={account.icon || 'wallet'} 
              size={16}
            />
          </div>
          
          {/* Conteúdo principal */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
              <span className={`font-bold text-lg truncate ${colors.text.primary}`}>
                {account.name}
              </span>
              
              <div className="flex flex-wrap gap-2">
                {/* Badge de tipo */}
                <span
                  className={`text-sm px-3 py-1.5 rounded-full font-medium
                    ${account.type === "CREDIT_DEBIT"
                      ? `${colors.text.tertiary} ${colors.bg.tertiary}`
                      : "bg-purple-100 text-purple-800 dark:bg-purple-800/40 dark:text-purple-200"
                    }
                `}>
                  {typeLabels[account.type] || account.type}
                </span>


                {/* Badge de status */}
                {!account.isActive && (
                  <span className="text-sm px-3 py-1.5 bg-gray-500 text-white rounded-full font-medium">
                    Inativa
                  </span>
                )}
              </div>
            </div>

            {/* Descrição */}
            {account.description && (
              <p className={`text-sm leading-relaxed ${colors.text.secondary} line-clamp-2`}>
                {account.description}
              </p>
            )}

            {/* Metadados */}
            <div className="flex items-center gap-4 mt-3">
              <div className="flex items-center gap-1.5">
                <div 
                  className="w-3 h-3 rounded-full border-2 border-white shadow-sm"
                  style={{ backgroundColor: account.color || '#3B82F6' }}
                />
                <span className={`text-xs ${colors.text.tertiary}`}>
                  {account.color || '#3B82F6'}
                </span>
              </div>
              
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center">
                  <IconRenderer 
                    iconName={account.icon || 'wallet'} 
                    size={8}
                    className="text-gray-600 dark:text-gray-300"
                  />
                </div>
                <span className={`text-xs capitalize ${colors.text.tertiary}`}>
                  {account.icon?.replace('-', ' ') || 'wallet'}
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <span className={`text-xs font-medium ${colors.text.tertiary}`}>
                  {account.currency}
                </span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Lado direito - Saldo e Ações */}
        <div className="hidden sm:flex sm:flex-col sm:items-end sm:gap-3 flex-shrink-0">
          {/* Saldo */}
          <span
            className={`text-lg font-bold
              ${colors.state.hover}
              ${account.balance > 0
                ? colors.colors.income.text
                : account.balance < 0
                  ? colors.colors.expense.text
                  : colors.text.secondary
              }`}
          >
            {formatCurrency(account.balance, account.currency)}
          </span>



          {/* Ações - CORREÇÃO: Verifica se as funções existem */}
          {(onToggleActive || onDelete) && (
            <div className="flex items-center gap-1">
              {/* Botão Ativar/Desativar */}
              {onToggleActive && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    onToggleActive(account); 
                  }}
                  icon={account.isActive ? <FaEyeSlash size={16} /> : <FaEye size={16} />}
                  className={`
                    !p-2 sm:!p-3 transition-all
                    ${account.isActive 
                      ? 'text-orange-600 hover:bg-orange-100 dark:hover:bg-orange-900/30' 
                      : 'text-green-600 hover:bg-green-100 dark:hover:bg-green-900/30'
                    }
                  `}
                  title={account.isActive ? 'Desativar conta' : 'Ativar conta'}
                />
              )}
              
              {/* Botão Excluir */}
              {onDelete && (
                <Button
                  variant="danger"
                  size="sm"
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    onDelete(account.id); 
                  }}
                  disabled={loading}
                  icon={<FaTrash size={14} />}
                  className="!p-2 sm:!p-3 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30 transition-all"
                  title="Excluir conta"
                />
              )}
            </div>
          )}
        </div>
      </div>

      {/* Saldo Mobile */}
      <div className="sm:hidden flex items-center justify-between mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
        <span className={`text-base font-semibold ${
          account.balance >= 0 
            ? 'text-green-600 dark:text-green-400' 
            : 'text-red-600 dark:text-red-400'
        }`}>
          {formatCurrency(account.balance, account.currency)}
        </span>
      </div>

      {/* Ações Mobile - Barra inferior - CORREÇÃO: Verifica se as funções existem */}
      {(onToggleActive || onDelete) && (
        <div className="sm:hidden flex items-center justify-between mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
            <span>Toque para editar</span>
          </div>
          
          <div className="flex items-center gap-2">
            {onToggleActive && (
              <Button
                variant="secondary"
                size="sm"
                onClick={(e) => { 
                  e.stopPropagation(); 
                  onToggleActive(account); 
                }}
                icon={account.isActive ? <FaEyeSlash size={12} /> : <FaEye size={12} />}
                className="!p-2 text-xs"
                title={account.isActive ? 'Desativar' : 'Ativar'}
              >
                {account.isActive ? 'Desativar' : 'Ativar'}
              </Button>
            )}
            
            {onDelete && (
              <Button
                variant="danger"
                size="sm"
                onClick={(e) => { 
                  e.stopPropagation(); 
                  onDelete(account.id); 
                }}
                disabled={loading}
                icon={<FaTrash size={12} />}
                className="!p-2 text-xs"
                title="Excluir"
              >
                Excluir
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Efeito de loading */}
      {loading && (
        <div className="absolute inset-0 bg-white/50 dark:bg-gray-900/50 rounded-2xl flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}
    </div>
  );
}
