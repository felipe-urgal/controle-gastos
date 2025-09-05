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
}: {
  isLoading: boolean;
  currentPage: number;
  totalItems: number;
  totalPages: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  filterComponent: ReactNode;
  listComponent: ReactNode;
}) => {
  return (
    <div>
      {/* Filtros */}
      {filterComponent}

      {/* Conteúdo principal */}
      <div className="overflow-hidden">
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
              <div className="py-3">
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
  );
};

export default GenericListPage;