// hooks
import { ReactNode } from "react";

// components
import { Button } from "@/app/components";

// icons
import { FaAngleDown } from "react-icons/fa";

const GenericListPage = ({
  isLoading,
  isLoadingMore,
  hasMore,
  onLoadMore,
  filterComponent,
  listComponent,
  breadcrumbComponent
}: {
  isLoading: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
  filterComponent: ReactNode;
  listComponent: ReactNode;
  breadcrumbComponent: ReactNode;
}) => {
  return (
    <>
      {breadcrumbComponent}
      
      <div className="">
        {filterComponent}

        <div className="">
          {isLoading ? (
            <div className="max-w-5xl mx-auto p-6 mt-5 flex justify-center items-center">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          ) : (
            <>
              {listComponent}

              {hasMore && (
                <div className="flex justify-center my-6">
                  <Button
                    onClick={onLoadMore}
                    disabled={isLoadingMore}
                    variant="link"
                    className="text-blue-300"
                    icon={<FaAngleDown size={18} />}
                  >
                    {isLoadingMore ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-blue-500 mr-2"></div>
                        Carregando...
                      </>
                    ) : (
                      "Ver mais"
                    )}
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default GenericListPage