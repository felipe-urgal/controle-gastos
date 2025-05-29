import React from "react";

interface TransactionDateFieldProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const TransactionDateField: React.FC<TransactionDateFieldProps> = ({ 
  value, 
  onChange,
}) => (
  <div className="space-y-2 mb-4">
    <label className="block text-sm font-medium text-gray-400">Data *</label>
    <input
      type="date"
      name="transactionDate"
      value={value}
      onChange={onChange}
      className="h-10 w-full px-3 border border-gray-700 rounded bg-gray-900 text-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      required
    />
  </div>
);

export default TransactionDateField;