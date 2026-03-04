import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RefreshCw, Zap, CheckCircle2, XCircle, AlertTriangle, Send, Clock } from "lucide-react";

const EVENT_TYPES = [
  "campaign_generated",
  "approval_required",
  "approval_completed",
  "publish_success",
  "publish_failed",
  "ai_warning",
];

const EVENT_ICONS: Record<string, any> = {
  campaign_generated: Zap,
  approval_required: Clock,
  approval_completed: CheckCircle2,
  publish_success: Send,
  publish_failed: XCircle,
  ai_warning: AlertTriangle,
};

const EVENT_COLORS: Record<string, string> = {
  campaign_generated: "default",
  approval_required: "outline",
  approval_completed: "default",
  publish_success: "default",
  publish_failed: "destructive",
  ai_warning: "secondary",
};

interface ActivityEvent {
  id: string;
  event_type: string;
  event_message: string;
  client_id: string | null;
  created_at: string;
}

export default function ActivityFeed() {
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  const fetchEvents = async () => {
    setLoading(true);
    let query = supabase.from("activity_events" as any).select("*").order("created_at", { ascending: false }).limit(100);
    if (filter !== "all") query = query.eq("event_type", filter);
    const { data } = await query;
    setEvents((data as any as ActivityEvent[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchEvents(); }, [filter]);

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Activity Feed</h1>
          <p className="text-muted-foreground text-sm">System-wide activity and event log</p>
        </div>
        <Button variant="outline" onClick={fetchEvents}><RefreshCw className="h-4 w-4 mr-2" /> Refresh</Button>
      </div>

      <Select value={filter} onValueChange={setFilter}>
        <SelectTrigger className="w-56"><SelectValue placeholder="Filter by type" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Events</SelectItem>
          {EVENT_TYPES.map(t => <SelectItem key={t} value={t}>{t.replace(/_/g, " ")}</SelectItem>)}
        </SelectContent>
      </Select>

      <div className="space-y-3">
        {loading ? (
          <Card><CardContent className="py-8 text-center text-muted-foreground">Loading…</CardContent></Card>
        ) : events.length === 0 ? (
          <Card><CardContent className="py-8 text-center text-muted-foreground">No activity events yet</CardContent></Card>
        ) : events.map(e => {
          const Icon = EVENT_ICONS[e.event_type] || Zap;
          return (
            <Card key={e.id}>
              <CardContent className="flex items-start gap-3 py-3">
                <Icon className="h-5 w-5 mt-0.5 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Badge variant={EVENT_COLORS[e.event_type] as any || "secondary"} className="text-xs">
                      {e.event_type.replace(/_/g, " ")}
                    </Badge>
                    <span className="text-xs text-muted-foreground">{new Date(e.created_at).toLocaleString()}</span>
                  </div>
                  <p className="text-sm mt-1">{e.event_message}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
