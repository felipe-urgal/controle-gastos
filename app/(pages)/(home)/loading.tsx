// Esqueleto leve exibido na troca de seção, enquanto o servidor monta a próxima tela.
export default function HomeLoading() {
  return (
    <div className="mt-4 space-y-4" role="status" aria-label="Carregando">
      <div className="h-10 w-48 animate-pulse rounded-[var(--radius-md)] bg-[var(--skeleton)]" />
      <div className="h-40 animate-pulse rounded-[var(--radius-lg)] bg-[var(--skeleton)]" />
      <div className="h-64 animate-pulse rounded-[var(--radius-lg)] bg-[var(--skeleton)]" />
    </div>
  );
}
