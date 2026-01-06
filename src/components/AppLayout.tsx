import { ReactNode } from "react";
import ChatSidebar from "./ChatSidebar";
import Footer from "./Footer";
import { SidebarProvider, useSidebarContext } from "@/contexts/SidebarContext";

interface AppLayoutProps {
  children: ReactNode;
  showSidebar?: boolean;
}

const AppLayoutContent = ({ children, showSidebar = true }: AppLayoutProps) => {
  const { isOpen } = useSidebarContext();
  
  return (
    <div className="min-h-screen w-full flex flex-col">
      {showSidebar && <ChatSidebar />}
      <div className={`flex-1 flex flex-col ${showSidebar && isOpen ? "ml-80" : ""}`}>
        {children}
        <Footer />
      </div>
    </div>
  );
};

const AppLayout = ({ children, showSidebar = true }: AppLayoutProps) => {
  return (
    <SidebarProvider>
      <AppLayoutContent showSidebar={showSidebar}>
        {children}
      </AppLayoutContent>
    </SidebarProvider>
  );
};

export default AppLayout;
