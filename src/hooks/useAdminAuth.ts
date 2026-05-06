import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

// Role hierarchy: owner > lead > team
export type AdminRole = "owner" | "lead" | "team";

const ROLE_RANK: Record<AdminRole, number> = { owner: 2, lead: 1, team: 0 };

export function hasAdminRole(
  userRole: AdminRole | undefined,
  required: AdminRole
): boolean {
  if (!userRole) return false;
  return ROLE_RANK[userRole] >= ROLE_RANK[required];
}

// Email → role map. Add new team members here.
const ADMIN_ROLES: Record<string, AdminRole> = {
  "kitchens@klyc.ai": "owner",
  "kristopher.kitchens@gmail.com": "owner",
  "ethanw@cipherstream.com": "lead",   // Ethan W — platform/UI
  "rohil@klyc.ai": "team",            // Rohil — image quality
  "rohilsri@gmail.com": "team",       // Rohil (personal)
  // TODO: add Ethan K email with role "team" once confirmed
};

const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000;

export type AdminUser = {
  id: string;
  email: string;
  display_name: string | null;
  role: AdminRole;
};

function resolveAdmin(
  session: { user?: { id: string; email?: string | null } } | null
): AdminUser | null {
  if (!session?.user?.email) return null;
  const email = session.user.email.toLowerCase().trim();
  const role = ADMIN_ROLES[email];
  if (!role) return null;
  return { id: session.user.id, email, display_name: null, role };
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

    const initCheck = async () => {
      try {
        const result = await Promise.race([
          supabase.auth.getSession(),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error("getSession timeout")), 5000)
          ),
        ]);
        if (cancelled) return;
        const session = (
          result as Awaited<ReturnType<typeof supabase.auth.getSession>>
        ).data.session;
        const user = resolveAdmin(session);
        setIsAdmin(!!user);
        setAdminUser(user);
      } catch {
        if (!cancelled) {
          setIsAdmin(false);
          setAdminUser(null);
        }
      }
    };

    initCheck();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
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
    async (
      action: string,
      targetType?: string,
      targetId?: string,
      details?: Record<string, unknown>
    ) => {
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
