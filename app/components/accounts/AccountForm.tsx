"use client";

// Hooks
import { useState, useEffect, forwardRef, useImperativeHandle } from "react";

// Components
import { Input, Select, Loading } from "@/app/components";

// Utils
import { AccountType } from '@/app/utils/format'

// Icons
import { FaWallet, FaCreditCard } from 'react-icons/fa';

interface AccountFormProps {
  account?: any;
  isEdit?: boolean;
  onSubmit: (data: any) => Promise<void>;
}

export interface AccountFormRef {
  submitForm: () => Promise<void>;
}
const AccountForm = forwardRef<AccountFormRef, AccountFormProps>(({ 
  account, 
  isEdit = false, 
  onSubmit,
}, ref) => {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errors, setErrors] = useState({ name: '', type: '', currency: '' });
  const [form, setForm] = useState({ type: "", currency: "BRL", name: "" });

  useEffect(() => {
    setIsLoading(true);
    
    if (isEdit && account) {
      setForm({
        name: account.name, 
        type: account.type, 
        currency: account.currency || "BRL" 
      });
    }
    
    setIsLoading(false);
  }, [isEdit, account]);

  // Validação dos campos
  const validateForm = () => {
    let valid = true;
    const newErrors = { name: '', type: '', currency: '' };

    // Validação do nome
    if (!form.name.trim()) {
      newErrors.name = 'Nome da conta é obrigatório';
      valid = false;
    } else if (form.name.trim().length < 2) {
      newErrors.name = 'Nome deve ter pelo menos 2 caracteres';
      valid = false;
    }

    // Validação do tipo
    if (!form.type) {
      newErrors.type = 'Tipo de conta é obrigatório';
      valid = false;
    }

    setErrors(newErrors);
    return valid;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const handleSelectChange = (field: string, value: string | number) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setErrors(prev => ({ ...prev, [field]: '' }));
  };

  useImperativeHandle(ref, () => ({
    submitForm: async () => {
      if (!validateForm()) return;
      await onSubmit(form);
    }
  }));

  if (isLoading) {
    return <Loading />
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="md:col-span-2">
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
            icon={<FaWallet className="text-indigo-500" />}
          />

          <Select
            value={form.type}
            onChange={(value) => handleSelectChange("type", value)} 
            placeholder="Selecione o tipo da conta"
            label="Tipo de Conta"
            options={AccountType}
            disabled={isLoading}
            name="type"
            error={errors.type}
            required
            icon={<FaCreditCard className="text-indigo-500" />}
          />
        </div>
      </div>
    </div>
  );
});

AccountForm.displayName = 'AccountForm';

export default AccountForm;