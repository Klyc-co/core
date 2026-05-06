import { Navigate } from "react-router-dom";
import { useAdminAuth, hasAdminRole } from "@/hooks/useAdminAuth";
import type { AdminRole } from "@/hooks/useAdminAuth";
import { Loader2 } from "lucide-react";

interface Props {
  children: React.ReactNode;
  /** If set, the user must have at least this role or they're redirected to overview. */
  minRole?: AdminRole;
}

export default function KlycAdminGuard({ children, minRole }: Props) {
  const { isAdmin, adminUser } = useAdminAuth();

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

  // Role-gated route — bounce to overview rather than showing an error
  if (minRole && !hasAdminRole(adminUser?.role, minRole)) {
    return <Navigate to="/klyc_admin/overview" replace />;
  }

  return <>{children}</>;
}
