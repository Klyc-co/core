import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

export function useAdminAuth() {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null); // null = loading
  const [adminUser, setAdminUser] = useState<{ id: string; email: string; display_name: string | null } | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setIsAdmin(false);
    setAdminUser(null);
  }, []);

  // Inactivity timer
  const resetTimer = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      signOut();
    }, INACTIVITY_TIMEOUT_MS);
  }, [signOut]);

  useEffect(() => {
    const events = ["mousedown", "keydown", "scroll", "touchstart"];
    const handler = () => resetTimer();
    events.forEach((e) => window.addEventListener(e, handler));
    resetTimer();
    return () => {
      events.forEach((e) => window.removeEventListener(e, handler));
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [resetTimer]);

  // Check admin status
  const checkAdmin = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.email) {
      setIsAdmin(false);
      setAdminUser(null);
      return;
    }

    const { data, error } = await supabase
      .from("admin_users")
      .select("id, email, display_name")
      .eq("email", user.email)
      .maybeSingle();

    if (error || !data) {
      setIsAdmin(false);
      setAdminUser(null);
    } else {
      setIsAdmin(true);
      setAdminUser(data);
      // Update last_login — fire and forget via edge or ignore RLS issue
    }
  }, []);

  useEffect(() => {
    checkAdmin();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      checkAdmin();
    });
    return () => subscription.unsubscribe();
  }, [checkAdmin]);

  const logAction = useCallback(
    async (action: string, targetType?: string, targetId?: string, details?: Record<string, unknown>) => {
      if (!adminUser) return;
      await supabase.from("admin_audit_log").insert([{
        admin_id: adminUser.id,
        action,
        target_type: targetType ?? null,
        target_id: targetId ?? null,
        details: (details ?? null) as any,
      }]);
    },
    [adminUser]
  );

  return { isAdmin, adminUser, signOut, logAction };
}
