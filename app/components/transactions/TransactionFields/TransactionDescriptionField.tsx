import React from "react";

interface TransactionDescriptionFieldProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const TransactionDescriptionField: React.FC<TransactionDescriptionFieldProps> = ({ value, onChange }) => (
  <div className="space-y-2">
    <label className="block text-sm font-medium text-gray-700">Descrição *</label>
    <input
      type="text"
      name="descricao"
      value={value}
      onChange={onChange}
      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      placeholder="Ex: Salário, Aluguel, Ações PETR4"
      required
      autoFocus
    />
  </div>
);

export default TransactionDescriptionField;