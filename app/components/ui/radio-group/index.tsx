'use client';

// importing hooks
import React from 'react';

interface RadioOption {
  label: string;
  value: string;
  icon?: React.ReactNode;
}

interface RadioGroupProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  options: RadioOption[];
  disabled?: boolean;
  name: string;
  required?: boolean;
  size?: 'default' | 'compact';
  className?: string;
}

export default function RadioGroup({
  label,
  value,
  onChange,
  options,
  disabled = false,
  name,
  size = 'compact',
  required,
  className,
}: RadioGroupProps) {
  const isCompact = size === 'compact';

  return (
    <div className={`flex flex-col ${className}`}>
      {label && (
        <label className="block mb-1.5 text-sm text-slate-400">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      <div className="flex">
        {options.map((option, index) => {
          const isSelected = value === option.value;
				  const isFirst = index === 0;
				  const isLast = index === options.length - 1;

          const baseClass =
            'relative flex items-center justify-center cursor-pointer transition-all duration-200';

          const sizeClass = isCompact
            ? 'px-3 py-2'
            : 'px-4 py-3';

          const selectedClass = isSelected
            ? 'bg-purple-600 text-white border-purple-600 shadow-md'
            : 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700';

          const disabledClass = disabled
            ? 'opacity-50 cursor-not-allowed'
            : '';

          const roundedClass = `
				    ${isFirst ? 'rounded-l-xl' : ''}
				    ${isLast ? 'rounded-r-xl' : ''}
				  `;

          return (
            <label
              key={option.value}
              className={`${baseClass} ${roundedClass} ${sizeClass} ${selectedClass} ${disabledClass}`}
            >
              <input
                type="radio"
                name={name}
                value={option.value}
                checked={isSelected}
                onChange={() => onChange(option.value)}
                disabled={disabled}
                className="hidden"
              />

              <div className="flex items-center gap-2">
                {option.icon && (
                  <span className={isSelected ? 'text-white' : 'text-gray-500'}>
                    {option.icon}
                  </span>
                )}

                <span className="font-medium">
                  {option.label}
                </span>
              </div>
            </label>
          );
        })}
      </div>
    </div>
  );
};
