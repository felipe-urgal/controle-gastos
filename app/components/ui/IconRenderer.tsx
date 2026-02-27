'use client';

// importing icons
import { IconType } from 'react-icons';
import { 
  // Ícones principais de finanças
  FaMoneyBill, FaPiggyBank, FaChartLine, FaCoins, FaCreditCard, FaWallet,
  FaLandmark, FaMoneyCheck, FaReceipt, FaHandHoldingUsd,
  
  // Categorias de despesas
  FaShoppingCart, FaUtensils, FaCar, FaGasPump, FaHome, FaBolt, 
  FaWifi, FaPhone, FaTv, FaHeart, FaGraduationCap, FaGamepad, 
  FaFilm, FaMusic, FaPlane, FaUmbrellaBeach, FaTshirt, FaGift,
  
  // Utilitários e ações
  FaTag, FaArrowUp, FaArrowDown, FaExchangeAlt,
  
  // Contas e transações
  FaUser, FaBuilding, FaUniversity,
} from 'react-icons/fa';

export interface IconDefinition {
  icon: IconType;
  label: string;
  category: 'finance' | 'expense' | 'income' | 'action' | 'account';
};

export const ICON_MAP: Record<string, IconDefinition> = {
  // ===== ÍCONES PRINCIPAIS DE FINANÇAS =====
  'money-bill': { icon: FaMoneyBill, label: 'Dinheiro', category: 'finance' },
  'piggy-bank': { icon: FaPiggyBank, label: 'Poupança', category: 'finance' },
  'chart-line': { icon: FaChartLine, label: 'Investimentos', category: 'finance' },
  'coins': { icon: FaCoins, label: 'Moedas', category: 'finance' },
  'credit-card': { icon: FaCreditCard, label: 'Cartão de Crédito', category: 'finance' },
  'wallet': { icon: FaWallet, label: 'Carteira', category: 'finance' },
  'bank': { icon: FaLandmark, label: 'Banco', category: 'account' },
  'university': { icon: FaUniversity, label: 'Instituição', category: 'account' },
  'money-check': { icon: FaMoneyCheck, label: 'Conta Corrente', category: 'account' },
  'receipt': { icon: FaReceipt, label: 'Recibo', category: 'finance' },
  'cash': { icon: FaHandHoldingUsd, label: 'Dinheiro', category: 'finance' },
  
  // ===== CATEGORIAS DE DESPESAS =====
  'food': { icon: FaUtensils, label: 'Alimentação', category: 'expense' },
  'groceries': { icon: FaShoppingCart, label: 'Mercado', category: 'expense' },
  'transport': { icon: FaCar, label: 'Transporte', category: 'expense' },
  'fuel': { icon: FaGasPump, label: 'Combustível', category: 'expense' },
  'housing': { icon: FaHome, label: 'Moradia', category: 'expense' },
  'electricity': { icon: FaBolt, label: 'Energia', category: 'expense' },
  'internet': { icon: FaWifi, label: 'Internet', category: 'expense' },
  'phone': { icon: FaPhone, label: 'Telefone', category: 'expense' },
  'tv': { icon: FaTv, label: 'TV/Streaming', category: 'expense' },
  'health': { icon: FaHeart, label: 'Saúde', category: 'expense' },
  'education': { icon: FaGraduationCap, label: 'Educação', category: 'expense' },
  'entertainment': { icon: FaGamepad, label: 'Entretenimento', category: 'expense' },
  'movies': { icon: FaFilm, label: 'Cinema', category: 'expense' },
  'music': { icon: FaMusic, label: 'Música', category: 'expense' },
  'games': { icon: FaGamepad, label: 'Jogos', category: 'expense' },
  'travel': { icon: FaPlane, label: 'Viagens', category: 'expense' },
  'vacation': { icon: FaUmbrellaBeach, label: 'Férias', category: 'expense' },
  'clothing': { icon: FaTshirt, label: 'Roupas', category: 'expense' },
  'gifts': { icon: FaGift, label: 'Presentes', category: 'expense' },
  'personal': { icon: FaUser, label: 'Pessoal', category: 'expense' },
  'building': { icon: FaBuilding, label: 'Imóvel', category: 'expense' },
  
  // ===== RECEITAS =====
  'income-up': { icon: FaArrowUp, label: 'Receita', category: 'income' },
  'income-down': { icon: FaArrowDown, label: 'Despesa', category: 'expense' },
  'transfer': { icon: FaExchangeAlt, label: 'Transferência', category: 'action' },
  
  // ===== UTILITÁRIOS =====
  'tag': { icon: FaTag, label: 'Tag', category: 'action' },
};

export const ICON_CATEGORIES = {
  finance: '💰 Finanças',
  account: '🏦 Contas',
  expense: '💸 Despesas',
  income: '📈 Receitas',
  action: '⚡ Ações',
};

interface IconRendererProps {
  iconName: string;
  size?: number;
  className?: string;
  color?: string;
  fallback?: IconType;
};

export default function IconRenderer({ 
  iconName, 
  size = 16, 
  className = '', 
  color,
  fallback = FaTag,
  ...props 
}: IconRendererProps) {
  const iconDef = ICON_MAP[iconName];
  const IconComponent = iconDef?.icon || fallback;
  
  return (
    <IconComponent 
      size={size} 
      className={className}
      style={color ? { color } : undefined}
      {...props} 
    />
  );
}

export function useIcons() {
  const getAllIcons = (): string[] => {
    return Object.keys(ICON_MAP);
  };

  const getIconsByCategory = (category: string): string[] => {
    return Object.entries(ICON_MAP)
      .filter(([, def]) => def.category === category)
      .map(([key]) => key);
  };

  const getIconLabel = (iconName: string): string => {
    return ICON_MAP[iconName]?.label || iconName;
  };

  const searchIcons = (query: string): Array<{key: string, def: IconDefinition}> => {
    const searchTerm = query.toLowerCase();
    return Object.entries(ICON_MAP)
      .filter(([key, def]) => 
        key.toLowerCase().includes(searchTerm) || 
        def.label.toLowerCase().includes(searchTerm)
      )
      .map(([key, def]) => ({ key, def }));
  };

  return {
    ICON_MAP,
    ICON_CATEGORIES,
    getAllIcons,
    getIconsByCategory,
    getIconLabel,
    searchIcons
  };
};
