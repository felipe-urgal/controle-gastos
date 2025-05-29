import React from "react";

interface TransactionValueFieldProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const TransactionValueField: React.FC<TransactionValueFieldProps> = ({ value, onChange }) => (
  <div className="space-y-2">
    <label className="block text-sm font-medium text-gray-400">Valor *</label>
    <input
      type="text"
      name="amount"
      value={value}
      onChange={onChange}
      className="h-10 w-full px-3 border border-gray-700 rounded bg-gray-900 text-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      placeholder="R$ 0,00"
      required
    />
  </div>
);

export default TransactionValueField;