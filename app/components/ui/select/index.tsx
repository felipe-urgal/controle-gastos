'use client'

// importing icons
import { FaChevronDown } from 'react-icons/fa';

type Option = {
  value: string | number
  label: string
};

type Group = {
  label: string
  options: Option[]
};

type SelectProps = {
  label?: string
  value?: string | number
  onChange: (value: string | number) => void
  options: Option[] | Group[]
  placeholder?: string
  disabled?: boolean
  grouped?: boolean
  icon?: React.ReactNode
  required?: boolean
};

export default function Select({
  label,
  value,
  onChange,
  options,
  placeholder = 'Selecione...',
  disabled,
  grouped,
  icon,
  required,
}: SelectProps) {
  const isGrouped = grouped;

  return (
    <div className="w-full">
      {label && (
        <label className="block mb-2 text-sm text-slate-400">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
            {icon}
          </div>
        )}

        <select
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className={`
            w-full h-10 rounded-md border
            bg-slate-800 border-slate-700
            text-white
            px-3
            ${icon ? 'pl-10' : ''}
            pr-10
            appearance-none
            focus:outline-none focus:ring-2 focus:ring-purple-500
            ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        >
          {!value && (
            <option value="" disabled hidden>
              {placeholder}
            </option>
          )}

          {isGrouped
            ? (options as Group[]).map((group) => (
                <optgroup key={group.label} label={group.label}>
                  {group.options.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </optgroup>
              ))
            : (options as Option[]).map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
        </select>

        <FaChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
      </div>
    </div>
  );
};
