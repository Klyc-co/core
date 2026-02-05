 import { Card, CardContent } from "@/components/ui/card";
 import { Loader2, Users, Building, Briefcase, ShoppingCart, Clock, Calendar } from "lucide-react";
 import { formatDistanceToNow, addMinutes, format } from "date-fns";
 import type { CrmConnection } from "../CrmContent";
 
 interface CrmOverviewTabProps {
   connection: CrmConnection;
   stats: {
     contacts: number;
     companies: number;
     deals: number;
     orders: number;
   };
   loadingStats: boolean;
 }
 
 const CrmOverviewTab = ({ connection, stats, loadingStats }: CrmOverviewTabProps) => {
   const isCommercePlatform = ["shopify", "woocommerce"].includes(connection.provider);
   
   const nextSyncTime = connection.last_sync_at
     ? addMinutes(new Date(connection.last_sync_at), connection.sync_frequency_minutes)
     : null;
 
   return (
     <div className="space-y-6">
       {/* Stats Grid */}
       <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
         <Card>
           <CardContent className="p-4 flex items-center gap-3">
             <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
               <Users className="w-5 h-5 text-primary" />
             </div>
             <div>
               <p className="text-2xl font-bold">
                 {loadingStats ? <Loader2 className="w-5 h-5 animate-spin" /> : stats.contacts.toLocaleString()}
               </p>
               <p className="text-sm text-muted-foreground">Contacts</p>
             </div>
           </CardContent>
         </Card>
 
         {!isCommercePlatform && (
           <>
             <Card>
               <CardContent className="p-4 flex items-center gap-3">
                 <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                   <Building className="w-5 h-5 text-blue-500" />
                 </div>
                 <div>
                   <p className="text-2xl font-bold">
                     {loadingStats ? <Loader2 className="w-5 h-5 animate-spin" /> : stats.companies.toLocaleString()}
                   </p>
                   <p className="text-sm text-muted-foreground">Companies</p>
                 </div>
               </CardContent>
             </Card>
 
             <Card>
               <CardContent className="p-4 flex items-center gap-3">
                 <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                   <Briefcase className="w-5 h-5 text-green-500" />
                 </div>
                 <div>
                   <p className="text-2xl font-bold">
                     {loadingStats ? <Loader2 className="w-5 h-5 animate-spin" /> : stats.deals.toLocaleString()}
                   </p>
                   <p className="text-sm text-muted-foreground">Deals</p>
                 </div>
               </CardContent>
             </Card>
           </>
         )}
 
         {isCommercePlatform && (
           <Card>
             <CardContent className="p-4 flex items-center gap-3">
               <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                 <ShoppingCart className="w-5 h-5 text-purple-500" />
               </div>
               <div>
                 <p className="text-2xl font-bold">
                   {loadingStats ? <Loader2 className="w-5 h-5 animate-spin" /> : stats.orders.toLocaleString()}
                 </p>
                 <p className="text-sm text-muted-foreground">Orders</p>
               </div>
             </CardContent>
           </Card>
         )}
       </div>
 
       {/* Sync Schedule */}
       <Card>
         <CardContent className="p-4">
           <h3 className="font-medium mb-3 flex items-center gap-2">
             <Clock className="w-4 h-4" />
             Sync Schedule
           </h3>
           <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
             <div>
               <p className="text-muted-foreground">Frequency</p>
               <p className="font-medium">Every {connection.sync_frequency_minutes / 60} hours</p>
             </div>
             <div>
               <p className="text-muted-foreground">Last Sync</p>
               <p className="font-medium">
                 {connection.last_sync_at
                   ? format(new Date(connection.last_sync_at), "MMM d, yyyy h:mm a")
                   : "Never"}
               </p>
             </div>
             <div>
               <p className="text-muted-foreground">Next Sync</p>
               <p className="font-medium">
                 {nextSyncTime
                   ? format(nextSyncTime, "MMM d, yyyy h:mm a")
                   : "Pending initial sync"}
               </p>
             </div>
           </div>
         </CardContent>
       </Card>
     </div>
   );
 };
 
 export default CrmOverviewTab;