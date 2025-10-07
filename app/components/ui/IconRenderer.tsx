// app/components/ui/IconRenderer.tsx
'use client';

import { 
  // Ícones principais de finanças
  FaMoneyBill, FaPiggyBank, FaChartLine, FaCoins, FaCreditCard, FaWallet,
  FaLandmark, FaMoneyCheck, FaReceipt, FaHandHoldingUsd,
  
  // Categorias de despesas
  FaShoppingCart, FaUtensils, FaCar, FaGasPump, FaHome, FaBolt, 
  FaWifi, FaPhone, FaTv, FaHeart, FaGraduationCap, FaGamepad, 
  FaFilm, FaMusic, FaPlane, FaUmbrellaBeach, FaTshirt, FaGift,
  
  // Utilitários e ações
  FaTag,
  
  // Contas e transações
  FaUser,
} from 'react-icons/fa';

// Mapeamento focado em finanças pessoais
export const ICON_MAP: any = {
  // ===== ÍCONES PRINCIPAIS DE FINANÇAS =====
  'money-bill': FaMoneyBill,
  'piggy-bank': FaPiggyBank,
  'chart-line': FaChartLine,
  'coins': FaCoins,
  'credit-card': FaCreditCard,
  'wallet': FaWallet,
  'bank': FaLandmark,
  'money-check': FaMoneyCheck,
  'receipt': FaReceipt,
  'cash': FaHandHoldingUsd,
  
  // ===== CATEGORIAS DE DESPESAS =====
  // Alimentação
  'food': FaUtensils,
  'groceries': FaShoppingCart,
  
  // Transporte
  'transport': FaCar,
  'fuel': FaGasPump,
  
  // Moradia
  'housing': FaHome,
  'electricity': FaBolt,
  'internet': FaWifi,
  'phone': FaPhone,
  'tv': FaTv,
  
  // Saúde
  'health': FaHeart,
  
  // Educação
  'education': FaGraduationCap,
  
  // Entretenimento
  'entertainment': FaGamepad,
  'movies': FaFilm,
  'music': FaMusic,
  'games': FaGamepad,
  
  // Viagens e Lazer
  'travel': FaPlane,
  'vacation': FaUmbrellaBeach,
  
  // Vestuário e Pessoal
  'clothing': FaTshirt,
  'shopping': FaShoppingCart,
  'gifts': FaGift,
  'personal': FaUser,
  
  // ===== UTILITÁRIOS =====
  'tag': FaTag
};

// Labels em português para finanças pessoais
export const ICON_LABELS: any = {
  // ===== ÍCONES PRINCIPAIS DE FINANÇAS =====
  'money-bill': 'Dinheiro',
  'piggy-bank': 'Economias',
  'chart-line': 'Investimentos',
  'coins': 'Moedas',
  'credit-card': 'Cartão de Crédito',
  'wallet': 'Carteira',
  'bank': 'Banco',
  'money-check': 'Conta Corrente',
  'receipt': 'Recibo',
  'cash': 'Dinheiro',
  
  // ===== CATEGORIAS DE DESPESAS =====
  'food': 'Alimentação',
  'groceries': 'Mercado',
  'transport': 'Transporte',
  'fuel': 'Combustível',
  'housing': 'Moradia',
  'electricity': 'Energia',
  'internet': 'Internet',
  'phone': 'Telefone',
  'tv': 'TV/Streaming',
  'health': 'Saúde',
  'education': 'Educação',
  'entertainment': 'Entretenimento',
  'movies': 'Cinema',
  'music': 'Música',
  'games': 'Jogos',
  'travel': 'Viagens',
  'vacation': 'Férias',
  'clothing': 'Roupas',
  'shopping': 'Compras',
  'gifts': 'Presentes',
  'personal': 'Pessoal',
  
  // ===== UTILITÁRIOS =====
  'tag': 'Tag'
};

// Agrupamentos lógicos para finanças pessoais
export const ICON_GROUPS: any = {
  // Categorias de despesas
  expenseCategories: ['food', 'groceries', 'transport', 'housing', 'health', 'education', 'entertainment', 'travel', 'clothing'],
  
  // Tipos de contas
  accountTypes: ['checking', 'savings', 'investment', 'credit'],
  
  // Operações financeiras
  transactions: ['income', 'expense', 'transfer'],
  
  // Ações do usuário
  actions: ['add', 'edit', 'delete', 'save', 'search', 'filter'],
  
  // Metas e planejamento
  goals: ['goal', 'target', 'milestone'],
  
  // Indicadores visuais
  indicators: ['up', 'down', 'success', 'error', 'warning', 'info']
};

export default function IconRenderer({ 
  iconName, 
  size = 16, 
  className = '', 
  color,
  ...props 
}: any) {
  const IconComponent = ICON_MAP[iconName] || FaTag;
  
  const style = color ? { color } : undefined;
  
  return (
    <IconComponent 
      size={size} 
      className={className}
      style={style}
      {...props} 
    />
  );
}

// Hook para usar os ícones
export function useIcons() {
  const getIconLabel = (iconName: string): string => {
    return ICON_LABELS[iconName] || iconName.split('-').map((word: any) => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const getIconsByGroup = (group: string): string[] => {
    return ICON_GROUPS[group] || [];
  };

  const getAllIcons = (): string[] => {
    return Object.keys(ICON_MAP);
  };

  const searchIcons = (query: string): string[] => {
    const searchTerm = query.toLowerCase();
    return getAllIcons().filter(icon => 
      icon.toLowerCase().includes(searchTerm) || 
      getIconLabel(icon).toLowerCase().includes(searchTerm)
    );
  };

  return {
    ICON_MAP,
    ICON_LABELS,
    ICON_GROUPS,
    getIconLabel,
    getIconsByGroup,
    getAllIcons,
    searchIcons
  };
}