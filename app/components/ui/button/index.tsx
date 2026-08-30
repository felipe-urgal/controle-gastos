'use client';

import {
  forwardRef,
  ButtonHTMLAttributes,
  AnchorHTMLAttributes,
  ReactNode,
} from 'react';

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

type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'success'
  | 'danger'
  | 'warning'
  | 'info'
  | 'outline'
  | 'ghost'
  | 'link';

type ButtonSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

type ButtonProps = BaseButtonProps &
  (BaseButtonProps['as'] extends 'a'
    ? AnchorHTMLAttributes<HTMLAnchorElement>
    : ButtonHTMLAttributes<HTMLButtonElement>);

const Button = forwardRef<HTMLButtonElement | HTMLAnchorElement, ButtonProps>(
  (
    {
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
      ripple: _ripple = true,
      href,
      target,
      rel,
      as = 'button',
      ...props
    },
    ref,
  ) => {
    const baseClasses = `
      relative inline-flex items-center justify-center overflow-hidden
      rounded-[var(--radius-md)] border border-transparent
      font-semibold leading-none
      transition-[background-color,border-color,color,box-shadow,transform]
      duration-150 ease-out
      focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2
      focus-visible:outline-[var(--focus)]
      disabled:cursor-not-allowed disabled:opacity-50
      ${!disabled && !isLoading ? 'active:translate-y-px' : ''}
    `;

    const variantMap: Record<ButtonVariant, string> = {
      primary:
        'bg-[var(--primary)] text-[var(--on-primary)] hover:bg-[var(--primary-hover)] shadow-sm',
      secondary:
        'bg-[var(--surface-raised)] text-[var(--foreground)] border-[var(--border)] hover:bg-[var(--surface-hover)] hover:border-[var(--border-strong)]',
      success:
        'bg-[var(--primary)] text-[var(--on-primary)] hover:bg-[var(--primary-hover)]',
      danger:
        'bg-[var(--danger)] text-[var(--on-danger)] hover:bg-[var(--danger-hover)]',
      warning:
        'bg-[var(--warning)] text-[var(--on-warning)] hover:brightness-95',
      info:
        'bg-[var(--info)] text-[var(--on-info)] hover:brightness-95',
      outline:
        'bg-transparent text-[var(--foreground)] border-[var(--border-strong)] hover:bg-[var(--surface-hover)]',
      ghost:
        'bg-transparent text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)]',
      link:
        'bg-transparent text-[var(--primary)] hover:text-[var(--primary-hover)] hover:underline underline-offset-4',
    };

    const isIconOnly = Boolean(icon && !children);

    const sizes: Record<ButtonSize, string> = {
      xs: isIconOnly
        ? 'p-2 min-h-11 min-w-11'
        : 'px-3 py-2 text-sm gap-1.5 min-h-9',
      sm: isIconOnly
        ? 'p-2.5 min-h-11 min-w-11'
        : 'px-4 py-2.5 text-sm gap-2 min-h-11',
      md: isIconOnly
        ? 'p-3 min-h-11 min-w-11'
        : 'px-5 py-3 text-base gap-2.5 min-h-11',
      lg: isIconOnly
        ? 'p-3.5 min-h-12 min-w-12'
        : 'px-6 py-3.5 text-lg gap-3 min-h-12',
      xl: isIconOnly
        ? 'p-4 min-h-14 min-w-14'
        : 'px-8 py-4 text-xl gap-4 min-h-14',
    };

    const iconSizes: Record<ButtonSize, string> = {
      xs: 'w-4 h-4',
      sm: 'w-4 h-4',
      md: 'w-5 h-5',
      lg: 'w-5 h-5',
      xl: 'w-6 h-6',
    };

    const spinnerSizes: Record<ButtonSize, string> = {
      xs: 'w-4 h-4 border-2',
      sm: 'w-4 h-4 border-2',
      md: 'w-5 h-5 border-2',
      lg: 'w-5 h-5 border-2',
      xl: 'w-6 h-6 border-2',
    };

    const content = (
      <>
        {isLoading && (
          <span
            className="absolute inset-0 flex items-center justify-center gap-2 bg-inherit"
            aria-hidden="true"
          >
            <span
              className={`animate-spin rounded-full border-solid border-current border-t-transparent ${spinnerSizes[size]}`}
            />
            {loadingText && <span className="text-sm">{loadingText}</span>}
          </span>
        )}

        <span
          className={`flex items-center justify-center transition-opacity duration-150 ${
            isLoading ? 'opacity-0' : 'opacity-100'
          }`}
        >
          {icon && iconPosition === 'left' && (
            <span
              className={`flex shrink-0 items-center justify-center ${iconSizes[size]} ${
                children ? 'mr-2' : ''
              }`}
              aria-hidden="true"
            >
              {icon}
            </span>
          )}

          {children}

          {icon && iconPosition === 'right' && (
            <span
              className={`flex shrink-0 items-center justify-center ${iconSizes[size]} ${
                children ? 'ml-2' : ''
              }`}
              aria-hidden="true"
            >
              {icon}
            </span>
          )}
        </span>
      </>
    );

    const classes = `
      ${baseClasses}
      ${variantMap[variant]}
      ${sizes[size]}
      ${fullWidth ? 'w-full' : 'w-auto'}
      ${className}
    `;

    if (href && as === 'a') {
      const linkProps = props as AnchorHTMLAttributes<HTMLAnchorElement>;
      const isUnavailable = disabled || isLoading;

      return (
        <a
          ref={ref as React.Ref<HTMLAnchorElement>}
          href={isUnavailable ? undefined : href}
          target={target}
          rel={target === '_blank' ? 'noopener noreferrer' : rel}
          aria-disabled={isUnavailable || undefined}
          aria-busy={isLoading || undefined}
          tabIndex={isUnavailable ? -1 : linkProps.tabIndex}
          className={`${classes} ${isUnavailable ? 'pointer-events-none opacity-50' : ''}`}
          onClick={
            !isUnavailable
              ? (onClick as React.MouseEventHandler<HTMLAnchorElement>)
              : undefined
          }
          {...linkProps}
        >
          {content}
        </a>
      );
    }

    const buttonProps = props as ButtonHTMLAttributes<HTMLButtonElement>;

    return (
      <button
        ref={ref as React.Ref<HTMLButtonElement>}
        type={type}
        onClick={(event) => {
          if (disabled || isLoading) return;
          onClick?.(event);
        }}
        disabled={disabled || isLoading}
        aria-busy={isLoading || undefined}
        className={`${classes} ${isLoading ? 'cursor-wait' : ''}`}
        {...buttonProps}
      >
        {content}
      </button>
    );
  },
);

Button.displayName = 'Button';

export default Button;
