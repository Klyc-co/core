import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft, RefreshCw, Send, Eye, EyeOff,
  CheckCircle, Flag, Bug,
} from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  new: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  in_progress: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  waiting_on_client: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  resolved: "bg-green-500/20 text-green-400 border-green-500/30",
};

const PRIORITY_COLORS: Record<string, string> = {
  urgent: "bg-red-500/20 text-red-400 border-red-500/30",
  normal: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  low: "bg-slate-700/30 text-slate-400 border-slate-600/30",
};

interface Ticket {
  id: string;
  client_id: string;
  subject: string;
  priority: string;
  status: string;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
}

interface Message {
  id: string;
  sender_type: string;
  sender_id: string | null;
  message: string;
  is_internal_note: boolean;
  created_at: string;
}

interface Employee {
  id: string;
  display_name: string;
}

export default function KlycAdminCollaborationDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { adminUser, logAction } = useAdminAuth();
  const { toast } = useToast();

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  const [replyText, setReplyText] = useState("");
  const [isNote, setIsNote] = useState(false);
  const [showNotes, setShowNotes] = useState(true);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    const [{ data: tData }, { data: mData }, { data: eData }] = await Promise.all([
      supabase.from("collaboration_tickets").select("*").eq("id", id).maybeSingle(),
      supabase.from("collaboration_messages").select("*").eq("ticket_id", id).order("created_at"),
      supabase.from("klyc_employees").select("id, display_name").eq("is_active", true),
    ]);
    setTicket(tData as Ticket | null);
    setMessages((mData as Message[]) ?? []);
    setEmployees((eData as Employee[]) ?? []);
    setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const sendReply = async () => {
    if (!replyText.trim() || !id || !adminUser) return;
    await supabase.from("collaboration_messages").insert([{
      ticket_id: id,
      sender_type: "admin" as any,
      sender_id: adminUser.id,
      message: replyText.trim(),
      is_internal_note: isNote,
    }]);
    logAction(isNote ? "internal_note_added" : "reply_sent", "collaboration_ticket", id);
    setReplyText("");
    setIsNote(false);
    load();
  };

  const resolve = async (tag?: string) => {
    if (!id || !ticket) return;
    await supabase.from("collaboration_tickets").update({
      status: "resolved" as any,
      resolved_at: new Date().toISOString(),
      resolution_time_ms: Date.now() - new Date(ticket.created_at).getTime(),
    }).eq("id", id);
    if (tag) {
      logAction(`ticket_resolved_${tag}`, "collaboration_ticket", id);
    } else {
      logAction("ticket_resolved", "collaboration_ticket", id);
    }
    toast({ title: tag ? `Resolved + tagged: ${tag}` : "Ticket resolved" });
    load();
  };

  const assignTo = async (empId: string) => {
    if (!id) return;
    await supabase.from("collaboration_tickets").update({ assigned_to: empId, status: "in_progress" as any }).eq("id", id);
    logAction("ticket_assigned", "collaboration_ticket", id, { assigned_to: empId });
    load();
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><RefreshCw className="w-6 h-6 animate-spin text-slate-400" /></div>;
  }

  if (!ticket) {
    return <div className="text-center text-slate-400 py-12">Ticket not found</div>;
  }

  const visibleMessages = showNotes ? messages : messages.filter((m) => !m.is_internal_note);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate("/klyc_admin/collaboration")} className="text-slate-400">
          <ArrowLeft className="w-4 h-4 mr-1" /> Back
        </Button>
        <h1 className="text-xl font-bold text-white flex-1 truncate">{ticket.subject}</h1>
        <Badge variant="outline" className={`text-xs ${PRIORITY_COLORS[ticket.priority]}`}>{ticket.priority}</Badge>
        <Badge variant="outline" className={`text-xs ${STATUS_COLORS[ticket.status]}`}>{ticket.status.replace(/_/g, " ")}</Badge>
      </div>

      {/* Assign + Resolve */}
      <div className="flex items-center gap-3 flex-wrap">
        <Select onValueChange={assignTo} value={ticket.assigned_to ?? undefined}>
          <SelectTrigger className="w-44 bg-slate-800 border-slate-700 text-sm"><SelectValue placeholder="Assign to..." /></SelectTrigger>
          <SelectContent className="bg-slate-800 border-slate-700">
            {employees.map((e) => <SelectItem key={e.id} value={e.id}>{e.display_name}</SelectItem>)}
          </SelectContent>
        </Select>
        {ticket.status !== "resolved" && (
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="border-green-700 text-green-400 hover:bg-green-900/30" onClick={() => resolve()}>
              <CheckCircle className="w-3.5 h-3.5 mr-1" /> Resolve
            </Button>
            <Button size="sm" variant="outline" className="border-blue-700 text-blue-400 hover:bg-blue-900/30" onClick={() => resolve("roadmap")}>
              <Flag className="w-3.5 h-3.5 mr-1" /> + Roadmap
            </Button>
            <Button size="sm" variant="outline" className="border-red-700 text-red-400 hover:bg-red-900/30" onClick={() => resolve("bug")}>
              <Bug className="w-3.5 h-3.5 mr-1" /> + Bug
            </Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Message Thread */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-400">Conversation</p>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              {showNotes ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
              <button onClick={() => setShowNotes(!showNotes)} className="hover:text-slate-300">
                {showNotes ? "Hide notes" : "Show notes"}
              </button>
            </div>
          </div>

          <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
            {visibleMessages.length === 0 ? (
              <p className="text-slate-500 text-sm text-center py-8">No messages yet. Start the conversation.</p>
            ) : (
              visibleMessages.map((m) => {
                const isAdmin = m.sender_type === "admin";
                return (
                  <div key={m.id} className={`flex ${isAdmin ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[75%] rounded-lg p-3 text-sm ${
                      m.is_internal_note
                        ? "bg-yellow-900/30 border border-yellow-700/40 text-yellow-200"
                        : isAdmin
                          ? "bg-primary/20 text-slate-100"
                          : "bg-slate-800 text-slate-200"
                    }`}>
                      {m.is_internal_note && <p className="text-[10px] text-yellow-500 mb-1 font-semibold">INTERNAL NOTE</p>}
                      <p className="whitespace-pre-wrap">{m.message}</p>
                      <p className="text-[10px] text-slate-500 mt-1">{new Date(m.created_at).toLocaleString()}</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Reply Box */}
          <Card className="bg-slate-900 border-slate-800">
            <CardContent className="p-3 space-y-2">
              <Textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder={isNote ? "Internal note (not visible to client)..." : "Reply to client..."}
                className={`bg-slate-800 border-slate-700 text-white min-h-[60px] ${isNote ? "border-yellow-700/50" : ""}`}
              />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Switch checked={isNote} onCheckedChange={setIsNote} />
                  <span className={`text-xs ${isNote ? "text-yellow-400" : "text-slate-500"}`}>Internal Note</span>
                </div>
                <Button size="sm" onClick={sendReply} disabled={!replyText.trim()} className="gap-1.5">
                  <Send className="w-3.5 h-3.5" /> {isNote ? "Add Note" : "Send"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Sidebar — Client Context */}
        <div className="space-y-4">
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-300">Client Context</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-slate-400">Client ID</span><span className="text-slate-200 font-mono text-xs">{ticket.client_id.slice(0, 12)}…</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Opened</span><span className="text-slate-200">{new Date(ticket.created_at).toLocaleDateString()}</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Messages</span><span className="text-slate-200">{messages.length}</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Assigned</span><span className="text-slate-200">{employees.find((e) => e.id === ticket.assigned_to)?.display_name ?? "Unassigned"}</span></div>
              <Button variant="outline" size="sm" className="w-full mt-2 border-slate-700 text-slate-300 text-xs"
                onClick={() => navigate(`/klyc_admin/clients/${ticket.client_id}`)}>
                View Full Client Profile
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-slate-900 border-slate-800">
            <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-300">Ticket Timeline</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-xs text-slate-400">
              <div>Created: {new Date(ticket.created_at).toLocaleString()}</div>
              <div>Updated: {new Date(ticket.updated_at).toLocaleString()}</div>
              {ticket.status === "resolved" && (
                <div className="text-green-400">Resolved ✓</div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
