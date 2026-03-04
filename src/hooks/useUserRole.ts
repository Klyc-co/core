import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

type UserRole = "admin" | "marketer" | "client" | "user";

// In-memory cache: cleared on logout / tab close
let cachedRole: UserRole | null = null;
let cacheUserId: string | null = null;

export function useUserRole(userId: string | null | undefined) {
  const [role, setRole] = useState<UserRole | null>(cachedRole);
  const [loading, setLoading] = useState(!cachedRole);

  const fetchRole = useCallback(async (uid: string) => {
    try {
      const { data, error } = await supabase.rpc("get_my_role");
      if (error) {
        console.error("get_my_role error:", error.message);
        // Least privilege fallback
        cachedRole = "user";
        cacheUserId = uid;
        setRole("user");
      } else {
        const resolved = (data as string) || "user";
        cachedRole = resolved as UserRole;
        cacheUserId = uid;
        setRole(resolved as UserRole);
      }
    } catch {
      cachedRole = "user";
      cacheUserId = uid;
      setRole("user");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!userId) {
      cachedRole = null;
      cacheUserId = null;
      setRole(null);
      setLoading(false);
      return;
    }

    // Return cached if same user
    if (cachedRole && cacheUserId === userId) {
      setRole(cachedRole);
      setLoading(false);
      return;
    }

    setLoading(true);
    fetchRole(userId);
  }, [userId, fetchRole]);

  const refreshRole = useCallback(() => {
    if (userId) {
      cachedRole = null;
      cacheUserId = null;
      setLoading(true);
      fetchRole(userId);
    }
  }, [userId, fetchRole]);

  return { role, loading: loading, refreshRole };
}

/** Call on logout to clear cached role */
export function clearRoleCache() {
  cachedRole = null;
  cacheUserId = null;
}
