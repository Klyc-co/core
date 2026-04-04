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

  const ADMIN_ALLOWLIST = ["ethanw@cipherstream.com", "kitchens@klyc.ai"];

  // Check admin status
  const checkAdmin = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.email) {
      setIsAdmin(false);
      setAdminUser(null);
      return;
    }

    const email = user.email.toLowerCase().trim();
    const isAllowlisted = ADMIN_ALLOWLIST.includes(email);

    const { data, error } = await supabase
      .from("admin_users")
      .select("id, email, display_name")
      .eq("email", email)
      .maybeSingle();

    if (isAllowlisted || (data && !error)) {
      setIsAdmin(true);
      setAdminUser(data ?? { id: user.id, email, display_name: null });
    } else {
      setIsAdmin(false);
      setAdminUser(null);
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
