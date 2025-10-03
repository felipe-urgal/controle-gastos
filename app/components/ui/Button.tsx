import { forwardRef } from "react";
import { useThemeColors } from '@/app/hook/useThemeColors';

const Button = forwardRef(
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
    }: any,
    ref: any
  ) => {
    const themeColors = useThemeColors();

    const baseClasses = "inline-flex items-center justify-center font-medium transition-all duration-200 ease-out focus:outline-none focus:ring-3 disabled:opacity-60 disabled:cursor-not-allowed transform hover:scale-[1.02] active:scale-[0.98] rounded-full";
    
    // Variantes usando o hook de cores
    const getVariantClasses = (variant: string) => {
      const buttonColors = themeColors.button[variant] || themeColors.button.primary;
      
      const baseVariant = [
        buttonColors.bg,
        buttonColors.text,
        buttonColors.shadow,
        buttonColors.focus
      ].join(' ');

      // Variantes especiais
      const extraClasses = {
        link: buttonColors.extra || '',
        outline: buttonColors.border || ''
      }[variant] || '';

      return `${baseVariant} ${extraClasses}`.trim();
    };

    const sizes: any = {
      xs: "px-3 py-1.5 text-xs gap-1",
      sm: "px-4 py-2 text-sm gap-1.5",
      md: "px-5 py-2.5 text-md gap-2",
      lg: "px-6 py-3 text-base gap-2.5",
      xl: "px-8 py-4 text-lg gap-3"
    };

    const iconSizes: any = {
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
          ${getVariantClasses(variant)}
          ${sizes[size]}
          ${fullWidth ? "w-full" : "w-auto"}
          ${className}
          relative overflow-hidden
          group
        `}
        {...props}
      >
        {/* Efeito de brilho no hover - usando o hook de cores */}
        <span className={`absolute inset-0 ${themeColors.utils.glowEffect} opacity-0 group-hover:opacity-100 transition-opacity duration-300 transform -translate-x-full group-hover:translate-x-full`}></span>
        
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
