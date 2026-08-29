'use client'

import { forwardRef, InputHTMLAttributes, TextareaHTMLAttributes, useId } from 'react'

type BaseProps = {
  label?: string
  error?: string
  icon?: React.ReactNode
  rightIcon?: React.ReactNode
  required?: boolean
  multiline?: boolean
  rows?: number
  className?: string
};

type InputProps = BaseProps &
  Omit<InputHTMLAttributes<HTMLInputElement>, 'ref'> &
  Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'ref'>;

const Input = forwardRef<
  HTMLInputElement | HTMLTextAreaElement,
  InputProps
>(function Input(
  {
    label,
    error,
    icon,
    rightIcon,
    required,
    multiline = false,
    rows = 3,
    className = '',
    ...props
  },
  ref
) {
  const generatedId = useId();
  const inputType = (props as InputHTMLAttributes<HTMLInputElement>).type;
  const isDate = inputType === 'date';
  const id = props.id ?? `field-${generatedId.replace(/:/g, '')}`;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [props['aria-describedby'], errorId].filter(Boolean).join(' ') || undefined;

  const baseClasses = `
    w-full min-w-0 rounded-xl border
    bg-slate-800 border-slate-700
    text-white
    px-3 py-2
    focus:outline-none focus:ring-2 focus:ring-purple-500
    disabled:opacity-50 disabled:cursor-not-allowed
    ${error ? 'border-red-500 focus:ring-red-500' : ''}
    ${icon ? 'pl-10' : ''}
    ${rightIcon ? 'pr-10' : ''}
    ${isDate ? 'appearance-none [color-scheme:dark] text-sm sm:text-base' : ''}
    ${className}
  `;

  return (
    <div className="w-full min-w-0">
      {label && (
        <label htmlFor={id} className="block mb-1.5 text-sm text-slate-400">
          {label}
          {required && <span className="text-red-500 ml-1" aria-hidden="true">*</span>}
        </label>
      )}

      <div className="relative min-w-0">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" aria-hidden="true">
            {icon}
          </div>
        )}

        {multiline ? (
          <textarea
            {...(props as TextareaHTMLAttributes<HTMLTextAreaElement>)}
            ref={ref as React.Ref<HTMLTextAreaElement>}
            id={id}
            rows={rows}
            required={required}
            aria-invalid={error ? true : undefined}
            aria-describedby={describedBy}
            className={`${baseClasses} resize-none`}
          />
        ) : (
          <input
            {...(props as InputHTMLAttributes<HTMLInputElement>)}
            ref={ref as React.Ref<HTMLInputElement>}
            id={id}
            required={required}
            aria-invalid={error ? true : undefined}
            aria-describedby={describedBy}
            className={baseClasses}
          />
        )}

        {rightIcon && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            {rightIcon}
          </div>
        )}
      </div>

      {error && (
        <p id={errorId} role="alert" className="text-sm text-red-500 mt-1">
          {error}
        </p>
      )}
    </div>
  );
});

Input.displayName = 'Input';

export default Input;
