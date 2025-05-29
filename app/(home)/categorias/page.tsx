"use client";

// import { useState, useEffect, useCallback } from "react";
// import { useRouter, useSearchParams } from "next/navigation";
// import { useAuth } from "@/app/context/AuthContext";
// import { toast } from "react-toastify";
import Breadcrumb from "@/app/components/Breadcrumb";
// import 'react-toastify/dist/ReactToastify.css';
// import Modal from "@/app/components/Modal";
import ProtectedRoute from "@/app/components/ProtectedRoute";
// import { TransactionPagination } from "@/app/components/transactions/TransactionPagination";
// import { CrudForm, CrudList } from "@/app/components/CrudComponents";

// interface Category {
//   id: string;
//   name: string;
//   userId: string;
// }

export default function CategoriaPage() {
  // const { user } = useAuth();
  // const router = useRouter();
  // const searchParams = useSearchParams();
  // const [isLoading, setIsLoading] = useState(true);
  // const [openModal, setOpenModal] = useState(false);

  // const [categories, setCategories] = useState<Category[]>([]);
  // const [editCategory, setEditCategory] = useState<Partial<Category>>({ name: "" });
  // const [newCategory, setNewCategory] = useState({ name: "" });
  // const [idCategory, setIdCategory] = useState<string | null>(null);

  // const itensForPages = 5;

  // const [pagination, setPagination] = useState({
  //   currentPage: Number(searchParams.get("page")) || 1,
  //   totalPages: 1,
  //   totalItems: 0,
  //   itemsPerPage: 5,
  // });

  // const updateURLParams = useCallback(
  //   (params: { page?: number }) => {
  //     const query = new URLSearchParams();
  //     if (params.page && params.page > 1) query.set("page", params.page.toString());

  //     router.replace(`/categorias?${query.toString()}`);
  //   },
  //   [router]
  // );

  // const fetchCategory = useCallback(async (page: number = 1) => {
  //   setIsLoading(true);

  //   try {
  //     const response = await fetch(
  //       `/api/category?userId=${user?.id}&page=${page}&limit=${itensForPages}`
  //     );
      
  //     if (!response.ok) {
  //       const errorData = await response.json();
  //       throw new Error(errorData.error || 'Erro ao carregar categorias');
  //     }
      
  //     const { data, pagination: pagData } = await response.json();
  //     setCategories(data.categories || []);
  //     setPagination(prev => ({
  //       ...prev,
  //       currentPage: page, // Garantir que a página atual seja atualizada
  //       totalPages: pagData.totalPages,
  //       totalItems: pagData.total
  //     }));
  //   } catch (error) {
  //     toast.error((error as Error).message);
  //     setCategories([]);
  //   } finally {
  //     setIsLoading(false);
  //   }
  // }, [user?.id]);
  
  // useEffect(() => {
  //   const page = Number(searchParams.get("page")) || 1;
  //   fetchCategory(page);
  // }, [fetchCategory, searchParams]);

  // const handlePageChange = (page: number) => {
  //   updateURLParams({ page });
  //   fetchCategory(page);
  // };

  // Funções para CRUD de categorias

  // const createCategory = async () => {
  //   if (!newCategory.name.trim()) {
  //     toast.error("O nome da categoria não pode estar vazio");
  //     return;
  //   }

  //   try {
  //     setIsLoading(true);
  //     const response = await fetch('/api/category', {
  //       method: 'POST',
  //       headers: { 'Content-Type': 'application/json' },
  //       body: JSON.stringify({ 
  //         name: newCategory.name,
  //         userId: user?.id 
  //       }),
  //     });

  //     if (!response.ok) {
  //       const errorData = await response.json();
  //       throw new Error(errorData.error || 'Erro ao criar categoria');
  //     }

  //     // const { data } = await response.json();
  //     fetchCategory(1); // Recarrega a primeira página
  //     setNewCategory({ name: "" });
  //     toast.success("Categoria adicionada com sucesso!");
  //   } catch (error) {
  //     toast.error((error as Error).message);
  //   } finally {
  //     setIsLoading(false);
  //   }
  // };

  // const initEditCategory = (category: Category) => {
  //   setIdCategory(category.id);
  //   setEditCategory({ name: category.name });
  // };

  // const cancelEditCategory = () => {
  //   setIdCategory(null);
  //   setEditCategory({ name: "" });
  // };

  // const saveEdit = async (id: string) => {
  //   if (!editCategory.name || !editCategory.name.trim()) {
  //     toast.error("O nome da categoria não pode estar vazio");
  //     return;
  //   }

  //   try {
  //     setIsLoading(true);
  //     const response = await fetch(`/api/category`, {
  //       method: 'PUT',
  //       headers: { 'Content-Type': 'application/json' },
  //       body: JSON.stringify({
  //         id: id,
  //         name: editCategory.name,
  //         userId: user?.id 
  //       }),
  //     });

  //     if (!response.ok) {
  //       const errorData = await response.json();
  //       throw new Error(errorData.error || 'Erro ao atualizar categoria');
  //     }

  //     await response.json();
  //     setIdCategory(null);
  //     setEditCategory({ name: "" });
  //     toast.success("Categoria atualizada com sucesso!");
  //     fetchCategory();
  //   } catch (error) {
  //     toast.error((error as Error).message);
  //   } finally {
  //     setIsLoading(false);
  //   }
  // };

  // const initDelete = (id: string) => {
  //   setIdCategory(id);
  //   setOpenModal(true);
  // };

  // const deleteCategory = async () => {
  //   if (!idCategory) return;

  //   try {
  //     const response = await fetch(`/api/category`, {
  //       method: 'DELETE',
  //       headers: { 'Content-Type': 'application/json' },
  //       body: JSON.stringify({ id: idCategory }),
  //     });

  //     if (!response.ok) {
  //       const errorData = await response.json();
  //       if (errorData.transacoesCount > 0) {
  //         throw new Error(`Esta categoria possui ${errorData.transacoesCount} transações vinculadas e não pode ser excluída`);
  //       }
  //       throw new Error(errorData.error || 'Erro ao excluir categoria');
  //     }

  //     setCategories(categories.filter(cat => cat.id !== idCategory));
  //     toast.success("Categoria excluída com sucesso!");
  //   } catch (error) {
  //     toast.error((error as Error).message);
  //   } finally {
  //     setOpenModal(false);
  //     setIdCategory(null);
  //     fetchCategory();
  //   }
  // };

  // const categoryFields = [
  //   {
  //     name: "name",
  //     label: "Nome da Categoria",
  //     type: "text",
  //     placeholder: "Ex: Cartão de crédito, Salário, etc..."
  //   },
  // ];
  
  // const categoryColumns = [
  //   {
  //     name: "name",
  //     label: "Nome",
  //     placeholder: "Ex: Salário, Lazer, etc."
  //   },
  // ];

  return (
    <ProtectedRoute>
      <Breadcrumb/>
      
      <div className="max-w-7xl">
        {/*<CrudForm
          fields={categoryFields}
          formData={newCategory}
          setFormData={setNewCategory}
          onSubmit={createCategory}
          isLoading={isLoading}
          submitText="Adicionar Categoria"
          validation={(data: { name: string }) => !!data.name.trim()}
        />

        <div className="border-0 overflow-hidden">
          <CrudList
            data={categories}
            columns={categoryColumns}
            isLoading={isLoading}
            editId={idCategory}
            editData={editCategory}
            onEdit={(id) => {
              const category = categories.find(category => category.id === id);
              if (category) initEditCategory(category);
            }}
            onCancelEdit={cancelEditCategory}
            onSaveEdit={saveEdit}
            onDelete={initDelete}
            setEditData={setEditCategory}
          />
        </div>*/}

        {/* Paginação */}
        {/*<TransactionPagination
          paginaAtual={pagination.currentPage}
          totalPaginas={pagination.totalPages}
          totalItens={pagination.totalItems}
          itensPorPagina={pagination.itemsPerPage}
          onPageChange={handlePageChange}
        />*/}
      </div>

      {/*<Modal
        isOpen={openModal}
        onClose={() => {
          setOpenModal(false);
          setIdCategory(null);
        }}
        onConfirm={deleteCategory}
        mensagem="Tem certeza que deseja excluir esta categoria?"
      />*/}
    </ProtectedRoute>
  );
}