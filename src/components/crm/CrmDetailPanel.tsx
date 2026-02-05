 import { useState, useEffect } from "react";
 import { supabase } from "@/integrations/supabase/client";
 import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
 import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
 import { Loader2 } from "lucide-react";
 import type { CrmConnection } from "./CrmContent";
 import CrmOverviewTab from "./tabs/CrmOverviewTab";
 import CrmContactsTab from "./tabs/CrmContactsTab";
 import CrmCompaniesTab from "./tabs/CrmCompaniesTab";
 import CrmDealsTab from "./tabs/CrmDealsTab";
 import CrmOrdersTab from "./tabs/CrmOrdersTab";
 import CrmActivityTab from "./tabs/CrmActivityTab";
 
 interface CrmDetailPanelProps {
   connection: CrmConnection;
   onRefresh: () => void;
 }
 
 const CrmDetailPanel = ({ connection, onRefresh }: CrmDetailPanelProps) => {
   const [activeTab, setActiveTab] = useState("overview");
   const [stats, setStats] = useState({
     contacts: 0,
     companies: 0,
     deals: 0,
     orders: 0,
   });
   const [loadingStats, setLoadingStats] = useState(true);
 
   // Determine which tabs to show based on provider
   const isCommercePlatform = ["shopify", "woocommerce"].includes(connection.provider);
 
   useEffect(() => {
     const fetchStats = async () => {
       setLoadingStats(true);
       try {
         const [contactsRes, companiesRes, dealsRes, ordersRes] = await Promise.all([
           supabase
             .from("crm_contacts")
             .select("id", { count: "exact", head: true })
             .eq("connection_id", connection.id),
           supabase
             .from("crm_companies")
             .select("id", { count: "exact", head: true })
             .eq("connection_id", connection.id),
           supabase
             .from("crm_deals")
             .select("id", { count: "exact", head: true })
             .eq("connection_id", connection.id),
           supabase
             .from("crm_orders")
             .select("id", { count: "exact", head: true })
             .eq("connection_id", connection.id),
         ]);
 
         setStats({
           contacts: contactsRes.count || 0,
           companies: companiesRes.count || 0,
           deals: dealsRes.count || 0,
           orders: ordersRes.count || 0,
         });
       } catch (error) {
         console.error("Failed to fetch stats:", error);
       } finally {
         setLoadingStats(false);
       }
     };
 
     fetchStats();
   }, [connection.id]);
 
   return (
     <Card>
       <CardHeader className="pb-4">
         <CardTitle className="text-lg">
           {connection.display_name} Details
         </CardTitle>
       </CardHeader>
       <CardContent>
         <Tabs value={activeTab} onValueChange={setActiveTab}>
           <TabsList className="mb-4 flex-wrap">
             <TabsTrigger value="overview">Overview</TabsTrigger>
             <TabsTrigger value="contacts">
               Contacts {!loadingStats && `(${stats.contacts})`}
             </TabsTrigger>
             {!isCommercePlatform && (
               <TabsTrigger value="companies">
                 Companies {!loadingStats && `(${stats.companies})`}
               </TabsTrigger>
             )}
             {!isCommercePlatform && (
               <TabsTrigger value="deals">
                 Deals {!loadingStats && `(${stats.deals})`}
               </TabsTrigger>
             )}
             {isCommercePlatform && (
               <TabsTrigger value="orders">
                 Orders {!loadingStats && `(${stats.orders})`}
               </TabsTrigger>
             )}
             <TabsTrigger value="activity">Activity</TabsTrigger>
           </TabsList>
 
           <TabsContent value="overview">
             <CrmOverviewTab
               connection={connection}
               stats={stats}
               loadingStats={loadingStats}
             />
           </TabsContent>
 
           <TabsContent value="contacts">
             <CrmContactsTab connectionId={connection.id} />
           </TabsContent>
 
           <TabsContent value="companies">
             <CrmCompaniesTab connectionId={connection.id} />
           </TabsContent>
 
           <TabsContent value="deals">
             <CrmDealsTab connectionId={connection.id} />
           </TabsContent>
 
           <TabsContent value="orders">
             <CrmOrdersTab connectionId={connection.id} />
           </TabsContent>
 
           <TabsContent value="activity">
             <CrmActivityTab connectionId={connection.id} />
           </TabsContent>
         </Tabs>
       </CardContent>
     </Card>
   );
 };
 
 export default CrmDetailPanel;