// app/components/categories/constants.ts
import { 
  FaTag, FaShoppingBag, FaUtensils, FaHome, FaCar, FaHeart, FaGraduationCap,
  FaGamepad, FaTshirt, FaMusic, FaFilm, FaBook, FaDumbbell, FaBriefcase,
  FaGift, FaPlane, FaWifi, FaPhone, FaTv, FaLaptop, FaMoneyBill, FaPiggyBank, 
  FaChartLine, FaCoins, FaCreditCard, FaHospital, FaBicycle, FaBolt, 
  FaDog, FaBaby, FaBeer, FaLeaf, FaSun, FaCloud, FaSnowflake, FaTrain, FaSubway, 
  FaShip, FaBus, FaMotorcycle, FaCalendar, FaClock, FaMapMarkerAlt, FaGlobe, 
  FaHandsHelping, FaUserFriends, FaRegSmile, FaBell, FaExclamationTriangle
} from 'react-icons/fa';

export const ICON_MAP: { [key: string]: React.ComponentType<any> } = {
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
  'warning': FaExclamationTriangle
};

export const ICON_OPTIONS = Object.keys(ICON_MAP);

export const COLOR_OPTIONS = [
  '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', 
  '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1'
];