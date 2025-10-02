// app/components/ui/IconRenderer.tsx
'use client';

import { 
  // Ícones de Categorias
  FaTag, FaShoppingBag, FaUtensils, FaHome, FaCar, FaHeart, FaGraduationCap,
  FaGamepad, FaTshirt, FaMusic, FaFilm, FaBook, FaDumbbell, FaBriefcase,
  FaGift, FaPlane, FaWifi, FaPhone, FaTv, FaLaptop, FaMoneyBill, FaPiggyBank, 
  FaChartLine, FaCoins, FaCreditCard, FaHospital, FaBicycle, FaBolt, 
  FaDog, FaBaby, FaBeer, FaLeaf, FaSun, FaCloud, FaSnowflake, FaTrain, FaSubway, 
  FaShip, FaBus, FaMotorcycle, FaCalendar, FaClock, FaMapMarkerAlt, FaGlobe, 
  FaHandsHelping, FaUserFriends, FaRegSmile, FaBell, FaExclamationTriangle,
  // Ícones de Contas
  FaWallet, FaLandmark, FaUniversity, FaGem, FaCrown
} from 'react-icons/fa';

// Mapeamento completo de todos os ícones
export const ICON_MAP: { [key: string]: React.ComponentType<any> } = {
  // Categorias
  'tag': FaTag,
  'shopping-bag': FaShoppingBag,
  'utensils': FaUtensils,
  'home': FaHome,
  'car': FaCar,
  'heart': FaHeart,
  'graduation-cap': FaGraduationCap,
  'gamepad': FaGamepad,
  'tshirt': FaTshirt,
  'music': FaMusic,
  'film': FaFilm,
  'book': FaBook,
  'dumbbell': FaDumbbell,
  'briefcase': FaBriefcase,
  'gift': FaGift,
  'plane': FaPlane,
  'wifi': FaWifi,
  'phone': FaPhone,
  'tv': FaTv,
  'laptop': FaLaptop,
  'money-bill': FaMoneyBill,
  'piggy-bank': FaPiggyBank,
  'chart-line': FaChartLine,
  'coins': FaCoins,
  'credit-card': FaCreditCard,
  'hospital': FaHospital,
  'bicycle': FaBicycle,
  'bolt': FaBolt,
  'dog': FaDog,
  'baby': FaBaby,
  'beer': FaBeer,
  'leaf': FaLeaf,
  'sun': FaSun,
  'cloud': FaCloud,
  'snowflake': FaSnowflake,
  'train': FaTrain,
  'subway': FaSubway,
  'ship': FaShip,
  'bus': FaBus,
  'motorcycle': FaMotorcycle,
  'calendar': FaCalendar,
  'clock': FaClock,
  'map-marker': FaMapMarkerAlt,
  'globe': FaGlobe,
  'hands-helping': FaHandsHelping,
  'friends': FaUserFriends,
  'smile': FaRegSmile,
  'bell': FaBell,
  'warning': FaExclamationTriangle,
  
  // Contas
  'wallet': FaWallet,
  'bank': FaLandmark,
  'university': FaUniversity,
  'gem': FaGem,
  'crown': FaCrown
};

// Labels amigáveis para todos os ícones
export const ICON_LABELS: { [key: string]: string } = {
  // Categorias
  'tag': 'Etiqueta',
  'shopping-bag': 'Compras',
  'utensils': 'Alimentação',
  'home': 'Casa',
  'car': 'Transporte',
  'heart': 'Saúde',
  'graduation-cap': 'Educação',
  'gamepad': 'Entretenimento',
  'tshirt': 'Vestuário',
  'music': 'Música',
  'film': 'Filmes',
  'book': 'Leitura',
  'dumbbell': 'Esportes',
  'briefcase': 'Trabalho',
  'gift': 'Presentes',
  'plane': 'Viagens',
  'wifi': 'Internet',
  'phone': 'Telefone',
  'tv': 'TV',
  'laptop': 'Tecnologia',
  'money-bill': 'Dinheiro',
  'piggy-bank': 'Economias',
  'chart-line': 'Investimentos',
  'coins': 'Moedas',
  'credit-card': 'Cartão',
  'hospital': 'Saúde',
  'bicycle': 'Esportes',
  'bolt': 'Energia',
  'dog': 'Pets',
  'baby': 'Bebê',
  'beer': 'Lazer',
  'leaf': 'Natureza',
  'sun': 'Clima',
  'cloud': 'Nuvem',
  'snowflake': 'Frio',
  'train': 'Trem',
  'subway': 'Metrô',
  'ship': 'Navio',
  'bus': 'Ônibus',
  'motorcycle': 'Moto',
  'calendar': 'Calendário',
  'clock': 'Tempo',
  'map-marker': 'Local',
  'globe': 'Mundo',
  'hands-helping': 'Ajuda',
  'friends': 'Amigos',
  'smile': 'Feliz',
  'bell': 'Notificação',
  'warning': 'Alerta',
  
  // Contas
  'wallet': 'Carteira',
  'bank': 'Banco',
  'university': 'Universidade',
  'gem': 'Gema',
  'crown': 'Coroa'
};

// Agrupamentos de ícones por categoria
export const ICON_GROUPS = {
  finances: ['money-bill', 'piggy-bank', 'chart-line', 'coins', 'credit-card', 'wallet', 'bank'],
  daily: ['shopping-bag', 'utensils', 'home', 'car', 'phone', 'wifi'],
  entertainment: ['gamepad', 'music', 'film', 'tv', 'book'],
  health: ['heart', 'hospital', 'dumbbell', 'bicycle'],
  travel: ['plane', 'train', 'subway', 'bus', 'car', 'ship', 'motorcycle'],
  nature: ['sun', 'cloud', 'snowflake', 'leaf'],
  objects: ['tag', 'gift', 'laptop', 'tshirt', 'bell', 'clock', 'calendar'],
  people: ['hands-helping', 'friends', 'smile', 'baby'],
  business: ['briefcase', 'university', 'gem', 'crown']
};

interface IconRendererProps {
  iconName: string;
  size?: number;
  className?: string;
  color?: string;
  [key: string]: any;
}

export default function IconRenderer({ 
  iconName, 
  size = 16, 
  className = '', 
  color,
  ...props 
}: IconRendererProps) {
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
    return ICON_LABELS[iconName] || iconName.split('-').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const getIconsByGroup = (group: keyof typeof ICON_GROUPS): string[] => {
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