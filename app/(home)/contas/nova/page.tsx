'use client';

import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { AccountForm } from '@/app/components';

export default function NewAccountPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen px-6 py-16">

      <motion.div
        initial={{ opacity: 0, y: 25 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mx-auto"
      >
        <AccountForm
          isEditing={false}
          onSubmitSuccess={() => router.push('/contas')}
          onCancel={() => router.push('/contas')}
          submitting={false}
        />
      </motion.div>

    </div>
  );
}
