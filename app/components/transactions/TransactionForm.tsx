"use client";

// Hooks
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTransactionFormData } from "@/app/hook/useTransactionFormData";

// Context
import { useAuth } from "@/app/context/AuthContext";

// Components
import { toast } from 'react-toastify';
import { FormContainer, Select, Input, Loading } from '@/app/components';
import 'react-toastify/dist/ReactToastify.css';

// Service
import { transactionService } from "@/app/services/transactionService";

// Types
import { TransactionPayload } from "@/app/types/transaction";

// Icons
import {
  FaExchangeAlt,
  FaCalendarAlt,
  FaFileAlt,
  FaCreditCard,
  FaTag,
  FaMoneyBillWave,
  FaSync, 
  FaTimes
} from 'react-icons/fa';

interface TransactionFormProps {
  transaction?: {
    id?: string;
    amount: number;
    description: string;
    categoryId: string | null;
    accountId: string | null;
    transactionDate: Date | null;
    type: string;
  };
  isEdit?: boolean;
}

const TransactionForm = ({ transaction, isEdit = false }: TransactionFormProps) => {
  const { user } = useAuth();
  const router = useRouter();
  const { categories, accounts, isLoading } = useTransactionFormData({ accountType: "CHECKING" });

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errors, setErrors] = useState({
    amount: "",
    type: "",
    description: "",
    transactionDate: "",
    categoryId: "",
    accountId: "",
  });

  const [form, setForm] = useState({
    amount: "",
    description: "",
    categoryId: "",
    accountId: "",
    transactionDate: "",
    type: "",
  });

  const [showRecurrence, setShowRecurrence] = useState(false);
  const [repeatMonths, setRepeatMonths] = useState(1);

  // Preenche o formulário se for edição
  useEffect(() => {
    if (isEdit && transaction && !isLoading) {
      const formatCurrencyValue = (value: number) => {
        return new Intl.NumberFormat("pt-BR", {
          style: "currency",
          currency: "BRL",
        }).format(value);
      };

      setForm({
        amount: formatCurrencyValue(transaction.amount),
        description: transaction.description,
        categoryId: transaction.categoryId || "",
        accountId: transaction.accountId || "",
        transactionDate: new Date(transaction.transactionDate ?? new Date()).toLocaleDateString('en-CA'),
        type: transaction.type,
      });
    }
  }, [isEdit, transaction, isLoading]);

  const formatCurrency = (value: string) => {
    const numericValue = value.replace(/\D/g, "");
    const floatValue = (parseInt(numericValue || "0") / 100).toFixed(2);
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(parseFloat(floatValue));
  };

  const parseCurrency = (value: string) => {
    return parseFloat(value.replace("R$", "").replace(/\./g, "").replace(",", ".")) || 0;
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    const formattedValue = formatCurrency(rawValue);
    setForm(prev => ({ ...prev, amount: formattedValue }));
    setErrors(prev => ({ ...prev, amount: '' }));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const validateForm = () => {
    let valid = true;
    const newErrors = {
      amount: "",
      type: "",
      description: "",
      transactionDate: "",
      categoryId: "",
      accountId: "",
    };

    if (!form.description.trim()) {
      newErrors.description = 'Descrição é obrigatória';
      valid = false;
    } else if (form.description.trim().length < 3) {
      newErrors.description = 'Descrição deve ter pelo menos 3 caracteres';
      valid = false;
    } else if (form.description.trim().length > 50) {
      newErrors.description = 'Descrição não pode exceder 50 caracteres';
      valid = false;
    }

    if (!form.transactionDate) {
      newErrors.transactionDate = 'Data é obrigatória';
      valid = false;
    }

    if (!form.type) {
      newErrors.type = 'Tipo da transação é obrigatório';
      valid = false;
    }

    if (!form.categoryId) {
      newErrors.categoryId = 'Categoria é obrigatória';
      valid = false;
    }

    if (!form.accountId) {
      newErrors.accountId = 'Conta é obrigatória';
      valid = false;
    }

    const newAmount = parseCurrency(form.amount);
    if (newAmount === 0) {
      newErrors.amount = 'Valor é obrigatório';
      valid = false;
    } else if (isNaN(newAmount)) {
      newErrors.amount = 'Valor inválido';
      valid = false;
    }

    setErrors(newErrors);
    return valid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    if (!user) {
      toast.error("Usuário não autenticado.");
      return;
    }

    let finalValue = 0;

    finalValue = parseCurrency(form.amount);

    const parts = form.transactionDate.split('-');

    const payload: TransactionPayload & { repeatMonths?: number } = {
      id: isEdit ? transaction?.id : undefined,
      amount: finalValue,
      type: isEdit && transaction ? transaction.type : form.type,
      description: form.description,
      transactionDate: new Date(
        parseInt(parts[0]),
        parseInt(parts[1]) - 1,
        parseInt(parts[2])
      ),
      userId: user.id,
      categoryId: form.categoryId || null,
      accountId: isEdit && transaction ? transaction.accountId : form.accountId || null,
    };

    // Adicionar repetição se estiver habilitada
    if (showRecurrence && repeatMonths > 1) {
      payload.repeatMonths = repeatMonths;
    }

    setIsSubmitting(true);

    try {
      if (isEdit) {
        if (!transaction) {
          throw new Error("Initial transaction data is missing");
        }
        
        await transactionService.updateTransaction(payload);
        toast.success("Transação atualizada com sucesso!");
      } else {
        await transactionService.createTransaction(payload);
        if (repeatMonths > 1) {
          toast.success(`Transação criada e repetida por ${repeatMonths} meses com sucesso!`);
        } else {
          toast.success("Transação criada com sucesso!");
        }
      }

      router.push(`/transacoes`);
    } catch (error) {
      toast.error((error as Error).message);
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  }

  const handleCancel = () => {
    router.push('/transacoes');
  };

  const types = [
    { id: "EXPENSE", name: 'Despesa' },
    { id: "INCOME", name: 'Renda' },
  ];

  if (isLoading) {
    return <Loading />
  }

  return (
    <div className="">
      <div className="">
        {/* Form Container */}
        <div className="bg-white/60 backdrop-blur-md rounded-2xl overflow-hidden">
          <div className="p-8">
            <FormContainer
              isSubmitting={isSubmitting}
              isEdit={isEdit}
              handleSubmit={handleSubmit}
              onCancel={handleCancel}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-1">
                  <Select
                    value={form.type}
                    onChange={handleChange}
                    placeholder="Selecione o tipo da transação"
                    label="Tipo da Transação"
                    options={types}
                    disabled={isLoading || isEdit || isSubmitting}
                    loading={isLoading || isSubmitting}
                    name="type"
                    error={errors.type}
                    icon={<FaExchangeAlt className="text-gray-500" />}
                    required
                  />
                </div>

                {form.type && (
                  <>
                    <div className="md:col-span-1">
                      <Input
                        type="date"
                        label="Data da Transação"
                        name="transactionDate"
                        value={form.transactionDate}
                        onChange={handleChange}
                        placeholder="Informe uma data"
                        loading={isLoading || isSubmitting}
                        error={errors.transactionDate}
                        required
                        icon={<FaCalendarAlt className="text-gray-500" />}
                      />
                    </div>

                    <div className="md:col-span-2">
                      <Input
                        type="text"
                        label="Descrição"
                        name="description"
                        value={form.description}
                        onChange={handleChange}
                        placeholder="Ex: Salário, Aluguel, etc"
                        loading={isLoading || isSubmitting}
                        error={errors.description}
                        required
                        icon={<FaFileAlt className="text-gray-500" />}
                      />
                    </div>

                    <div className="md:col-span-1">
                      <Select
                        value={form.accountId}
                        onChange={handleChange}
                        placeholder="Selecione uma conta"
                        label="Conta"
                        options={accounts}
                        disabled={isLoading || isEdit}
                        loading={isLoading || isSubmitting}
                        name="accountId"
                        error={errors.accountId}
                        icon={<FaCreditCard className="text-gray-500" />}
                        required
                      />
                    </div>

                    <div className="md:col-span-1">
                      <Select
                        value={form.categoryId}
                        onChange={handleChange}
                        placeholder="Selecione uma categoria"
                        label="Categoria"
                        options={categories}
                        disabled={isLoading}
                        loading={isLoading || isSubmitting}
                        name="categoryId"
                        error={errors.categoryId}
                        icon={<FaTag className="text-gray-500" />}
                        required
                      />
                    </div>

                    <div className="md:col-span-1">
                      <Input
                        label="Valor"
                        type="text"
                        name="amount"
                        value={form.amount}
                        onChange={handleAmountChange}
                        placeholder="R$ 0,00"
                        loading={isLoading || isSubmitting}
                        error={errors.amount}
                        icon={<FaMoneyBillWave className="text-gray-500" />}
                        required
                      />
                    </div>
                  </>
                )}

                {form.type && !isEdit && (
                  <div className="md:col-span-2">
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-xl border border-blue-200/60 shadow-sm">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center">
                          <div className="bg-blue-100 p-2 rounded-lg mr-3">
                            <FaSync className="text-blue-600 text-lg" />
                          </div>
                          <div>
                            <h3 className="text-base font-semibold text-gray-800">Repetir transação</h3>
                            <p className="text-sm text-gray-500">Configure transações recorrentes</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowRecurrence(!showRecurrence)}
                          className={`flex items-center text-sm font-medium px-4 py-2 rounded-lg transition-all duration-200 ${
                            showRecurrence
                              ? 'bg-red-100 text-red-700 hover:bg-red-200'
                              : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                          }`}
                        >
                          {showRecurrence ? (
                            <>
                              <FaTimes className="mr-1.5" /> Cancelar
                            </>
                          ) : (
                            <>
                              <FaSync className="mr-1.5" /> Configurar repetição
                            </>
                          )}
                        </button>
                      </div>

                      {showRecurrence && (
                        <div className="mt-5 p-5 bg-white rounded-xl border border-gray-200 shadow-sm">
                          <div className="mb-6">
                            <label className="block text-sm font-medium text-gray-800 mb-3">
                              Repetir por quantos meses?
                            </label>
                            
                            {/* Range Input Customizado */}
                            <div className="mb-4">
                              <input
                                type="range"
                                min="1"
                                max="24"
                                value={repeatMonths}
                                onChange={(e) => setRepeatMonths(parseInt(e.target.value))}
                                className="w-full h-2 bg-blue-100 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-600 [&::-webkit-slider-thumb]:border-0 [&::-webkit-slider-thumb]:transition-all [&::-webkit-slider-thumb]:duration-200 [&::-webkit-slider-thumb]:hover:scale-125"
                              />
                              <div className="flex justify-between text-xs text-gray-500 mt-1">
                                <span>1 mês</span>
                                <span>24 meses</span>
                              </div>
                            </div>
                            
                            {/* Display do valor selecionado */}
                            <div className="flex items-center justify-center gap-3 mb-4">
                              <div className="bg-blue-100 text-blue-700 px-4 py-2 rounded-lg">
                                <span className="text-2xl font-bold">{repeatMonths}</span>
                                <span className="text-sm font-medium ml-1">
                                  {repeatMonths === 1 ? 'mês' : 'meses'}
                                </span>
                              </div>
                            </div>
                            
                            {/* Informações adicionais */}
                            <div className="text-center">
                              <div className="text-sm text-gray-600 mb-2">
                                {repeatMonths === 1 ? (
                                  "Apenas esta transação será criada"
                                ) : (
                                  <>
                                    Serão criadas <span className="font-semibold text-blue-700">{repeatMonths} transações</span> mensais
                                  </>
                                )}
                              </div>
                              <div className="text-xs text-gray-400">
                                {repeatMonths > 1 && `Primeira transação: ${form.transactionDate || 'data atual'}`}
                              </div>
                            </div>
                          </div>
                          
                          {/* Preview das datas */}
                          {repeatMonths > 1 && (
                            <div className="border-t border-gray-100 pt-4 mt-4">
                              <p className="text-xs font-medium text-gray-700 mb-2">Próximas datas:</p>
                              <div className="flex flex-wrap gap-2">
                                {Array.from({ length: Math.min(repeatMonths, 12) }, (_, i) => {
                                  const date = new Date(form.transactionDate || new Date());
                                  date.setMonth(date.getMonth() + i);
                                  return (
                                    <span 
                                      key={i}
                                      className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-md"
                                    >
                                      {date.toLocaleDateString('pt-BR')}
                                      {i === 4 && repeatMonths > 12 && " ..."}
                                    </span>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </FormContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TransactionForm;