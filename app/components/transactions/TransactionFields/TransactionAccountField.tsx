import React from "react";

interface TransactionAccountFieldProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  accounts: {id: string; name: string}[];
  isLoading: boolean;
}

const TransactionAccountField: React.FC<TransactionAccountFieldProps> = ({ 
  value, 
  onChange, 
  accounts, 
  isLoading 
}) => (
  <div className="space-y-2 mb-4">
    <label className="block text-sm font-medium text-gray-400">Conta</label>
    <select
      name="accountId"
      value={value}
      onChange={onChange}
      className="h-10 w-full px-3 border border-gray-700 rounded bg-gray-900 text-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      disabled={isLoading}
    >
      <option value="">Selecione uma conta</option>
      {accounts.map((account) => (
        <option key={account.id} value={account.id}>
          {account.name}
        </option>
      ))}
    </select>
  </div>
);

export default TransactionAccountField;