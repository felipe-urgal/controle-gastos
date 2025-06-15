"use client";

// Hooks
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTransactionFormData } from "@/app/hook/useTransactionFormData";

// Context
import { useAuth } from "@/app/context/AuthContext";

// Components
import { toast } from 'react-toastify';
import { FormContainer } from '../ui/FormContainer';
import { Select } from "../ui/Select";
import { Input } from "../ui/Input";
import 'react-toastify/dist/ReactToastify.css';

// Service
import { investmentService } from "@/app/services/investmentService";

// Types
import { InvestmentPayload } from "@/app/types/investment";

// Icons
import {
  FaExchangeAlt,
  FaCalendarAlt,
  FaFileAlt,
  FaCreditCard,
  FaDollarSign,
  FaHashtag,
  FaCalculator,
} from 'react-icons/fa';

// Utils
import { InvestmentType } from "@/app/utils/format";

interface InvestmentFormProps {
  investment?: {
    id?: string;
    amount: number;
    unitPrice: number;
    description: string;
    quantity: number;
    accountId: string;
    investmentDate: string;
    type: string;
    ticker: string;
  };
  isEdit?: boolean;
}

const InvestmentForm = ({ investment, isEdit = false }: InvestmentFormProps) => {
  const { user } = useAuth();
  const router = useRouter();
  const { accounts, isLoading } = useTransactionFormData({ accountType: "INVESTMENT" });
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errors, setErrors] = useState({
    amount: "",
    unitPrice: "",
    type: "",
    description: "",
    investmentDate: "",
    quantity: "",
    accountId: "",
    ticker: "",
  });

  const [form, setForm] = useState({
    amount: "",
    unitPrice: "",
    description: "",
    quantity: "1",
    accountId: "",
    investmentDate: "",
    type: "",
    ticker: "",
  });

  // Preenche o formulário se for edição
  useEffect(() => {
    if (isEdit && investment && !isLoading) {
      const formatCurrencyValue = (value: number) => {
        return new Intl.NumberFormat("pt-BR", {
          style: "currency",
          currency: "BRL",
        }).format(value);
      };

      setForm({
        amount: formatCurrencyValue(investment.amount),
        unitPrice: formatCurrencyValue(investment.unitPrice),
        description: investment.description,
        quantity: investment.quantity.toString(),
        accountId: investment.accountId || "",
        investmentDate: new Date(investment.investmentDate).toLocaleDateString('en-CA'),
        type: investment.type,
        ticker: investment.ticker,
      });
    }
  }, [isEdit, investment, isLoading]);

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

  const handleUnitPriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    const formattedValue = formatCurrency(rawValue);
    setForm(prev => ({ ...prev, unitPrice: formattedValue }));
    setErrors(prev => ({ ...prev, unitPrice: '' }));
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
      unitPrice: "",
      type: "",
      description: "",
      investmentDate: "",
      quantity: "",
      accountId: "",
      ticker: "",
    };

    if (!form.description.trim()) {
      newErrors.description = 'Descrição é obrigatório';
      valid = false;
    } else if (form.description.trim().length < 3) {
      newErrors.description = 'Descrição deve ter pelo menos 3 caracteres';
      valid = false;
    } else if (form.description.trim().length > 50) {
      newErrors.description = 'Descrição não pode exceder 50 caracteres';
      valid = false;
    }

    if (!form.investmentDate) {
      newErrors.investmentDate = 'Data é obrigatório';
      valid = false;
    }

    if (!form.type) {
      newErrors.type = 'Tipo da transação é obrigatório';
      valid = false;
    }

    if (!form.ticker) {
      newErrors.ticker = 'Código do ativo é obrigatório';
      valid = false;
    }

    if (!form.accountId) {
      newErrors.accountId = 'Conta é obrigatório';
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

    const newUnitPrice = parseCurrency(form.unitPrice);
    if (newUnitPrice === 0) {
      newErrors.unitPrice = 'Valor Unitário é obrigatório';
      valid = false;
    } else if (isNaN(newUnitPrice)) {
      newErrors.unitPrice = 'Valor Unitário inválido';
      valid = false;
    }

    if (!form.quantity.trim()) {
      newErrors.quantity = 'Quantidade é obrigatória';
      valid = false;
    }
    if (form.quantity.trim() && (0 >= Number(form.quantity))) {
      newErrors.quantity = 'Quantidade deve ser maior que 0';
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
    let numericUnitValue = 0;

    numericUnitValue = parseCurrency(form.unitPrice);
    const numericalQuantity = Number(form.quantity) || 1;
    finalValue = numericUnitValue * numericalQuantity;

    const parts = form.investmentDate.split('-');

    const payload: InvestmentPayload = {
      id: isEdit ? investment?.id : undefined,
      amount: finalValue,
      type: isEdit && investment ? investment.type : form.type,
      ticker: isEdit && investment ? investment.ticker : form.ticker,
      description: form.description,
      investmentDate: new Date(
        parseInt(parts[0]),
        parseInt(parts[1]) - 1,
        parseInt(parts[2])
      ),
      userId: user.id,
      accountId: isEdit && investment ? investment.accountId : form.accountId,
      unitPrice: isEdit && investment
          ? investment.unitPrice
          : numericUnitValue,
      quantity: isEdit && investment ? investment.quantity : Number(form.quantity),
    };

    setIsSubmitting(true);

    try {
      if (isEdit) {
        if (!investment) {
          throw new Error("Initial investment data is missing");
        }
        
        await investmentService.updateInvestment(payload);
        toast.success("Investimento atualizado com sucesso!");
      } else {
        await investmentService.createInvestment(payload);
        toast.success("Investimento criado com sucesso!");
      }

      router.push(`/investimentos`);
    } catch (error) {
      toast.error((error as Error).message);
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  }

  const calculatePrice = () => {
    const numericalQuantity = Number(form.quantity) || 1;
    const numericUnitValue = parseCurrency(form.unitPrice);
    const amount = (numericalQuantity * numericUnitValue).toFixed(2);
    form.amount = amount
    return formatCurrency(amount);
  };

  const handleCancel = () => {
    router.push('/investimentos');
  };

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto p-4 flex justify-center items-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  return (
    <div className="bg-gray-800 p-3 border-b border-gray-700">
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
        >
          <div className="xs:col-span-1">
            <Select
              value={form.type}
              onChange={handleChange}
              placeholder="Selecione o tipo"
              label="Tipo de Investimento"
              options={InvestmentType}
              disabled={isLoading || isEdit || isSubmitting}
              loading={isLoading || isSubmitting}
              name="type"
              error={errors.type}
              icon={<FaExchangeAlt />}
              required
            />
          </div>

          {form.type && (
            <>
              <div className="xs:col-span-1">
                <Input
                  type="date"
                  label="Data do Investimento"
                  name="investmentDate"
                  value={form.investmentDate}
                  onChange={handleChange}
                  loading={isLoading || isSubmitting}
                  error={errors.investmentDate}
                  required
                  icon={<FaCalendarAlt />}
                />
              </div>

              <div className="xs:col-span-1">
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
                  icon={<FaFileAlt />}
                />
              </div>

              <div className="xs:col-span-1">
                <Input
                  type="text"
                  label="Código do Ativo"
                  name="ticker"
                  value={form.ticker}
                  onChange={handleChange}
                  placeholder="Ex: Salário, Aluguel, etc"
                  loading={isLoading || isSubmitting}
                  error={errors.ticker}
                  required
                  icon={<FaFileAlt />}
                />
              </div>

              <div className="xs:col-span-1">
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
                  icon={<FaCreditCard />}
                  required
                />
              </div>

              <div className="xs:col-span-1">
                <Input
                  label="Valor Unitário"
                  type="text"
                  name="unitPrice"
                  value={form.unitPrice}
                  onChange={handleUnitPriceChange}
                  placeholder="R$ 0,00"
                  loading={isLoading || isSubmitting}
                  error={errors.unitPrice}
                  icon={<FaDollarSign />}
                  required
                />
              </div>

              <div className="xs:col-span-1">
                <Input
                  label="Quantidade"
                  type="number"
                  name="quantity"
                  value={form.quantity}
                  onChange={handleChange}
                  placeholder="1"
                  loading={isLoading || isSubmitting}
                  error={errors.quantity}
                  icon={<FaHashtag />}
                  required
                />
              </div>

              <div className="xs:col-span-1">
                <Input
                  label="Valor Total"
                  type="text"
                  value={calculatePrice()}
                  placeholder="1"
                  disabled={true}
                  loading={isLoading || isSubmitting}
                  icon={<FaCalculator />}
                />
              </div>
            </>
          )}
        </FormContainer>
      )}
    </div>
  );
};

export default InvestmentForm;