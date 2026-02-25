"use client";

// hooks
import { useCategories } from "@/app/hooks/categories/category-index";

// components
import PageHeader from "@/app/components/ui/PageHeader";
import ListFilters from "@/app/components/ui/ListFilters";
import EntityList from "@/app/components/ui/EntityList";
import CategoryCard from "@/app/components/category/index/card";

export default function Index() {
  const { 
    loading,
    processedCategories,
    search,
    setSearch,
    viewMode,
    setViewMode,
  } = useCategories();

  return (
    <>
      <PageHeader
        title="Categorias"
        description="Organize suas receitas e despesas"
        createUrl="/categorias/nova"
        loading={loading}
      />

      <ListFilters
        search={search}
        onSearchChange={setSearch}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        loading={loading}
        searchPlaceholder="Buscar categoria..."
      />

      <EntityList
        items={processedCategories}
        loading={loading}
        viewMode={viewMode}
        search={search}
        emptyTitle="Nenhuma categoria encontrada"
        renderItem={(category, index) => (
          <CategoryCard
            key={category.id}
            category={category}
            viewMode={viewMode}
            searchTerm={search}
            index={index}
          />
        )}
      />
    </>
  );
};
