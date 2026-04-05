import { ReactNode } from "react";
import LeftNavSidebar from "./LeftNavSidebar";
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
      <LeftNavSidebar />
      <div
        className={`h-screen overflow-y-auto ${isMobile ? "ml-0 pt-14" : "ml-[260px]"}`}
      >
        {children}
      </div>
    </div>
  );
};

export default AppLayout;
