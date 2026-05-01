import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

const ADMIN_ALLOWLIST = [
  "ethanw@cipherstream.com",
  "kitchens@klyc.ai",
  "kristopher.kitchens@gmail.com",
];

const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000;

type AdminUser = { id: string; email: string; display_name: string | null };

function resolveAdmin(session: { user?: { id: string; email?: string | null } } | null): AdminUser | null {
  if (!session?.user?.email) return null;
  const email = session.user.email.toLowerCase().trim();
  if (!ADMIN_ALLOWLIST.includes(email)) return null;
  return { id: session.user.id, email, display_name: null };
}

export function useAdminAuth() {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
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

  useEffect(() => {
    let cancelled = false;

    // Initial check — getSession() reads localStorage (no network round-trip normally).
    // Wrap in a 5s timeout: if Supabase is slow to refresh the token, we fall through
    // to isAdmin=false rather than spinning forever on a null guard.
    const initCheck = async () => {
      try {
        const result = await Promise.race([
          supabase.auth.getSession(),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error("getSession timeout")), 5000)
          ),
        ]);
        if (cancelled) return;
        const session = (result as Awaited<ReturnType<typeof supabase.auth.getSession>>).data.session;
        const user = resolveAdmin(session);
        setIsAdmin(!!user);
        setAdminUser(user);
      } catch {
        // Timeout or error — don't leave the guard spinning
        if (!cancelled) {
          setIsAdmin(false);
          setAdminUser(null);
        }
      }
    };

    initCheck();

    // onAuthStateChange passes the session directly — no second getSession() call.
    // This eliminates the race between the initial check and the auth state event.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (cancelled) return;
      const user = resolveAdmin(session);
      setIsAdmin(!!user);
      setAdminUser(user);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

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
