import React from "react";

interface TransactionInvestmentFieldsProps {
  unitPrice: string;
  onUnitPriceChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  quantity: string;
  onQuantityChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  price: string;
  formatCurrency: (value: string) => string;
}

const TransactionInvestmentFields: React.FC<TransactionInvestmentFieldsProps> = ({
  unitPrice,
  onUnitPriceChange,
  quantity,
  onQuantityChange,
  price,
  formatCurrency
}) => (
  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-400">Valor Unitário *</label>
      <input
        type="text"
        name="unitPrice"
        value={unitPrice}
        onChange={onUnitPriceChange}
        className="h-10 w-full px-3 border border-gray-700 rounded bg-gray-900 text-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        placeholder="R$ 0,00"
        required
      />
    </div>

    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-400">Quantidade *</label>
      <input
        type="number"
        name="quantity"
        min="1"
        step="1"
        value={quantity}
        onChange={onQuantityChange}
        className="h-10 w-full px-3 border border-gray-700 rounded bg-gray-900 text-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        required
      />
    </div>

    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-600">Valor Total</label>
      <div className="text-gray-600 w-full px-4 py-2 border border-gray-600 rounded-md bg-gray-900">
        {formatCurrency(price)}
      </div>
    </div>
  </div>
);

export default TransactionInvestmentFields;