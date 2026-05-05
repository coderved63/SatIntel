import { createContext, useContext, useMemo, useState } from 'react';

const DEFAULT_RANGE = {
  start_date: '2024-01-01',
  end_date: '2026-03-22',
};

const AnalysisContext = createContext(null);

export function AnalysisProvider({ children }) {
  const [dateRange, setDateRange] = useState(DEFAULT_RANGE);

  const value = useMemo(() => ({
    dateRange,
    setDateRange,
    resetDateRange: () => setDateRange(DEFAULT_RANGE),
  }), [dateRange]);

  return <AnalysisContext.Provider value={value}>{children}</AnalysisContext.Provider>;
}

export function useAnalysisContext() {
  const context = useContext(AnalysisContext);
  if (!context) throw new Error('useAnalysisContext must be used within AnalysisProvider');
  return context;
}
