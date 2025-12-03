import { ReactNode } from "react";
import ChatSidebar from "./ChatSidebar";

interface AppLayoutProps {
  children: ReactNode;
  showSidebar?: boolean;
}

const AppLayout = ({ children, showSidebar = true }: AppLayoutProps) => {
  return (
    <div className="flex min-h-screen w-full">
      {showSidebar && <ChatSidebar />}
      <div className="flex-1 overflow-auto">
        {children}
      </div>
    </div>
  );
};

export default AppLayout;
