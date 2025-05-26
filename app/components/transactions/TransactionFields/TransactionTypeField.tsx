import React from "react";

interface TransactionTypeFieldProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
}

const TransactionTypeField: React.FC<TransactionTypeFieldProps> = ({ value, onChange }) => (
  <div className="space-y-2">
    <label className="block text-sm font-medium text-gray-700">Tipo *</label>
    <select
      name="tipo"
      value={value}
      onChange={onChange}
      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      required
    >
      <option value="despesa">Despesa</option>
      <option value="renda">Renda</option>
      <option value="investimentos">Investimento</option>
    </select>
  </div>
);

export default TransactionTypeField;