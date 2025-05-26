import { HiOutlineSearch } from "react-icons/hi";

type InputProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  withSearchIcon?: boolean;
};

export const Input = ({
  value,
  onChange,
  placeholder = "",
  className = "",
  withSearchIcon = false,
}: InputProps) => {
  return (
    <div className={`relative ${className}`}>
      {withSearchIcon && (
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <HiOutlineSearch className="h-5 w-5 text-gray-400" />
        </div>
      )}
      <input
        type="text"
        className={`block w-full ${
          withSearchIcon ? "pl-10" : "pl-3"
        } pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
};