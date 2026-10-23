'use client';

import { forwardRef, type ChangeEvent, type ComponentProps } from 'react';

import InlineInput from '@/app/components/ui/inline-input';
import Input from '@/app/components/ui/input';
import { formatMoneyDisplay, maskMoneyInput } from '@/app/lib/currency/money-mask';

type MoneyInputProps = Omit<ComponentProps<typeof Input>, 'value' | 'onChange' | 'type' | 'inputMode' | 'multiline'> & {
  /** Valor canônico ("1234,56"); vazio quando não há valor. */
  value: string;
  onValueChange: (value: string) => void;
  currency?: string;
  /** Aceita sinal negativo (ex.: saldo de extrato). */
  allowNegative?: boolean;
};

/** Campo monetário com máscara "R$ 1.234,56". Guarda e emite o valor sem formatação, compatível com `parseMoneyInputToCents`. */
const MoneyInput = forwardRef<HTMLInputElement | HTMLTextAreaElement, MoneyInputProps>(function MoneyInput(
  { value, onValueChange, currency = 'BRL', allowNegative = false, placeholder, ...props },
  ref,
) {
  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    onValueChange(maskMoneyInput(event.target.value, allowNegative));
  }

  function moveCursorToEnd(event: { currentTarget: HTMLInputElement | HTMLTextAreaElement }) {
    const field = event.currentTarget;
    window.requestAnimationFrame(() => field.setSelectionRange(field.value.length, field.value.length));
  }

  return (
    <Input
      {...props}
      ref={ref}
      value={formatMoneyDisplay(value, currency)}
      onChange={handleChange as ComponentProps<typeof Input>['onChange']}
      onFocus={moveCursorToEnd}
      onClick={moveCursorToEnd}
      inputMode={allowNegative ? 'text' : 'numeric'}
      autoComplete="off"
      placeholder={placeholder ?? formatMoneyDisplay('0,00', currency)}
    />
  );
});

MoneyInput.displayName = 'MoneyInput';

type MoneyInlineInputProps = Omit<ComponentProps<typeof InlineInput>, 'value' | 'onChange' | 'type' | 'inputMode'> & {
  value: string;
  onValueChange: (value: string) => void;
  currency?: string;
};

/** Variante "no lugar" (`InlineInput`). O símbolo da moeda fica a cargo do chamador, ao lado do campo. */
export function MoneyInlineInput({ value, onValueChange, currency = 'BRL', placeholder = '0,00', ...props }: MoneyInlineInputProps) {
  return (
    <InlineInput
      {...props}
      value={formatMoneyDisplay(value, currency, false)}
      onChange={(event) => onValueChange(maskMoneyInput(event.target.value))}
      inputMode="numeric"
      autoComplete="off"
      placeholder={placeholder}
    />
  );
}

export default MoneyInput;
