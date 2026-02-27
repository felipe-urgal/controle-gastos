// importing types
import { AccountType } from '@/app/types/account';

export const accountTypeOptions = [
  { value: 'CREDIT_DEBIT', label: 'Conta Corrente' },
  { value: 'INVESTMENT', label: 'Investimento' },
];

export const currencyOptions = [
  { value: 'BRL', label: 'R$ Real' },
  { value: 'USD', label: 'US$ Dólar' },
  { value: 'EUR', label: '€ Euro' },
];

export const initialFormData = {
  name: '',
  type: 'CREDIT_DEBIT' as AccountType,
  currency: 'BRL',
  color: '#7C3AED',
  icon: 'wallet',
  description: '',
  isActive: true,
};

export const typeConfig = {
  CREDIT_DEBIT: {
    label: "Conta Corrente",
  },
  INVESTMENT: {
    label: "Investimento",
  },
};