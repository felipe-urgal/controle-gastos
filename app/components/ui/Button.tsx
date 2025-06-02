import { ReactNode } from "react";

type ButtonProps = {
  children?: ReactNode;
  onClick?: () => void;
  type?: "button" | "submit" | "reset";
  variant?: "primary" | "secondary" | "danger" | "success";
  className?: string;
  disabled?: boolean;
  icon?: ReactNode;
  title?: string;
};

export const Button = ({
  children,
  onClick,
  type = "button",
  variant = "primary",
  className = "",
  disabled = false,
  icon,
  title=""
}: ButtonProps) => {
  const variants = {
    primary: "hover:bg-blue-700",
    secondary: "hover:bg-gray-700",
    danger: "hover:bg-red-700",
    success: "hover:bg-green-700",
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`
        w-auto min-w-[150px] h-10 duration-600 text-gray-500 cursor-pointer border border-gray-600 flex 
        items-center justify-center gap-2 px-2 mx-2 rounded-md font-medium transition-colors
        hover:text-white ${variants[variant]} ${className} ${
        disabled ? "disabled:opacity-30 disabled:cursor-not-allowed" : ""
      }`}
    >
      {icon && <span>{icon}</span>}
      {title}
      {children}
    </button>
  );
};