export default function Footer() {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="absolute bottom-0 left-0 right-0 pb-3 text-center text-slate-600 dark:text-slate-300 text-sm">
      <p>
        © {currentYear} Controle de Gastos. 
        <span className="block sm:inline sm:ml-1">
          Todos os direitos reservados.
        </span>
      </p>
    </footer>
  );
}