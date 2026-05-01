import { Card, CardContent } from "@/components/ui/card";
import {
  Award, BarChart3, Globe, Newspaper, TrendingUp,
  Megaphone, Zap, Users, Heart,
} from "lucide-react";

const PLANNED_SECTIONS = [
  { icon: Award, label: "Employee Advocacy", desc: "Team posts, reach, engagement leaderboard by person and channel." },
  { icon: Globe, label: "Channel Metrics", desc: "Followers, growth rate, engagement per platform — LinkedIn, Twitter/X, Instagram, TikTok, Email, Blog." },
  { icon: TrendingUp, label: "Campaign Performance", desc: "KLYC's own campaigns: reach, clicks, conversions, CAC, ROI by channel." },
  { icon: Newspaper, label: "Brand Health", desc: "Community size, brand mentions, sentiment, press log." },
];

const KPI_PLACEHOLDERS = [
  { label: "Total Followers", icon: Users },
  { label: "30d Impressions", icon: Globe },
  { label: "Avg Eng. Rate", icon: Heart },
  { label: "Employee Reach", icon: Megaphone },
  { label: "Advocacy Posts", icon: Zap },
];

export default function KlycAdminMarketing() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Marketing Performance</h1>
        <p className="text-sm text-slate-400">KLYC's own marketing tracked through the platform</p>
      </div>

      {/* KPI row — all dashes until data exists */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {KPI_PLACEHOLDERS.map(({ label, icon: Icon }) => (
          <Card key={label} className="bg-slate-900 border-slate-800">
            <CardContent className="pt-4 pb-3 px-4">
              <div className="flex items-center gap-2 mb-1">
                <Icon className="w-3.5 h-3.5 text-primary" />
                <span className="text-xs text-slate-400">{label}</span>
              </div>
              <div className="text-2xl font-bold text-slate-600">—</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Empty state */}
      <Card className="bg-slate-900 border-slate-800">
        <CardContent className="py-14 text-center">
          <Megaphone className="w-10 h-10 text-slate-700 mx-auto mb-4" />
          <h2 className="text-base font-semibold text-white mb-2">Marketing tracking not yet connected</h2>
          <p className="text-sm text-slate-400 max-w-md mx-auto">
            No marketing database tables exist yet. This section will populate once KLYC's
            own social accounts, campaign tracking, and analytics are wired up — post beta onboarding.
          </p>
        </CardContent>
      </Card>

      {/* What's coming */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {PLANNED_SECTIONS.map(({ icon: Icon, label, desc }) => (
          <Card key={label} className="bg-slate-900 border-slate-800 border-dashed opacity-60">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Icon className="w-4 h-4 text-slate-500" />
                <span className="text-sm font-medium text-slate-400">{label}</span>
              </div>
              <p className="text-xs text-slate-600">{desc}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
