import { Navigate } from "react-router-dom";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { Loader2 } from "lucide-react";

interface Props {
  children: React.ReactNode;
}

export default function KlycAdminGuard({ children }: Props) {
  const { isAdmin } = useAdminAuth();

  if (isAdmin === null) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return <Navigate to="/klyc_admin" replace />;
  }

  return <>{children}</>;
}
