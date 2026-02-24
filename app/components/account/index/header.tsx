// importing icons
import { FaPlus } from 'react-icons/fa';

// importing components
import Button from '@/app/components/ui/Button';
import Link from 'next/link';

export default function Header() {
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
      <div>
        <h1 className="text-2xl sm:text-4xl font-bold text-white">
          Contas
        </h1>
        <p className="text-xs text-slate-400">
          Gerencie suas contas bancárias e investimentos
        </p>
      </div>

      <Link href="/contas/nova" className="w-full sm:w-auto">
        <Button
          variant="primary"
          icon={<FaPlus />}
        >
          Nova Conta
        </Button>
      </Link>
    </div>
  );
};
