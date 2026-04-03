import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import {
  Award, BarChart3, Globe, Heart, Megaphone, Newspaper,
  TrendingUp, Users, Zap,
} from "lucide-react";

/* ── Constants ── */
const CHANNELS = ["Twitter/X", "LinkedIn", "Instagram", "TikTok", "Email", "Blog", "Paid Ads"];
const CHANNEL_COLORS: Record<string, string> = {
  "Twitter/X": "#1DA1F2", LinkedIn: "#0A66C2", Instagram: "#E4405F",
  TikTok: "#00f2ea", Email: "#f59e0b", Blog: "#10b981", "Paid Ads": "#8b5cf6",
};

const EMPLOYEES = [
  { id: "e1", name: "Kitchens", role: "Founder" },
  { id: "e2", name: "Ethan K", role: "Engineer" },
  { id: "e3", name: "Ethan W", role: "Engineer" },
  { id: "e4", name: "Rohil", role: "Marketing" },
];

/* ── Mock Data ── */
function mockChannelMetrics() {
  return CHANNELS.map((ch) => ({
    channel: ch,
    followers: Math.floor(Math.random() * 8000 + 1000),
    growth: +(Math.random() * 12 - 2).toFixed(1),
    posts7d: Math.floor(Math.random() * 10 + 2),
    posts30d: Math.floor(Math.random() * 35 + 8),
    engRate: +(Math.random() * 6 + 1).toFixed(2),
    impressions30d: Math.floor(Math.random() * 200000 + 20000),
    sparkline: Array.from({ length: 7 }, () => Math.floor(Math.random() * 500 + 100)),
  }));
}

function mockAdvocacy() {
  return EMPLOYEES.map((emp) => ({
    ...emp,
    posts30d: Math.floor(Math.random() * 15 + 3),
    reach: Math.floor(Math.random() * 50000 + 5000),
    engRate: +(Math.random() * 5 + 1).toFixed(2),
    topPost: "How KLYC is reshaping AI marketing",
    topMetric: Math.floor(Math.random() * 5000 + 500),
    channels: ["Twitter/X", "LinkedIn"].slice(0, Math.floor(Math.random() * 2) + 1),
  })).sort((a, b) => b.reach - a.reach);
}

function mockCampaigns() {
  return [
    { name: "AI Marketing Launch", channel: "LinkedIn", reach: 142000, clicks: 4800, conversions: 320, spend: 2400, roi: 5.2 },
    { name: "Compression Moat Thread", channel: "Twitter/X", reach: 89000, clicks: 3200, conversions: 0, spend: 0, roi: 0 },
    { name: "Product Hunt Launch", channel: "Blog", reach: 67000, clicks: 12400, conversions: 890, spend: 0, roi: 0 },
    { name: "Instagram Reels Series", channel: "Instagram", reach: 54000, clicks: 1800, conversions: 95, spend: 1200, roi: 3.1 },
    { name: "TikTok AI Demo", channel: "TikTok", reach: 210000, clicks: 8400, conversions: 420, spend: 800, roi: 8.4 },
    { name: "Email Drip — Trial", channel: "Email", reach: 12000, clicks: 3600, conversions: 540, spend: 150, roi: 12.0 },
    { name: "Google Ads — SaaS", channel: "Paid Ads", reach: 180000, clicks: 6200, conversions: 280, spend: 4800, roi: 2.3 },
  ];
}

function mockFunnel() {
  return [
    { stage: "Impressions", value: 850000 },
    { stage: "Clicks", value: 42000 },
    { stage: "Signups", value: 3200 },
    { stage: "Trial", value: 1800 },
    { stage: "Paid", value: 420 },
  ];
}

function mockCACByChannel() {
  return [
    { channel: "Twitter/X", cac: 0 },
    { channel: "LinkedIn", cac: 42 },
    { channel: "Instagram", cac: 68 },
    { channel: "TikTok", cac: 22 },
    { channel: "Email", cac: 8 },
    { channel: "Blog", cac: 0 },
    { channel: "Paid Ads", cac: 95 },
  ];
}

function mockOrgPaidSplit() {
  return [
    { name: "Organic", value: 65 },
    { name: "Paid", value: 35 },
  ];
}

function mockOrgPaidTrend() {
  return Array.from({ length: 6 }, (_, i) => ({
    month: ["Oct", "Nov", "Dec", "Jan", "Feb", "Mar"][i],
    organic: Math.floor(55 + i * 2 + Math.random() * 5),
    paid: Math.floor(45 - i * 2 + Math.random() * 5),
  }));
}

function mockPressLog() {
  return [
    { date: "2026-03-28", outlet: "TechCrunch", title: "KLYC raises seed round for AI marketing platform", link: "#" },
    { date: "2026-03-15", outlet: "Product Hunt", title: "#3 Product of the Day — KLYC AI", link: "#" },
    { date: "2026-02-20", outlet: "Marketing Brew", title: "How AI agents are replacing marketing teams", link: "#" },
    { date: "2026-01-10", outlet: "SaaS Weekly", title: "Startup to watch: KLYC's compression moat", link: "#" },
  ];
}

function mockCommunity() {
  return [
    { name: "Newsletter", count: 4200, growth: "+340/mo" },
    { name: "Discord", count: 890, growth: "+120/mo" },
    { name: "Twitter Followers", count: 6800, growth: "+580/mo" },
    { name: "LinkedIn Page", count: 3400, growth: "+280/mo" },
  ];
}

/* ── Sparkline ── */
function Spark({ data, color = "hsl(var(--primary))" }: { data: number[]; color?: string }) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const w = 56; const h = 18;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / range) * h}`).join(" ");
  return <svg width={w} height={h}><polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" /></svg>;
}

const PIE_COLORS = ["hsl(var(--primary))", "#8b5cf6"];

/* ── Main ── */
export default function KlycAdminMarketing() {
  const channels = useMemo(mockChannelMetrics, []);
  const advocacy = useMemo(mockAdvocacy, []);
  const campaigns = useMemo(mockCampaigns, []);
  const funnel = useMemo(mockFunnel, []);
  const cacData = useMemo(mockCACByChannel, []);
  const orgPaid = useMemo(mockOrgPaidSplit, []);
  const orgPaidTrend = useMemo(mockOrgPaidTrend, []);
  const press = useMemo(mockPressLog, []);
  const community = useMemo(mockCommunity, []);

  const totalReach = advocacy.reduce((a, e) => a + e.reach, 0);
  const totalAdvPosts = advocacy.reduce((a, e) => a + e.posts30d, 0);
  const totalFollowers = channels.reduce((a, c) => a + c.followers, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Marketing Performance</h1>
        <p className="text-sm text-slate-400">KLYC's own marketing through the platform</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: "Total Followers", value: totalFollowers.toLocaleString(), icon: Users },
          { label: "30d Impressions", value: `${(channels.reduce((a, c) => a + c.impressions30d, 0) / 1000).toFixed(0)}K`, icon: Globe },
          { label: "Avg Eng. Rate", value: `${(channels.reduce((a, c) => a + c.engRate, 0) / channels.length).toFixed(2)}%`, icon: Heart },
          { label: "Employee Reach", value: totalReach.toLocaleString(), icon: Megaphone },
          { label: "Advocacy Posts", value: totalAdvPosts.toString(), icon: Zap },
        ].map((kpi) => (
          <Card key={kpi.label} className="bg-slate-900 border-slate-800">
            <CardContent className="pt-4 pb-3 px-4">
              <div className="flex items-center gap-2 mb-1">
                <kpi.icon className="w-3.5 h-3.5 text-primary" />
                <span className="text-xs text-slate-400">{kpi.label}</span>
              </div>
              <div className="text-2xl font-bold text-white">{kpi.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="advocacy" className="space-y-4">
        <TabsList className="bg-slate-800 border-slate-700">
          <TabsTrigger value="advocacy" className="data-[state=active]:bg-slate-700">
            <Award className="w-3.5 h-3.5 mr-1" /> Advocacy
          </TabsTrigger>
          <TabsTrigger value="channels" className="data-[state=active]:bg-slate-700">
            <BarChart3 className="w-3.5 h-3.5 mr-1" /> Channels
          </TabsTrigger>
          <TabsTrigger value="campaigns" className="data-[state=active]:bg-slate-700">
            <TrendingUp className="w-3.5 h-3.5 mr-1" /> Campaigns
          </TabsTrigger>
          <TabsTrigger value="brand" className="data-[state=active]:bg-slate-700">
            <Newspaper className="w-3.5 h-3.5 mr-1" /> Brand Health
          </TabsTrigger>
        </TabsList>

        {/* ── ADVOCACY ── */}
        <TabsContent value="advocacy" className="space-y-4">
          {/* Aggregate bar */}
          <div className="grid grid-cols-3 gap-3">
            <Card className="bg-slate-900 border-slate-800">
              <CardContent className="pt-4 pb-3 px-4 text-center">
                <div className="text-2xl font-bold text-white">{totalReach.toLocaleString()}</div>
                <div className="text-xs text-slate-400">Combined Reach (30d)</div>
              </CardContent>
            </Card>
            <Card className="bg-slate-900 border-slate-800">
              <CardContent className="pt-4 pb-3 px-4 text-center">
                <div className="text-2xl font-bold text-white">{totalAdvPosts}</div>
                <div className="text-xs text-slate-400">Total Posts (30d)</div>
              </CardContent>
            </Card>
            <Card className="bg-slate-900 border-slate-800">
              <CardContent className="pt-4 pb-3 px-4 text-center">
                <div className="text-2xl font-bold text-emerald-400">+{(totalFollowers * 0.08).toFixed(0)}</div>
                <div className="text-xs text-slate-400">Audience Growth (30d)</div>
              </CardContent>
            </Card>
          </div>

          {/* Leaderboard */}
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-slate-300 flex items-center gap-2">
                <Award className="w-4 h-4 text-amber-400" /> Advocacy Leaderboard
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-800 hover:bg-transparent">
                    <TableHead className="text-slate-400 text-xs w-10">#</TableHead>
                    <TableHead className="text-slate-400 text-xs">Employee</TableHead>
                    <TableHead className="text-slate-400 text-xs">Posts (30d)</TableHead>
                    <TableHead className="text-slate-400 text-xs">Reach</TableHead>
                    <TableHead className="text-slate-400 text-xs">Eng. Rate</TableHead>
                    <TableHead className="text-slate-400 text-xs">Top Post</TableHead>
                    <TableHead className="text-slate-400 text-xs">Channels</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {advocacy.map((emp, i) => (
                    <TableRow key={emp.id} className="border-slate-800">
                      <TableCell>
                        <span className={`text-sm font-bold ${i === 0 ? "text-amber-400" : i === 1 ? "text-slate-300" : i === 2 ? "text-orange-400" : "text-slate-500"}`}>
                          {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm font-medium text-white">{emp.name}</div>
                        <div className="text-[10px] text-slate-500">{emp.role}</div>
                      </TableCell>
                      <TableCell className="text-sm text-white">{emp.posts30d}</TableCell>
                      <TableCell className="text-sm font-medium text-white">{emp.reach.toLocaleString()}</TableCell>
                      <TableCell className="text-sm text-emerald-400">{emp.engRate}%</TableCell>
                      <TableCell>
                        <div className="text-xs text-slate-300 max-w-[180px] truncate">{emp.topPost}</div>
                        <div className="text-[10px] text-slate-500">{emp.topMetric.toLocaleString()} imp.</div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {emp.channels.map((ch) => (
                            <Badge key={ch} className="bg-slate-700 text-slate-300 border-0 text-[9px]">{ch}</Badge>
                          ))}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Advocacy trend */}
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-slate-300">Advocacy Impact Over Time</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={Array.from({ length: 12 }, (_, i) => ({
                    month: ["Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar"][i],
                    reach: Math.floor(5000 + i * 4000 + Math.random() * 3000),
                    posts: Math.floor(8 + i * 3 + Math.random() * 5),
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="month" tick={{ fill: "#94a3b8", fontSize: 10 }} />
                    <YAxis yAxisId="l" tick={{ fill: "#94a3b8", fontSize: 10 }} />
                    <YAxis yAxisId="r" orientation="right" tick={{ fill: "#94a3b8", fontSize: 10 }} />
                    <Tooltip contentStyle={{ background: "#1e293b", border: "1px solid #334155", color: "#fff" }} />
                    <Legend formatter={(v) => <span className="text-xs text-slate-300">{v}</span>} />
                    <Line yAxisId="l" type="monotone" dataKey="reach" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} name="Reach" />
                    <Bar yAxisId="r" dataKey="posts" fill="#8b5cf6" radius={[2, 2, 0, 0]} name="Posts" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── CHANNELS ── */}
        <TabsContent value="channels" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {channels.map((ch) => (
              <Card key={ch.channel} className="bg-slate-900 border-slate-800">
                <CardContent className="pt-4 pb-3 px-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-white">{ch.channel}</span>
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: CHANNEL_COLORS[ch.channel] }} />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-lg font-bold text-white">{ch.followers.toLocaleString()}</div>
                      <div className="text-[10px] text-slate-500">followers</div>
                    </div>
                    <Spark data={ch.sparkline} color={CHANNEL_COLORS[ch.channel]} />
                  </div>
                  <div className={`text-xs ${ch.growth >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                    {ch.growth >= 0 ? "+" : ""}{ch.growth}% growth
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[10px]">
                    <div><span className="text-slate-500">7d posts:</span> <span className="text-white">{ch.posts7d}</span></div>
                    <div><span className="text-slate-500">30d posts:</span> <span className="text-white">{ch.posts30d}</span></div>
                    <div><span className="text-slate-500">Eng rate:</span> <span className="text-emerald-400">{ch.engRate}%</span></div>
                    <div><span className="text-slate-500">Imp:</span> <span className="text-white">{(ch.impressions30d / 1000).toFixed(0)}K</span></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Cross-channel comparison */}
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-slate-300">Cross-Channel Comparison</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={channels}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="channel" tick={{ fill: "#94a3b8", fontSize: 9 }} angle={-20} textAnchor="end" height={50} />
                    <YAxis tick={{ fill: "#94a3b8", fontSize: 10 }} />
                    <Tooltip contentStyle={{ background: "#1e293b", border: "1px solid #334155", color: "#fff" }} />
                    <Legend formatter={(v) => <span className="text-xs text-slate-300">{v}</span>} />
                    <Bar dataKey="followers" fill="hsl(var(--primary))" name="Followers" radius={[2, 2, 0, 0]} />
                    <Bar dataKey="posts30d" fill="#8b5cf6" name="Posts (30d)" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Content calendar placeholder */}
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-slate-300">Content Calendar</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-1 text-center">
                {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
                  <div key={d} className="text-[10px] text-slate-500 py-1">{d}</div>
                ))}
                {Array.from({ length: 28 }, (_, i) => {
                  const hasPost = Math.random() > 0.6;
                  return (
                    <div key={i} className={`aspect-square rounded text-[10px] flex items-center justify-center ${hasPost ? "bg-primary/20 text-primary" : "bg-slate-800/50 text-slate-600"}`}>
                      {i + 1}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── CAMPAIGNS ── */}
        <TabsContent value="campaigns" className="space-y-4">
          {/* Campaign table */}
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-slate-300">KLYC Campaign Performance</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-800 hover:bg-transparent">
                    <TableHead className="text-slate-400 text-xs">Campaign</TableHead>
                    <TableHead className="text-slate-400 text-xs">Channel</TableHead>
                    <TableHead className="text-slate-400 text-xs">Reach</TableHead>
                    <TableHead className="text-slate-400 text-xs">Clicks</TableHead>
                    <TableHead className="text-slate-400 text-xs">Conv.</TableHead>
                    <TableHead className="text-slate-400 text-xs">Spend</TableHead>
                    <TableHead className="text-slate-400 text-xs">ROI</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {campaigns.map((c) => (
                    <TableRow key={c.name} className="border-slate-800">
                      <TableCell className="text-sm font-medium text-white">{c.name}</TableCell>
                      <TableCell>
                        <Badge className="bg-slate-700 text-slate-300 border-0 text-[10px]">{c.channel}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-white">{c.reach.toLocaleString()}</TableCell>
                      <TableCell className="text-sm text-white">{c.clicks.toLocaleString()}</TableCell>
                      <TableCell className="text-sm text-white">{c.conversions}</TableCell>
                      <TableCell className="text-sm text-white">{c.spend > 0 ? `$${c.spend.toLocaleString()}` : "—"}</TableCell>
                      <TableCell className={`text-sm font-bold ${c.roi >= 5 ? "text-emerald-400" : c.roi > 0 ? "text-yellow-400" : "text-slate-500"}`}>
                        {c.roi > 0 ? `${c.roi}x` : "Organic"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Funnel */}
            <Card className="bg-slate-900 border-slate-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-slate-300">Conversion Funnel</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {funnel.map((step, i) => {
                  const prevVal = i > 0 ? funnel[i - 1].value : step.value;
                  const rate = i > 0 ? ((step.value / prevVal) * 100).toFixed(1) : "100";
                  const width = (step.value / funnel[0].value) * 100;
                  return (
                    <div key={step.stage} className="space-y-0.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-300">{step.stage}</span>
                        <span className="text-white font-medium">{step.value.toLocaleString()}</span>
                      </div>
                      <div className="h-6 bg-slate-800 rounded relative overflow-hidden">
                        <div
                          className="h-full rounded transition-all"
                          style={{
                            width: `${width}%`,
                            backgroundColor: `hsl(var(--primary) / ${0.3 + (1 - i / funnel.length) * 0.7})`,
                          }}
                        />
                        {i > 0 && (
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-400">{rate}%</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            {/* CAC by channel */}
            <Card className="bg-slate-900 border-slate-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-slate-300">CAC by Channel</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={cacData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis type="number" tick={{ fill: "#94a3b8", fontSize: 10 }} unit="$" />
                      <YAxis dataKey="channel" type="category" tick={{ fill: "#94a3b8", fontSize: 9 }} width={70} />
                      <Tooltip contentStyle={{ background: "#1e293b", border: "1px solid #334155", color: "#fff" }} formatter={(v: number) => [`$${v}`, "CAC"]} />
                      <Bar dataKey="cac" radius={[0, 4, 4, 0]}>
                        {cacData.map((d, i) => (
                          <Cell key={i} fill={d.cac === 0 ? "#10b981" : d.cac < 50 ? "hsl(var(--primary))" : d.cac < 80 ? "#f59e0b" : "#ef4444"} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Organic vs Paid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="bg-slate-900 border-slate-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-slate-300">Organic vs Paid Split</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={orgPaid} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value" paddingAngle={3}>
                        {orgPaid.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
                      </Pie>
                      <Legend formatter={(v) => <span className="text-xs text-slate-300">{v}</span>} />
                      <Tooltip contentStyle={{ background: "#1e293b", border: "1px solid #334155", color: "#fff" }} formatter={(v: number) => [`${v}%`, ""]} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-900 border-slate-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-slate-300">Organic vs Paid Trend</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={orgPaidTrend}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis dataKey="month" tick={{ fill: "#94a3b8", fontSize: 10 }} />
                      <YAxis tick={{ fill: "#94a3b8", fontSize: 10 }} unit="%" />
                      <Tooltip contentStyle={{ background: "#1e293b", border: "1px solid #334155", color: "#fff" }} />
                      <Legend formatter={(v) => <span className="text-xs text-slate-300 capitalize">{v}</span>} />
                      <Line type="monotone" dataKey="organic" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="paid" stroke="#8b5cf6" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── BRAND HEALTH ── */}
        <TabsContent value="brand" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Community */}
            <Card className="bg-slate-900 border-slate-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-slate-300 flex items-center gap-2">
                  <Users className="w-4 h-4 text-primary" /> Community Size
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {community.map((c) => (
                  <div key={c.name} className="flex items-center justify-between">
                    <span className="text-sm text-white">{c.name}</span>
                    <div className="text-right">
                      <span className="text-sm font-bold text-white">{c.count.toLocaleString()}</span>
                      <span className="text-xs text-emerald-400 ml-2">{c.growth}</span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Mentions placeholder */}
            <Card className="bg-slate-900 border-slate-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-slate-300 flex items-center gap-2">
                  <Globe className="w-4 h-4 text-primary" /> Brand Mentions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <div className="text-3xl font-bold text-white">127</div>
                  <div className="text-xs text-slate-400 mt-1">mentions this month</div>
                  <div className="text-xs text-emerald-400 mt-1">+23% vs last month</div>
                  <div className="mt-4 text-[10px] text-slate-500 bg-slate-800 px-3 py-1.5 rounded-full">
                    Social listening integration coming soon
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Press log */}
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-slate-300 flex items-center gap-2">
                <Newspaper className="w-4 h-4 text-primary" /> Press & Media Log
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-800 hover:bg-transparent">
                    <TableHead className="text-slate-400 text-xs">Date</TableHead>
                    <TableHead className="text-slate-400 text-xs">Outlet</TableHead>
                    <TableHead className="text-slate-400 text-xs">Title</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {press.map((p, i) => (
                    <TableRow key={i} className="border-slate-800">
                      <TableCell className="text-xs text-slate-400">{p.date}</TableCell>
                      <TableCell>
                        <Badge className="bg-slate-700 text-slate-300 border-0 text-[10px]">{p.outlet}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-white">{p.title}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
