'use client';

// importing hooks
import { forwardRef, ButtonHTMLAttributes, AnchorHTMLAttributes, ReactNode } from 'react';

// Interface base com as props comuns
interface BaseButtonProps {
  children?: ReactNode;
  onClick?: (e: React.MouseEvent<HTMLButtonElement | HTMLAnchorElement>) => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  disabled?: boolean;
  icon?: ReactNode;
  iconPosition?: 'left' | 'right';
  isLoading?: boolean;
  fullWidth?: boolean;
  loadingText?: string;
  ripple?: boolean;
  href?: string;
  target?: string;
  rel?: string;
  as?: 'button' | 'a';
}

// types
type ButtonVariant = 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info' | 'outline' | 'ghost' | 'link';
type ButtonSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

type ButtonProps = BaseButtonProps & 
  (BaseButtonProps['as'] extends 'a' 
    ? AnchorHTMLAttributes<HTMLAnchorElement> 
    : ButtonHTMLAttributes<HTMLButtonElement>);

const Button = forwardRef<HTMLButtonElement | HTMLAnchorElement, ButtonProps>(({
  children,
  onClick,
  type = 'button',
  variant = 'primary',
  size = 'md',
  className = '',
  disabled = false,
  icon,
  iconPosition = 'left',
  isLoading = false,
  fullWidth = false,
  loadingText,
  ripple = true,
  href,
  target,
  rel,
  as = 'button',
  ...props
}, ref) => {

  const baseClasses = `
    inline-flex items-center justify-center
    font-medium
    transition-all duration-200 ease-out
    focus:outline-none focus:ring-2 focus:ring-offset-2
    disabled:opacity-50 disabled:cursor-not-allowed
    disabled:hover:scale-100 disabled:active:scale-100
    ${!disabled && !isLoading ? 'hover:scale-[1.00] active:scale-[0.98]' : ''}
    rounded-xl
    relative overflow-hidden
  `;

  const getVariantClasses = (variant: ButtonVariant) => {
    const variantMap = {
      primary: 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-600/30 focus:ring-purple-500 hover:shadow-xl hover:shadow-purple-600/40',
      secondary: 'bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white shadow-md focus:ring-slate-500 hover:bg-slate-300 dark:hover:bg-slate-600',
      success: 'bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-lg shadow-green-600/30 focus:ring-green-500 hover:shadow-xl hover:shadow-green-600/40',
      danger: 'bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-lg shadow-red-600/30 focus:ring-red-500 hover:shadow-xl hover:shadow-red-600/40',
      warning: 'bg-gradient-to-r from-yellow-500 to-amber-500 text-white shadow-lg shadow-yellow-500/30 focus:ring-yellow-500 hover:shadow-xl hover:shadow-yellow-500/40',
      info: 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-lg shadow-blue-600/30 focus:ring-blue-500 hover:shadow-xl hover:shadow-blue-600/40',
      outline: 'bg-transparent border-2 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white focus:ring-purple-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:border-slate-400 dark:hover:border-slate-500',
      ghost: 'bg-transparent text-slate-900 dark:text-white focus:ring-purple-500 hover:bg-slate-100 dark:hover:bg-slate-800',
      link: 'bg-transparent text-purple-600 dark:text-purple-400 hover:underline underline-offset-2 focus:ring-purple-500',
    };
    return variantMap[variant] || variantMap.primary;
  };

  const isIconOnly = icon && !children;

  const sizes = {
    xs: isIconOnly ? 'p-2 min-h-[32px] min-w-[32px]' : 'px-3 py-1.5 text-xs gap-1.5 min-h-[32px]',
    sm: isIconOnly ? 'p-2.5 min-h-[36px] min-w-[36px]' : 'px-4 py-2 text-sm gap-2 min-h-[36px]',
    md: isIconOnly ? 'p-3 min-h-[42px] min-w-[42px]' : 'px-5 py-2.5 text-base gap-2.5 min-h-[42px]',
    lg: isIconOnly ? 'p-3.5 min-h-[48px] min-w-[48px]' : 'px-6 py-3 text-lg gap-3 min-h-[48px]',
    xl: isIconOnly ? 'p-4 min-h-[56px] min-w-[56px]' : 'px-8 py-4 text-xl gap-4 min-h-[56px]',
  };

  const iconSizes = {
    xs: 'w-3.5 h-3.5',
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
    xl: 'w-7 h-7',
  };

  const spinnerSizes = {
    xs: 'w-3 h-3 border-2',
    sm: 'w-4 h-4 border-2',
    md: 'w-5 h-5 border-2',
    lg: 'w-6 h-6 border-3',
    xl: 'w-7 h-7 border-3',
  };

  const content = (
    <>
      {/* Loading spinner */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center gap-2 bg-inherit rounded-xl backdrop-blur-sm">
          <div className={`
            animate-spin rounded-full border-solid border-current border-t-transparent
            ${spinnerSizes[size]}
          `} />
          {loadingText && (
            <span className="ml-2 text-sm">{loadingText}</span>
          )}
        </div>
      )}

      {/* Conteúdo do botão */}
      <span className={`
        flex items-center justify-center
        ${isLoading ? 'opacity-0' : 'opacity-100'}
        transition-opacity duration-200
      `}>
        {icon && iconPosition === 'left' && (
          <span
            className={`
              flex items-center justify-center flex-shrink-0
              ${iconSizes[size]}
              ${children ? 'mr-2' : ''}
            `}
          >
            {icon}
          </span>
        )}
        
        {children}

        {icon && iconPosition === 'right' && (
          <span
            className={`
              flex items-center justify-center flex-shrink-0
              ${iconSizes[size]}
              ${children ? 'ml-2' : ''}
            `}
          >
            {icon}
          </span>
        )}
      </span>
    </>
  );

  // Renderizar como link se href estiver presente
  if (href && as === 'a') {
    const linkProps = props as AnchorHTMLAttributes<HTMLAnchorElement>;
    
    return (
      <a
        ref={ref as React.Ref<HTMLAnchorElement>}
        href={href}
        target={target}
        rel={target === '_blank' ? 'noopener noreferrer' : rel}
        className={`
          ${baseClasses}
          ${getVariantClasses(variant)}
          ${sizes[size]}
          ${fullWidth ? 'w-full' : 'w-auto'}
          ${className}
          ${disabled ? 'pointer-events-none opacity-50' : ''}
        `}
        onClick={!disabled && !isLoading ? onClick as React.MouseEventHandler<HTMLAnchorElement> : undefined}
        {...linkProps}
      >
        {content}
      </a>
    );
  }

  // Renderizar como botão
  const buttonProps = props as ButtonHTMLAttributes<HTMLButtonElement>;
  
  return (
    <button
      ref={ref as React.Ref<HTMLButtonElement>}
      type={type}
      onClick={(e) => {
        if (disabled || isLoading) return;
        onClick?.(e as React.MouseEvent<HTMLButtonElement>);
      }}
      disabled={disabled || isLoading}
      className={`
        ${baseClasses}
        ${getVariantClasses(variant)}
        ${sizes[size]}
        ${fullWidth ? 'w-full' : 'w-auto'}
        ${className}
        ${isLoading ? 'cursor-wait' : ''}
      `}
      {...buttonProps}
    >
      {content}
    </button>
  );
});

Button.displayName = 'Button';

export default Button;
