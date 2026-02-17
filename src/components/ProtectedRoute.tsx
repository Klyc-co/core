import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useTheme } from "next-themes";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";

interface ProtectedRouteProps {
  children: React.ReactNode;
  /**
   * If set, enforces portal separation:
   * - requiredRole="client" => user_metadata.role must be "client"
   * - requiredRole="marketer" => redirects clients away from marketer routes
   */
  requiredRole?: "client" | "marketer";
  /** Where to send unauthenticated users */
  unauthRedirectTo?: string;
  /** Where to send users who are authenticated but in the wrong portal */
  wrongRoleRedirectTo?: string;
}

const ProtectedRoute = ({
  children,
  requiredRole,
  unauthRedirectTo = "/auth",
  wrongRoleRedirectTo,
}: ProtectedRouteProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const location = useLocation();
  const { setTheme } = useTheme();

  // Force light mode for authenticated interface
  useEffect(() => {
    setTheme("light");
  }, [setTheme]);

  useEffect(() => {
    // Check initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    // Redirect to auth page, preserving the intended destination
    return <Navigate to={unauthRedirectTo} state={{ from: location }} replace />;
  }

  // Enforce portal separation.
  const role = (user.user_metadata as any)?.role as string | undefined;
  if (requiredRole === "client" && role !== "client") {
    return <Navigate to={wrongRoleRedirectTo ?? "/home"} replace />;
  }
  if (requiredRole === "marketer" && role === "client") {
    return <Navigate to={wrongRoleRedirectTo ?? "/client/dashboard"} replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
