import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface LaunchResult {
  success: boolean;
  campaignContext?: Record<string, unknown>;
  error?: string;
}

export function useLaunchCampaign() {
  const [isLaunching, setIsLaunching] = useState(false);
  const [lastResult, setLastResult] = useState<LaunchResult | null>(null);
  const { toast } = useToast();

  const launch = async (
    campaignDraftId?: string,
    testMode = false
  ): Promise<LaunchResult> => {
    setIsLaunching(true);
    setLastResult(null);

    try {
      const { data, error } = await supabase.functions.invoke("launch-campaign", {
        body: { campaignDraftId, testMode },
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
          title: testMode ? "Test payload generated!" : "Campaign launched!",
          description: "Campaign context assembled successfully.",
        });
      } else {
        toast({
          title: "Launch issue",
          description: data.error || "Unknown error",
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
