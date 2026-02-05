 import { useState } from "react";
 import {
   Dialog,
   DialogContent,
   DialogHeader,
   DialogTitle,
   DialogDescription,
 } from "@/components/ui/dialog";
 import { Button } from "@/components/ui/button";
 import { Input } from "@/components/ui/input";
 import { Label } from "@/components/ui/label";
 import { Badge } from "@/components/ui/badge";
 import { Loader2, ExternalLink } from "lucide-react";
 import { toast } from "sonner";
 import { supabase } from "@/integrations/supabase/client";
 import HubSpotIcon from "@/components/icons/HubSpotIcon";
 import ShopifyIcon from "@/components/icons/ShopifyIcon";
 import SalesforceIcon from "@/components/icons/SalesforceIcon";
 import ZohoIcon from "@/components/icons/ZohoIcon";
 import PipedriveIcon from "@/components/icons/PipedriveIcon";
 import WooCommerceIcon from "@/components/icons/WooCommerceIcon";
 
 interface ConnectCrmModalProps {
   open: boolean;
   onOpenChange: (open: boolean) => void;
   onSuccess: () => void;
 }
 
 interface CrmProvider {
   id: string;
   name: string;
   icon: React.FC<{ className?: string }>;
   available: boolean;
   description: string;
 }
 
 const providers: CrmProvider[] = [
   {
     id: "hubspot",
     name: "HubSpot",
     icon: HubSpotIcon,
     available: true,
     description: "Contacts, companies, and deals",
   },
   {
     id: "shopify",
     name: "Shopify",
     icon: ShopifyIcon,
     available: true,
     description: "Customers and orders",
   },
  {
    id: "salesforce",
    name: "Salesforce",
    icon: SalesforceIcon,
    available: true,
    description: "Contacts, accounts, and opportunities",
  },
   {
     id: "zoho",
     name: "Zoho CRM",
     icon: ZohoIcon,
     available: false,
     description: "Contacts and deals",
   },
   {
     id: "pipedrive",
     name: "Pipedrive",
     icon: PipedriveIcon,
     available: false,
     description: "Sales pipeline management",
   },
   {
     id: "woocommerce",
     name: "WooCommerce",
     icon: WooCommerceIcon,
     available: false,
     description: "WordPress ecommerce",
   },
 ];
 
 const ConnectCrmModal = ({ open, onOpenChange, onSuccess }: ConnectCrmModalProps) => {
   const [step, setStep] = useState<"select" | "configure">("select");
   const [selectedProvider, setSelectedProvider] = useState<CrmProvider | null>(null);
   const [isConnecting, setIsConnecting] = useState(false);
   const [formData, setFormData] = useState({
     displayName: "",
     shopDomain: "", // For Shopify
   });
 
   const handleSelectProvider = (provider: CrmProvider) => {
     if (!provider.available) {
       toast.info(`${provider.name} integration coming soon!`);
       return;
     }
     setSelectedProvider(provider);
     setFormData({
       displayName: provider.name,
       shopDomain: "",
     });
     setStep("configure");
   };
 
   const handleConnect = async () => {
     if (!selectedProvider) return;
 
     setIsConnecting(true);
     try {
       // Call the appropriate auth URL edge function
       const functionName = `${selectedProvider.id}-crm-auth-url`;
       
       const body: Record<string, string> = {
         displayName: formData.displayName,
       };
 
       if (selectedProvider.id === "shopify" && formData.shopDomain) {
         body.shopDomain = formData.shopDomain;
       }
 
       const { data, error } = await supabase.functions.invoke(functionName, {
         body,
       });
 
       if (error) throw error;
 
       if (data?.authUrl) {
         // Redirect to OAuth
         window.location.href = data.authUrl;
       } else {
         toast.error("Failed to get authorization URL");
       }
     } catch (error: unknown) {
       console.error("Failed to connect CRM:", error);
       toast.error("Failed to connect CRM. Please try again.");
     } finally {
       setIsConnecting(false);
     }
   };
 
   const handleClose = () => {
     setStep("select");
     setSelectedProvider(null);
     setFormData({ displayName: "", shopDomain: "" });
     onOpenChange(false);
   };
 
   return (
     <Dialog open={open} onOpenChange={handleClose}>
       <DialogContent className="sm:max-w-lg">
         <DialogHeader>
           <DialogTitle>
             {step === "select" ? "Connect a CRM or Commerce Platform" : `Connect ${selectedProvider?.name}`}
           </DialogTitle>
           <DialogDescription>
             {step === "select"
               ? "Choose a platform to sync your customer data with Klyc."
               : "Configure your connection settings."}
           </DialogDescription>
         </DialogHeader>
 
         {step === "select" ? (
           <div className="grid grid-cols-2 gap-3 py-4">
             {providers.map((provider) => (
               <button
                 key={provider.id}
                 onClick={() => handleSelectProvider(provider)}
                 className={`flex flex-col items-center gap-2 p-4 rounded-lg border transition-all text-left ${
                   provider.available
                     ? "border-border hover:border-primary hover:bg-accent/50 cursor-pointer"
                     : "border-border/50 opacity-60 cursor-not-allowed"
                 }`}
               >
                 <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                   <provider.icon className="w-8 h-8" />
                 </div>
                 <div className="text-center">
                   <div className="flex items-center gap-2 justify-center">
                     <span className="font-medium text-foreground">{provider.name}</span>
                     {!provider.available && (
                       <Badge variant="secondary" className="text-xs">Soon</Badge>
                     )}
                   </div>
                   <p className="text-xs text-muted-foreground mt-1">{provider.description}</p>
                 </div>
               </button>
             ))}
           </div>
         ) : (
           <div className="space-y-4 py-4">
             <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
               {selectedProvider && <selectedProvider.icon className="w-8 h-8" />}
               <div>
                 <p className="font-medium">{selectedProvider?.name}</p>
                 <p className="text-sm text-muted-foreground">{selectedProvider?.description}</p>
               </div>
             </div>
 
             <div className="space-y-3">
               <div>
                 <Label htmlFor="displayName">Display Name</Label>
                 <Input
                   id="displayName"
                   value={formData.displayName}
                   onChange={(e) => setFormData((prev) => ({ ...prev, displayName: e.target.value }))}
                   placeholder="My HubSpot Account"
                 />
                 <p className="text-xs text-muted-foreground mt-1">
                   A name to identify this connection in Klyc.
                 </p>
               </div>
 
               {selectedProvider?.id === "shopify" && (
                 <div>
                   <Label htmlFor="shopDomain">Shop Domain</Label>
                   <div className="flex items-center gap-2">
                     <Input
                       id="shopDomain"
                       value={formData.shopDomain}
                       onChange={(e) => setFormData((prev) => ({ ...prev, shopDomain: e.target.value }))}
                       placeholder="your-store"
                     />
                     <span className="text-muted-foreground">.myshopify.com</span>
                   </div>
                   <p className="text-xs text-muted-foreground mt-1">
                     Enter your Shopify store subdomain.
                   </p>
                 </div>
               )}
             </div>
 
             <div className="flex gap-3 pt-4">
               <Button variant="outline" onClick={() => setStep("select")} className="flex-1">
                 Back
               </Button>
               <Button onClick={handleConnect} disabled={isConnecting} className="flex-1 gap-2">
                 {isConnecting ? (
                   <>
                     <Loader2 className="w-4 h-4 animate-spin" />
                     Connecting...
                   </>
                 ) : (
                   <>
                     <ExternalLink className="w-4 h-4" />
                     Connect with {selectedProvider?.name}
                   </>
                 )}
               </Button>
             </div>
           </div>
         )}
       </DialogContent>
     </Dialog>
   );
 };
 
 export default ConnectCrmModal;