import { useTheme } from "@/app/context/ThemeContext";
import { Button } from "@/app/components"; // ajuste o caminho conforme necessário

interface TabNavigationProps {
  activeTab: 'transactions' | 'investments';
  onTabChange: (tab: 'transactions' | 'investments') => void;
}

export default function TabNavigation({ activeTab, onTabChange }: TabNavigationProps) {
  const { resolvedTheme } = useTheme();

  const containerStyle = resolvedTheme === 'dark' ? 'bg-gray-700' : 'bg-white';

  return (
    <div className={`flex space-x-1 ${containerStyle} rounded-full p-1 shadow-inner`}>
      <Button
        onClick={() => onTabChange('transactions')}
        variant={activeTab === 'transactions' ? 'primary' : 'ghost'}
        size="sm"
        className={`flex-1 rounded-full ${
          activeTab === 'transactions' 
            ? '' 
            : resolvedTheme === 'dark' 
              ? 'text-gray-400 hover:text-gray-200' 
              : 'text-gray-600 hover:text-gray-800'
        }`}
        fullWidth
      >
        Transações
      </Button>
      <Button
        onClick={() => onTabChange('investments')}
        variant={activeTab === 'investments' ? 'primary' : 'ghost'}
        size="sm"
        className={`flex-1 rounded-full ${
          activeTab === 'investments' 
            ? '' 
            : resolvedTheme === 'dark' 
              ? 'text-gray-400 hover:text-gray-200' 
              : 'text-gray-600 hover:text-gray-800'
        }`}
        fullWidth
      >
        Investimentos
      </Button>
    </div>
  );
}