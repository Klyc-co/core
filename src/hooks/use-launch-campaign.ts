import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface DeliveryLog {
  webhookDeliveryStatus: string;
  responseCode: number;
  responseBody: string;
  timestamp: string;
  attempts: number;
}

interface LaunchResult {
  success: boolean;
  campaignContext?: Record<string, unknown>;
  deliveryLog?: DeliveryLog;
  error?: string;
}

export function useLaunchCampaign() {
  const [isLaunching, setIsLaunching] = useState(false);
  const [lastResult, setLastResult] = useState<LaunchResult | null>(null);
  const { toast } = useToast();

  const launch = async (
    campaignDraftId?: string,
    webhookUrl?: string,
    testMode = false
  ): Promise<LaunchResult> => {
    setIsLaunching(true);
    setLastResult(null);

    try {
      const { data, error } = await supabase.functions.invoke("launch-campaign", {
        body: { campaignDraftId, webhookUrl, testMode },
      });

      if (error) {
        const result: LaunchResult = { success: false, error: error.message };
        setLastResult(result);
        toast({
          title: "Launch failed",
          description: error.message,
          variant: "destructive",
        });
        return result;
      }

      setLastResult(data);

      if (data.success) {
        toast({
          title: testMode ? "Test payload sent!" : "Campaign launched!",
          description: `Delivered to Zapier in ${data.deliveryLog?.attempts || 1} attempt(s).`,
        });
      } else {
        toast({
          title: "Delivery issue",
          description: `Webhook returned status ${data.deliveryLog?.responseCode}`,
          variant: "destructive",
        });
      }

      return data;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Unknown error";
      const result: LaunchResult = { success: false, error: errorMsg };
      setLastResult(result);
      toast({ title: "Launch failed", description: errorMsg, variant: "destructive" });
      return result;
    } finally {
      setIsLaunching(false);
    }
  };

  return { isLaunching, lastResult, launch };
}
