'use client';

interface ActiveToggleProps {
  isActive: boolean;
  onToggle: (active: boolean) => void;
  disabled?: boolean;
  label?: string;
  activeLabel?: string;
  inactiveLabel?: string;
};

export default function ActiveToggle({
  isActive,
  onToggle,
  disabled = false,
  label = 'Item ativo',
  activeLabel = 'Ativo',
  inactiveLabel = 'Inativo'
}: ActiveToggleProps) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-700">
      <label className="flex items-center gap-3 cursor-pointer flex-1">
        <input
          type="checkbox"
          checked={isActive}
          onChange={(e) => onToggle(e.target.checked)}
          className="w-4 h-4 rounded border-gray-300 text-blue-500 focus:ring-blue-500 transition-colors"
          disabled={disabled}
        />
        <span className="text-sm font-medium text-gray-400">
          {label}
        </span>
      </label>
      <div className={`px-2 py-1 rounded-full text-xs font-medium ${isActive  ? 'bg-gray-700' : 'bg-gray-800 text-gray-500'}`}>
        {isActive ? activeLabel : inactiveLabel}
      </div>
    </div>
  );
};
