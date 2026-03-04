import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { RefreshCw, Check, X, RotateCcw, Trash2, Calendar } from "lucide-react";

interface PostQueueRow {
  id: string;
  client_id: string | null;
  campaign_draft_id: string | null;
  status: string;
  content_type: string;
  post_text: string | null;
  scheduled_at: string | null;
  retry_count: number | null;
  created_at: string;
}

const STATUS_COLORS: Record<string, string> = {
  draft: "secondary",
  pending_approval: "outline",
  approved: "default",
  scheduled: "default",
  publishing: "default",
  published: "default",
  failed: "destructive",
};

export default function PostQueueManager() {
  const [posts, setPosts] = useState<PostQueueRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  const fetchPosts = async () => {
    setLoading(true);
    let query = supabase.from("post_queue").select("id, client_id, campaign_draft_id, status, content_type, post_text, scheduled_at, retry_count, created_at").order("created_at", { ascending: false }).limit(100);
    if (filter !== "all") query = query.eq("status", filter);
    const { data } = await query;
    setPosts((data as PostQueueRow[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchPosts(); }, [filter]);

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("post_queue").update({ status }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success(`Post ${status}`);
    fetchPosts();
  };

  const deletePost = async (id: string) => {
    const { error } = await supabase.from("post_queue").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Post deleted");
    fetchPosts();
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Post Queue Manager</h1>
          <p className="text-muted-foreground text-sm">Manage posts in the publishing queue</p>
        </div>
        <Button variant="outline" onClick={fetchPosts}><RefreshCw className="h-4 w-4 mr-2" /> Refresh</Button>
      </div>

      <div className="flex gap-3 items-center">
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="pending_approval">Pending Approval</SelectItem>
            <SelectItem value="scheduled">Scheduled</SelectItem>
            <SelectItem value="published">Published</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground">{posts.length} posts</span>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Campaign</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Scheduled</TableHead>
                <TableHead>Retries</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Loading…</TableCell></TableRow>
              ) : posts.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No posts found</TableCell></TableRow>
              ) : posts.map(p => (
                <TableRow key={p.id}>
                  <TableCell className="font-mono text-xs">{p.id.slice(0, 8)}</TableCell>
                  <TableCell className="font-mono text-xs">{p.client_id?.slice(0, 8) || "—"}</TableCell>
                  <TableCell className="font-mono text-xs">{p.campaign_draft_id?.slice(0, 8) || "—"}</TableCell>
                  <TableCell><Badge variant="secondary">{p.content_type}</Badge></TableCell>
                  <TableCell><Badge variant={STATUS_COLORS[p.status] as any || "secondary"}>{p.status}</Badge></TableCell>
                  <TableCell className="text-xs">{p.scheduled_at ? new Date(p.scheduled_at).toLocaleString() : "—"}</TableCell>
                  <TableCell>{p.retry_count ?? 0}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" onClick={() => updateStatus(p.id, "approved")} title="Approve"><Check className="h-4 w-4 text-green-500" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => updateStatus(p.id, "draft")} title="Reject"><X className="h-4 w-4 text-red-500" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => updateStatus(p.id, "scheduled")} title="Reschedule"><Calendar className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => updateStatus(p.id, "draft")} title="Retry"><RotateCcw className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => deletePost(p.id)} title="Delete"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
