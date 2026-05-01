import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DollarSign, TrendingUp, Receipt, Calculator, PiggyBank } from "lucide-react";

const TIERS = [
  { tier: "Starter",    price: 99,   campaigns: 10,  color: "#3b82f6" },
  { tier: "Growth",     price: 350,  campaigns: 50,  color: "#22c55e" },
  { tier: "Pro",        price: 1000, campaigns: 150, color: "#a855f7" },
  { tier: "Enterprise", price: 2500, campaigns: -1,  color: "#f59e0b" },
];

const PLANNED = [
  { icon: TrendingUp, label: "ARR Dashboard",    desc: "Revenue by tier, MRR/ARR, NRR, growth rate. Needs billing_subscriptions table." },
  { icon: Receipt,    label: "P&L Statement",    desc: "Monthly: revenue, COGS, gross profit, OPEX, EBITDA, net income." },
  { icon: DollarSign, label: "Expense Tracker",  desc: "Log, categorize, and export business expenses with budget vs actual." },
  { icon: Calculator, label: "Cash Flow & Tax",  desc: "Monthly cash flow, runway, 90-day forecast, quarterly tax, R&D credits." },
];

const usd = (n: number) => "$" + n.toLocaleString();

export default function KlycAdminFinancials() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Financials & P&L</h1>
        <p className="text-slate-400 text-sm">The numbers that run the business</p>
      </div>

      {/* Live KPIs — all zero until beta users are paying */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "MRR",          value: "$0",  note: "Sprint target: $1,000" },
          { label: "ARR",          value: "$0",  note: "MRR × 12" },
          { label: "Active Subs",  value: "0",   note: "Awaiting beta users" },
          { label: "Gross Margin", value: "—",   note: "Needs billing data" },
        ].map((k) => (
          <Card key={k.label} className="bg-slate-900 border-slate-800">
            <CardContent className="pt-4 pb-3 px-4">
              <div className="text-xs text-slate-400 mb-1">{k.label}</div>
              <div className="text-2xl font-bold text-white">{k.value}</div>
              <div className="text-xs text-slate-500 mt-1">{k.note}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tier Pricing — real config, always visible */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-slate-300">Pricing Tiers</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 text-xs">
                <th className="text-left p-3">Tier</th>
                <th className="text-right p-3">Price / mo</th>
                <th className="text-right p-3">Campaigns / mo</th>
                <th className="text-right p-3">ARR (1 client)</th>
              </tr>
            </thead>
            <tbody>
              {TIERS.map((t) => (
                <tr key={t.tier} className="border-b border-slate-800 text-slate-200">
                  <td className="p-3">
                    <Badge style={{ background: t.color + "30", color: t.color }}>{t.tier}</Badge>
                  </td>
                  <td className="text-right p-3 font-medium">{usd(t.price)}</td>
                  <td className="text-right p-3">{t.campaigns === -1 ? "Unlimited" : t.campaigns}</td>
                  <td className="text-right p-3 text-slate-400">{usd(t.price * 12)}</td>
                </tr>
              ))}
              <tr className="text-white font-semibold bg-slate-800/50">
                <td className="p-3 text-emerald-400">30-user Sprint Target</td>
                <td className="text-right p-3 text-emerald-400">$1,000+</td>
                <td className="text-right p-3 text-slate-500">—</td>
                <td className="text-right p-3 text-slate-500">$12,000+</td>
              </tr>
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Empty state for everything else */}
      <Card className="bg-slate-900 border-slate-800">
        <CardContent className="py-12 text-center">
          <PiggyBank className="w-10 h-10 text-slate-700 mx-auto mb-4" />
          <h2 className="text-base font-semibold text-white mb-2">Financial data awaiting beta users</h2>
          <p className="text-sm text-slate-400 max-w-md mx-auto mb-6">
            Full P&L, ARR dashboard, and expense tracking will populate once beta users are on paid plans
            and the{" "}
            <code className="text-xs text-slate-300 bg-slate-800 px-1 rounded">billing_subscriptions</code>
            {" "}table is migrated.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-left">
            {PLANNED.map(({ icon: Icon, label, desc }) => (
              <div key={label} className="bg-slate-800/50 rounded-lg p-3 border border-slate-700 border-dashed">
                <div className="flex items-center gap-2 mb-1.5">
                  <Icon className="w-3.5 h-3.5 text-slate-500" />
                  <span className="text-xs font-medium text-slate-400">{label}</span>
                </div>
                <p className="text-xs text-slate-600">{desc}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
