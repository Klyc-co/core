import { createContext, useContext, useState, ReactNode } from "react";

interface ChatHeightContextType {
  heightVh: number;
  setHeightVh: (h: number) => void;
}

const ChatHeightContext = createContext<ChatHeightContextType | undefined>(undefined);

export const ChatHeightProvider = ({ children }: { children: ReactNode }) => {
  const [heightVh, setHeightVh] = useState(4);
  return (
    <ChatHeightContext.Provider value={{ heightVh, setHeightVh }}>
      {children}
    </ChatHeightContext.Provider>
  );
};

export const useChatHeight = () => {
  const ctx = useContext(ChatHeightContext);
  if (!ctx) throw new Error("useChatHeight must be used within ChatHeightProvider");
  return ctx;
};
