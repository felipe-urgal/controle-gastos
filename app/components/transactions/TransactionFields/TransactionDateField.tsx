import React from "react";

interface TransactionDateFieldProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  anoSelecionado: number;
  mesSelecionado: number;
}

const TransactionDateField: React.FC<TransactionDateFieldProps> = ({ 
  value, 
  onChange,
  anoSelecionado,
  mesSelecionado
}) => (
  <div className="space-y-2">
    <label className="block text-sm font-medium text-gray-700">Data *</label>
    <input
      type="date"
      name="data"
      value={value}
      onChange={onChange}
      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      required
      min={new Date(anoSelecionado, mesSelecionado - 1, 1).toLocaleDateString('en-CA')}
      max={new Date(anoSelecionado, mesSelecionado, 0).toLocaleDateString('en-CA')}
    />
  </div>
);

export default TransactionDateField;