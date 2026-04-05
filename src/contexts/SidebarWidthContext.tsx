import { createContext, useContext, useState, ReactNode } from "react";

interface SidebarWidthContextType {
  width: number;
  setWidth: (w: number) => void;
}

const SidebarWidthContext = createContext<SidebarWidthContextType | undefined>(undefined);

const MIN_WIDTH = 260;
const MAX_WIDTH = 800;
const DEFAULT_WIDTH = 480;

export const SidebarWidthProvider = ({ children }: { children: ReactNode }) => {
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  return (
    <SidebarWidthContext.Provider value={{ width, setWidth }}>
      {children}
    </SidebarWidthContext.Provider>
  );
};

export const useSidebarWidth = () => {
  const ctx = useContext(SidebarWidthContext);
  if (!ctx) throw new Error("useSidebarWidth must be used within SidebarWidthProvider");
  return ctx;
};

export { MIN_WIDTH, MAX_WIDTH };
