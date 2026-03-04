import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useTheme } from "next-themes";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { useUserRole, clearRoleCache } from "@/hooks/useUserRole";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: "client" | "marketer";
  unauthRedirectTo?: string;
  wrongRoleRedirectTo?: string;
}

const ProtectedRoute = ({
  children,
  requiredRole,
  unauthRedirectTo = "/auth",
  wrongRoleRedirectTo,
}: ProtectedRouteProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const location = useLocation();
  const { setTheme } = useTheme();

  useEffect(() => {
    setTheme("light");
  }, [setTheme]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setAuthLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (_event === "SIGNED_OUT") {
        clearRoleCache();
      }
      setUser(session?.user ?? null);
      setAuthLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Server-side role resolution from user_roles table
  const { role, loading: roleLoading } = useUserRole(user?.id);

  if (authLoading || (user && roleLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to={unauthRedirectTo} state={{ from: location }} replace />;
  }

  // Role enforcement using server-side resolved role (defaults to "user" / least privilege)
  const resolvedRole = role || "user";

  if (requiredRole === "client" && resolvedRole !== "client") {
    return <Navigate to={wrongRoleRedirectTo ?? "/home"} replace />;
  }
  if (requiredRole === "marketer" && resolvedRole === "client") {
    return <Navigate to={wrongRoleRedirectTo ?? "/client/dashboard"} replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
