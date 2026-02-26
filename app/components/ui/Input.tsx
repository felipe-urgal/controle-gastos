'use client'

import {
  forwardRef,
  InputHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react'

type BaseProps = {
  label?: string
  error?: string
  icon?: React.ReactNode
  rightIcon?: React.ReactNode
  required?: boolean
  multiline?: boolean
  rows?: number
  className?: string
}

type InputProps = BaseProps &
  Omit<InputHTMLAttributes<HTMLInputElement>, 'ref'> &
  Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'ref'>

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
  const baseClasses = `
    w-full rounded-xl border
    bg-slate-800 border-slate-700
    text-white
    px-3 py-2.5
    focus:outline-none focus:ring-2 focus:ring-purple-500
    disabled:opacity-50 disabled:cursor-not-allowed
    ${error ? 'border-red-500 focus:ring-red-500' : ''}
    ${icon ? 'pl-10' : ''}
    ${rightIcon ? 'pr-10' : ''}
    ${className}
  `

  return (
    <div className="w-full">
      {label && (
        <label className="block mb-1.5 text-sm text-slate-400">
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

        {multiline ? (
          <textarea
            ref={ref as React.Ref<HTMLTextAreaElement>}
            rows={rows}
            className={`${baseClasses} resize-none`}
            {...(props as TextareaHTMLAttributes<HTMLTextAreaElement>)}
          />
        ) : (
          <input
            ref={ref as React.Ref<HTMLInputElement>}
            className={baseClasses}
            {...(props as InputHTMLAttributes<HTMLInputElement>)}
          />
        )}

        {rightIcon && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            {rightIcon}
          </div>
        )}
      </div>

      {error && (
        <p className="text-sm text-red-500 mt-1">
          {error}
        </p>
      )}
    </div>
  )
})

export default Input
