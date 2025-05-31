"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from 'react-toastify';
import { useAuth } from "@/app/context/AuthContext";
import { Input } from "../ui/Input";
import { Select } from "../ui/Select";
import { FormContainer } from '../ui/FormContainer';

interface AccountFormProps {
  account?: {
    id?: string;
    balance: number;
    currency: string;
    type: string;
    name: string;
  };
  isEdit?: boolean;
}

const AccountForm = ({ account, isEdit = false }: AccountFormProps) => {
  const { user } = useAuth();
  const router = useRouter();

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errors, setErrors] = useState({
    name: '',
    type: '',
    balance: '',
    currency: ''
  });

  const [form, setForm] = useState({
    balance: "",
    type: "",
    currency: "",
    name: "",
  });

  // Carrega os dados iniciais
  useEffect(() => {
    if (user?.id) {
      const fetchAccount = async () => {
        try {
          setIsLoading(true);
          
          if (isEdit && account) {
            const formatCurrencyValue = (value: number) => {
              return new Intl.NumberFormat("pt-BR", {
                style: "currency",
                currency: "BRL",
              }).format(value);
            };

            setForm({
              balance: formatCurrencyValue(account.balance),
              name: account.name,
              type: account.type,
              currency: account.currency
            });
          }
          
        } catch (error) {
          toast.error((error as Error).message);
          if (isEdit) {
            router.push(`/contas`);
          }
        } finally {
          setIsLoading(false);
        }
      };
      
      fetchAccount();
    }
  }, [user, isEdit, account, router]);

  // Validação dos campos
  const validateForm = () => {
    let valid = true;
    const newErrors = {
      name: '',
      type: '',
      balance: '',
      currency: ''
    };

    // Validação do nome
    if (!form.name.trim()) {
      newErrors.name = 'Nome da conta é obrigatório';
      valid = false;
    } else if (form.name.trim().length < 3) {
      newErrors.name = 'Nome deve ter pelo menos 3 caracteres';
      valid = false;
    } else if (form.name.trim().length > 50) {
      newErrors.name = 'Nome não pode exceder 50 caracteres';
      valid = false;
    }

    // Validação do tipo
    if (!form.type) {
      newErrors.type = 'Tipo de conta é obrigatório';
      valid = false;
    }

    // Validação do saldo
    const numericBalance = parseCurrency(form.balance);
    if (isNaN(numericBalance)) {
      newErrors.balance = 'Valor inválido';
      valid = false;
    }

    // Validação da moeda
    if (!form.currency) {
      newErrors.currency = 'Moeda é obrigatória';
      valid = false;
    }

    setErrors(newErrors);
    return valid;
  };

  // Função para formatar valores monetários
  const formatCurrency = (value: string) => {
    const numericValue = value.replace(/\D/g, "");
    const floatValue = (parseInt(numericValue || "0") / 100).toFixed(2);
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(parseFloat(floatValue));
  };

  // Função para converter valor monetário para número
  const parseCurrency = (value: string) => {
    return parseFloat(value.replace("R$", "").replace(/\./g, "").replace(",", ".")) || 0;
  };

  const handleBalanceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    const formattedValue = formatCurrency(rawValue);
    setForm(prev => ({ ...prev, balance: formattedValue }));
    setErrors(prev => ({ ...prev, balance: '' }));
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    setErrors(prev => ({ ...prev, [name]: '' }));
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

    const payload = {
      ...(isEdit && account?.id && { id: account.id }),
      userId: user.id,
      balance: parseCurrency(form.balance),
      type: form.type,
      name: form.name.trim(),
      currency: form.currency,
    };

    setIsSubmitting(true);

    try {
      const method = isEdit ? "PUT" : "POST";

      const res = await fetch("/api/account", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        toast.success(`Conta ${isEdit ? 'atualizada' : 'criada'} com sucesso!`);
        router.push(`/contas`);
      } else {
        throw new Error(await res.text());
      }
    } catch (error) {
      toast.error((error as Error).message);
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.push('/contas');
  };

  const types = [
    { id: "CHECKING", name: "Conta Corrente" },
    { id: "SAVINGS", name: "Conta Poupança" },
    { id: "INVESTMENT", name: "Investimento" },
    { id: "CASH", name: "Dinheiro Físico" },
    { id: "OTHER", name: "Outro" },
  ];
  
  const moedas = [
    { id: "BRL", name: "Real Brasileiro (R$)" },
    { id: "USD", name: "Dólar Americano (US$)" },
    { id: "EUR", name: "Euro (€)" },
    { id: "GBP", name: "Libra Esterlina (£)" },
    { id: "", name: "Outra" },
  ];

  return (
    <div className="bg-gray-800 p-6 border-b border-gray-700 mb-6">
      {isLoading ? (
        <div className="max-w-5xl mx-auto p-4 flex justify-center items-center">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <FormContainer
          isSubmitting={isSubmitting}
          isEdit={isEdit}
          handleSubmit={handleSubmit}
          onCancel={handleCancel}
          submitLabel={isEdit ? 'Atualizar' : 'Criar'}
        >
          <div className="xs:col-span-1">
            <Input
              label="Nome da Conta"
              type="text"
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="Ex: Banco X, Carteira, etc."
              loading={isLoading}
              error={errors.name}
              required
            />
          </div>

          <div className="xs:col-span-1">
            <Select
              value={form.type}
              onChange={handleChange}
              placeholder="Selecione o tipo da conta"
              label="Tipo de Conta"
              options={types}
              disabled={isLoading}
              name="type"
              error={errors.type}
              required
            />
          </div>

          <div className="xs:col-span-1">
            <Input
              label="Saldo"
              type="text"
              name="balance"
              value={form.balance}
              onChange={handleBalanceChange}
              placeholder="R$ 0,00"
              loading={isLoading}
              error={errors.balance}
            />
          </div>

          <div className="xs:col-span-1">
            <Select
              value={form.currency}
              onChange={handleChange}
              placeholder="Selecione uma moeda"
              label="Moeda"
              options={moedas}
              disabled={isLoading}
              name="currency"
              error={errors.currency}
              required
            />
          </div>
        </FormContainer>
      )}
    </div>
  )
};

export default AccountForm;