 import { useState, useEffect } from "react";
 import { supabase } from "@/integrations/supabase/client";
 import { Badge } from "@/components/ui/badge";
 import { Loader2, Activity, CheckCircle, XCircle, RefreshCw } from "lucide-react";
 import { formatDistanceToNow, format } from "date-fns";
 
 interface CrmActivityTabProps {
   connectionId: string;
 }
 
 interface SyncLog {
   id: string;
   started_at: string;
   finished_at: string | null;
   status: string;
   summary: string | null;
   error_message: string | null;
 }
 
 const CrmActivityTab = ({ connectionId }: CrmActivityTabProps) => {
   const [logs, setLogs] = useState<SyncLog[]>([]);
   const [loading, setLoading] = useState(true);
 
   useEffect(() => {
     const fetchLogs = async () => {
       setLoading(true);
       try {
         const { data, error } = await supabase
           .from("crm_sync_logs")
           .select("*")
           .eq("connection_id", connectionId)
           .order("started_at", { ascending: false })
           .limit(50);
 
         if (error) throw error;
         setLogs(data || []);
       } catch (error) {
         console.error("Failed to fetch sync logs:", error);
       } finally {
         setLoading(false);
       }
     };
 
     fetchLogs();
   }, [connectionId]);
 
   if (loading) {
     return (
       <div className="flex items-center justify-center py-12">
         <Loader2 className="w-6 h-6 animate-spin text-primary" />
       </div>
     );
   }
 
   if (logs.length === 0) {
     return (
       <div className="flex flex-col items-center justify-center py-12 text-center">
         <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
           <Activity className="w-6 h-6 text-muted-foreground" />
         </div>
         <h3 className="font-medium text-foreground mb-1">No sync activity yet</h3>
         <p className="text-sm text-muted-foreground">
           Sync logs will appear here after the first sync runs.
         </p>
       </div>
     );
   }
 
   return (
     <div className="space-y-3">
       {logs.map((log) => (
         <div
           key={log.id}
           className="flex items-start gap-3 p-3 rounded-lg border border-border bg-card"
         >
           <div className="mt-0.5">
             {log.status === "success" ? (
               <CheckCircle className="w-5 h-5 text-green-500" />
             ) : log.status === "error" ? (
               <XCircle className="w-5 h-5 text-red-500" />
             ) : (
               <RefreshCw className="w-5 h-5 text-yellow-500 animate-spin" />
             )}
           </div>
           <div className="flex-1 min-w-0">
             <div className="flex items-center gap-2 mb-1">
               <Badge
                 variant="outline"
                 className={
                   log.status === "success"
                     ? "text-green-500 border-green-500/20"
                     : log.status === "error"
                     ? "text-red-500 border-red-500/20"
                     : "text-yellow-500 border-yellow-500/20"
                 }
               >
                 {log.status}
               </Badge>
               <span className="text-xs text-muted-foreground">
                 {format(new Date(log.started_at), "MMM d, yyyy h:mm a")}
               </span>
             </div>
             {log.summary && (
               <p className="text-sm text-foreground">{log.summary}</p>
             )}
             {log.error_message && (
               <p className="text-sm text-red-500 mt-1">{log.error_message}</p>
             )}
             {log.finished_at && (
               <p className="text-xs text-muted-foreground mt-1">
                 Completed in{" "}
                 {Math.round(
                   (new Date(log.finished_at).getTime() - new Date(log.started_at).getTime()) / 1000
                 )}
                 s
               </p>
             )}
           </div>
         </div>
       ))}
     </div>
   );
 };
 
 export default CrmActivityTab;