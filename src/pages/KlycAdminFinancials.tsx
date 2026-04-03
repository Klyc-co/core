import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  DollarSign, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight,
  Download, Plus, Receipt, Calculator, Wallet, PiggyBank, FileText, AlertTriangle,
} from "lucide-react";
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell,
  PieChart, Pie,
} from "recharts";
import { format, subMonths, startOfMonth } from "date-fns";

// ── helpers ──
const usd = (n: number) => "$" + n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
const usdDec = (n: number) => "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const pct = (n: number) => `${n.toFixed(1)}%`;

// ── seed data generators ──
const TIER_PRICES: Record<string, number> = { Starter: 99, Growth: 350, Pro: 1000, Enterprise: 2500 };
const TIER_COLORS: Record<string, string> = { Starter: "#3b82f6", Growth: "#22c55e", Pro: "#a855f7", Enterprise: "#f59e0b" };
const months = Array.from({ length: 12 }, (_, i) => {
  const d = subMonths(new Date(), 11 - i);
  return { key: format(d, "MMM yy"), date: d };
});

const arrData = months.map((m, i) => ({
  month: m.key,
  Starter: (8 + i) * 99 * 12,
  Growth: (5 + Math.floor(i * 0.8)) * 350 * 12,
  Pro: (2 + Math.floor(i * 0.4)) * 1000 * 12,
  Enterprise: (1 + Math.floor(i / 6)) * 2500 * 12,
}));
const latestArr = arrData[arrData.length - 1];
const totalArr = latestArr.Starter + latestArr.Growth + latestArr.Pro + latestArr.Enterprise;
const prevArr = arrData[arrData.length - 2];
const prevTotal = prevArr.Starter + prevArr.Growth + prevArr.Pro + prevArr.Enterprise;
const arrGrowth = ((totalArr - prevTotal) / prevTotal) * 100;

const tierBreakdown = Object.entries(TIER_PRICES).map(([tier, price]) => {
  const count = tier === "Starter" ? 19 : tier === "Growth" ? 14 : tier === "Pro" ? 6 : 2;
  const mrr = count * price;
  return { tier, count, price, mrr, arr: mrr * 12 };
});
const totalMrr = tierBreakdown.reduce((s, t) => s + t.mrr, 0);

// P&L mock
const plMonths = ["Mar 2026", "Feb 2026", "Mar 2025"];
const plData = plMonths.map((label, idx) => {
  const rev = totalMrr * (1 - idx * 0.05) + 800;
  const cogs = rev * 0.18;
  const gross = rev - cogs;
  const opex = 28000 + idx * 1000;
  const ebitda = gross - opex;
  const tax = Math.max(ebitda * 0.25, 0);
  const net = ebitda - tax;
  return { label, rev, cogs, gross, grossMargin: (gross / rev) * 100, opex, ebitda, tax, net, netMargin: (net / rev) * 100 };
});

// Expenses mock
const EXPENSE_CATEGORIES = [
  "payroll","contractors","benefits","payroll_tax","software",
  "marketing_paid","marketing_content","marketing_events",
  "legal","accounting","consulting","office","equipment","travel","other",
] as const;
const mockExpenses = [
  { id: "1", date: "2026-03-01", category: "payroll", vendor: "Team", amount: 18000, description: "March salaries", is_recurring: true, is_tax_deductible: true },
  { id: "2", date: "2026-03-05", category: "software", vendor: "Vercel", amount: 240, description: "Hosting", is_recurring: true, is_tax_deductible: true },
  { id: "3", date: "2026-03-05", category: "software", vendor: "OpenAI", amount: 3200, description: "API costs", is_recurring: true, is_tax_deductible: true },
  { id: "4", date: "2026-03-10", category: "marketing_paid", vendor: "Meta", amount: 1500, description: "FB/IG ads", is_recurring: false, is_tax_deductible: true },
  { id: "5", date: "2026-03-12", category: "legal", vendor: "Roberts LLP", amount: 2500, description: "Trademark filing", is_recurring: false, is_tax_deductible: true },
  { id: "6", date: "2026-03-15", category: "contractors", vendor: "Design Co", amount: 3000, description: "UI work", is_recurring: false, is_tax_deductible: true },
  { id: "7", date: "2026-03-20", category: "office", vendor: "WeWork", amount: 800, description: "Coworking", is_recurring: true, is_tax_deductible: true },
];

const expenseByCat = EXPENSE_CATEGORIES.map((cat) => ({
  category: cat.replace(/_/g, " "),
  amount: mockExpenses.filter((e) => e.category === cat).reduce((s, e) => s + e.amount, 0),
})).filter((e) => e.amount > 0);

const budgetVsActual = [
  { category: "Payroll", budget: 20000, actual: 18000 },
  { category: "Software", budget: 4000, actual: 3440 },
  { category: "Marketing", budget: 2000, actual: 1500 },
  { category: "Legal", budget: 1000, actual: 2500 },
  { category: "Contractors", budget: 3500, actual: 3000 },
  { category: "Office", budget: 1000, actual: 800 },
];

// Cash flow
const cashFlowData = months.map((m, i) => {
  const cashIn = totalMrr * (0.7 + i * 0.03);
  const cashOut = 28000 + Math.random() * 4000;
  return { month: m.key, cashIn: Math.round(cashIn), cashOut: Math.round(cashOut), net: Math.round(cashIn - cashOut) };
});
const lastCf = cashFlowData[cashFlowData.length - 1];
const avgBurn = Math.round(cashFlowData.slice(-3).reduce((s, c) => s + c.cashOut, 0) / 3);
const bankBalance = 287000;
const runway = Math.round(bankBalance / avgBurn);

// Tax
const taxPayments = [
  { quarter: "Q1 2026", type: "Federal", due: "2026-04-15", amountDue: 12000, paid: 12000, status: "Paid" },
  { quarter: "Q1 2026", type: "State", due: "2026-04-15", amountDue: 3200, paid: 3200, status: "Paid" },
  { quarter: "Q2 2026", type: "Federal", due: "2026-06-15", amountDue: 13500, paid: 0, status: "Due" },
  { quarter: "Q2 2026", type: "State", due: "2026-06-15", amountDue: 3600, paid: 0, status: "Due" },
  { quarter: "Q2 2026", type: "SE Tax", due: "2026-06-15", amountDue: 5800, paid: 0, status: "Due" },
];
const ytdDeductions = [
  { category: "Payroll", amount: 54000 },
  { category: "Software", amount: 10320 },
  { category: "Marketing", amount: 4500 },
  { category: "Legal", amount: 2500 },
  { category: "Office", amount: 2400 },
  { category: "R&D Credits", amount: 8500 },
];

// NRR calc
const startingMrr = totalMrr * 0.95;
const expansionMrr = totalMrr * 0.06;
const contractionMrr = totalMrr * 0.01;
const churnMrr = totalMrr * 0.02;
const nrr = ((startingMrr + expansionMrr - contractionMrr - churnMrr) / startingMrr) * 100;

// Sparkline
const MiniSparkline = ({ data, color = "#22c55e", h = 32 }: { data: number[]; color?: string; h?: number }) => (
  <ResponsiveContainer width="100%" height={h}>
    <LineChart data={data.map((v, i) => ({ i, v }))}>
      <Line type="monotone" dataKey="v" stroke={color} dot={false} strokeWidth={1.5} />
    </LineChart>
  </ResponsiveContainer>
);

export default function KlycAdminFinancials() {
  const [tab, setTab] = useState("arr");
  const [expFilter, setExpFilter] = useState("all");
  const [fedRate, setFedRate] = useState(21);
  const [stateRate, setStateRate] = useState(8.84);

  const filteredExpenses = expFilter === "all" ? mockExpenses : mockExpenses.filter((e) => e.category === expFilter);

  const exportExpenses = () => {
    const header = "Date,Category,Vendor,Amount,Description,Recurring,Deductible\n";
    const rows = mockExpenses.map((e) => `${e.date},${e.category},${e.vendor},${e.amount},"${e.description}",${e.is_recurring},${e.is_tax_deductible}`).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "expenses.csv";
    a.click();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Financials & P&L</h1>
          <p className="text-slate-400 text-sm">The numbers that run the business</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="border-slate-700 text-slate-300" onClick={exportExpenses}>
            <Download className="w-3.5 h-3.5 mr-1" /> Export
          </Button>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="bg-slate-800/50 border border-slate-700">
          <TabsTrigger value="arr">ARR Dashboard</TabsTrigger>
          <TabsTrigger value="pl">P&L Statement</TabsTrigger>
          <TabsTrigger value="expenses">Expenses</TabsTrigger>
          <TabsTrigger value="cashflow">Cash Flow</TabsTrigger>
          <TabsTrigger value="tax">Tax Planning</TabsTrigger>
        </TabsList>

        {/* ───── ARR DASHBOARD ───── */}
        <TabsContent value="arr" className="space-y-6">
          {/* Hero ARR */}
          <Card className="bg-gradient-to-br from-emerald-900/40 to-slate-900 border-emerald-800/50 text-center py-8">
            <CardContent className="space-y-1">
              <p className="text-slate-400 text-sm font-medium uppercase tracking-wider">Annual Recurring Revenue</p>
              <p className="text-5xl font-black text-emerald-400">{usd(totalArr)}</p>
              <div className="flex items-center justify-center gap-2 text-sm">
                <Badge className={arrGrowth > 0 ? "bg-emerald-900/60 text-emerald-300" : "bg-red-900/60 text-red-300"}>
                  {arrGrowth > 0 ? <ArrowUpRight className="w-3 h-3 mr-1" /> : <ArrowDownRight className="w-3 h-3 mr-1" />}
                  {pct(arrGrowth)} MoM
                </Badge>
                <span className="text-slate-500">MRR: {usd(totalMrr)}</span>
                <Badge className={nrr >= 100 ? "bg-emerald-900/60 text-emerald-300" : "bg-amber-900/60 text-amber-300"}>
                  NRR {pct(nrr)}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* MRR sub-metrics */}
          <div className="grid grid-cols-4 gap-4">
            {[
              { label: "New MRR", value: usd(Math.round(totalMrr * 0.08)), color: "text-emerald-400", icon: TrendingUp },
              { label: "Expansion MRR", value: usd(Math.round(expansionMrr)), color: "text-blue-400", icon: ArrowUpRight },
              { label: "Churned MRR", value: usd(Math.round(churnMrr)), color: "text-red-400", icon: TrendingDown },
              { label: "Net New MRR", value: usd(Math.round(totalMrr * 0.08 + expansionMrr - churnMrr)), color: "text-emerald-300", icon: DollarSign },
            ].map((m) => (
              <Card key={m.label} className="bg-slate-800/50 border-slate-700">
                <CardContent className="pt-4 pb-3">
                  <p className="text-xs text-slate-400">{m.label}</p>
                  <p className={`text-xl font-bold ${m.color}`}>{m.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* ARR by tier stacked */}
          <div className="grid grid-cols-2 gap-4">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-300">ARR by Tier (12mo)</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={arrData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="month" tick={{ fill: "#94a3b8", fontSize: 11 }} />
                    <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`} />
                    <Tooltip contentStyle={{ background: "#1e293b", border: "1px solid #334155", color: "#e2e8f0" }} formatter={(v: number) => usd(v)} />
                    <Legend />
                    {Object.entries(TIER_COLORS).map(([tier, color]) => (
                      <Area key={tier} type="monotone" dataKey={tier} stackId="1" fill={color} stroke={color} fillOpacity={0.6} />
                    ))}
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-300">Tier Breakdown</CardTitle></CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="text-slate-400 border-b border-slate-700">
                      <th className="text-left py-2">Tier</th><th className="text-right">Clients</th><th className="text-right">Price</th>
                      <th className="text-right">MRR</th><th className="text-right">ARR</th><th className="text-right">% Total</th>
                    </tr></thead>
                    <tbody>
                      {tierBreakdown.map((t) => (
                        <tr key={t.tier} className="border-b border-slate-800 text-slate-300">
                          <td className="py-2"><Badge style={{ background: TIER_COLORS[t.tier] + "30", color: TIER_COLORS[t.tier] }}>{t.tier}</Badge></td>
                          <td className="text-right">{t.count}</td>
                          <td className="text-right">{usd(t.price)}</td>
                          <td className="text-right font-medium">{usd(t.mrr)}</td>
                          <td className="text-right font-medium">{usd(t.arr)}</td>
                          <td className="text-right">{pct((t.arr / totalArr) * 100)}</td>
                        </tr>
                      ))}
                      <tr className="text-white font-bold">
                        <td className="py-2">Total</td><td className="text-right">{tierBreakdown.reduce((s, t) => s + t.count, 0)}</td>
                        <td></td><td className="text-right">{usd(totalMrr)}</td><td className="text-right">{usd(totalArr)}</td><td className="text-right">100%</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* ARR growth rate */}
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-300">ARR Growth Rate (MoM %)</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={arrData.map((d, i) => {
                  if (i === 0) return { month: d.month, growth: 0 };
                  const cur = d.Starter + d.Growth + d.Pro + d.Enterprise;
                  const prev = arrData[i - 1].Starter + arrData[i - 1].Growth + arrData[i - 1].Pro + arrData[i - 1].Enterprise;
                  return { month: d.month, growth: ((cur - prev) / prev) * 100 };
                })}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="month" tick={{ fill: "#94a3b8", fontSize: 11 }} />
                  <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} tickFormatter={(v: number) => `${v.toFixed(1)}%`} />
                  <Tooltip contentStyle={{ background: "#1e293b", border: "1px solid #334155", color: "#e2e8f0" }} formatter={(v: number) => pct(v)} />
                  <Line type="monotone" dataKey="growth" stroke="#22c55e" strokeWidth={2} dot={{ fill: "#22c55e", r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ───── P&L STATEMENT ───── */}
        <TabsContent value="pl" className="space-y-6">
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-sm text-slate-300">Monthly Profit & Loss</CardTitle>
              <CardDescription className="text-slate-500">Current vs Previous vs Year-Ago</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 mb-4">
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <Label>Federal %</Label>
                  <Input type="number" value={fedRate} onChange={(e) => setFedRate(+e.target.value)} className="w-20 h-7 text-xs bg-slate-900 border-slate-700 text-white" />
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <Label>State %</Label>
                  <Input type="number" value={stateRate} onChange={(e) => setStateRate(+e.target.value)} className="w-20 h-7 text-xs bg-slate-900 border-slate-700 text-white" />
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-700 text-slate-400">
                      <th className="text-left py-2 w-1/3">Line Item</th>
                      {plData.map((p) => <th key={p.label} className="text-right">{p.label}</th>)}
                    </tr>
                  </thead>
                  <tbody className="text-slate-300">
                    <PLRow label="Subscription Revenue" values={plData.map((p) => p.rev * 0.92)} />
                    <PLRow label="Overage Revenue" values={plData.map((p) => p.rev * 0.05)} />
                    <PLRow label="Enterprise Contracts" values={plData.map((p) => p.rev * 0.03)} />
                    <PLRow label="Total Revenue" values={plData.map((p) => p.rev)} bold />
                    <tr><td colSpan={4} className="py-1"></td></tr>
                    <PLRow label="API Costs" values={plData.map((p) => p.cogs * 0.7)} negative />
                    <PLRow label="Infrastructure" values={plData.map((p) => p.cogs * 0.3)} negative />
                    <PLRow label="Total COGS" values={plData.map((p) => p.cogs)} bold negative />
                    <tr><td colSpan={4} className="py-1"></td></tr>
                    <PLRow label="Gross Profit" values={plData.map((p) => p.gross)} bold green />
                    <PLRow label="Gross Margin" values={plData.map((p) => p.grossMargin)} isPct />
                    <tr><td colSpan={4} className="py-1"></td></tr>
                    <PLRow label="Payroll & Benefits" values={plData.map(() => 21000)} negative />
                    <PLRow label="Software & Tools" values={plData.map(() => 3440)} negative />
                    <PLRow label="Marketing" values={plData.map(() => 1500)} negative />
                    <PLRow label="Legal & Accounting" values={plData.map(() => 2500)} negative />
                    <PLRow label="Total OPEX" values={plData.map((p) => p.opex)} bold negative />
                    <tr><td colSpan={4} className="py-1"></td></tr>
                    <PLRow label="EBITDA" values={plData.map((p) => p.ebitda)} bold green />
                    <PLRow label={`Federal Tax (${fedRate}%)`} values={plData.map((p) => Math.max(p.ebitda * fedRate / 100, 0))} negative />
                    <PLRow label={`State Tax (${stateRate}%)`} values={plData.map((p) => Math.max(p.ebitda * stateRate / 100, 0))} negative />
                    <tr><td colSpan={4} className="py-1 border-t border-slate-600"></td></tr>
                    <PLRow label="NET INCOME" values={plData.map((p) => p.ebitda - Math.max(p.ebitda * (fedRate + stateRate) / 100, 0))} bold hero />
                    <PLRow label="Net Margin" values={plData.map((p) => ((p.ebitda - Math.max(p.ebitda * (fedRate + stateRate) / 100, 0)) / p.rev) * 100)} isPct />
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ───── EXPENSES ───── */}
        <TabsContent value="expenses" className="space-y-6">
          {/* Add expense form */}
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-300">Add Expense</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-6 gap-3">
                <Input placeholder="Date" type="date" className="bg-slate-900 border-slate-700 text-white text-xs" />
                <Select><SelectTrigger className="bg-slate-900 border-slate-700 text-white text-xs"><SelectValue placeholder="Category" /></SelectTrigger>
                  <SelectContent>{EXPENSE_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
                </Select>
                <Input placeholder="Vendor" className="bg-slate-900 border-slate-700 text-white text-xs" />
                <Input placeholder="Amount" type="number" className="bg-slate-900 border-slate-700 text-white text-xs" />
                <Input placeholder="Description" className="bg-slate-900 border-slate-700 text-white text-xs" />
                <Button size="sm" className="bg-primary"><Plus className="w-3.5 h-3.5 mr-1" /> Add</Button>
              </div>
              <div className="flex gap-4 mt-2">
                <div className="flex items-center gap-2"><Switch id="rec" /><Label htmlFor="rec" className="text-xs text-slate-400">Recurring</Label></div>
                <div className="flex items-center gap-2"><Switch id="ded" /><Label htmlFor="ded" className="text-xs text-slate-400">Tax Deductible</Label></div>
              </div>
            </CardContent>
          </Card>

          {/* Filter + table */}
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader className="pb-2 flex-row items-center justify-between">
              <CardTitle className="text-sm text-slate-300">Expense Log</CardTitle>
              <div className="flex gap-2">
                <Select value={expFilter} onValueChange={setExpFilter}>
                  <SelectTrigger className="w-40 bg-slate-900 border-slate-700 text-white text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {EXPENSE_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c.replace(/_/g, " ")}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Button variant="outline" size="sm" className="border-slate-700 text-slate-300" onClick={exportExpenses}>
                  <Download className="w-3.5 h-3.5 mr-1" /> CSV
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <table className="w-full text-sm">
                <thead><tr className="text-slate-400 border-b border-slate-700">
                  <th className="text-left py-2">Date</th><th className="text-left">Category</th><th className="text-left">Vendor</th>
                  <th className="text-right">Amount</th><th className="text-left">Description</th><th className="text-center">Rec.</th><th className="text-center">Ded.</th>
                </tr></thead>
                <tbody>
                  {filteredExpenses.map((e) => (
                    <tr key={e.id} className="border-b border-slate-800 text-slate-300">
                      <td className="py-2">{e.date}</td>
                      <td><Badge variant="outline" className="text-xs border-slate-600">{e.category.replace(/_/g, " ")}</Badge></td>
                      <td>{e.vendor}</td><td className="text-right font-medium">{usdDec(e.amount)}</td>
                      <td className="text-slate-400">{e.description}</td>
                      <td className="text-center">{e.is_recurring ? "✓" : ""}</td>
                      <td className="text-center">{e.is_tax_deductible ? "✓" : ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>

          {/* Budget vs Actual + By category */}
          <div className="grid grid-cols-2 gap-4">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-300">Budget vs Actual</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={budgetVsActual} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis type="number" tick={{ fill: "#94a3b8", fontSize: 11 }} tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`} />
                    <YAxis type="category" dataKey="category" tick={{ fill: "#94a3b8", fontSize: 11 }} width={80} />
                    <Tooltip contentStyle={{ background: "#1e293b", border: "1px solid #334155", color: "#e2e8f0" }} formatter={(v: number) => usd(v)} />
                    <Legend />
                    <Bar dataKey="budget" fill="#475569" name="Budget" />
                    <Bar dataKey="actual" name="Actual">
                      {budgetVsActual.map((entry) => (
                        <Cell key={entry.category} fill={entry.actual > entry.budget ? "#ef4444" : "#22c55e"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-300">Monthly Totals by Category</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={expenseByCat} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis type="number" tick={{ fill: "#94a3b8", fontSize: 11 }} tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`} />
                    <YAxis type="category" dataKey="category" tick={{ fill: "#94a3b8", fontSize: 11 }} width={100} />
                    <Tooltip contentStyle={{ background: "#1e293b", border: "1px solid #334155", color: "#e2e8f0" }} formatter={(v: number) => usd(v)} />
                    <Bar dataKey="amount" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ───── CASH FLOW ───── */}
        <TabsContent value="cashflow" className="space-y-6">
          <div className="grid grid-cols-3 gap-4">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-slate-400 text-xs mb-1"><Wallet className="w-4 h-4" /> Bank Balance</div>
                <p className="text-2xl font-bold text-white">{usd(bankBalance)}</p>
              </CardContent>
            </Card>
            <Card className="bg-slate-800/50 border-slate-700">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-slate-400 text-xs mb-1"><PiggyBank className="w-4 h-4" /> Avg Monthly Burn</div>
                <p className="text-2xl font-bold text-red-400">{usd(avgBurn)}</p>
              </CardContent>
            </Card>
            <Card className={`border ${runway > 12 ? "bg-emerald-900/20 border-emerald-800/50" : runway > 6 ? "bg-amber-900/20 border-amber-800/50" : "bg-red-900/20 border-red-800/50"}`}>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-slate-400 text-xs mb-1"><Calculator className="w-4 h-4" /> Runway</div>
                <p className={`text-2xl font-bold ${runway > 12 ? "text-emerald-400" : runway > 6 ? "text-amber-400" : "text-red-400"}`}>{runway} months</p>
              </CardContent>
            </Card>
          </div>

          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-300">Monthly Cash Flow</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={cashFlowData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="month" tick={{ fill: "#94a3b8", fontSize: 11 }} />
                  <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip contentStyle={{ background: "#1e293b", border: "1px solid #334155", color: "#e2e8f0" }} formatter={(v: number) => usd(v)} />
                  <Legend />
                  <Bar dataKey="cashIn" fill="#22c55e" name="Cash In" />
                  <Bar dataKey="cashOut" fill="#ef4444" name="Cash Out" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* 90-day forecast */}
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-300">90-Day Cash Forecast</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                {[1, 2, 3].map((m) => {
                  const projIn = Math.round(lastCf.cashIn * (1 + arrGrowth / 100 * m / 12));
                  const projOut = avgBurn;
                  const projBal = bankBalance + (projIn - projOut) * m;
                  return (
                    <div key={m} className="bg-slate-900/50 rounded-lg p-4 border border-slate-700">
                      <p className="text-xs text-slate-400 mb-2">Month +{m}</p>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between"><span className="text-slate-400">Projected In</span><span className="text-emerald-400">{usd(projIn)}</span></div>
                        <div className="flex justify-between"><span className="text-slate-400">Projected Out</span><span className="text-red-400">{usd(projOut)}</span></div>
                        <div className="flex justify-between border-t border-slate-700 pt-1 mt-1"><span className="text-slate-300 font-medium">Balance</span><span className="text-white font-bold">{usd(projBal)}</span></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ───── TAX PLANNING ───── */}
        <TabsContent value="tax" className="space-y-6">
          <div className="grid grid-cols-3 gap-4">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardContent className="pt-4">
                <p className="text-xs text-slate-400 mb-1">YTD Taxable Income</p>
                <p className="text-2xl font-bold text-white">{usd(plData[0].ebitda * 3)}</p>
              </CardContent>
            </Card>
            <Card className="bg-slate-800/50 border-slate-700">
              <CardContent className="pt-4">
                <p className="text-xs text-slate-400 mb-1">Est. Year-End Liability</p>
                <p className="text-2xl font-bold text-amber-400">{usd(Math.round(plData[0].ebitda * 12 * (fedRate + stateRate) / 100))}</p>
              </CardContent>
            </Card>
            <Card className="bg-slate-800/50 border-slate-700">
              <CardContent className="pt-4">
                <p className="text-xs text-slate-400 mb-1">Total Deductions YTD</p>
                <p className="text-2xl font-bold text-emerald-400">{usd(ytdDeductions.reduce((s, d) => s + d.amount, 0))}</p>
              </CardContent>
            </Card>
          </div>

          {/* Quarterly payments */}
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-300">Quarterly Estimated Payments</CardTitle></CardHeader>
            <CardContent>
              <table className="w-full text-sm">
                <thead><tr className="text-slate-400 border-b border-slate-700">
                  <th className="text-left py-2">Quarter</th><th className="text-left">Type</th><th className="text-left">Due Date</th>
                  <th className="text-right">Due</th><th className="text-right">Paid</th><th className="text-center">Status</th>
                </tr></thead>
                <tbody>
                  {taxPayments.map((t, i) => (
                    <tr key={i} className="border-b border-slate-800 text-slate-300">
                      <td className="py-2">{t.quarter}</td><td>{t.type}</td><td>{t.due}</td>
                      <td className="text-right">{usdDec(t.amountDue)}</td>
                      <td className="text-right">{usdDec(t.paid)}</td>
                      <td className="text-center">
                        <Badge className={t.status === "Paid" ? "bg-emerald-900/60 text-emerald-300" : "bg-amber-900/60 text-amber-300"}>{t.status}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>

          {/* Deductions + R&D */}
          <div className="grid grid-cols-2 gap-4">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-300">Deduction Summary</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={ytdDeductions} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis type="number" tick={{ fill: "#94a3b8", fontSize: 11 }} tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`} />
                    <YAxis type="category" dataKey="category" tick={{ fill: "#94a3b8", fontSize: 11 }} width={80} />
                    <Tooltip contentStyle={{ background: "#1e293b", border: "1px solid #334155", color: "#e2e8f0" }} formatter={(v: number) => usd(v)} />
                    <Bar dataKey="amount" fill="#22c55e" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-300">R&D Credit Tracker</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {[
                  { item: "AI/ML Development", hours: 480, cost: 5200 },
                  { item: "Compression R&D", hours: 320, cost: 3300 },
                  { item: "Infrastructure", hours: 160, cost: 1800 },
                ].map((r) => (
                  <div key={r.item} className="flex items-center justify-between bg-slate-900/50 p-3 rounded border border-slate-700">
                    <div>
                      <p className="text-sm text-white">{r.item}</p>
                      <p className="text-xs text-slate-400">{r.hours} hrs logged</p>
                    </div>
                    <p className="text-sm font-medium text-emerald-400">{usd(r.cost)}</p>
                  </div>
                ))}
                <div className="flex justify-between pt-2 border-t border-slate-700">
                  <span className="text-sm text-slate-300 font-medium">Total Qualifying R&D</span>
                  <span className="text-sm font-bold text-emerald-400">{usd(10300)}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          <Button variant="outline" className="border-slate-700 text-slate-300"><FileText className="w-3.5 h-3.5 mr-1" /> Export Tax Summary for CPA</Button>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ── P&L Row component ──
function PLRow({ label, values, bold, green, negative, hero, isPct }: {
  label: string; values: number[]; bold?: boolean; green?: boolean; negative?: boolean; hero?: boolean; isPct?: boolean;
}) {
  return (
    <tr className={bold ? "font-semibold" : ""}>
      <td className={`py-1.5 ${bold ? "text-white" : "text-slate-400"} ${hero ? "text-lg" : "text-sm"}`}>{label}</td>
      {values.map((v, i) => {
        let color = "text-slate-300";
        if (hero) color = v >= 0 ? "text-emerald-400" : "text-red-400";
        else if (green) color = "text-emerald-400";
        else if (negative) color = "text-slate-400";
        const display = isPct ? pct(v) : (negative ? `(${usd(Math.abs(Math.round(v)))})` : usd(Math.round(v)));
        return <td key={i} className={`text-right py-1.5 ${color} ${hero ? "text-lg font-bold" : "text-sm"}`}>{display}</td>;
      })}
    </tr>
  );
}
