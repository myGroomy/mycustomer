"use client";

import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { getSessionUser } from "@/utils/session";

interface BranchContextValue {
  selectedBranch: string;
  setSelectedBranch: (branch: string) => void;
}

const BranchContext = createContext<BranchContextValue>({
  selectedBranch: "",
  setSelectedBranch: () => {},
});

export function BranchProvider({ children }: { children: ReactNode }) {
  const [selectedBranch, setSelectedBranchState] = useState("");

  useEffect(() => {
    const session = getSessionUser();
    if (session?.branch) {
      setSelectedBranchState(session.branch);
    }
  }, []);

  const setSelectedBranch = (branch: string) => {
    setSelectedBranchState(branch);
    try {
      localStorage.setItem("mycustomer_selected_branch", branch);
    } catch {}
  };

  useEffect(() => {
    try {
      const stored = localStorage.getItem("mycustomer_selected_branch");
      if (stored) setSelectedBranchState(stored);
    } catch {}
  }, []);

  return (
    <BranchContext.Provider value={{ selectedBranch, setSelectedBranch }}>
      {children}
    </BranchContext.Provider>
  );
}

export function useBranch() {
  return useContext(BranchContext);
}
