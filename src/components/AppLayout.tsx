import { ReactNode } from "react";
import LeftNavSidebar from "./LeftNavSidebar";
import BottomChatPanel from "./BottomChatPanel";
import { useIsMobile } from "@/hooks/use-mobile";

interface AppLayoutProps {
  children: ReactNode;
  showSidebar?: boolean;
}

const AppLayout = ({ children, showSidebar = true }: AppLayoutProps) => {
  const isMobile = useIsMobile();

  if (!showSidebar) {
    return <div className="min-h-screen w-full flex flex-col">{children}</div>;
  }

  return (
    <div className="h-screen w-full overflow-hidden">
      {/* Left nav sidebar */}
      <LeftNavSidebar />

      {/* Main content area */}
      <div
        className={`overflow-y-auto ${isMobile ? "ml-0 pt-14" : "ml-[220px]"}`}
        style={{ height: isMobile ? "calc(100vh - 30vh)" : "calc(100vh - 25vh)" }}
      >
        {children}
      </div>

      {/* Bottom chat panel - always open */}
      <BottomChatPanel />
    </div>
  );
};

export default AppLayout;
