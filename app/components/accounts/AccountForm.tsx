"use client";

// Hooks
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/context/AuthContext";

// Toast
import { toast } from 'react-toastify';

// Components
import { FormContainer, Input, Select, Loading } from "@/app/components";

// Services
import { accountService } from "@/app/services/accountService";

// Type
import { AccountModel} from '@/app/types/account'

// Utils
import { AccountType } from '@/app/utils/format'

// Icons
import { FaWallet, FaCreditCard } from 'react-icons/fa';

interface AccountFormProps {
  account?: {
    id?: string;
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
  const [errors, setErrors] = useState({ name: '', type: '', currency: '' });
  const [form, setForm] = useState({ type: "", currency: "BRL", name: "" });

  useEffect(() => {
    if (user?.id) {
      const fetchAccount = async () => {
        try {
          setIsLoading(true);
          
          if (isEdit && account) {
            setForm({ 
              name: account.name, 
              type: account.type, 
              currency: account.currency || "BRL" 
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    if (!user) {
      toast.error("Usuário não autenticado.");
      return;
    }

    const payload = {
      ...(isEdit && account?.id && { id: account.id }),
      userId: user.id,
      type: form.type,
      name: form.name.trim(),
      currency: form.currency,
    };

    setIsSubmitting(true);

    try {
      if (isEdit) {
        await accountService.updateAccount(payload as AccountModel);
      } else {
        await accountService.createAccount(payload);
      }

      const titleToast = isEdit ? 'Conta atualizada' : 'Conta criada'

      toast.success(`${titleToast} com sucesso!`);

      router.push(`/contas`);
      // router.refresh();
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

  if (isLoading) {
    return <Loading />
  }

  return (
    <div className="">
      <div className="">
        {/* Form Container */}
        <div className="bg-white/80 backdrop-blur-md rounded-2xl overflow-hidden">
          <div className="p-8">
            <FormContainer
              isSubmitting={isSubmitting}
              isEdit={isEdit}
              handleSubmit={handleSubmit}
              onCancel={handleCancel}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
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
                </div>

                <div>
                  <Select
                    value={form.type}
                    onChange={handleChange}
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
            </FormContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccountForm;