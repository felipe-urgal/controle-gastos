'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { accountService } from '@/app/services';
import { AccountModel } from '@/app/types/account';
import { AccountForm } from '@/app/components';

export default function EditAccountPage() {
  const { id } = useParams();
  const router = useRouter();

  const [account, setAccount] = useState<AccountModel | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const response = await accountService.getAccountById(String(id));
        setAccount(response.data);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  return (
    <div className="min-h-screen px-6 py-16">

      <div className="mx-auto">

        {loading && (
          <div className="rounded-3xl p-10 bg-white/5 border border-white/10 animate-pulse h-64" />
        )}

        {!loading && account && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <AccountForm
              account={account}
              isEditing
              onSubmitSuccess={() =>
                router.push(`/contas/show/${account.id}`)
              }
              onCancel={() => router.back()}
              submitting={false}
            />
          </motion.div>
        )}

      </div>
    </div>
  );
}
