// importing types
import { AccountType } from '@/app/types/account';
import { FilterField } from "@/app/components/navigation/dynamic-filters";

export const ACCOUNT_NAME_MAX_LENGTH = 50;
export const ACCOUNT_DESCRIPTION_MAX_LENGTH = 255;
export const ACCOUNT_ICON_MAX_LENGTH = 30;

export const accountTypeOptions = [
  { value: 'CREDIT_DEBIT', label: 'Conta Corrente' },
  { value: 'INVESTMENT', label: 'Investimento' },
  { value: 'CREDIT_CARD', label: 'Cartão de crédito' },
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
  creditLimit: '',
  statementClosingDay: '',
  statementDueDay: '',
};

export const typeConfig = {
  CREDIT_DEBIT: {
    label: "Conta Corrente",
  },
  INVESTMENT: {
    label: "Investimento",
  },
  CREDIT_CARD: {
    label: "Cartão de crédito",
  },
};

export const accountFilters = [
  {
    type: "search",
    key: "search",
    placeholder: "Buscar conta...",
  },
  {
    type: "select",
    key: "isActive",
    label: "Status",
    options: [
      { label: "Ativa", value: "true" },
      { label: "Inativa", value: "false" },
    ],
  },
  {
    type: "select",
    key: "type",
    label: "Tipo",
    options: accountTypeOptions,
  },
  {
    type: "select",
    key: "currency",
    label: "Moeda",
    options: currencyOptions,
  },
] satisfies FilterField[];
