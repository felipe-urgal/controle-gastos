"use client";

// Hook
// import { useCallback } from "react";
// Context
import { useAuth } from "@/app/context/AuthContext";
// Components
import ProtectedRoute from "@/app/components/ProtectedRoute";
import Breadcrumb from "@/app/components/Breadcrumb";
// import { TransactionSummary } from "@/app/components/transactions/TransactionSummary";

export default function ContasPage() {
  const { user } = useAuth();
  // const currentYear = new Date().getFullYear();
  // const currentMonth = new Date().getMonth() +1;

  // const [transactions, setTransactions] = useState<Transacao[]>([]);
  // const transactions = []
  // const [analytics, setAnalytics] = useState<Transacao[]>([]);
  // const [loading, setLoading] = useState(true);

  // const fetchDados = useCallback(async () => {
  //   if (!user) return;

  //   // setLoading(true);

  //   try {
  //     const { transactions } = await fetchTransactionsReports(user.id, currentMonth, currentYear);

  //     setTransactions(transactions);
  //     // setAnalytics(analytics);

  //   } catch (error) {
  //     console.error("Erro ao carregar dados:", error);
  //     let errorMessage = "Erro ao carregar dados";
  //     if (error instanceof Error) {
  //       errorMessage += `: ${error.message}`;
  //     }
  //     toast.error(errorMessage);
  //   } finally {
  //     // setLoading(false);
  //   }

  // }, [user, currentMonth, currentYear]);

  // useEffect(() => {
  //   fetchDados();
  // }, [fetchDados]);

  // const calcularSaldo = useCallback(
  //   (type: "INVESTMENT" | "INCOME" | "EXPENSE" | "TRANSFER") => {
  //     return transactions.reduce(
  //       (total, transaction) => total + (transaction.type === type ? Number(transaction.amount) : 0),
  //       0
  //     );
  //   },
  //   [transactions]
  // );

  if (!user) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="loader"></div>
      </div>
    );
  }

  return (
    <ProtectedRoute>
      <Breadcrumb />
      <div className="max-w-7xl mx-auto">
        {/*<TransactionSummary
          // transacoes={transactions}
          // categorias={[]}
          saldo={calcularSaldo("INCOME") - calcularSaldo("EXPENSE")}
          saldoRenda={calcularSaldo("INCOME")}
          saldoDespesa={calcularSaldo("EXPENSE")}
          saldoInvestimentos={calcularSaldo("INVESTMENT")}
          mes={currentMonth}
          ano={currentYear}
        />*/}
      </div>
    </ProtectedRoute>
  );
}