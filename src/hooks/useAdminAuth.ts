import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

const ADMIN_ALLOWLIST = [
  "ethanw@cipherstream.com",
  "kitchens@klyc.ai",
  "kristopher.kitchens@gmail.com",
];

const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000;

export function useAdminAuth() {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [adminUser, setAdminUser] = useState<{ id: string; email: string; display_name: string | null } | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setIsAdmin(false);
    setAdminUser(null);
  }, []);

  const resetTimer = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => signOut(), INACTIVITY_TIMEOUT_MS);
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

  const checkAdmin = useCallback(async () => {
    // Use getSession() — reads from localStorage immediately without a network round-trip.
    // getUser() makes an API call each time and returns null before the session rehydrates
    // on a hard page refresh, causing the guard to redirect to login incorrectly.
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user?.email) {
      setIsAdmin(false);
      setAdminUser(null);
      return;
    }
    const email = session.user.email.toLowerCase().trim();
    if (ADMIN_ALLOWLIST.includes(email)) {
      setIsAdmin(true);
      setAdminUser({ id: session.user.id, email, display_name: null });
    } else {
      setIsAdmin(false);
      setAdminUser(null);
    }
  }, []);

  useEffect(() => {
    checkAdmin();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => checkAdmin());
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
