// importing hooks
import { useRouter } from "next/navigation";

// importing components
import { Button } from "@/app/components";

export default function Empty() {
  const router = useRouter();

  return (
    <>
      <h3 className="text-xl font-medium text-white mb-2">
        Conta não encontrada
      </h3>
      <Button
        variant="primary"
        onClick={() => router.push('/contas')}
      >
        Voltar para listagem
      </Button>
    </>
  );
};
