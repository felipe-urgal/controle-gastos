'use client';

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

type FiscalYearContextValue = {
  year: number;
  setYear: (year: number) => void;
};

const InvestmentFiscalYearContext =
  createContext<FiscalYearContextValue | null>(null);

export function InvestmentFiscalYearProvider({
  children,
}: {
  children: ReactNode;
}) {
  const currentYear = new Date().getUTCFullYear();
  const [year, setYear] = useState(currentYear);
  const value = useMemo(() => ({ year, setYear }), [year]);

  return (
    <InvestmentFiscalYearContext.Provider value={value}>
      {children}
    </InvestmentFiscalYearContext.Provider>
  );
}

export function useInvestmentFiscalYear() {
  const value = useContext(InvestmentFiscalYearContext);
  if (!value) {
    throw new Error(
      'useInvestmentFiscalYear must be used within InvestmentFiscalYearProvider',
    );
  }
  return value;
}
