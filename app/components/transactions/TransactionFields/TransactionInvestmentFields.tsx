import React from "react";

interface TransactionInvestmentFieldsProps {
  valorUnitario: string;
  onValorUnitarioChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  quantidade: string;
  onQuantidadeChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  valorFinal: string;
  formatCurrency: (value: string) => string;
}

const TransactionInvestmentFields: React.FC<TransactionInvestmentFieldsProps> = ({
  valorUnitario,
  onValorUnitarioChange,
  quantidade,
  onQuantidadeChange,
  valorFinal,
  formatCurrency
}) => (
  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">Valor Unitário *</label>
      <input
        type="text"
        value={valorUnitario}
        onChange={onValorUnitarioChange}
        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        placeholder="R$ 0,00"
        required
      />
    </div>

    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">Quantidade *</label>
      <input
        type="number"
        name="quantidade"
        min="1"
        step="1"
        value={quantidade}
        onChange={onQuantidadeChange}
        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        required
      />
    </div>

    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">Valor Total</label>
      <div className="w-full px-4 py-2 border border-gray-300 rounded-md bg-gray-50">
        {formatCurrency(valorFinal)}
      </div>
    </div>
  </div>
);

export default TransactionInvestmentFields;