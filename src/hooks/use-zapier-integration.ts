import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export type ZapierTriggerType = 
  | "campaign_only" 
  | "campaign_with_analytics" 
  | "campaign_with_competitor" 
  | "all_data";

interface ZapierTriggerResult {
  success: boolean;
  automation_id?: string;
  message?: string;
  error?: string;
}

interface AutomationResult {
  id: string;
  user_id: string;
  campaign_draft_id: string | null;
  trigger_type: string;
  payload_sent: Record<string, unknown> | null;
  result_data: Record<string, unknown> | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export function useZapierIntegration() {
  const [isSending, setIsSending] = useState(false);
  const [automationId, setAutomationId] = useState<string | null>(null);
  const { toast } = useToast();

  const triggerZapier = async (
    campaignDraftId: string,
    triggerType: ZapierTriggerType = "all_data"
  ): Promise<ZapierTriggerResult> => {
    setIsSending(true);
    
    try {
      const { data, error } = await supabase.functions.invoke("zapier-trigger", {
        body: {
          campaignDraftId,
          triggerType,
        },
      });

      if (error) {
        console.error("Zapier trigger error:", error);
        toast({
          title: "Failed to send to Zapier",
          description: error.message,
          variant: "destructive",
        });
        return { success: false, error: error.message };
      }

      setAutomationId(data.automation_id);
      toast({
        title: "Sent to Zapier!",
        description: "Your campaign data has been sent for automation.",
      });

      return {
        success: true,
        automation_id: data.automation_id,
        message: data.message,
      };
    } catch (error) {
      console.error("Zapier trigger error:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      toast({
        title: "Failed to send to Zapier",
        description: errorMessage,
        variant: "destructive",
      });
      return { success: false, error: errorMessage };
    } finally {
      setIsSending(false);
    }
  };

  const checkAutomationStatus = async (
    automationId: string
  ): Promise<AutomationResult | null> => {
    try {
      const { data, error } = await supabase
        .from("zapier_automation_results" as unknown as "campaign_drafts")
        .select("*")
        .eq("id", automationId)
        .single();

      if (error) {
        console.error("Error checking automation status:", error);
        return null;
      }

      return data as unknown as AutomationResult;
    } catch (error) {
      console.error("Error checking automation status:", error);
      return null;
    }
  };

  const getLatestAutomationResults = async (): Promise<AutomationResult[]> => {
    try {
      const { data, error } = await supabase
        .from("zapier_automation_results" as unknown as "campaign_drafts")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) {
        console.error("Error fetching automation results:", error);
        return [];
      }

      return (data as unknown as AutomationResult[]) || [];
    } catch (error) {
      console.error("Error fetching automation results:", error);
      return [];
    }
  };

  return {
    isSending,
    automationId,
    triggerZapier,
    checkAutomationStatus,
    getLatestAutomationResults,
  };
}
