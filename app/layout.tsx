"use client";

import { Inter } from "next/font/google";
import "./globals.css";
import { createContext, useContext, useState } from "react";
import { DataRow } from "@/types/data";
import { Toaster } from "sonner";

const inter = Inter({ subsets: ["latin"] });

interface DataContextType {
  data: DataRow[];
  setData: (data: DataRow[]) => void;
}

const DataContext = createContext<DataContextType>({
  data: [],
  setData: () => {},
});

export const useDataContext = () => useContext(DataContext);

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [data, setData] = useState<DataRow[]>([]);

  return (
    <html lang="en">
      <body className={inter.className}>
        <DataContext.Provider value={{ data, setData }}>
          {children}
          <Toaster richColors closeButton position="top-right" />
        </DataContext.Provider>
      </body>
    </html>
  );
}
