import type { Metadata } from "next";
import "./globals.css";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { AuthProvider } from "@/app/context/AuthContext";

export const metadata: Metadata = {
  title: "Controle de Gastos",
  description: "Ferramenta para controlar seus gastos financeiros",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body className="antialiased">
        <AuthProvider>
          <ToastContainer
            position="bottom-center"
            autoClose={1500}
            hideProgressBar={true}
            closeOnClick
            pauseOnHover
            draggable
            toastClassName="text-sm px-3 py-2 rounded shadow-md max-w-[90vw] bg-white text-black"
            className="text-sm"
          />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
