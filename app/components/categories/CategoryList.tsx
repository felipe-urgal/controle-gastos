import { CategoryItem } from "./CategoryItem";
import { CategoryModel } from '@/app/types/category'

type CategoryListProps = {
  categories: CategoryModel[];
  onDelete: (id: string) => void;
};

export const CategoryList = ({ categories, onDelete }: CategoryListProps) => {
  return (
    <div className="flex-1 overflow-y-auto">
      <table className="w-full">
        <thead className="bg-gray-800 text-gray-400 text-sm md:table-header-group">
          <tr>
            <th className="px-4 py-3 text-left">Nome da Categoria</th>
            <th className="px-4 py-3 text-right">Ações</th>
          </tr>
        </thead>
        <tbody>
          {categories.length === 0 ? (
            <tr>
              <td colSpan={2} className="text-center text-gray-600 py-5">
                Nenhuma categoria encontrada
              </td>
            </tr>
          ) : (
            categories.map(category => (
              <CategoryItem 
                key={category.id} 
                category={category} 
                onDelete={onDelete}
              />
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};