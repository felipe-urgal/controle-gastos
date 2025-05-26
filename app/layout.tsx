import type { Metadata } from "next";
import "./globals.css";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { AuthProvider } from "@/app/context/AuthContext";

export const metadata: Metadata = {
  title: "Controle de Gastos",
  description: "Ferramenta para controlar seus gastos financeiros",
  openGraph: {
    siteName: 'Controle de Gastos',
    images: [
      {
        url: '/logo.jpg',
        width: 800,
        height: 600,
      },
      {
        url: '/logo.jpg',
        width: 1800,
        height: 1600,
        alt: 'My custom alt',
      },
    ],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    images: ['/logo.jpg'],
  },
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
