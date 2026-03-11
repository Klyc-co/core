import { ReactNode } from "react";
import ChatSidebar from "./ChatSidebar";
import Footer from "./Footer";
import { SidebarProvider, useSidebarContext } from "@/contexts/SidebarContext";
import { useIsMobile } from "@/hooks/use-mobile";

interface AppLayoutProps {
  children: ReactNode;
  showSidebar?: boolean;
}

const AppLayoutContent = ({ children, showSidebar = true }: AppLayoutProps) => {
  const { isOpen } = useSidebarContext();
  const isMobile = useIsMobile();
  
  // On mobile, sidebar is an overlay so no margin needed
  const shouldApplyMargin = showSidebar && isOpen && !isMobile;
  
  return (
    <div className="min-h-screen w-full flex flex-col">
      {showSidebar && <ChatSidebar />}
      <div className={`flex-1 flex flex-col transition-[margin] duration-200 ${<div className={`flex-1 flex flex-col transition-[margin] duration-200 ${shouldApplyMargin ? "ml-[22rem]" : ""}`}>}`}>
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
