import { ReactNode, ButtonHTMLAttributes } from "react";

type ButtonVariant = "primary" | "secondary" | "danger" | "success" | "ghost" | "link" | "default";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children?: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  icon?: ReactNode;
  iconPosition?: "left" | "right";
  fullWidth?: boolean;
  isLoading?: boolean;
}

export const Button = ({
  children,
  onClick,
  type = "button",
  variant = "default",
  size = "md",
  className = "",
  disabled = false,
  icon,
  iconPosition = "left",
  fullWidth = false,
  isLoading = false,
  ...props
}: ButtonProps) => {
  const baseClasses = "inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none";
  
  const variants: Record<ButtonVariant, string> = {
    primary: "bg-blue-600 text-white hover:bg-blue-700 focus-visible:ring-blue-500",
    secondary: "bg-gray-600 text-white hover:bg-gray-700 focus-visible:ring-gray-500",
    danger: "bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500",
    success: "bg-green-600 text-white hover:bg-green-700 focus-visible:ring-green-500",
    ghost: "hover:bg-gray-100 text-gray-800 dark:hover:bg-gray-800 dark:text-gray-100",
    link: "text-blue-600 hover:text-blue-800 underline-offset-4 bg-transparent",
    default: ""
  };

  const sizes: Record<ButtonSize, string> = {
    sm: "h-8 px-3 text-sm",
    md: "h-10 px-4",
    lg: "h-12 px-6 text-lg",
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || isLoading}
      className={`
        ${baseClasses}
        ${variant ? variants[variant] : ""}
        ${sizes[size]}
        ${fullWidth ? "w-full" : ""}
        ${className}
      `}
      {...props}
    >
      {isLoading && (
        <span className="mr-2 animate-spin">
          {/* Substitua por seu ícone de loading */}
          <div className="max-w-5xl mx-auto p-4 flex justify-center items-center">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        </span>
      )}
      {!isLoading && icon && iconPosition === "left" && (
        <span className="mr-2">{icon}</span>
      )}
      {children}
      {!isLoading && icon && iconPosition === "right" && (
        <span className="ml-2">{icon}</span>
      )}
    </button>
  );
};