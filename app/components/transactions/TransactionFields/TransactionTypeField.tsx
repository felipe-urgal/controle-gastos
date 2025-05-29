import React from "react";

interface TransactionTypeFieldProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
}

const TransactionTypeField: React.FC<TransactionTypeFieldProps> = ({ value, onChange }) => (
  <div className="space-y-2 mb-4">
    <label className="block text-sm font-medium text-gray-400">Tipo *</label>
    <select
      name="type"
      value={value}
      onChange={onChange}
      className="h-10 w-full px-3 border border-gray-700 rounded bg-gray-900 text-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      required
    >
      <option value="EXPENSE">Despesa</option>
      <option value="INCOME">Renda</option>
      <option value="INVESTMENT">Investimento</option>
    </select>
  </div>
);

export default TransactionTypeField;