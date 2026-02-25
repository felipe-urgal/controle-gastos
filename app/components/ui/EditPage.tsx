"use client";

import { motion } from "framer-motion";
import PageHeader from "./PageHeader";
import PageLoading from "./PageLoading";
import PageError from "./PageError";

interface EditPageProps {
  title: string;
  description?: string;
  loading?: boolean;
  error?: any;
  onBack?: () => void;
  children: React.ReactNode;
  errorRedirectTo?: string;
}

export default function EditPage({
  title,
  description,
  loading,
  error,
  onBack,
  children,
  errorRedirectTo,
}: EditPageProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="mx-auto"
    >
      <PageHeader
        title={title}
        description={description}
        onBack={onBack}
        loading={loading}
      />

      {loading ? (
        <PageLoading type="form" />
      ) : error ? (
        <PageError
          message={error}
          buttonText="Voltar"
          redirectTo={errorRedirectTo}
        />
      ) : (
        children
      )}
    </motion.div>
  );
}