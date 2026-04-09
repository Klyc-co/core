import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Users, CreditCard, Activity, Brain, Shield, LogOut, Clock,
} from "lucide-react";

interface AuditEntry {
  id: string;
  action: string;
  target_type: string | null;
  created_at: string;
}

export default function KlycAdminDashboard() {
  const navigate = useNavigate();
  const { adminUser, signOut, logAction } = useAdminAuth();
  const [stats, setStats] = useState({ clients: 0, subs: 0, campaigns: 0 });
  const [recentAudit, setRecentAudit] = useState<AuditEntry[]>([]);

  useEffect(() => {
    logAction("admin_dashboard_view");

    const fetchStats = async () => {
      const [clientsRes, subsRes, campaignsRes, auditRes] = await Promise.all([
        supabase.from("client_profiles").select("id", { count: "exact", head: true }),
        supabase.from("billing_subscriptions").select("id", { count: "exact", head: true }),
        supabase.from("campaign_drafts").select("id", { count: "exact", head: true }),
        supabase.from("admin_audit_log").select("id, action, target_type, created_at").order("created_at", { ascending: false }).limit(10),
      ]);
      setStats({
        clients: clientsRes.count ?? 0,
        subs: subsRes.count ?? 0,
        campaigns: campaignsRes.count ?? 0,
      });
      setRecentAudit((auditRes.data as AuditEntry[]) ?? []);
    };
    fetchStats();
  }, [logAction]);

  const handleSignOut = async () => {
    await logAction("admin_sign_out");
    await signOut();
    navigate("/klyc_admin");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Shield className="w-5 h-5 text-primary" />
          <h1 className="text-lg font-bold">Klyc Admin</h1>
          <Badge variant="secondary" className="text-xs">{adminUser?.email}</Badge>
        </div>
        <Button variant="ghost" size="sm" onClick={handleSignOut}>
          <LogOut className="w-4 h-4 mr-1" /> Sign Out
        </Button>
      </header>

      <main className="max-w-6xl mx-auto p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard icon={<Users className="w-5 h-5" />} label="Total Clients" value={stats.clients} />
          <StatCard icon={<CreditCard className="w-5 h-5" />} label="Subscriptions" value={stats.subs} />
          <StatCard icon={<Activity className="w-5 h-5" />} label="Campaigns" value={stats.campaigns} />
        </div>

        {/* Quick Nav */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Billing",        path: "/klyc_admin/billing",   icon: <CreditCard className="w-4 h-4" /> },
            { label: "Employees",      path: "/klyc_admin/employees", icon: <Users className="w-4 h-4" /> },
            { label: "Channels",       path: "/klyc_admin/channels",  icon: <Activity className="w-4 h-4" /> },
            { label: "AI Functions",   path: "/klyc_admin/subminds",  icon: <Brain className="w-4 h-4" /> },
          ].map((item) => (
            <Button
              key={item.path}
              variant="outline"
              className="h-20 flex-col gap-2"
              onClick={() => navigate(item.path)}
            >
              {item.icon}
              <span className="text-xs">{item.label}</span>
            </Button>
          ))}
        </div>

        {/* Audit Log */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Clock className="w-4 h-4" /> Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentAudit.length === 0 ? (
              <p className="text-sm text-muted-foreground">No activity recorded yet.</p>
            ) : (
              <div className="space-y-2">
                {recentAudit.map((entry) => (
                  <div key={entry.id} className="flex items-center justify-between text-sm border-b border-border pb-2">
                    <div>
                      <span className="font-medium">{entry.action}</span>
                      {entry.target_type && (
                        <span className="text-muted-foreground ml-2">→ {entry.target_type}</span>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(entry.created_at).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10 text-primary">{icon}</div>
          <div>
            <p className="text-2xl font-bold">{value}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
