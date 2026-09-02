'use client';

import {
  forwardRef,
  InputHTMLAttributes,
  TextareaHTMLAttributes,
  useEffect,
  useId,
} from 'react';

type BaseProps = {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  required?: boolean;
  multiline?: boolean;
  rows?: number;
  className?: string;
  focusOnError?: boolean;
};

type InputProps = BaseProps &
  Omit<InputHTMLAttributes<HTMLInputElement>, 'ref'> &
  Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'ref'>;

const Input = forwardRef<HTMLInputElement | HTMLTextAreaElement, InputProps>(
  function Input(
    {
      label,
      error,
      icon,
      rightIcon,
      required,
      multiline = false,
      rows = 3,
      className = '',
      focusOnError = true,
      ...props
    },
    ref,
  ) {
    const generatedId = useId();
    const id = props.id ?? `field-${generatedId.replace(/:/g, '')}`;
    const errorId = error ? `${id}-error` : undefined;
    const describedBy =
      [props['aria-describedby'], errorId].filter(Boolean).join(' ') || undefined;

    useEffect(() => {
      if (!error || !focusOnError) return;

      const frame = window.requestAnimationFrame(() => {
        const activeElement = document.activeElement;
        if (
          activeElement instanceof HTMLElement &&
          activeElement.getAttribute('aria-invalid') === 'true'
        ) {
          return;
        }

        const field = document.getElementById(id);
        if (field instanceof HTMLElement) {
          field.focus({ preventScroll: true });
          field.scrollIntoView({ block: 'nearest' });
        }
      });

      return () => window.cancelAnimationFrame(frame);
    }, [error, focusOnError, id]);

    const baseClasses = `
      ds-control min-w-0 px-3.5 py-2.5
      ${error ? 'border-[var(--danger)] focus-visible:border-[var(--danger)] focus-visible:outline-[var(--danger)]' : ''}
      ${icon ? 'pl-10' : ''}
      ${rightIcon ? 'pr-14' : ''}
      ${className}
    `;

    return (
      <div className="w-full min-w-0">
        {label && (
          <label htmlFor={id} className="ds-label mb-2 block">
            {label}
            {required && (
              <span className="ml-1 text-[var(--expense)]" aria-hidden="true">
                *
              </span>
            )}
          </label>
        )}

        <div className="relative min-w-0">
          {icon && (
            <div
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
              aria-hidden="true"
            >
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
              aria-errormessage={errorId}
              className={`${baseClasses} min-h-24 resize-y`}
            />
          ) : (
            <input
              {...(props as InputHTMLAttributes<HTMLInputElement>)}
              ref={ref as React.Ref<HTMLInputElement>}
              id={id}
              required={required}
              aria-invalid={error ? true : undefined}
              aria-describedby={describedBy}
              aria-errormessage={errorId}
              className={baseClasses}
            />
          )}

          {rightIcon && (
            <div className="absolute right-0 top-1/2 flex min-h-11 min-w-11 -translate-y-1/2 items-center justify-center text-[var(--text-muted)] [&_button]:inline-flex [&_button]:min-h-11 [&_button]:min-w-11 [&_button]:items-center [&_button]:justify-center [&_button]:rounded-[var(--radius-sm)]">
              {rightIcon}
            </div>
          )}
        </div>

        {error && (
          <p
            id={errorId}
            role="alert"
            className="mt-1.5 text-sm leading-relaxed text-[var(--expense)]"
          >
            {error}
          </p>
        )}
      </div>
    );
  },
);

Input.displayName = 'Input';

export default Input;
