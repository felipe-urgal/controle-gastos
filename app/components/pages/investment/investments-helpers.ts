import { SupportedCurrency } from '@/app/types/financial-summary';
import { InvestmentAssetType, InvestmentFiscalEventType, InvestmentTaxLocation, InvestmentOperationType } from '@/app/types/investment';

export const fiscalEventTypes: Array<{ value: InvestmentFiscalEventType; label: string }> = [
  { value: 'BUY', label: 'Compra' },
  { value: 'SELL', label: 'Venda' },
  { value: 'CUSTODY_TRANSFER_IN', label: 'Transferência de custódia · entrada' },
  { value: 'CUSTODY_TRANSFER_OUT', label: 'Transferência de custódia · saída' },
  { value: 'BONUS', label: 'Bonificação' },
  { value: 'SPLIT', label: 'Desdobramento' },
  { value: 'REVERSE_SPLIT', label: 'Grupamento' },
  { value: 'OTHER', label: 'Outro' },
];

export const assetTypes: Array<{ value: InvestmentAssetType; label: string }> = [
  { value: 'STOCK', label: 'Ação' },
  { value: 'FII', label: 'FII' },
  { value: 'ETF', label: 'ETF' },
  { value: 'FIXED_INCOME', label: 'Renda fixa' },
  { value: 'CRYPTO', label: 'Cripto' },
  { value: 'FUND', label: 'Fundo' },
  { value: 'OTHER', label: 'Outro' },
];

export function today() {
  const date = new Date();
  return [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, '0'),
    String(date.getUTCDate()).padStart(2, '0'),
  ].join('-');
}

export function typeLabel(type: InvestmentAssetType) {
  return assetTypes.find((item) => item.value === type)?.label ?? type;
}

export function operationLabel(type: InvestmentOperationType) {
  return type === 'BUY' ? 'Compra' : 'Venda';
}

export function fiscalEventLabel(type: InvestmentFiscalEventType) {
  return fiscalEventTypes.find((item) => item.value === type)?.label ?? type;
}

export function dateLabel(value: string) {
  const [year, month, day] = value.split('-');
  return `${day}/${month}/${year}`;
}

export function quoteDateLabel(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  });
}

export function quantityLabel(value: string) {
  return value.replace('.', ',');
}

export type AssetForm = {
  symbol: string;
  name: string;
  type: InvestmentAssetType;
  currency: SupportedCurrency;
  market: string;
  taxLocation: InvestmentTaxLocation;
};

export type FiscalCostForm = {
  assetId: string;
  quantity: string;
  costBasis: string;
  date: string;
  reason: string;
  sourceInstitution: string;
};

export type OperationForm = {
  type: InvestmentOperationType;
  accountId: string;
  assetId: string;
  quantity: string;
  unitPrice: string;
  fees: string;
  date: string;
  note: string;
};

export const emptyAsset: AssetForm = {
  symbol: '',
  name: '',
  type: 'STOCK',
  currency: 'BRL',
  market: 'B3',
  taxLocation: 'BRAZIL',
};

export const emptyFiscalCost: FiscalCostForm = {
  assetId: '',
  quantity: '',
  costBasis: '',
  date: today(),
  reason: '',
  sourceInstitution: '',
};

export const emptyOperation: OperationForm = {
  type: 'BUY',
  accountId: '',
  assetId: '',
  quantity: '',
  unitPrice: '',
  fees: '',
  date: today(),
  note: '',
};
