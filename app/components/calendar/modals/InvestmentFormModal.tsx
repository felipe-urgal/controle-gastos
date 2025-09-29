"use client";

import { useTheme } from "@/app/context/ThemeContext";
import { HiX, HiCheck } from "react-icons/hi";
import { InvestmentFormModalProps } from "@/app/types/calendar";
import { Input, Select, Button } from "@/app/components";
import { useState, useEffect } from "react";

export default function InvestmentFormModal({
  isOpen,
  onClose,
  formData,
  setFormData,
  editingInvestment,
  isSubmitting,
  accounts,
  onSubmit,
}: InvestmentFormModalProps) {
  const { resolvedTheme } = useTheme();
  const [localFormData, setLocalFormData] = useState({
    amount: "",
    quantity: "",
    unitPrice: "",
    ticker: formData.ticker || "",
    type: formData.type || "BUY",
    description: formData.description || "",
    accountId: formData.accountId || "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Sincronizar com o formData externo quando mudar
  useEffect(() => {
    setLocalFormData({
      amount: formatCurrency(formData.amount || 0),
      quantity: formatNumberForInput(formData.quantity || 0),
      unitPrice: formatCurrency(formData.unitPrice || 0),
      ticker: formData.ticker || "",
      type: formData.type || "BUY",
      description: formData.description || "",
      accountId: formData.accountId || "",
    });
  }, [formData]);

  const colors = {
    bg: resolvedTheme === "dark" ? "bg-gray-900" : "bg-white",
    text: resolvedTheme === "dark" ? "text-gray-100" : "text-gray-800",
    textSecondary: resolvedTheme === "dark" ? "text-gray-300" : "text-gray-600",
  };

  // Formatar número para input (quantidade - sem R$, apenas números e vírgula)
  const formatNumberForInput = (value: number): string => {
    if (!value && value !== 0) return "";
    return new Intl.NumberFormat("pt-BR")
      .format(value)
      .replace(/[^\d,]/g, "");
  };

  // Formatar para moeda BRL (com R$)
  const formatCurrency = (value: number): string => {
    if (!value && value !== 0) return "";
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 2,
    }).format(value || 0);
  };

  // Parse da string digitada -> número (para valores monetários)
  const parseCurrency = (value: string): number => {
    if (!value) return 0;
    // Remove R$ e formatação, converte para número
    return parseFloat(value.replace("R$", "").replace(/\./g, "").replace(",", ".")) || 0;
  };

  // Parse da string digitada -> número (para quantidade)
  const parseInputToNumber = (value: string): number => {
    if (!value) return 0;
    const cleaned = value.replace(/[^\d,]/g, "").replace(",", ".");
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
  };

  // Formatar valor digitado para moeda
  const formatCurrencyInput = (value: string): string => {
    const numericValue = value.replace(/\D/g, "");
    const floatValue = (parseInt(numericValue || "0") / 100).toFixed(2);
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(parseFloat(floatValue));
  };

  // Validar formulário
  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    // Validar tipo
    if (!localFormData.type) {
      newErrors.type = 'Tipo do investimento é obrigatório';
    }

    // Validar valor total
    if (!localFormData.amount || localFormData.amount === 'R$ 0,00') {
      newErrors.amount = 'Valor total é obrigatório';
    } else {
      const amountValue = parseCurrency(localFormData.amount);
      if (amountValue <= 0) {
        newErrors.amount = 'Valor total deve ser maior que zero';
      } else if (amountValue > 10000000) {
        newErrors.amount = 'Valor total não pode ser maior que R$ 10.000.000,00';
      }
    }

    // Validar descrição
    if (!localFormData.description?.trim()) {
      newErrors.description = 'Descrição é obrigatória';
    } else if (localFormData.description.trim().length < 3) {
      newErrors.description = 'Descrição deve ter pelo menos 3 caracteres';
    } else if (localFormData.description.trim().length > 100) {
      newErrors.description = 'Descrição não pode exceder 100 caracteres';
    }

    // Validar conta
    if (!localFormData.accountId) {
      newErrors.accountId = 'Conta é obrigatória';
    }

    // Validações específicas para compra/venda
    if (localFormData.type !== "DIVIDEND") {
      // Validar quantidade
      const quantityValue = parseInputToNumber(localFormData.quantity);
      if (!localFormData.quantity || quantityValue === 0) {
        newErrors.quantity = 'Quantidade é obrigatória para compra/venda';
      } else if (quantityValue < 0) {
        newErrors.quantity = 'Quantidade não pode ser negativa';
      } else if (quantityValue > 1000000) {
        newErrors.quantity = 'Quantidade não pode ser maior que 1.000.000';
      }

      // Validar preço unitário
      const unitPriceValue = parseCurrency(localFormData.unitPrice);
      if (!localFormData.unitPrice || unitPriceValue === 0) {
        newErrors.unitPrice = 'Preço unitário é obrigatório para compra/venda';
      } else if (unitPriceValue <= 0) {
        newErrors.unitPrice = 'Preço unitário deve ser maior que zero';
      } else if (unitPriceValue > 100000) {
        newErrors.unitPrice = 'Preço unitário não pode ser maior que R$ 100.000,00';
      }

      // Validar cálculo (se quantidade e preço unitário não batem com valor total)
      if (quantityValue > 0 && unitPriceValue > 0) {
        const calculatedTotal = quantityValue * unitPriceValue;
        const enteredTotal = parseCurrency(localFormData.amount);
        const difference = Math.abs(calculatedTotal - enteredTotal);
        
        if (difference > 0.01) { // Tolerância de 1 centavo
          newErrors.amount = `Valor total não corresponde ao cálculo (${formatCurrency(calculatedTotal)})`;
        }
      }
    }

    // Validar ticker (opcional, mas com regras se preenchido)
    if (localFormData.ticker && localFormData.ticker.length > 20) {
      newErrors.ticker = 'Ticker não pode exceder 20 caracteres';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handler para campos monetários (amount e unitPrice)
  const handleCurrencyChange = (field: 'amount' | 'unitPrice', value: string) => {
    const formattedValue = formatCurrencyInput(value);
    setLocalFormData(prev => ({ ...prev, [field]: formattedValue }));
    
    // Converter para número e atualizar formData externo
    const numericValue = parseCurrency(formattedValue);
    setFormData(prev => ({ ...prev, [field]: numericValue }));
    
    // Limpar erro do campo
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
    if (field === 'unitPrice' && errors.amount) {
      setErrors(prev => ({ ...prev, amount: '' }));
    }
  };

  // Handler para quantidade
  const handleQuantityChange = (value: string) => {
    const formattedValue = formatNumberForInput(parseInputToNumber(value));
    setLocalFormData(prev => ({ ...prev, quantity: formattedValue }));
    
    const numericValue = parseInputToNumber(value);
    setFormData(prev => ({ ...prev, quantity: numericValue }));
    
    // Limpar erro do campo
    if (errors.quantity) {
      setErrors(prev => ({ ...prev, quantity: '' }));
    }
    if (errors.amount) {
      setErrors(prev => ({ ...prev, amount: '' }));
    }
  };

  // Handler para outros campos
  const handleFieldChange = (field: keyof typeof localFormData, value: string | number) => {
    setLocalFormData(prev => ({ ...prev, [field]: value }));
    
    if (field === 'ticker' || field === 'description' || field === 'accountId') {
      setFormData(prev => ({ ...prev, [field]: value }));
    } else if (field === 'type') {
      setFormData(prev => ({ ...prev, type: value as any }));
      // Limpar erros específicos do tipo anterior
      setErrors(prev => ({
        ...prev,
        quantity: '',
        unitPrice: '',
        amount: ''
      }));
    }
    
    // Limpar erro do campo
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  // Calcular total automaticamente
  const calculateTotal = () => {
    const quantity = parseInputToNumber(localFormData.quantity);
    const unitPrice = parseCurrency(localFormData.unitPrice);
    
    if (quantity && unitPrice) {
      const total = quantity * unitPrice;
      const totalFormatted = formatCurrency(total);
      
      setLocalFormData(prev => ({ ...prev, amount: totalFormatted }));
      setFormData(prev => ({ ...prev, amount: total }));
      
      // Limpar erro de cálculo
      if (errors.amount?.includes('não corresponde')) {
        setErrors(prev => ({ ...prev, amount: '' }));
      }
    }
  };

  // Display do cálculo
  const getCalculationDisplay = () => {
    const quantity = parseInputToNumber(localFormData.quantity);
    const unitPrice = parseCurrency(localFormData.unitPrice);
    
    if (!quantity || !unitPrice) return null;
    
    const total = quantity * unitPrice;
    return `${formatNumberForInput(quantity)} × ${formatCurrency(unitPrice)} = ${formatCurrency(total)}`;
  };

  // Handle do submit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      // Scroll para o primeiro erro
      const firstErrorField = Object.keys(errors)[0];
      const errorElement = document.querySelector(`[data-field="${firstErrorField}"]`);
      errorElement?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    
    // Garantir que todos os valores estão sincronizados
    // const finalFormData = {
    //   ...formData,
    //   amount: parseCurrency(localFormData.amount),
    //   quantity: parseInputToNumber(localFormData.quantity),
    //   unitPrice: parseCurrency(localFormData.unitPrice),
    // };
    
    // Chamar o onSubmit
    onSubmit(e as any);
  };

  if (!isOpen) return null;

  const investmentTypeOptions = [
    { value: "BUY", label: "Compra" },
    { value: "SELL", label: "Venda" },
    { value: "DIVIDEND", label: "Dividendo" },
  ];

  const accountOptions = [
    { value: "", label: "Selecione uma conta" },
    ...accounts.map((account) => ({
      value: account.id,
      label: account.name,
    }))
  ];

  const handleClose = () => {
    onClose()
    setErrors({})
  }
  
  return (
    <div className="fixed inset-0 bg-opacity-50 flex items-center justify-center z-50 px-2 py-3">
      <div
        className={`${colors.bg} rounded-3xl shadow-xl w-full h-full sm:max-w-6xl max-h-[90vh] p-4 overflow-y-auto`}
      >
        <div className="flex justify-between items-center mb-4">
          <h4 className={`text-lg font-bold ${colors.text}`}>
            {editingInvestment ? "Editar Investimento" : "Novo Investimento"}
          </h4>
          <Button
            onClick={handleClose}
            variant="secondary"
            size="sm"
            icon={<HiX className="w-4 h-4" />}
            className="rounded-full !p-2"
            title="Fechar"
            disabled={isSubmitting}
          />
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Tipo */}
          <div data-field="type">
            <Select
              options={investmentTypeOptions}
              value={localFormData.type}
              onChange={(value) => {
                setLocalFormData(prev => ({ ...prev, type: value as any }));
                setFormData(prev => ({ ...prev, type: value as any }));
                if (errors.type) {
                  setErrors(prev => ({ ...prev, type: '' }));
                }
              }}
              label="Tipo *"
              variant="outlined"
              size="md"
              required
              disabled={isSubmitting}
              loading={isSubmitting}
              error={errors.type}
            />
          </div>

          {/* Ticker + Valor total */}
          <div className="grid grid-cols-2 gap-2">
            <div data-field="ticker">
              <Input
                type="text"
                label="Ticker"
                value={localFormData.ticker}
                onChange={(e) => handleFieldChange("ticker", e.target.value.toUpperCase())}
                placeholder="PETR4, AAPL"
                variant="outlined"
                size="md"
                disabled={isSubmitting}
                loading={isSubmitting}
                error={errors.ticker}
              />
            </div>

            <div data-field="amount">
              <Input
                type="text"
                label="Valor Total *"
                value={localFormData.amount}
                onChange={(e) => handleCurrencyChange("amount", e.target.value)}
                placeholder="R$ 0,00"
                variant="outlined"
                size="md"
                required
                disabled={isSubmitting}
                loading={isSubmitting}
                error={errors.amount}
              />
            </div>
          </div>

          {/* Quantidade + Unitário */}
          {localFormData.type !== "DIVIDEND" && (
            <div className="grid grid-cols-2 gap-2">
              <div data-field="quantity">
                <Input
                  type="text"
                  label="Quantidade *"
                  value={localFormData.quantity}
                  onChange={(e) => handleQuantityChange(e.target.value)}
                  onBlur={calculateTotal}
                  placeholder="0"
                  variant="outlined"
                  size="md"
                  disabled={isSubmitting}
                  loading={isSubmitting}
                  error={errors.quantity}
                />
              </div>

              <div data-field="unitPrice">
                <Input
                  type="text"
                  label="Preço Unitário *"
                  value={localFormData.unitPrice}
                  onChange={(e) => handleCurrencyChange("unitPrice", e.target.value)}
                  onBlur={calculateTotal}
                  placeholder="R$ 0,00"
                  variant="outlined"
                  size="md"
                  disabled={isSubmitting}
                  loading={isSubmitting}
                  error={errors.unitPrice}
                />
              </div>
            </div>
          )}

          {/* Descrição */}
          <div data-field="description">
            <Input
              type="text"
              label="Descrição *"
              value={localFormData.description}
              onChange={(e) => handleFieldChange("description", e.target.value)}
              placeholder={
                localFormData.type === "BUY"
                  ? "Compra de ações..."
                  : localFormData.type === "SELL"
                  ? "Venda de ações..."
                  : "Recebimento de dividendos..."
              }
              variant="outlined"
              size="md"
              required
              disabled={isSubmitting}
              loading={isSubmitting}
              error={errors.description}
            />
          </div>

          {/* Conta */}
          <div data-field="accountId">
            <Select
              options={accountOptions}
              value={localFormData.accountId}
              onChange={(value) => handleFieldChange("accountId", value)}
              label="Conta *"
              variant="outlined"
              size="md"
              required
              placeholder="Selecione uma conta"
              disabled={isSubmitting}
              loading={isSubmitting}
              error={errors.accountId}
            />
          </div>

          {/* Cálculo automático */}
          {localFormData.type !== "DIVIDEND" &&
            parseInputToNumber(localFormData.quantity) > 0 &&
            parseCurrency(localFormData.unitPrice) > 0 && (
              <div
                className={`p-3 rounded-lg ${
                  resolvedTheme === "dark"
                    ? "bg-blue-900/20 border border-blue-800"
                    : "bg-blue-50 border border-blue-200"
                }`}
              >
                <p
                  className={`text-sm ${
                    resolvedTheme === "dark"
                      ? "text-blue-300"
                      : "text-blue-600"
                  }`}
                >
                  <strong>Calculado:</strong> {getCalculationDisplay()}
                </p>
                <p className={`text-xs ${
                  resolvedTheme === "dark" ? "text-blue-400" : "text-blue-500"
                } mt-1`}>
                  Valor atualizado automaticamente
                </p>
              </div>
            )}

          {/* Resumo de erros */}
          {Object.keys(errors).length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-red-800 text-sm font-medium mb-1">
                Por favor, corrija os seguintes erros:
              </p>
              <ul className="text-red-700 text-xs list-disc list-inside space-y-1">
                {Object.entries(errors).map(([field, error]) => (
                  <li key={field}>{error}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Botões */}
          <div className="flex justify-end space-x-2 pt-3 border-t">
            <Button
              type="button"
              onClick={handleClose}
              variant="secondary"
              size="md"
              icon={<HiX className="w-4 h-4" />}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              isLoading={isSubmitting}
              icon={<HiCheck className="w-4 h-4" />}
            >
              {editingInvestment ? "Atualizar" : "Criar"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
