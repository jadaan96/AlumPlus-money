import { createContext, useContext, useState, ReactNode } from "react";

interface PeriodContextValue {
  periodId: string | null;
  setPeriodId: (id: string | null) => void;
}

const PeriodContext = createContext<PeriodContextValue | null>(null);

export function PeriodProvider({ children }: { children: ReactNode }) {
  const [periodId, setPeriodId] = useState<string | null>(
    localStorage.getItem("selectedPeriodId")
  );

  const setAndPersist = (id: string | null) => {
    setPeriodId(id);
    if (id) localStorage.setItem("selectedPeriodId", id);
    else localStorage.removeItem("selectedPeriodId");
  };

  return (
    <PeriodContext.Provider value={{ periodId, setPeriodId: setAndPersist }}>
      {children}
    </PeriodContext.Provider>
  );
}

export function usePeriod() {
  const ctx = useContext(PeriodContext);
  if (!ctx) throw new Error("usePeriod outside provider");
  return ctx;
}
