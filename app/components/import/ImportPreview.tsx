// app/components/import/ImportPreview.tsx - CORRIGIDO
'use client';

import { useState, useMemo } from 'react';
import { FaEye, FaEyeSlash, FaEdit, FaSave, FaTimes } from 'react-icons/fa';
import { useThemeColors } from '@/app/hook';
import { CSVTransaction } from '@/app/types/import';

interface ImportPreviewProps {
  transactions: CSVTransaction[];
  onTransactionsChange?: (transactions: CSVTransaction[]) => void;
}

// Extender o tipo para garantir que id sempre existe
interface EditableCSVTransaction extends CSVTransaction {
  id: string;
}

export default function ImportPreview({ 
  transactions, 
  onTransactionsChange 
}: ImportPreviewProps) {
  const colors = useThemeColors();
  const [showAll, setShowAll] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editedTransactions, setEditedTransactions] = useState<EditableCSVTransaction[]>([]);

  // Inicializar transações editadas com IDs únicos
  useMemo(() => {
    const transactionsWithIds: EditableCSVTransaction[] = transactions.map((transaction, index) => ({
      ...transaction,
      id: transaction.id || `temp-${index}-${Date.now()}`
    }));
    setEditedTransactions(transactionsWithIds);
  }, [transactions]);

  const displayTransactions = showAll ? editedTransactions : editedTransactions.slice(0, 10);

  const getStatusColor = (transaction: EditableCSVTransaction) => {
    return transaction.type === 'INCOME' ? 'text-green-500' : 'text-red-500';
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(amount / 100);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  // Funções de edição
  const startEditing = (transactionId: string) => {
    setEditingId(transactionId);
  };

  const cancelEditing = () => {
    setEditingId(null);
  };

  const saveEditing = () => {
    setEditingId(null);
    
    // Notificar mudanças
    if (onTransactionsChange) {
      onTransactionsChange(editedTransactions);
    }
  };

  const updateTransaction = (transactionId: string, field: keyof EditableCSVTransaction, value: any) => {
    const updated = editedTransactions.map(transaction => 
      transaction.id === transactionId 
        ? { ...transaction, [field]: value }
        : transaction
    );
    
    setEditedTransactions(updated);
  };

  const updateTransactionType = (transactionId: string, newType: 'INCOME' | 'EXPENSE') => {
    const updated = editedTransactions.map(transaction => 
      transaction.id === transactionId 
        ? { 
            ...transaction, 
            type: newType,
            amount: newType === 'INCOME' ? Math.abs(transaction.amount) : -Math.abs(transaction.amount)
          }
        : transaction
    );
    
    setEditedTransactions(updated);
  };

  const updateAmount = (transactionId: string, amountValue: string) => {
    const cleanValue = amountValue.replace(/[R$\s.]/g, '').replace(',', '.');
    const amount = Math.round(parseFloat(cleanValue) * 100);
    
    if (!isNaN(amount)) {
      const transaction = editedTransactions.find(t => t.id === transactionId);
      if (transaction) {
        const updatedAmount = transaction.type === 'INCOME' ? Math.abs(amount) : -Math.abs(amount);
        updateTransaction(transactionId, 'amount', updatedAmount);
      }
    }
  };

  const removeTransaction = (transactionId: string) => {
    const updated = editedTransactions.filter(transaction => transaction.id !== transactionId);
    setEditedTransactions(updated);
    
    if (onTransactionsChange) {
      onTransactionsChange(updated);
    }
  };

  const isEditing = (transactionId: string) => editingId === transactionId;

  return (
    <div className={`border rounded-lg ${colors.border.primary} overflow-hidden flex flex-col h-full`}>
      {/* Cabeçalho FIXO */}
      <div className={`flex items-center justify-between p-4 border-b ${colors.border.primary} ${colors.bg.secondary} flex-shrink-0`}>
        <div>
          <h3 className={`font-medium ${colors.text.primary}`}>
            Pré-visualização das Transações
          </h3>
          <p className={`text-xs ${colors.text.secondary} mt-1`}>
            Clique no ícone de edição para ajustar os valores
          </p>
        </div>
        
        <div className="flex items-center space-x-4">
          <span className={`text-sm ${colors.text.secondary}`}>
            {editedTransactions.length} transações
          </span>
          
          <button
            onClick={() => setShowAll(!showAll)}
            className={`flex items-center space-x-2 text-sm ${colors.text.primary} hover:${colors.text.secondary}`}
          >
            {showAll ? <FaEyeSlash size={14} /> : <FaEye size={14} />}
            <span>{showAll ? 'Mostrar menos' : 'Mostrar todas'}</span>
          </button>
        </div>
      </div>

      {/* Área SCROLLÁVEL da tabela */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full overflow-y-auto">
          <table className="w-full">
            <thead className={`border-b ${colors.border.primary} ${colors.bg.secondary} sticky top-0 z-10`}>
              <tr>
                <th className={`text-left p-3 text-sm font-medium ${colors.text.primary} w-24`}>
                  Data
                </th>
                <th className={`text-left p-3 text-sm font-medium ${colors.text.primary}`}>
                  Descrição
                </th>
                <th className={`text-left p-3 text-sm font-medium ${colors.text.primary} w-32`}>
                  Categoria
                </th>
                <th className={`text-right p-3 text-sm font-medium ${colors.text.primary} w-32`}>
                  Valor
                </th>
                <th className={`text-center p-3 text-sm font-medium ${colors.text.primary} w-24`}>
                  Tipo
                </th>
                <th className={`text-center p-3 text-sm font-medium ${colors.text.primary} w-20`}>
                  Ações
                </th>
              </tr>
            </thead>
            
            <tbody className={`divide-y ${colors.border.primary}`}>
              {displayTransactions.map((transaction) => (
                <tr 
                  key={transaction.id}
                  className={`hover:${colors.bg.secondary} transition-colors ${
                    isEditing(transaction.id) ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                  }`}
                >
                  {/* Data */}
                  <td className={`p-3 text-sm ${colors.text.primary}`}>
                    {isEditing(transaction.id) ? (
                      <input
                        type="date"
                        value={transaction.date}
                        onChange={(e) => updateTransaction(transaction.id, 'date', e.target.value)}
                        className={`w-full px-2 py-1 border rounded text-sm ${colors.border.primary} ${colors.bg.primary}`}
                      />
                    ) : (
                      formatDate(transaction.date)
                    )}
                  </td>
                  
                  {/* Descrição */}
                  <td className={`p-3 text-sm ${colors.text.primary}`}>
                    {isEditing(transaction.id) ? (
                      <input
                        type="text"
                        value={transaction.description}
                        onChange={(e) => updateTransaction(transaction.id, 'description', e.target.value)}
                        className={`w-full px-2 py-1 border rounded text-sm ${colors.border.primary} ${colors.bg.primary}`}
                        placeholder="Descrição da transação"
                      />
                    ) : (
                      <span className="max-w-xs truncate block">
                        {transaction.description}
                      </span>
                    )}
                  </td>
                  
                  {/* Categoria */}
                  <td className={`p-3 text-sm ${colors.text.secondary}`}>
                    {isEditing(transaction.id) ? (
                      <input
                        type="text"
                        value={transaction.categoryName || ''}
                        onChange={(e) => updateTransaction(transaction.id, 'categoryName', e.target.value)}
                        className={`w-full px-2 py-1 border rounded text-sm ${colors.border.primary} ${colors.bg.primary}`}
                        placeholder="Categoria"
                      />
                    ) : (
                      transaction.categoryName || '—'
                    )}
                  </td>
                  
                  {/* Valor */}
                  <td className={`p-3 text-sm text-right font-medium ${getStatusColor(transaction)}`}>
                    {isEditing(transaction.id) ? (
                      <input
                        type="text"
                        value={formatAmount(Math.abs(transaction.amount))}
                        onChange={(e) => updateAmount(transaction.id, e.target.value)}
                        className={`w-full px-2 py-1 border rounded text-sm text-right ${
                          transaction.type === 'INCOME' 
                            ? 'border-green-300 bg-green-50 dark:bg-green-900/20' 
                            : 'border-red-300 bg-red-50 dark:bg-red-900/20'
                        }`}
                        placeholder="R$ 0,00"
                      />
                    ) : (
                      formatAmount(transaction.amount)
                    )}
                  </td>
                  
                  {/* Tipo */}
                  <td className={`p-3 text-sm text-center`}>
                    {isEditing(transaction.id) ? (
                      <select
                        value={transaction.type}
                        onChange={(e) => updateTransactionType(transaction.id, e.target.value as 'INCOME' | 'EXPENSE')}
                        className={`w-full px-2 py-1 border rounded text-sm text-center ${
                          transaction.type === 'INCOME' 
                            ? 'border-green-300 bg-green-50 dark:bg-green-900/20' 
                            : 'border-red-300 bg-red-50 dark:bg-red-900/20'
                        }`}
                      >
                        <option value="INCOME">Receita</option>
                        <option value="EXPENSE">Despesa</option>
                      </select>
                    ) : (
                      <span className={`
                        inline-block px-2 py-1 rounded-full text-xs font-medium
                        ${transaction.type === 'INCOME' 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' 
                          : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                        }
                      `}>
                        {transaction.type === 'INCOME' ? 'Receita' : 'Despesa'}
                      </span>
                    )}
                  </td>
                  
                  {/* Ações */}
                  <td className={`p-3 text-sm text-center`}>
                    <div className="flex justify-center space-x-2">
                      {isEditing(transaction.id) ? (
                        <>
                          <button
                            onClick={saveEditing}
                            className="text-green-600 hover:text-green-800"
                            title="Salvar"
                          >
                            <FaSave size={14} />
                          </button>
                          <button
                            onClick={cancelEditing}
                            className="text-gray-600 hover:text-gray-800"
                            title="Cancelar"
                          >
                            <FaTimes size={14} />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => startEditing(transaction.id)}
                            className="text-blue-600 hover:text-blue-800"
                            title="Editar"
                          >
                            <FaEdit size={14} />
                          </button>
                          <button
                            onClick={() => removeTransaction(transaction.id)}
                            className="text-red-600 hover:text-red-800"
                            title="Remover"
                          >
                            <FaTimes size={14} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Mensagem quando não há transações */}
          {editedTransactions.length === 0 && (
            <div className={`p-8 text-center ${colors.bg.primary}`}>
              <p className={`text-sm ${colors.text.secondary}`}>
                Nenhuma transação para mostrar
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Rodapé FIXO */}
      {!showAll && editedTransactions.length > 10 && (
        <div className={`p-3 text-center border-t ${colors.border.primary} ${colors.bg.secondary} flex-shrink-0`}>
          <p className={`text-sm ${colors.text.secondary}`}>
            Mostrando 10 de {editedTransactions.length} transações
          </p>
        </div>
      )}

      {/* Resumo das edições */}
      {editedTransactions.length !== transactions.length && (
        <div className={`p-3 border-t ${colors.border.primary} ${colors.bg.secondary} flex-shrink-0`}>
          <p className={`text-sm ${colors.text.primary} text-center`}>
            ⚠️ {transactions.length - editedTransactions.length} transação(ões) removida(s)
          </p>
        </div>
      )}
    </div>
  );
}