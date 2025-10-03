// Icons
import { FaSpinner } from "react-icons/fa";
import { useThemeColors } from '@/app/hook/useThemeColors';

interface LoadingProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
  className?: string;
}

const Loading = ({ 
  size = 'md', 
  text = "Carregando dados...",
  className = "" 
}: LoadingProps) => {
  const theme = useThemeColors();

  const sizeClasses = {
    sm: "h-8 w-8 text-sm",
    md: "h-12 w-12 text-base", 
    lg: "h-16 w-16 text-lg"
  };

  const iconSizes = {
    sm: "text-lg",
    md: "text-xl",
    lg: "text-2xl"
  };

  return (
    <div className={`overflow-hidden flex flex-col items-center justify-center py-12 ${className}`}>
      <div className="relative">
        <div className={`animate-spin rounded-full border-t-2 border-b-2 ${theme.button.primary.bg.split(' ')[0]} ${sizeClasses[size]}`}></div>
        <FaSpinner className={`absolute inset-0 m-auto ${theme.colors.info.text} ${iconSizes[size]} animate-spin`} />
      </div>
      {text && (
        <p className={`${theme.text.tertiary} mt-4 text-center ${sizeClasses[size].split(' ')[2]}`}>
          {text}
        </p>
      )}
    </div>
  );
};

export default Loading;
