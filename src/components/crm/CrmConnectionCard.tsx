 import { formatDistanceToNow } from "date-fns";
 import { Card, CardContent } from "@/components/ui/card";
 import { Button } from "@/components/ui/button";
 import { Badge } from "@/components/ui/badge";
 import {
   DropdownMenu,
   DropdownMenuContent,
   DropdownMenuItem,
   DropdownMenuTrigger,
 } from "@/components/ui/dropdown-menu";
 import { RefreshCw, MoreVertical, Eye, Settings, Trash2, Loader2 } from "lucide-react";
 import type { CrmConnection } from "./CrmContent";
 import type { Json } from "@/integrations/supabase/types";
 import HubSpotIcon from "@/components/icons/HubSpotIcon";
 import ShopifyIcon from "@/components/icons/ShopifyIcon";
 import SalesforceIcon from "@/components/icons/SalesforceIcon";
 import ZohoIcon from "@/components/icons/ZohoIcon";
 import PipedriveIcon from "@/components/icons/PipedriveIcon";
 import WooCommerceIcon from "@/components/icons/WooCommerceIcon";
 
 interface CrmConnectionCardProps {
   connection: CrmConnection;
   isSelected: boolean;
   onSelect: () => void;
   onSyncNow: () => void;
   onDisconnect: () => void;
 }
 
 const providerIcons: Record<string, React.FC<{ className?: string }>> = {
   hubspot: HubSpotIcon,
   shopify: ShopifyIcon,
   salesforce: SalesforceIcon,
   zoho: ZohoIcon,
   pipedrive: PipedriveIcon,
   woocommerce: WooCommerceIcon,
 };
 
 const providerNames: Record<string, string> = {
   hubspot: "HubSpot",
   shopify: "Shopify",
   salesforce: "Salesforce",
   zoho: "Zoho CRM",
   pipedrive: "Pipedrive",
   woocommerce: "WooCommerce",
 };
 
 const statusColors: Record<string, string> = {
   connected: "bg-green-500/10 text-green-500 border-green-500/20",
   syncing: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
   error: "bg-red-500/10 text-red-500 border-red-500/20",
   disconnected: "bg-muted text-muted-foreground border-border",
 };
 
 const CrmConnectionCard = ({
   connection,
   isSelected,
   onSelect,
   onSyncNow,
   onDisconnect,
 }: CrmConnectionCardProps) => {
   const IconComponent = providerIcons[connection.provider] || HubSpotIcon;
   const providerName = providerNames[connection.provider] || connection.display_name;
   const statusColor = statusColors[connection.status] || statusColors.connected;
 
   const metadata = (connection.metadata || {}) as {
     contacts_count?: number;
     companies_count?: number;
     deals_count?: number;
     orders_count?: number;
   };
 
   return (
     <Card
       className={`cursor-pointer transition-all hover:border-primary/50 ${
         isSelected ? "border-primary ring-1 ring-primary/20" : ""
       }`}
       onClick={onSelect}
     >
       <CardContent className="p-4">
         <div className="flex items-start justify-between mb-3">
           <div className="flex items-center gap-3">
             <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
               <IconComponent className="w-6 h-6" />
             </div>
             <div>
               <h3 className="font-medium text-foreground">{providerName}</h3>
               <p className="text-xs text-muted-foreground">{connection.display_name}</p>
             </div>
           </div>
           <DropdownMenu>
             <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
               <Button variant="ghost" size="icon" className="h-8 w-8">
                 <MoreVertical className="w-4 h-4" />
               </Button>
             </DropdownMenuTrigger>
             <DropdownMenuContent align="end">
               <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onSelect(); }}>
                 <Eye className="w-4 h-4 mr-2" />
                 View Data
               </DropdownMenuItem>
               <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onSyncNow(); }}>
                 <RefreshCw className="w-4 h-4 mr-2" />
                 Sync Now
               </DropdownMenuItem>
               <DropdownMenuItem onClick={(e) => e.stopPropagation()}>
                 <Settings className="w-4 h-4 mr-2" />
                 Settings
               </DropdownMenuItem>
               <DropdownMenuItem 
                 onClick={(e) => { e.stopPropagation(); onDisconnect(); }}
                 className="text-destructive"
               >
                 <Trash2 className="w-4 h-4 mr-2" />
                 Disconnect
               </DropdownMenuItem>
             </DropdownMenuContent>
           </DropdownMenu>
         </div>
 
         <div className="flex items-center gap-2 mb-3">
           <Badge variant="outline" className={statusColor}>
             {connection.status === "syncing" && (
               <Loader2 className="w-3 h-3 mr-1 animate-spin" />
             )}
             {connection.status.charAt(0).toUpperCase() + connection.status.slice(1)}
           </Badge>
           {connection.last_sync_at && (
             <span className="text-xs text-muted-foreground">
               Last sync: {formatDistanceToNow(new Date(connection.last_sync_at), { addSuffix: true })}
             </span>
           )}
         </div>
 
         <div className="grid grid-cols-2 gap-2 text-sm">
           {metadata?.contacts_count !== undefined && (
             <div className="flex justify-between">
               <span className="text-muted-foreground">Contacts</span>
               <span className="font-medium">{metadata.contacts_count.toLocaleString()}</span>
             </div>
           )}
           {metadata?.companies_count !== undefined && (
             <div className="flex justify-between">
               <span className="text-muted-foreground">Companies</span>
               <span className="font-medium">{metadata.companies_count.toLocaleString()}</span>
             </div>
           )}
           {metadata?.deals_count !== undefined && (
             <div className="flex justify-between">
               <span className="text-muted-foreground">Deals</span>
               <span className="font-medium">{metadata.deals_count.toLocaleString()}</span>
             </div>
           )}
           {metadata?.orders_count !== undefined && (
             <div className="flex justify-between">
               <span className="text-muted-foreground">Orders</span>
               <span className="font-medium">{metadata.orders_count.toLocaleString()}</span>
             </div>
           )}
         </div>
       </CardContent>
     </Card>
   );
 };
 
 export default CrmConnectionCard;