import React from "react";

interface TransactionCategoryFieldProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  categorias: {id: string; nome: string}[];
  isLoading: boolean;
}

const TransactionCategoryField: React.FC<TransactionCategoryFieldProps> = ({ 
  value, 
  onChange, 
  categorias, 
  isLoading 
}) => (
  <div className="space-y-2">
    <label className="block text-sm font-medium text-gray-700">Categoria</label>
    <select
      name="categoriaId"
      value={value}
      onChange={onChange}
      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      disabled={isLoading}
    >
      <option value="">Selecione uma categoria</option>
      {categorias.map((categoria) => (
        <option key={categoria.id} value={categoria.id}>
          {categoria.nome}
        </option>
      ))}
    </select>
  </div>
);

export default TransactionCategoryField;