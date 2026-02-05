 import { useState, useEffect } from "react";
 import { supabase } from "@/integrations/supabase/client";
 import { useClientContext } from "@/contexts/ClientContext";
 import { Button } from "@/components/ui/button";
 import { Card, CardContent } from "@/components/ui/card";
 import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
 import { Plus, Database, Loader2 } from "lucide-react";
 import { toast } from "sonner";
 import CrmConnectionCard from "./CrmConnectionCard";
 import CrmDetailPanel from "./CrmDetailPanel";
 import ConnectCrmModal from "./ConnectCrmModal";
 
 import type { Json } from "@/integrations/supabase/types";
 
 export interface CrmConnection {
   id: string;
   user_id: string;
   provider: string;
   display_name: string;
   status: string;
   last_sync_at: string | null;
   sync_frequency_minutes: number;
   metadata: Json;
   created_at: string;
   updated_at: string;
 }
 
 const CrmContent = () => {
   const { getEffectiveUserId } = useClientContext();
   const [connections, setConnections] = useState<CrmConnection[]>([]);
   const [loading, setLoading] = useState(true);
   const [selectedConnection, setSelectedConnection] = useState<CrmConnection | null>(null);
   const [showConnectModal, setShowConnectModal] = useState(false);
 
   const fetchConnections = async () => {
     const effectiveUserId = getEffectiveUserId();
     if (!effectiveUserId) return;
 
     setLoading(true);
     try {
       const { data, error } = await supabase
         .from("crm_connections")
         .select("*")
         .eq("user_id", effectiveUserId)
         .order("created_at", { ascending: false });
 
       if (error) throw error;
       setConnections(data || []);
       
       // Auto-select first connection if none selected
       if (data && data.length > 0 && !selectedConnection) {
         setSelectedConnection(data[0]);
       }
     } catch (error) {
       console.error("Failed to fetch CRM connections:", error);
       toast.error("Failed to load CRM connections");
     } finally {
       setLoading(false);
     }
   };
 
   useEffect(() => {
     fetchConnections();
   }, [getEffectiveUserId]);
 
   const handleSyncNow = async (connectionId: string) => {
     try {
       // Update status to syncing
       await supabase
         .from("crm_connections")
         .update({ status: "syncing" })
         .eq("id", connectionId);
 
       // Trigger sync via edge function
       const { error } = await supabase.functions.invoke("crm-sync", {
         body: { connectionId },
       });
 
       if (error) throw error;
       toast.success("Sync started");
       fetchConnections();
     } catch (error) {
       console.error("Failed to start sync:", error);
       toast.error("Failed to start sync");
     }
   };
 
   const handleDisconnect = async (connectionId: string) => {
     try {
       const { error } = await supabase
         .from("crm_connections")
         .delete()
         .eq("id", connectionId);
 
       if (error) throw error;
       toast.success("CRM disconnected");
       
       if (selectedConnection?.id === connectionId) {
         setSelectedConnection(null);
       }
       fetchConnections();
     } catch (error) {
       console.error("Failed to disconnect CRM:", error);
       toast.error("Failed to disconnect CRM");
     }
   };
 
   const handleConnectionSuccess = () => {
     setShowConnectModal(false);
     fetchConnections();
   };
 
   if (loading) {
     return (
       <div className="flex items-center justify-center py-16">
         <Loader2 className="w-6 h-6 animate-spin text-primary" />
       </div>
     );
   }
 
   return (
     <div className="space-y-6">
       {/* Header */}
       <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
         <div>
           <h2 className="text-xl font-semibold text-foreground">CRM Library</h2>
           <p className="text-sm text-muted-foreground">
             Connected CRMs and customer data powering your Klyc campaigns.
           </p>
         </div>
         <Button onClick={() => setShowConnectModal(true)} className="gap-2">
           <Plus className="w-4 h-4" />
           Connect CRM
         </Button>
       </div>
 
       {connections.length === 0 ? (
         <Card>
           <CardContent className="flex flex-col items-center justify-center py-16 text-center">
             <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
               <Database className="w-8 h-8 text-muted-foreground" />
             </div>
             <h3 className="text-lg font-medium text-foreground mb-2">No CRMs connected</h3>
             <p className="text-sm text-muted-foreground max-w-md mb-4">
               Connect your CRM or commerce platform to sync customer data and power AI-driven campaigns.
             </p>
             <Button onClick={() => setShowConnectModal(true)} className="gap-2">
               <Plus className="w-4 h-4" />
               Connect CRM
             </Button>
           </CardContent>
         </Card>
       ) : (
         <>
           {/* Connected CRM Cards */}
           <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
             {connections.map((connection) => (
               <CrmConnectionCard
                 key={connection.id}
                 connection={connection}
                 isSelected={selectedConnection?.id === connection.id}
                 onSelect={() => setSelectedConnection(connection)}
                 onSyncNow={() => handleSyncNow(connection.id)}
                 onDisconnect={() => handleDisconnect(connection.id)}
               />
             ))}
           </div>
 
           {/* Detail Panel */}
           {selectedConnection && (
             <CrmDetailPanel
               connection={selectedConnection}
               onRefresh={fetchConnections}
             />
           )}
         </>
       )}
 
       <ConnectCrmModal
         open={showConnectModal}
         onOpenChange={setShowConnectModal}
         onSuccess={handleConnectionSuccess}
       />
     </div>
   );
 };
 
 export default CrmContent;