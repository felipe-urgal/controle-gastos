// app/components/ui/IconRenderer.tsx
'use client';

import { 
  // Ícones principais de finanças
  FaMoneyBill, FaPiggyBank, FaChartLine, FaCoins, FaCreditCard, FaWallet,
  FaLandmark, FaUniversity, FaMoneyCheck,
  FaReceipt, FaHandHoldingUsd, FaCashRegister, FaPercentage, FaCalculator,
  
  // Categorias de despesas
  FaShoppingCart, FaShoppingBag, FaUtensils, FaPizzaSlice, FaCoffee,
  FaCar, FaGasPump, FaHome, FaBolt, FaWifi, FaPhone, FaTv,
  FaHeart, FaHospital, FaStethoscope, FaPills, FaTooth,
  FaGraduationCap, FaBook, FaGamepad, FaFilm, FaMusic,
  FaPlane, FaHotel, FaUmbrellaBeach, FaGift, FaTshirt,
  
  // Utilitários e ações
  FaTag, FaPlus, FaMinus, FaTimes, FaCheck, FaSearch, FaFilter,
  FaArrowUp, FaArrowDown, FaArrowLeft, FaArrowRight,
  FaChevronUp, FaChevronDown, FaChevronLeft, FaChevronRight,
  FaCalendar, FaClock, FaChartBar, FaChartPie,
  
  // Status e indicadores
  FaExclamationTriangle, FaCheckCircle, FaTimesCircle, FaInfoCircle,
  FaQuestionCircle, FaBell, FaEye, FaEyeSlash, FaLock, FaUnlock,
  
  // Contas e transações
  FaExchangeAlt, FaUser, FaDownload, FaUpload,
  FaSync, FaHistory, FaTrash, FaEdit, FaCopy, FaSave,
  
  // Meta e objetivos
  FaBullseye, FaFlag, FaTrophy, FaStar, FaAward,
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
  'university': FaUniversity,
  'money-check': FaMoneyCheck,
  'receipt': FaReceipt,
  'cash': FaHandHoldingUsd,
  'cash-register': FaCashRegister,
  'percentage': FaPercentage,
  'calculator': FaCalculator,
  
  // ===== CATEGORIAS DE DESPESAS =====
  // Alimentação
  'food': FaUtensils,
  'restaurant': FaUtensils,
  'pizza': FaPizzaSlice,
  'coffee': FaCoffee,
  'groceries': FaShoppingCart,
  
  // Transporte
  'transport': FaCar,
  'car': FaCar,
  'fuel': FaGasPump,
  'taxi': FaCar,
  
  // Moradia
  'housing': FaHome,
  'rent': FaHome,
  'mortgage': FaHome,
  'electricity': FaBolt,
  'water': FaBolt,
  'internet': FaWifi,
  'phone': FaPhone,
  'tv': FaTv,
  
  // Saúde
  'health': FaHeart,
  'hospital': FaHospital,
  'doctor': FaStethoscope,
  'medicines': FaPills,
  'dentist': FaTooth,
  
  // Educação
  'education': FaGraduationCap,
  'books': FaBook,
  'courses': FaGraduationCap,
  
  // Entretenimento
  'entertainment': FaGamepad,
  'movies': FaFilm,
  'music': FaMusic,
  'games': FaGamepad,
  
  // Viagens e Lazer
  'travel': FaPlane,
  'hotel': FaHotel,
  'vacation': FaUmbrellaBeach,
  'leisure': FaUmbrellaBeach,
  
  // Vestuário e Pessoal
  'clothing': FaTshirt,
  'shopping': FaShoppingBag,
  'gifts': FaGift,
  'personal': FaUser,
  
  // ===== TIPOS DE CONTA =====
  'checking': FaMoneyCheck,
  'savings': FaPiggyBank,
  'investment': FaChartLine,
  'credit': FaCreditCard,
  'loan': FaUniversity,
  
  // ===== STATUS DE TRANSAÇÕES =====
  'income': FaDownload,
  'expense': FaUpload,
  'transfer': FaExchangeAlt,
  'pending': FaClock,
  'completed': FaCheckCircle,
  'failed': FaTimesCircle,
  'recurring': FaSync,
  
  // ===== METAS E OBJETIVOS =====
  'goal': FaBullseye,
  'target': FaBullseye,
  'milestone': FaFlag,
  'achievement': FaTrophy,
  'reward': FaAward,
  'star': FaStar,
  
  // ===== AÇÕES E OPERAÇÕES =====
  'add': FaPlus,
  'remove': FaMinus,
  'close': FaTimes,
  'confirm': FaCheck,
  'search': FaSearch,
  'filter': FaFilter,
  'edit': FaEdit,
  'delete': FaTrash,
  'copy': FaCopy,
  'save': FaSave,
  'history': FaHistory,
  
  // ===== NAVEGAÇÃO E SETAS =====
  'arrow-up': FaArrowUp,
  'arrow-down': FaArrowDown,
  'arrow-left': FaArrowLeft,
  'arrow-right': FaArrowRight,
  'chevron-up': FaChevronUp,
  'chevron-down': FaChevronDown,
  'chevron-left': FaChevronLeft,
  'chevron-right': FaChevronRight,
  
  // ===== RELATÓRIOS E ANÁLISE =====
  'chart': FaChartLine,
  'chart-bar': FaChartBar,
  'chart-pie': FaChartPie,
  'analytics': FaChartLine,
  'report': FaChartBar,
  
  // ===== TEMPO E CALENDÁRIO =====
  'calendar': FaCalendar,
  'clock': FaClock,
  'schedule': FaClock,
  
  // ===== SEGURANÇA E STATUS =====
  'warning': FaExclamationTriangle,
  'info': FaInfoCircle,
  'question': FaQuestionCircle,
  'notification': FaBell,
  'visible': FaEye,
  'hidden': FaEyeSlash,
  'locked': FaLock,
  'unlocked': FaUnlock,
  
  // ===== UTILITÁRIOS =====
  'category': FaTag,
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
  'university': 'Empréstimo',
  'money-check': 'Cheque',
  'receipt': 'Recibo',
  'cash': 'Dinheiro',
  'cash-register': 'Caixa',
  'percentage': 'Juros',
  'calculator': 'Calculadora',
  
  // ===== CATEGORIAS DE DESPESAS =====
  'food': 'Alimentação',
  'restaurant': 'Restaurante',
  'pizza': 'Delivery',
  'coffee': 'Café',
  'groceries': 'Mercado',
  
  // Transporte
  'transport': 'Transporte',
  'car': 'Carro',
  'fuel': 'Combustível',
  'taxi': 'Táxi',
  
  // Moradia
  'housing': 'Moradia',
  'rent': 'Aluguel',
  'mortgage': 'Hipoteca',
  'electricity': 'Energia',
  'water': 'Água',
  'internet': 'Internet',
  'phone': 'Telefone',
  'tv': 'TV/Streaming',
  
  // Saúde
  'health': 'Saúde',
  'hospital': 'Hospital',
  'doctor': 'Médico',
  'medicines': 'Remédios',
  'dentist': 'Dentista',
  
  // Educação
  'education': 'Educação',
  'books': 'Livros',
  'courses': 'Cursos',
  
  // Entretenimento
  'entertainment': 'Entretenimento',
  'movies': 'Cinema',
  'music': 'Música',
  'games': 'Jogos',
  
  // Viagens e Lazer
  'travel': 'Viagens',
  'hotel': 'Hotel',
  'vacation': 'Férias',
  'leisure': 'Lazer',
  
  // Vestuário e Pessoal
  'clothing': 'Roupas',
  'shopping': 'Compras',
  'gifts': 'Presentes',
  'personal': 'Pessoal',
  
  // ===== TIPOS DE CONTA =====
  'checking': 'Conta Corrente',
  'savings': 'Poupança',
  'investment': 'Investimentos',
  'credit': 'Cartão',
  'loan': 'Empréstimo',
  
  // ===== STATUS DE TRANSAÇÕES =====
  'income': 'Receita',
  'expense': 'Despesa',
  'transfer': 'Transferência',
  'pending': 'Pendente',
  'completed': 'Concluído',
  'failed': 'Falhou',
  'recurring': 'Recorrente',
  
  // ===== METAS E OBJETIVOS =====
  'goal': 'Meta',
  'target': 'Objetivo',
  'milestone': 'Marco',
  'achievement': 'Conquista',
  'reward': 'Recompensa',
  'star': 'Destacado',
  
  // ===== AÇÕES E OPERAÇÕES =====
  'add': 'Adicionar',
  'remove': 'Remover',
  'close': 'Fechar',
  'confirm': 'Confirmar',
  'search': 'Pesquisar',
  'filter': 'Filtrar',
  'edit': 'Editar',
  'delete': 'Excluir',
  'copy': 'Copiar',
  'save': 'Salvar',
  'history': 'Histórico',
  
  // ===== RELATÓRIOS E ANÁLISE =====
  'chart': 'Gráfico',
  'chart-bar': 'Barras',
  'chart-pie': 'Pizza',
  'analytics': 'Análise',
  'report': 'Relatório',
  
  // ===== UTILITÁRIOS =====
  'category': 'Categoria',
  'tag': 'Tag'
};

// Agrupamentos lógicos para finanças pessoais
export const ICON_GROUPS: any = {
  // Grupos principais para categorização
  expenseCategories: ['food', 'transport', 'housing', 'health', 'education', 'entertainment', 'travel', 'clothing'],
  
  // Tipos de contas
  accountTypes: ['checking', 'savings', 'investment', 'credit', 'cash', 'loan'],
  
  // Operações financeiras
  transactions: ['income', 'expense', 'transfer', 'pending', 'completed'],
  
  // Ferramentas e análise
  tools: ['chart', 'calculator', 'filter', 'search', 'report'],
  
  // Ações do usuário
  actions: ['add', 'edit', 'delete', 'save', 'copy'],
  
  // Metas e planejamento
  goals: ['goal', 'target', 'milestone', 'achievement'],
  
  // Navegação e UI
  navigation: ['arrow-up', 'arrow-down', 'chevron-left', 'chevron-right', 'close', 'check']
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