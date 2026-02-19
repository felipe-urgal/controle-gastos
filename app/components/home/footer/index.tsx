export default function Footer() {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="py-10 text-center text-sm text-slate-400 border-t border-slate-200 dark:border-slate-800">
      <p>
        © {currentYear} Controle de Gastos. 
        <span className="block sm:inline sm:ml-1">
          Todos os direitos reservados.
        </span>
      </p>
    </footer>
  );
}