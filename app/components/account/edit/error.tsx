'use client'

// importing hooks
import { useRouter } from "next/navigation";

// importing components
import { Button } from "@/app/components";

export default function Error({ error } : { error: any }) {
  const router = useRouter();

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto text-center py-24">
        <h3 className="text-xl font-medium text-white">
          Erro ao carregar
        </h3>
        <p className="text-slate-400 mb-6">{error}</p>
        <Button
          variant="primary"
          onClick={() => router.push('/contas')}
        >
          Voltar para listagem
        </Button>
      </div>
    </div>
  );
};
