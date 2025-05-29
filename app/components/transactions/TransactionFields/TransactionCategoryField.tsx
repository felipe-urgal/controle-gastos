import React from "react";

interface TransactionCategoryFieldProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  categories: {id: string; name: string}[];
  isLoading: boolean;
}

const TransactionCategoryField: React.FC<TransactionCategoryFieldProps> = ({ 
  value, 
  onChange, 
  categories, 
  isLoading 
}) => (
  <div className="space-y-2 mb-4">
    <label className="block text-sm font-medium text-gray-400">Categoria</label>
    <select
      name="categoryId"
      value={value}
      onChange={onChange}
      className="h-10 w-full px-3 border border-gray-700 rounded bg-gray-900 text-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      disabled={isLoading}
    >
      <option value="">Selecione uma categoria</option>
      {categories.map((category) => (
        <option key={category.id} value={category.id}>
          {category.name}
        </option>
      ))}
    </select>
  </div>
);

export default TransactionCategoryField;