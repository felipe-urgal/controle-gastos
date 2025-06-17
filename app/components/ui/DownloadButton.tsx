import { FaDownload, FaSpinner } from "react-icons/fa";

interface DownloadButtonProps {
  onClick: () => void;
  isLoading: boolean;
  disabled: boolean;
  label: string;
  variant?: "primary" | "secondary";
}

const DownloadButton = ({
  onClick,
  isLoading,
  disabled,
  label,
  variant = "primary"
}: DownloadButtonProps) => (
  <button
    onClick={onClick}
    disabled={disabled || isLoading}
    className={`flex items-center justify-center px-4 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 ${
      variant === "primary" 
        ? "bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-500 text-white" 
        : "bg-gray-600 hover:bg-gray-700 focus:ring-gray-500 text-white"
    } disabled:opacity-50 transition-colors duration-200`}
  >
    {isLoading ? (
      <span className="flex items-center">
        <FaSpinner className="animate-spin mr-2" />
        Gerando...
      </span>
    ) : (
      <span className="flex items-center">
        <FaDownload className="mr-2" />
        {label}
      </span>
    )}
  </button>
);

export default DownloadButton;
