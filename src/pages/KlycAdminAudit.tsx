import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock } from "lucide-react";

interface AuditEntry {
  id: string;
  action: string;
  target_type: string | null;
  target_id: string | null;
  created_at: string;
  admin_id: string | null;
}

export default function KlycAdminAudit() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);

  useEffect(() => {
    supabase
      .from("admin_audit_log")
      .select("id, action, target_type, target_id, created_at, admin_id")
      .order("created_at", { ascending: false })
      .limit(100)
      .then(({ data }) => setEntries((data as AuditEntry[]) ?? []));
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Clock className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">Audit Log</h1>
      </div>
      <Card>
        <CardHeader><CardTitle>Recent Actions ({entries.length})</CardTitle></CardHeader>
        <CardContent>
          {entries.length === 0 ? (
            <p className="text-muted-foreground text-sm">No audit entries yet.</p>
          ) : (
            <div className="space-y-2">
              {entries.map((e) => (
                <div key={e.id} className="flex items-center justify-between text-sm border-b border-border pb-2">
                  <div>
                    <span className="font-medium">{e.action}</span>
                    {e.target_type && <span className="text-muted-foreground ml-2">→ {e.target_type}</span>}
                    {e.target_id && <span className="text-muted-foreground ml-1 text-xs">({e.target_id.slice(0, 8)})</span>}
                  </div>
                  <span className="text-xs text-muted-foreground">{new Date(e.created_at).toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
