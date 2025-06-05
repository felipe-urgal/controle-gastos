type SelectOption = {
  id?: string;
  value?: string;
  label?: string;
  name?: string;
};

type SelectProps = {
  options: SelectOption[];
  value: string;
  onChange: (event: React.ChangeEvent<HTMLSelectElement>) => void;
  className?: string;
  label?: string;
  disabled?: boolean;
  name?: string;
  placeholder?: string;
  error?: string;
  loading?: boolean;
  required?: boolean;
};

export const Select = ({
  options,
  value,
  onChange,
  className = "",
  label,
  disabled,
  name,
  placeholder,
  error = "",
  loading = false,
  required = false,
}: SelectProps) => {
  return (
    <div className="">
      {label && (
        <label
          htmlFor={name}
          className={`${disabled || loading ? 'opacity-40 block text-sm' : ''} font-medium ${error ? 'text-red-400' : 'text-gray-400'}`}
        >
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <svg className="h-5 w-5 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </div>
        <select
          id={name}
          name={name}
          className={`
            ${className}
            disabled:opacity-50 disabled:cursor-not-allowed disabled:border-gray-700 disabled:text-gray-500
            h-10 w-full border bg-gray-900 text-sm
            focus:outline-none focus:ring-2 focus:border-transparent
            appearance-none pl-10 pr-3 py-3 rounded-lg shadow-sm transition duration-200
            ${
              error 
                ? 'border-red-500 focus:ring-red-500 text-red-300' 
                : value 
                  ? 'border-blue-900 focus:ring-blue-500 text-gray-300' 
                  : 'text-gray-700 border-gray-700 focus:ring-blue-500 text-gray-500'
            }
            ${loading ? 'animate-pulse' : ''}
          `}
          value={value}
          onChange={(e) => onChange(e)}
          disabled={disabled || loading}
          aria-invalid={!!error}
          aria-describedby={error ? `${name}-error` : undefined}
        >
          {placeholder && (
            <option value="" className="text-gray-700">
              {placeholder}
            </option>
          )}

          {options.map((option) => (
            <option 
              key={option.value || option.id} 
              value={option.value || option.id} 
              className="bg-gray-900 text-gray-300"
            >
              {option.label || option.name}
            </option>
          ))}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-400">
          <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
            <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
          </svg>
        </div>
      </div>
      {error && (
        <p 
          id={`${name}-error`}
          className="mt-1 text-sm text-red-500"
        >
          {error}
        </p>
      )}
    </div>
  );
};