import { FaDownload, FaSpinner } from "react-icons/fa";

interface DownloadButtonProps {
  onClick: () => void;
  isLoading: boolean;
  disabled: boolean;
  label: string;
  variant?: "primary" | "secondary" | "outline";
  size?: "sm" | "md" | "lg";
}

const DownloadButton = ({
  onClick,
  isLoading,
  disabled,
  label,
  variant = "primary",
  size = "md"
}: DownloadButtonProps) => {
  // Classes baseadas no variant
  const variantClasses = {
    primary: "bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 focus:ring-emerald-500/30 text-white shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30",
    secondary: "bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-700 hover:to-slate-800 focus:ring-slate-500/30 text-white shadow-lg shadow-slate-500/20 hover:shadow-slate-500/30",
    outline: "bg-transparent border-2 border-emerald-500 text-emerald-600 hover:bg-emerald-500 hover:text-white focus:ring-emerald-500/30 dark:text-emerald-400 dark:border-emerald-400 dark:hover:bg-emerald-400 dark:hover:text-white"
  };

  // Classes baseadas no size
  const sizeClasses = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-5 py-2.5 text-base",
    lg: "px-6 py-3 text-lg"
  };

  // Classes para ícones baseadas no size
  const iconSizeClasses = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base"
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled || isLoading}
      className={`
        flex items-center justify-center 
        rounded-lg 
        font-medium
        transition-all duration-300 ease-out
        focus:outline-none focus:ring-4 
        disabled:opacity-60 disabled:cursor-not-allowed
        transform hover:scale-[1.03] active:scale-[0.98]
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        relative overflow-hidden
        group
      `}
      aria-busy={isLoading}
      aria-label={isLoading ? "Gerando download" : label}
    >
      {/* Efeito de brilho no hover */}
      <span className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 transform -translate-x-full group-hover:translate-x-full"></span>
      
      {isLoading ? (
        <span className="flex items-center gap-2 relative z-10">
          <FaSpinner className={`animate-spin ${iconSizeClasses[size]}`} />
          <span>Gerando...</span>
        </span>
      ) : (
        <span className="flex items-center gap-2 relative z-10">
          <FaDownload className={iconSizeClasses[size]} />
          <span>{label}</span>
        </span>
      )}
      
      {/* Efeito de loading sutil */}
      {isLoading && (
        <div className="absolute bottom-0 left-0 w-full h-0.5 bg-white/30">
          <div className="h-full w-1/2 bg-white animate-[loading_1.5s_ease-in-out_infinite]"></div>
        </div>
      )}
    </button>
  );
};

export default DownloadButton;