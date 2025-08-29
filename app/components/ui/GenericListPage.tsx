"use client";

import { ReactNode } from "react";
import { Pagination, Loading } from "@/app/components";

const GenericListPage = ({
  isLoading,
  currentPage,
  totalItems,
  totalPages,
  itemsPerPage,
  onPageChange,
  filterComponent,
  listComponent,
  breadcrumbComponent
}: {
  isLoading: boolean;
  currentPage: number;
  totalItems: number;
  totalPages: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  filterComponent: ReactNode;
  listComponent: ReactNode;
  breadcrumbComponent: ReactNode;
}) => {
  return (
    <>
      {breadcrumbComponent}
      
      <div className="min-h-screen">
        <div className="max-w-7xl mx-auto ">
          {/* Filtros */}
          <div className="mb-4">
            {filterComponent}
          </div>

          {/* Conteúdo principal */}
          <div className="bg-white/60 backdrop-blur-md rounded-2xl overflow-hidden">
            {isLoading ? (
              <Loading />
            ) : (
              <>
                {/* Lista */}
                <div className="divide-y divide-gray-100">
                  {listComponent}
                </div>

                {/* Paginação */}
                {totalPages > 1 && (
                  <div className="px-6 py-4 border-t border-gray-100">
                    <Pagination
                      currentPage={currentPage}
                      totalPages={totalPages}
                      totalItems={totalItems}
                      itemsPerPage={itemsPerPage}
                      onPageChange={onPageChange}
                    />
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default GenericListPage;