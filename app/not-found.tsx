import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-800 text-gray-400 p-4">
      <h1 className="text-4xl font-bold mb-4">404 - Página não encontrada</h1>
      <p className="text-lg mb-6">A página que você está procurando não existe ou foi removida.</p>
      <Link href="/" className="text-blue-600 hover:underline">Voltar para a home</Link>
    </div>
  );
}