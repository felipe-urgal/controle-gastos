import { ReactNode, ButtonHTMLAttributes, forwardRef } from "react";

type ButtonVariant = "primary" | "secondary" | "danger" | "success" | "warning" | "info" | "ghost" | "link" | "outline" | "dark" | "light";
type ButtonSize = "xs" | "sm" | "md" | "lg" | "xl";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children?: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  icon?: ReactNode;
  iconPosition?: "left" | "right";
  isLoading?: boolean;
  fullWidth?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      onClick,
      type = "button",
      variant = "primary",
      size = "md",
      className = "",
      disabled = false,
      icon,
      iconPosition = "left",
      isLoading = false,
      fullWidth = false,
      ...props
    },
    ref
  ) => {
    const baseClasses = "inline-flex items-center justify-center font-medium transition-all duration-200 ease-out focus:outline-none focus:ring-3 disabled:opacity-60 disabled:cursor-not-allowed transform hover:scale-[1.02] active:scale-[0.98] rounded-xl";
    
    const variants: Record<ButtonVariant, string> = {
      primary: "bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 focus:ring-blue-400/40",
      secondary: "bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-700 hover:to-slate-800 text-white shadow-lg shadow-slate-500/20 hover:shadow-slate-500/30 focus:ring-slate-400/40",
      danger: "bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white shadow-lg shadow-red-500/20 hover:shadow-red-500/30 focus:ring-red-400/40",
      success: "bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 focus:ring-emerald-400/40",
      warning: "bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white shadow-lg shadow-amber-500/20 hover:shadow-amber-500/30 focus:ring-amber-400/40",
      info: "bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700 text-white shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/30 focus:ring-cyan-400/40",
      ghost: "bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 focus:ring-slate-400/20",
      link: "bg-transparent text-blue-600 hover:text-blue-800 underline-offset-4 hover:underline focus:ring-blue-400/20 p-0",
      outline: "bg-transparent border-2 border-blue-500 text-blue-600 hover:bg-blue-500 hover:text-white focus:ring-blue-400/40 dark:border-blue-400 dark:text-blue-400 dark:hover:bg-blue-400 dark:hover:text-white",
      dark: "bg-gradient-to-r from-gray-800 to-gray-900 hover:from-gray-900 hover:to-black text-white shadow-lg shadow-gray-800/20 hover:shadow-gray-800/30 focus:ring-gray-600/40",
      light: "bg-gradient-to-r from-gray-100 to-gray-200 hover:from-gray-200 hover:to-gray-300 text-gray-800 shadow-lg shadow-gray-300/20 hover:shadow-gray-300/30 focus:ring-gray-400/40"
    };

    const sizes: Record<ButtonSize, string> = {
      xs: "px-3 py-1.5 text-xs gap-1",
      sm: "px-4 py-2 text-sm gap-1.5",
      md: "px-5 py-2.5 text-md gap-2",
      lg: "px-6 py-3 text-base gap-2.5",
      xl: "px-8 py-4 text-lg gap-3"
    };

    const iconSizes: Record<ButtonSize, string> = {
      xs: "text-xs",
      sm: "text-sm",
      md: "text-md",
      lg: "text-base",
      xl: "text-lg"
    };

    return (
      <button
        ref={ref}
        type={type}
        onClick={onClick}
        disabled={disabled || isLoading}
        className={`
          ${baseClasses}
          ${variants[variant]}
          ${sizes[size]}
          ${fullWidth ? "w-full" : "w-auto"}
          ${className}
          relative overflow-hidden
          group
        `}
        {...props}
      >
        {/* Efeito de brilho no hover */}
        <span className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 transform -translate-x-full group-hover:translate-x-full"></span>
        
        {/* Loading spinner */}
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-inherit rounded-xl">
            <div className={`animate-spin rounded-full border-2 border-solid border-current border-t-transparent ${iconSizes[size]}`} style={{ width: '1em', height: '1em' }} />
          </div>
        )}
        
        {/* Conteúdo do botão (escondido durante loading) */}
        <span className={`flex items-center ${isLoading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-200`}>
          {icon && iconPosition === "left" && (
            <span className={`flex-shrink-0 ${children ? 'mr-2' : ''}`}>{icon}</span>
          )}
          {children}
          {icon && iconPosition === "right" && (
            <span className={`flex-shrink-0 ${children ? 'ml-2' : ''}`}>{icon}</span>
          )}
        </span>
      </button>
    );
  }
);

Button.displayName = "Button";

export default Button;