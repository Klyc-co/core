import { useNavigate, useLocation } from "react-router-dom";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Shield, LogOut, LayoutDashboard, Users, CreditCard,
  Activity, Brain, Radio, Clock, Layers, Building2, MessageCircle, Zap, ThumbsUp, Map, Megaphone, FlaskConical,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { label: "Overview", path: "/klyc_admin/overview", icon: LayoutDashboard },
  { label: "Clients", path: "/klyc_admin/clients", icon: Users },
  { label: "Revenue", path: "/klyc_admin/revenue", icon: CreditCard },
  { label: "Infrastructure", path: "/klyc_admin/infrastructure", icon: Activity },
  { label: "Compression", path: "/klyc_admin/compression", icon: Layers },
  { label: "Subminds", path: "/klyc_admin/subminds", icon: Brain },
  { label: "Channels", path: "/klyc_admin/channels", icon: Radio },
  { label: "Dispatch Log", path: "/klyc_admin/dispatch", icon: Zap },
  { label: "Collaboration", path: "/klyc_admin/collaboration", icon: MessageCircle },
  { label: "Client Voting", path: "/klyc_admin/voting", icon: ThumbsUp },
  { label: "Roadmap", path: "/klyc_admin/roadmap", icon: Map },
  { label: "Marketing", path: "/klyc_admin/marketing", icon: Megaphone },
  { label: "Financials", path: "/klyc_admin/financials", icon: CreditCard },
  { label: "AI Testing & Measurement", path: "/klyc_admin/ai-testing", icon: FlaskConical },
  { label: "KLYC Internal", path: "/klyc_admin/klyc-internal", icon: Building2 },
  { label: "Audit Log", path: "/klyc_admin/audit", icon: Clock },
];

interface Props {
  children: React.ReactNode;
}

export default function KlycAdminLayout({ children }: Props) {
  const navigate = useNavigate();
  const location = useLocation();
  const { adminUser, signOut } = useAdminAuth();

  const handleSignOut = async () => {
    await signOut();
    navigate("/klyc_admin");
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex">
      {/* Sidebar */}
      <aside className="w-56 border-r border-slate-800 flex flex-col">
        <div className="p-4 flex items-center gap-2 border-b border-slate-800">
          <Shield className="w-5 h-5 text-primary" />
          <span className="font-bold text-sm">Klyc Admin</span>
        </div>
        <nav className="flex-1 p-2 space-y-1">
          {NAV_ITEMS.map((item) => {
            const active = location.pathname === item.path;
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={cn(
                  "w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors",
                  active
                    ? "bg-primary/20 text-primary font-medium"
                    : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                )
              }
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </button>
            );
          })}
        </nav>
        <div className="p-3 border-t border-slate-800 space-y-2">
          <div className="text-xs text-slate-500 truncate">{adminUser?.email}</div>
          <Button variant="ghost" size="sm" className="w-full justify-start text-slate-400 hover:text-white" onClick={handleSignOut}>
            <LogOut className="w-3.5 h-3.5 mr-2" /> Sign Out
          </Button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
