// Icons
import { FaSpinner } from "react-icons/fa";

const Loading = () => {
  return (
    <div className="bg-white/30 rounded-xl shadow-2xl overflow-hidden flex flex-col items-center justify-center py-12">
      <div className="relative">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        <FaSpinner className="absolute inset-0 m-auto text-blue-500 text-xl" />
      </div>
      <p className="text-gray-400 mt-4 text-center">
        Carregando dados...
      </p>
    </div>
  );
};

export default Loading;