import { ReactNode } from "react";
import LeftNavSidebar from "./LeftNavSidebar";
import TopToolsHeader from "./TopToolsHeader";
import { useIsMobile } from "@/hooks/use-mobile";
import { SidebarWidthProvider, useSidebarWidth } from "@/contexts/SidebarWidthContext";

interface AppLayoutProps {
  children: ReactNode;
  showSidebar?: boolean;
}

const AppLayoutInner = ({ children, showSidebar = true }: AppLayoutProps) => {
  const isMobile = useIsMobile();
  const { width } = useSidebarWidth();

  if (!showSidebar) {
    return <div className="min-h-screen w-full flex flex-col">{children}</div>;
  }

  return (
    <div className="h-screen w-full overflow-hidden">
      <LeftNavSidebar />
      <div
        className={`h-screen flex flex-col ${isMobile ? "ml-0 pt-14" : ""}`}
        style={isMobile ? undefined : { marginLeft: `${width}px` }}
      >
        <TopToolsHeader />
        <div className="flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
};

const AppLayout = ({ children, showSidebar = true }: AppLayoutProps) => (
  <SidebarWidthProvider>
    <AppLayoutInner showSidebar={showSidebar}>{children}</AppLayoutInner>
  </SidebarWidthProvider>
);

export default AppLayout;
