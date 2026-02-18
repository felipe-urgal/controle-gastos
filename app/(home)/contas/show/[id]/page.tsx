"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  FaArrowLeft,
  FaEdit,
  FaWallet,
  FaExchangeAlt,
  FaTrash,
  FaChartLine,
  FaArrowUp,
  FaArrowDown
} from "react-icons/fa";

import { accountService, transactionService } from "@/app/services";
import { AccountModel } from "@/app/types/account";
import { useAuth } from "@/app/context";
import { ConfirmationModal } from "@/app/components";

export default function AccountShowPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user } = useAuth();

  const [account, setAccount] = useState<AccountModel | null>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    async function load() {
      if (!user?.id) return;

      try {
        const [accountRes, transactionsRes] = await Promise.all([
          accountService.getAccountById(String(id)),
          transactionService.getTransactions(user.id, {
            account: String(id),
            status: "COMPLETED",
          }),
        ]);

        setAccount(accountRes.data);

        const items = transactionsRes.data.items;
        setTransactions(items.slice(0, 5)); // 🔥 últimas 5
        setSummary(transactionsRes.data.additionalData);

      } finally {
        setLoading(false);
      }
    }

    load();
  }, [id, user?.id]);

  async function handleDelete() {
    if (!account) return;
    try {
      setIsDeleting(true);
      await accountService.deleteAccount(account.id);
      router.push("/contas");
    } finally {
      setIsDeleting(false);
      setIsDeleteModalOpen(false);
    }
  }

  if (loading) return <div className="px-6 py-12">Carregando...</div>;
  if (!account) return <div>Conta não encontrada</div>;

  const formatCurrency = (value: number) =>
    user?.showValues
      ? new Intl.NumberFormat("pt-BR", {
          style: "currency",
          currency: account.currency,
        }).format(value / 100)
      : "••••••";

  return (
    <>
      <div className="px-6 py-12 space-y-10">

        {/* HEADER */}
        <div className="flex justify-between items-center">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10"
          >
            <FaArrowLeft size={12} />
            Voltar
          </button>

          <div className="flex gap-3">
            <button
              onClick={() => router.push(`/contas/alterar/${account.id}`)}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white"
            >
              <FaEdit size={13} />
            </button>

            <button
              onClick={() => setIsDeleteModalOpen(true)}
              className="px-5 py-2.5 rounded-xl bg-red-500/10 text-red-400"
            >
              <FaTrash size={13} />
            </button>
          </div>
        </div>

        {/* DASHBOARD GRID */}
        <div className="grid xl:grid-cols-3 gap-8">

          {/* MAIN */}
          <div className="xl:col-span-2 space-y-8">

            {/* HERO */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="relative rounded-3xl p-8 bg-white/5 backdrop-blur-2xl border border-white/10"
            >
              <div
                className="absolute inset-0 opacity-20 pointer-events-none"
                style={{
                  background: `radial-gradient(circle at top left, ${account.color}, transparent 60%)`
                }}
              />

              <div className="relative z-10">
                <div className="flex items-center gap-4 mb-6">
                  <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center text-white"
                    style={{ backgroundColor: account.color }}
                  >
                    <FaWallet size={20} />
                  </div>

                  <div>
                    <h1 className="text-3xl font-bold">{account.name}</h1>
                    <p className="text-slate-400 text-sm">
                      {account.description || "Sem descrição"}
                    </p>
                  </div>
                </div>

                <p className="text-sm text-slate-400 uppercase">
                  Saldo Atual
                </p>
                <h2
                  className="text-4xl font-bold mt-2"
                  style={{
                    color: account.isActive ? account.color : "#6B7280",
                  }}
                >
                  {formatCurrency(account.balance)}
                </h2>
              </div>
            </motion.div>

            {/* ÚLTIMAS TRANSAÇÕES */}
            <div className="rounded-3xl p-6 bg-white/5 border border-white/10">
              <h3 className="text-lg font-semibold mb-6">
                Últimas Transações
              </h3>

              {transactions.length === 0 ? (
                <p className="text-sm text-slate-400">
                  Nenhuma transação registrada.
                </p>
              ) : (
                <div className="space-y-4">
                  {transactions.map((tx) => (
                    <div
                      key={tx.id}
                      className="flex justify-between items-center p-4 rounded-xl bg-slate-900/40 border border-slate-800"
                    >
                      <div>
                        <p className="font-medium">{tx.description}</p>
                        <p className="text-xs text-slate-400">
                          {tx.day}/{tx.month}/{tx.year}
                        </p>
                      </div>

                      <p
                        className={`font-semibold ${
                          tx.type === "INCOME"
                            ? "text-green-400"
                            : "text-red-400"
                        }`}
                      >
                        {formatCurrency(tx.amount)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* SIDEBAR */}
          <div className="space-y-6">

            {/* RESUMO */}
            {summary && (
              <div className="p-6 rounded-2xl bg-white/5 border border-white/10 space-y-5">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-400">
                    Receitas
                  </span>
                  <span className="text-green-400 font-semibold">
                    + {formatCurrency(summary.income)}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-400">
                    Despesas
                  </span>
                  <span className="text-red-400 font-semibold">
                    - {formatCurrency(summary.expenses)}
                  </span>
                </div>

                <div className="border-t border-slate-800 pt-4 flex justify-between items-center">
                  <span className="text-sm text-slate-400">
                    Resultado
                  </span>
                  <span className="font-bold">
                    {formatCurrency(summary.balance)}
                  </span>
                </div>
              </div>
            )}

            {/* CONTADOR */}
            <div className="p-6 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-4">
              <FaChartLine className="text-indigo-400" />
              <div>
                <p className="text-sm text-slate-400">
                  Total de Transações
                </p>
                <p className="text-2xl font-bold">
                  {account._count?.transactions ?? 0}
                </p>
              </div>
            </div>

          </div>
        </div>
      </div>

      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => !isDeleting && setIsDeleteModalOpen(false)}
        onConfirm={handleDelete}
        title="Excluir conta"
        message="Esta ação não poderá ser desfeita."
        confirmText="Excluir"
        variant="danger"
        isLoading={isDeleting}
      />
    </>
  );
}
