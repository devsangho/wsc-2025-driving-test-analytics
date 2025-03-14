"use client";

import { createContext, useContext, useState, ReactNode } from "react";
import { DataRow } from "@/types/data";

interface DataContextType {
  data: DataRow[];
  setData: (data: DataRow[]) => void;
}

const DataContext = createContext<DataContextType>({
  data: [],
  setData: () => {},
});

export const useDataContext = () => useContext(DataContext);

export function DataProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<DataRow[]>([]);

  return (
    <DataContext.Provider value={{ data, setData }}>
      {children}
    </DataContext.Provider>
  );
}
