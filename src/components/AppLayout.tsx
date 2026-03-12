import { ReactNode } from "react";
import LeftNavSidebar from "./LeftNavSidebar";
import BottomChatPanel from "./BottomChatPanel";
import { useIsMobile } from "@/hooks/use-mobile";
import { ChatHeightProvider, useChatHeight } from "@/contexts/ChatHeightContext";

interface AppLayoutProps {
  children: ReactNode;
  showSidebar?: boolean;
}

const AppLayoutInner = ({ children, showSidebar = true }: AppLayoutProps) => {
  const isMobile = useIsMobile();
  const { heightVh } = useChatHeight();

  if (!showSidebar) {
    return <div className="min-h-screen w-full flex flex-col">{children}</div>;
  }

  const chatH = isMobile ? Math.max(heightVh, 20) : heightVh;

  return (
    <div className="h-screen w-full overflow-hidden">
      <LeftNavSidebar />
      <div
        className={`overflow-y-auto ${isMobile ? "ml-0 pt-14" : "ml-[220px]"}`}
        style={{ height: `calc(100vh - ${chatH}vh)` }}
      >
        {children}
      </div>
      <BottomChatPanel />
    </div>
  );
};

const AppLayout = ({ children, showSidebar = true }: AppLayoutProps) => (
  <ChatHeightProvider>
    <AppLayoutInner showSidebar={showSidebar}>{children}</AppLayoutInner>
  </ChatHeightProvider>
);

export default AppLayout;
