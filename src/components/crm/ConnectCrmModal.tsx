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
import SquareIcon from "@/components/icons/SquareIcon";
import SquarespaceIcon from "@/components/icons/SquarespaceIcon";
import StripeIcon from "@/components/icons/StripeIcon";
import ActiveCampaignIcon from "@/components/icons/ActiveCampaignIcon";
import CloseIcon from "@/components/icons/CloseIcon";
import CopperIcon from "@/components/icons/CopperIcon";
import SugarCRMIcon from "@/components/icons/SugarCRMIcon";
import FreshsalesIcon from "@/components/icons/FreshsalesIcon";

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
  useApiKey?: boolean;
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
    available: true,
    description: "Contacts, accounts, and deals",
  },
  {
    id: "square",
    name: "Square",
    icon: SquareIcon,
    available: true,
    description: "Customers and orders",
    useApiKey: true,
  },
  {
    id: "squarespace",
    name: "Squarespace",
    icon: SquarespaceIcon,
    available: true,
    description: "E-commerce & orders",
    useApiKey: true,
  },
  {
    id: "stripe",
    name: "Stripe",
    icon: StripeIcon,
    available: true,
    description: "Payments & customers",
    useApiKey: true,
  },
  {
    id: "pipedrive",
    name: "Pipedrive",
    icon: PipedriveIcon,
    available: true,
    description: "Sales pipeline management",
  },
  {
    id: "activecampaign",
    name: "ActiveCampaign",
    icon: ActiveCampaignIcon,
    available: true,
    description: "Contacts & marketing automation",
    useApiKey: true,
  },
  {
    id: "close",
    name: "Close CRM",
    icon: CloseIcon,
    available: true,
    description: "Sales CRM & pipeline",
    useApiKey: true,
  },
  {
    id: "copper",
    name: "Copper CRM",
    icon: CopperIcon,
    available: true,
    description: "Google Workspace CRM",
    useApiKey: true,
  },
  {
    id: "sugarcrm",
    name: "SugarCRM",
    icon: SugarCRMIcon,
    available: true,
    description: "Enterprise CRM platform",
    useApiKey: true,
  },
  {
    id: "freshsales",
    name: "Freshsales",
    icon: FreshsalesIcon,
    available: true,
    description: "Sales CRM by Freshworks",
    useApiKey: true,
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
    shopDomain: "",
    squareAccessToken: "",
    squareApplicationId: "",
    squarespaceApiKey: "",
    stripeSecretKey: "",
    activecampaignApiUrl: "",
    activecampaignApiKey: "",
    closeApiKey: "",
    copperApiKey: "",
    copperEmail: "",
    sugarcrmInstanceUrl: "",
    sugarcrmUsername: "",
    sugarcrmPassword: "",
    freshsalesSubdomain: "",
    freshsalesApiKey: "",
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
      squareAccessToken: "",
      squareApplicationId: "",
      squarespaceApiKey: "",
      stripeSecretKey: "",
      activecampaignApiUrl: "",
      activecampaignApiKey: "",
      closeApiKey: "",
      copperApiKey: "",
      copperEmail: "",
      sugarcrmInstanceUrl: "",
      sugarcrmUsername: "",
      sugarcrmPassword: "",
      freshsalesSubdomain: "",
      freshsalesApiKey: "",
    });
    setStep("configure");
  };

  const handleConnect = async () => {
    if (!selectedProvider) return;

    setIsConnecting(true);
    try {
      // Squarespace uses direct API key — no OAuth redirect
      if (selectedProvider.id === "squarespace") {
        const { data, error } = await supabase.functions.invoke("squarespace-crm-connect", {
          body: {
            displayName: formData.displayName,
            apiKey: formData.squarespaceApiKey,
          },
        });
        if (error) throw error;
        if (data?.success) {
          toast.success("Squarespace connected successfully!");
          onSuccess();
          handleClose();
        } else {
          toast.error(data?.error || "Failed to connect Squarespace");
        }
        return;
      }

      // Stripe uses direct secret key — no OAuth redirect
      if (selectedProvider.id === "stripe") {
        const { data, error } = await supabase.functions.invoke("stripe-crm-connect", {
          body: {
            displayName: formData.displayName,
            secretKey: formData.stripeSecretKey,
          },
        });
        if (error) throw error;
        if (data?.success) {
          toast.success("Stripe connected successfully!");
          onSuccess();
          handleClose();
        } else {
          toast.error(data?.error || "Failed to connect Stripe");
        }
        return;
      }

      // Square uses direct API token — no OAuth redirect
      if (selectedProvider.id === "square") {
        const { data, error } = await supabase.functions.invoke("square-crm-connect", {
          body: {
            displayName: formData.displayName,
            accessToken: formData.squareAccessToken,
            applicationId: formData.squareApplicationId,
          },
        });
        if (error) throw error;
        if (data?.success) {
          toast.success("Square connected successfully!");
          onSuccess();
          handleClose();
        } else {
          toast.error(data?.error || "Failed to connect Square");
        }
        return;
      }

      // ActiveCampaign uses API URL + API Key
      if (selectedProvider.id === "activecampaign") {
        const { data, error } = await supabase.functions.invoke("activecampaign-crm-connect", {
          body: {
            displayName: formData.displayName,
            apiUrl: formData.activecampaignApiUrl,
            apiKey: formData.activecampaignApiKey,
          },
        });
        if (error) throw error;
        if (data?.success) {
          toast.success("ActiveCampaign connected successfully!");
          onSuccess();
          handleClose();
        } else {
          toast.error(data?.error || "Failed to connect ActiveCampaign");
        }
        return;
      }

      // Close CRM uses API Key
      if (selectedProvider.id === "close") {
        const { data, error } = await supabase.functions.invoke("close-crm-connect", {
          body: {
            displayName: formData.displayName,
            apiKey: formData.closeApiKey,
          },
        });
        if (error) throw error;
        if (data?.success) {
          toast.success("Close CRM connected successfully!");
          onSuccess();
          handleClose();
        } else {
          toast.error(data?.error || "Failed to connect Close CRM");
        }
        return;
      }

      // Copper CRM uses API Key + Email
      if (selectedProvider.id === "copper") {
        const { data, error } = await supabase.functions.invoke("copper-crm-connect", {
          body: {
            displayName: formData.displayName,
            apiKey: formData.copperApiKey,
            email: formData.copperEmail,
          },
        });
        if (error) throw error;
        if (data?.success) {
          toast.success("Copper CRM connected successfully!");
          onSuccess();
          handleClose();
        } else {
          toast.error(data?.error || "Failed to connect Copper CRM");
        }
        return;
      }

      // SugarCRM uses instance URL + username/password
      if (selectedProvider.id === "sugarcrm") {
        const { data, error } = await supabase.functions.invoke("sugarcrm-connect", {
          body: {
            displayName: formData.displayName,
            instanceUrl: formData.sugarcrmInstanceUrl,
            username: formData.sugarcrmUsername,
            password: formData.sugarcrmPassword,
          },
        });
        if (error) throw error;
        if (data?.success) {
          toast.success("SugarCRM connected successfully!");
          onSuccess();
          handleClose();
        } else {
          toast.error(data?.error || "Failed to connect SugarCRM");
        }
        return;
      }

      // Freshsales uses subdomain + API key
      if (selectedProvider.id === "freshsales") {
        const { data, error } = await supabase.functions.invoke("freshsales-crm-connect", {
          body: {
            displayName: formData.displayName,
            subdomain: formData.freshsalesSubdomain,
            apiKey: formData.freshsalesApiKey,
          },
        });
        if (error) throw error;
        if (data?.success) {
          toast.success("Freshsales connected successfully!");
          onSuccess();
          handleClose();
        } else {
          toast.error(data?.error || "Failed to connect Freshsales");
        }
        return;
      }

      // OAuth flow for other providers
      const functionName = `${selectedProvider.id}-crm-auth-url`;
      const body: Record<string, string> = {
        displayName: formData.displayName,
      };

      if (selectedProvider.id === "shopify" && formData.shopDomain) {
        body.shopDomain = formData.shopDomain;
      }

      const { data, error } = await supabase.functions.invoke(functionName, { body });

      if (error) throw error;

      if (data?.authUrl) {
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
    setFormData({ displayName: "", shopDomain: "", squareAccessToken: "", squareApplicationId: "", squarespaceApiKey: "", stripeSecretKey: "", activecampaignApiUrl: "", activecampaignApiKey: "", closeApiKey: "", copperApiKey: "", copperEmail: "", sugarcrmInstanceUrl: "", sugarcrmUsername: "", sugarcrmPassword: "", freshsalesSubdomain: "", freshsalesApiKey: "" });
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

              {selectedProvider?.id === "square" && (
                <>
                  <div>
                    <Label htmlFor="squareAccessToken">Access Token</Label>
                    <Input
                      id="squareAccessToken"
                      type="password"
                      value={formData.squareAccessToken}
                      onChange={(e) => setFormData((prev) => ({ ...prev, squareAccessToken: e.target.value }))}
                      placeholder="EAAAl..."
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Found in your Square Developer Dashboard under your app's credentials.
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="squareApplicationId">Application ID <span className="text-muted-foreground">(optional)</span></Label>
                    <Input
                      id="squareApplicationId"
                      value={formData.squareApplicationId}
                      onChange={(e) => setFormData((prev) => ({ ...prev, squareApplicationId: e.target.value }))}
                      placeholder="sq0idp-..."
                    />
                  </div>
                 </>
               )}

               {selectedProvider?.id === "stripe" && (
                 <div>
                   <Label htmlFor="stripeSecretKey">Secret Key</Label>
                   <Input
                     id="stripeSecretKey"
                     type="password"
                     value={formData.stripeSecretKey}
                     onChange={(e) => setFormData((prev) => ({ ...prev, stripeSecretKey: e.target.value }))}
                     placeholder="sk_live_..."
                   />
                   <p className="text-xs text-muted-foreground mt-1">
                     Found in your Stripe Dashboard under <strong>Developers → API keys</strong>. Use your <em>Secret key</em> (starts with <code>sk_</code>).
                   </p>
                 </div>
               )}

               {selectedProvider?.id === "squarespace" && (
                 <div>
                   <Label htmlFor="squarespaceApiKey">API Key</Label>
                   <Input
                     id="squarespaceApiKey"
                     type="password"
                     value={formData.squarespaceApiKey}
                     onChange={(e) => setFormData((prev) => ({ ...prev, squarespaceApiKey: e.target.value }))}
                     placeholder="Enter your Squarespace API key"
                   />
                   <p className="text-xs text-muted-foreground mt-1">
                     Found in <strong>Settings → Advanced → API Keys</strong>. Create a key with Commerce read permissions.
                   </p>
                 </div>
                )}

                {selectedProvider?.id === "activecampaign" && (
                  <>
                    <div>
                      <Label htmlFor="activecampaignApiUrl">Account URL</Label>
                      <Input
                        id="activecampaignApiUrl"
                        value={formData.activecampaignApiUrl}
                        onChange={(e) => setFormData((prev) => ({ ...prev, activecampaignApiUrl: e.target.value }))}
                        placeholder="https://youraccountname.api-us1.com"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Found in <strong>Settings → Developer</strong>. It looks like <code>https://youraccountname.api-us1.com</code>.
                      </p>
                    </div>
                    <div>
                      <Label htmlFor="activecampaignApiKey">API Key</Label>
                      <Input
                        id="activecampaignApiKey"
                        type="password"
                        value={formData.activecampaignApiKey}
                        onChange={(e) => setFormData((prev) => ({ ...prev, activecampaignApiKey: e.target.value }))}
                        placeholder="Enter your ActiveCampaign API key"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Found on the same <strong>Settings → Developer</strong> page as the URL.
                      </p>
                    </div>
                  </>
                )}

                {selectedProvider?.id === "close" && (
                  <div>
                    <Label htmlFor="closeApiKey">API Key</Label>
                    <Input
                      id="closeApiKey"
                      type="password"
                      value={formData.closeApiKey}
                      onChange={(e) => setFormData((prev) => ({ ...prev, closeApiKey: e.target.value }))}
                      placeholder="api_..."
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Found in <strong>Settings → API Keys</strong> in your Close account.
                    </p>
                  </div>
                )}

                {selectedProvider?.id === "copper" && (
                  <>
                    <div>
                      <Label htmlFor="copperEmail">Account Email</Label>
                      <Input
                        id="copperEmail"
                        type="email"
                        value={formData.copperEmail}
                        onChange={(e) => setFormData((prev) => ({ ...prev, copperEmail: e.target.value }))}
                        placeholder="you@company.com"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        The email address associated with your Copper account.
                      </p>
                    </div>
                    <div>
                      <Label htmlFor="copperApiKey">API Key</Label>
                      <Input
                        id="copperApiKey"
                        type="password"
                        value={formData.copperApiKey}
                        onChange={(e) => setFormData((prev) => ({ ...prev, copperApiKey: e.target.value }))}
                        placeholder="Enter your Copper API key"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Found in <strong>Settings → Integrations → API Keys</strong> in Copper.
                      </p>
                    </div>
                  </>
                )}

                {selectedProvider?.id === "sugarcrm" && (
                  <>
                    <div>
                      <Label htmlFor="sugarcrmInstanceUrl">Instance URL</Label>
                      <Input
                        id="sugarcrmInstanceUrl"
                        value={formData.sugarcrmInstanceUrl}
                        onChange={(e) => setFormData((prev) => ({ ...prev, sugarcrmInstanceUrl: e.target.value }))}
                        placeholder="https://yourcompany.sugarondemand.com"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Your SugarCRM instance URL (e.g., <code>https://yourcompany.sugarondemand.com</code>).
                      </p>
                    </div>
                    <div>
                      <Label htmlFor="sugarcrmUsername">Username</Label>
                      <Input
                        id="sugarcrmUsername"
                        value={formData.sugarcrmUsername}
                        onChange={(e) => setFormData((prev) => ({ ...prev, sugarcrmUsername: e.target.value }))}
                        placeholder="admin"
                      />
                    </div>
                    <div>
                      <Label htmlFor="sugarcrmPassword">Password</Label>
                      <Input
                        id="sugarcrmPassword"
                        type="password"
                        value={formData.sugarcrmPassword}
                        onChange={(e) => setFormData((prev) => ({ ...prev, sugarcrmPassword: e.target.value }))}
                        placeholder="Enter your password"
                      />
                    </div>
                  </>
                )}

                {selectedProvider?.id === "freshsales" && (
                  <>
                    <div>
                      <Label htmlFor="freshsalesSubdomain">Subdomain</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          id="freshsalesSubdomain"
                          value={formData.freshsalesSubdomain}
                          onChange={(e) => setFormData((prev) => ({ ...prev, freshsalesSubdomain: e.target.value }))}
                          placeholder="yourcompany"
                        />
                        <span className="text-muted-foreground whitespace-nowrap">.freshsales.io</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Your Freshsales subdomain from the URL.
                      </p>
                    </div>
                    <div>
                      <Label htmlFor="freshsalesApiKey">API Key</Label>
                      <Input
                        id="freshsalesApiKey"
                        type="password"
                        value={formData.freshsalesApiKey}
                        onChange={(e) => setFormData((prev) => ({ ...prev, freshsalesApiKey: e.target.value }))}
                        placeholder="Enter your Freshsales API key"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Found in <strong>Settings → API Settings</strong> in your Freshsales account.
                      </p>
                    </div>
                  </>
                )}
              </div>
  
             <div className="flex gap-3 pt-4">
               <Button variant="outline" onClick={() => setStep("select")} className="flex-1">
                 Back
               </Button>
                <Button 
                  onClick={handleConnect} 
                  disabled={isConnecting || (selectedProvider?.id === "shopify" && !formData.shopDomain.trim()) || (selectedProvider?.id === "square" && !formData.squareAccessToken.trim()) || (selectedProvider?.id === "squarespace" && !formData.squarespaceApiKey.trim()) || (selectedProvider?.id === "stripe" && !formData.stripeSecretKey.trim()) || (selectedProvider?.id === "activecampaign" && (!formData.activecampaignApiUrl.trim() || !formData.activecampaignApiKey.trim())) || (selectedProvider?.id === "close" && !formData.closeApiKey.trim()) || (selectedProvider?.id === "copper" && (!formData.copperApiKey.trim() || !formData.copperEmail.trim())) || (selectedProvider?.id === "sugarcrm" && (!formData.sugarcrmInstanceUrl.trim() || !formData.sugarcrmUsername.trim() || !formData.sugarcrmPassword.trim())) || (selectedProvider?.id === "freshsales" && (!formData.freshsalesSubdomain.trim() || !formData.freshsalesApiKey.trim()))} 
                  className="flex-1 gap-2"
                >
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