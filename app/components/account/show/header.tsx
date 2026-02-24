// importing hooks
import { useRouter } from "next/navigation";

import { FaArrowLeft, FaEdit, FaTrash } from "react-icons/fa";
import Button from "@/app/components/ui/Button";

export default function Header({
  handleBack,
  isDeleting,
  account,
  setIsDeleteModalOpen,
  loading,
}: {
  handleBack: () => void;
  isDeleting: boolean;
  account: any;
  setIsDeleteModalOpen: (value: boolean) => void;
  loading: boolean;
}) {
  const router = useRouter();

  return (
    <div className="flex sm:items-center justify-between">
      <div className="flex items-center">
        <Button
          variant="outline"
          onClick={handleBack}
          icon={<FaArrowLeft />}
          disabled={isDeleting}
          isLoading={loading}
        >
          <span className="">Voltar</span>
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <Button
          variant="primary"
          onClick={() => router.push(`/contas/alterar/${account.id}`)}
          icon={<FaEdit />}
          disabled={isDeleting}
          isLoading={loading}
        >
          <span className="">Editar</span>
        </Button>

        <Button
          variant="danger"
          onClick={() => setIsDeleteModalOpen(true)}
          icon={<FaTrash />}
          disabled={isDeleting}
          isLoading={loading}
        >
          <span className="">Excluir</span>
        </Button>
      </div>
    </div>
  );
};
