import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, RefreshCw, List, CalendarDays, FileText, Paperclip, ExternalLink, ChevronRight, FolderOpen } from "lucide-react";
import { toast } from "sonner";
import ClickUpIcon from "@/components/icons/ClickUpIcon";

interface ClickUpDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
}

interface ClickUpList {
  id: string;
  clickup_list_id: string;
  name: string;
  space_name: string | null;
  folder_name: string | null;
  is_marketing_suggested: boolean;
  is_selected_for_sync: boolean;
  task_count: number;
  last_sync_at: string | null;
}

interface ClickUpTask {
  id: string;
  clickup_task_id: string;
  clickup_list_id: string;
  title: string;
  description: string | null;
  status: string | null;
  priority: string | null;
  due_date: string | null;
  start_date: string | null;
  date_created: string | null;
  assignees: any;
  tags: any;
  url: string | null;
  list_name: string | null;
}

interface ClickUpAttachment {
  id: string;
  clickup_task_id: string;
  task_title: string | null;
  list_name: string | null;
  file_name: string;
  file_url: string;
  mime_type: string | null;
  size: number | null;
}

export default function ClickUpDrawer({ open, onOpenChange, userId }: ClickUpDrawerProps) {
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [lists, setLists] = useState<ClickUpList[]>([]);
  const [tasks, setTasks] = useState<ClickUpTask[]>([]);
  const [attachments, setAttachments] = useState<ClickUpAttachment[]>([]);
  const [teamName, setTeamName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [syncFrequency, setSyncFrequency] = useState("manual");
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("lists");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch lists from edge function
      const { data, error } = await supabase.functions.invoke("clickup-list-spaces", { body: {} });
      if (error) throw error;

      setLists(data.lists || []);
      setTeamName(data.teamName || "");
      setUserEmail(data.userEmail || "");

      // Fetch connection info for sync frequency
      const { data: connData } = await supabase.functions.invoke("clickup-connect", {
        body: { action: "status" },
      });
      if (connData?.connection) {
        setSyncFrequency(connData.connection.sync_frequency || "manual");
        setLastSyncAt(connData.connection.last_sync_at);
      }

      // Fetch tasks and attachments from DB
      const { data: conn } = await supabase
        .from("clickup_connections")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();

      if (conn) {
        const { data: taskData } = await supabase
          .from("clickup_tasks")
          .select("*")
          .eq("connection_id", conn.id)
          .order("due_date", { ascending: true, nullsFirst: false });
        setTasks((taskData as ClickUpTask[]) || []);

        const { data: attData } = await supabase
          .from("clickup_attachments")
          .select("*")
          .eq("connection_id", conn.id);
        setAttachments((attData as ClickUpAttachment[]) || []);
      }
    } catch (err: any) {
      toast.error("Failed to load ClickUp data");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (open) fetchData();
  }, [open, fetchData]);

  const handleToggleSync = async (listId: string, selected: boolean) => {
    setLists(prev => prev.map(l => l.id === listId ? { ...l, is_selected_for_sync: selected } : l));
    try {
      await supabase.functions.invoke("clickup-update-selection", {
        body: { listIds: [listId], isSelectedForSync: selected },
      });
    } catch {
      toast.error("Failed to update selection");
    }
  };

  const handleSelectAllMarketing = async () => {
    const marketingIds = lists.filter(l => l.is_marketing_suggested).map(l => l.id);
    setLists(prev => prev.map(l => l.is_marketing_suggested ? { ...l, is_selected_for_sync: true } : l));
    try {
      await supabase.functions.invoke("clickup-update-selection", {
        body: { listIds: marketingIds, isSelectedForSync: true },
      });
      toast.success("Selected all suggested marketing lists");
    } catch {
      toast.error("Failed to update selection");
    }
  };

  const handleClearSelection = async () => {
    const allIds = lists.map(l => l.id);
    setLists(prev => prev.map(l => ({ ...l, is_selected_for_sync: false })));
    try {
      await supabase.functions.invoke("clickup-update-selection", {
        body: { listIds: allIds, isSelectedForSync: false },
      });
    } catch {
      toast.error("Failed to clear selection");
    }
  };

  const handleSyncNow = async () => {
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke("clickup-sync", { body: {} });
      if (error) throw error;
      if (data?.error) {
        toast.error(data.error);
        return;
      }
      toast.success(`Synced ${data.taskCount} tasks from ${data.listsProcessed} lists`);
      setLastSyncAt(new Date().toISOString());
      fetchData();
    } catch (err: any) {
      toast.error("Sync failed: " + (err.message || "Unknown error"));
    } finally {
      setSyncing(false);
    }
  };

  const handleSyncFrequencyChange = async (value: string) => {
    setSyncFrequency(value);
    try {
      await supabase.functions.invoke("clickup-update-selection", {
        body: { listIds: [], syncFrequency: value },
      });
      toast.success(`Sync frequency set to ${value}`);
    } catch {
      toast.error("Failed to update sync frequency");
    }
  };

  // Group lists by space
  const listsBySpace = lists.reduce<Record<string, ClickUpList[]>>((acc, list) => {
    const space = list.space_name || "Other";
    if (!acc[space]) acc[space] = [];
    acc[space].push(list);
    return acc;
  }, {});

  // Calendar tasks: selected lists with due dates
  const selectedListIds = new Set(lists.filter(l => l.is_selected_for_sync).map(l => l.clickup_list_id));
  const calendarTasks = tasks.filter(t => t.due_date && selectedListIds.has(t.clickup_list_id));

  // Briefs: tasks with long descriptions from selected lists
  const briefTasks = tasks.filter(t =>
    selectedListIds.has(t.clickup_list_id) &&
    (t.description && t.description.length > 100)
  );

  // Attachments from selected lists
  const selectedAttachments = attachments.filter(a => {
    const task = tasks.find(t => t.clickup_task_id === a.clickup_task_id);
    return task && selectedListIds.has(task.clickup_list_id);
  });

  // Group calendar tasks by date
  const tasksByDate = calendarTasks.reduce<Record<string, ClickUpTask[]>>((acc, task) => {
    const date = task.due_date ? new Date(task.due_date).toLocaleDateString() : "No date";
    if (!acc[date]) acc[date] = [];
    acc[date].push(task);
    return acc;
  }, {});

  const getPriorityColor = (priority: string | null) => {
    switch (priority?.toLowerCase()) {
      case "urgent": return "bg-red-500/10 text-red-600 border-red-200";
      case "high": return "bg-orange-500/10 text-orange-600 border-orange-200";
      case "normal": return "bg-blue-500/10 text-blue-600 border-blue-200";
      case "low": return "bg-gray-500/10 text-gray-600 border-gray-200";
      default: return "bg-muted text-muted-foreground";
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl lg:max-w-4xl p-0 flex flex-col">
        <SheetHeader className="px-6 pt-6 pb-4 border-b border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ClickUpIcon className="w-8 h-8" />
              <div>
                <SheetTitle className="text-xl">ClickUp Marketing Data</SheetTitle>
                <SheetDescription>
                  {teamName && `Workspace: ${teamName}`}
                  {userEmail && ` · ${userEmail}`}
                </SheetDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Select value={syncFrequency} onValueChange={handleSyncFrequencyChange}>
                <SelectTrigger className="w-32 h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">Manual</SelectItem>
                  <SelectItem value="hourly">Every hour</SelectItem>
                  <SelectItem value="4hours">Every 4 hrs</SelectItem>
                  <SelectItem value="daily">Daily</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={handleSyncNow} disabled={syncing} size="sm" className="gap-2">
                {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                Sync Now
              </Button>
            </div>
          </div>
          {lastSyncAt && (
            <p className="text-xs text-muted-foreground mt-1">
              Last synced: {new Date(lastSyncAt).toLocaleString()}
            </p>
          )}
        </SheetHeader>

        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
            <TabsList className="mx-6 mt-4 w-fit">
              <TabsTrigger value="lists" className="gap-2"><List className="w-4 h-4" />Lists</TabsTrigger>
              <TabsTrigger value="calendar" className="gap-2"><CalendarDays className="w-4 h-4" />Content Calendar</TabsTrigger>
              <TabsTrigger value="briefs" className="gap-2"><FileText className="w-4 h-4" />Briefs & Notes</TabsTrigger>
              <TabsTrigger value="attachments" className="gap-2"><Paperclip className="w-4 h-4" />Attachments</TabsTrigger>
            </TabsList>

            {/* Lists Tab */}
            <TabsContent value="lists" className="flex-1 overflow-hidden mt-0">
              <div className="px-6 py-3 flex gap-2 border-b border-border">
                <Button variant="outline" size="sm" onClick={handleSelectAllMarketing}>
                  Select all suggested
                </Button>
                <Button variant="ghost" size="sm" onClick={handleClearSelection}>
                  Clear selection
                </Button>
              </div>
              <ScrollArea className="flex-1 h-[calc(100vh-280px)]">
                <div className="px-6 py-4 space-y-6">
                  {Object.entries(listsBySpace).map(([spaceName, spaceLists]) => (
                    <div key={spaceName}>
                      <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                        <FolderOpen className="w-4 h-4 text-muted-foreground" />
                        {spaceName}
                      </h4>
                      <div className="space-y-2">
                        {spaceLists.map(list => (
                          <Card key={list.id} className="p-3">
                            <div className="flex items-center justify-between">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-0.5">
                                  <span className="text-sm font-medium text-foreground truncate">{list.name}</span>
                                  {list.is_marketing_suggested && (
                                    <Badge variant="secondary" className="text-xs shrink-0">Suggested</Badge>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                  {list.folder_name && (
                                    <span className="flex items-center gap-1">
                                      <ChevronRight className="w-3 h-3" />{list.folder_name}
                                    </span>
                                  )}
                                  <span>{list.task_count} tasks</span>
                                  {list.last_sync_at && (
                                    <span>· Synced {new Date(list.last_sync_at).toLocaleDateString()}</span>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-muted-foreground">Sync</span>
                                <Switch
                                  checked={list.is_selected_for_sync}
                                  onCheckedChange={(checked) => handleToggleSync(list.id, checked)}
                                />
                              </div>
                            </div>
                          </Card>
                        ))}
                      </div>
                    </div>
                  ))}
                  {lists.length === 0 && (
                    <div className="text-center py-12 text-muted-foreground">
                      <p>No lists found. Make sure your ClickUp workspace has lists.</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            {/* Content Calendar Tab */}
            <TabsContent value="calendar" className="flex-1 overflow-hidden mt-0">
              <ScrollArea className="flex-1 h-[calc(100vh-240px)]">
                <div className="px-6 py-4 space-y-6">
                  {Object.keys(tasksByDate).length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <CalendarDays className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p>No tasks with due dates found in synced lists.</p>
                      <p className="text-xs mt-1">Select lists and sync to see your content calendar.</p>
                    </div>
                  ) : (
                    Object.entries(tasksByDate)
                      .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
                      .map(([date, dateTasks]) => (
                        <div key={date}>
                          <h4 className="text-sm font-semibold text-foreground mb-2">{date}</h4>
                          <div className="space-y-2">
                            {dateTasks.map(task => (
                              <Card key={task.id} className="p-3">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-foreground">{task.title}</p>
                                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                                      <span className="text-xs text-muted-foreground">{task.list_name}</span>
                                      {task.status && (
                                        <Badge variant="outline" className="text-xs">{task.status}</Badge>
                                      )}
                                      {task.priority && (
                                        <Badge className={`text-xs ${getPriorityColor(task.priority)}`}>
                                          {task.priority}
                                        </Badge>
                                      )}
                                    </div>
                                  </div>
                                  {task.url && (
                                    <a href={task.url} target="_blank" rel="noopener noreferrer"
                                      className="text-muted-foreground hover:text-primary shrink-0">
                                      <ExternalLink className="w-4 h-4" />
                                    </a>
                                  )}
                                </div>
                              </Card>
                            ))}
                          </div>
                        </div>
                      ))
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            {/* Briefs & Notes Tab */}
            <TabsContent value="briefs" className="flex-1 overflow-hidden mt-0">
              <ScrollArea className="flex-1 h-[calc(100vh-240px)]">
                <div className="px-6 py-4 space-y-3">
                  {briefTasks.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p>No briefs or detailed notes found yet.</p>
                      <p className="text-xs mt-1">Tasks with longer descriptions will appear here.</p>
                    </div>
                  ) : (
                    briefTasks.map(task => (
                      <Card key={task.id} className="p-4">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div>
                            <h4 className="text-sm font-semibold text-foreground">{task.title}</h4>
                            <p className="text-xs text-muted-foreground">{task.list_name}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            {task.status && <Badge variant="outline" className="text-xs">{task.status}</Badge>}
                            {task.url && (
                              <a href={task.url} target="_blank" rel="noopener noreferrer"
                                className="text-muted-foreground hover:text-primary">
                                <ExternalLink className="w-4 h-4" />
                              </a>
                            )}
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-3">
                          {task.description}
                        </p>
                      </Card>
                    ))
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            {/* Attachments Tab */}
            <TabsContent value="attachments" className="flex-1 overflow-hidden mt-0">
              <ScrollArea className="flex-1 h-[calc(100vh-240px)]">
                <div className="px-6 py-4 space-y-2">
                  {selectedAttachments.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <Paperclip className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p>No attachments found in synced tasks.</p>
                    </div>
                  ) : (
                    selectedAttachments.map(att => (
                      <Card key={att.id} className="p-3">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{att.file_name}</p>
                            <p className="text-xs text-muted-foreground truncate">
                              From: {att.task_title} in {att.list_name}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            {att.size && (
                              <span className="text-xs text-muted-foreground">
                                {(att.size / 1024).toFixed(0)} KB
                              </span>
                            )}
                            <a href={att.file_url} target="_blank" rel="noopener noreferrer">
                              <Button variant="outline" size="sm">
                                <ExternalLink className="w-3 h-3 mr-1" />Open
                              </Button>
                            </a>
                          </div>
                        </div>
                      </Card>
                    ))
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        )}
      </SheetContent>
    </Sheet>
  );
}
