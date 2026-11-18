"use client";

import { createContext, useContext } from "react";

type Option = { id: string; name: string };
type PlanOptionsValue = { staff: Option[]; patients: Option[] };

const PlanOptionsContext = createContext<PlanOptionsValue>({ staff: [], patients: [] });

// Passes the carer and client lists once to every visit card on the page.
export function PlanOptionsProvider({ staff, patients, children }: PlanOptionsValue & { children: React.ReactNode }) {
  return <PlanOptionsContext.Provider value={{ staff, patients }}>{children}</PlanOptionsContext.Provider>;
}

export function usePlanOptions() {
  return useContext(PlanOptionsContext);
}
