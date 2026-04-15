import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  Send, CalendarIcon, Settings, Loader2, Check, X,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface PlatformConnection {
  id: string;
  platform: string;
  status: string;
  connected_at: string;
}

interface PlatformPostActionsProps {
  platform: string; // e.g. "LinkedIn"
  generatedContent: string | null;
}

const PLATFORM_KEY_MAP: Record<string, string> = {
  "LinkedIn": "linkedin",
  "X / Twitter": "twitter",
  "Instagram": "instagram",
  "TikTok": "tiktok",
  "YouTube": "youtube",
  "Facebook": "facebook",
  "Threads": "threads",
  "Pinterest": "pinterest",
};

export default function PlatformPostActions({ platform, generatedContent }: PlatformPostActionsProps) {
  const [connection, setConnection] = useState<PlatformConnection | null>(null);
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [scheduling, setScheduling] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [scheduleDate, setScheduleDate] = useState<Date | undefined>();
  const [scheduleTime, setScheduleTime] = useState("12:00");

  const platformKey = PLATFORM_KEY_MAP[platform] || platform.toLowerCase();

  useEffect(() => {
    fetchConnection();
  }, [platformKey]);

  const fetchConnection = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const { data } = await supabase
      .from("client_platform_connections")
      .select("*")
      .eq("client_id", user.id)
      .eq("platform", platformKey)
      .eq("status", "active")
      .maybeSingle();

    setConnection(data as PlatformConnection | null);
    setLoading(false);
  };

  // Listen for OAuth callback redirect params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const oauthSuccess = params.get("oauth_success");
    const oauthError = params.get("oauth_error");

    if (oauthSuccess === platformKey) {
      toast.success(`${platform} connected successfully!`);
      fetchConnection();
      // Clean up URL params
      const url = new URL(window.location.href);
      url.searchParams.delete("oauth_success");
      window.history.replaceState({}, "", url.toString());
    }
    if (oauthError) {
      toast.error(`OAuth error: ${oauthError}`);
      const url = new URL(window.location.href);
      url.searchParams.delete("oauth_error");
      window.history.replaceState({}, "", url.toString());
    }
  }, []);

  const OAUTH_FUNCTION_MAP: Record<string, { functionName: string; urlKey: string }> = {
    linkedin: { functionName: "linkedin-oauth-initiate", urlKey: "auth_url" },
    tiktok: { functionName: "tiktok-auth-url", urlKey: "authUrl" },
    instagram: { functionName: "instagram-auth-url", urlKey: "url" },
    snapchat: { functionName: "snapchat-auth-url", urlKey: "authUrl" },
  };

  const handleConnect = async () => {
    const oauthConfig = OAUTH_FUNCTION_MAP[platformKey];

    if (oauthConfig) {
      setConnecting(true);
      try {
        const body = platformKey === "linkedin"
          ? { redirect_uri: window.location.origin + window.location.pathname }
          : {};
        const { data, error } = await supabase.functions.invoke(oauthConfig.functionName, { body });
        if (error) throw error;
        const authUrl = data?.[oauthConfig.urlKey];
        if (authUrl) {
          window.location.href = authUrl;
          return;
        }
        throw new Error("No auth URL returned");
      } catch (e: any) {
        toast.error(e.message || "Failed to start OAuth");
        setConnecting(false);
      }
      return;
    }

    // Fallback mock connection for other platforms
    setConnecting(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Please log in first");
      setConnecting(false);
      return;
    }

    const { error } = await supabase
      .from("client_platform_connections")
      .upsert({
        client_id: user.id,
        platform: platformKey,
        access_token: `mock_token_${platformKey}_${Date.now()}`,
        status: "active",
        connected_at: new Date().toISOString(),
      }, { onConflict: "client_id,platform" });

    if (error) {
      toast.error(`Failed to connect: ${error.message}`);
    } else {
      toast.success(`${platform} connected successfully!`);
      await fetchConnection();
    }
    setConnecting(false);
  };

  const handleDisconnect = async () => {
    if (!connection) return;
    const { error } = await supabase
      .from("client_platform_connections")
      .delete()
      .eq("id", connection.id);

    if (error) {
      toast.error(`Failed to disconnect: ${error.message}`);
    } else {
      toast.success(`${platform} disconnected`);
      setConnection(null);
      setShowSettings(false);
    }
  };

  const handlePostNow = async () => {
    if (!generatedContent) {
      toast.error("Generate content first before posting");
      return;
    }
    setPosting(true);
    try {
      const { data, error } = await supabase.functions.invoke("post-to-platform", {
        body: { platform: platformKey, content: generatedContent },
      });
      if (error) throw error;
      if (data?.success) {
        toast.success(data.message || `Posted to ${platform}!`);
      } else {
        toast.error(data?.error || "Post failed");
      }
    } catch (e: any) {
      toast.error(e.message || "Failed to post");
    } finally {
      setPosting(false);
    }
  };

  const handleSchedule = async () => {
    if (!generatedContent || !scheduleDate) {
      toast.error("Select a date and generate content first");
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const [hours, minutes] = scheduleTime.split(":").map(Number);
    const scheduledFor = new Date(scheduleDate);
    scheduledFor.setHours(hours, minutes, 0, 0);

    if (scheduledFor <= new Date()) {
      toast.error("Scheduled time must be in the future");
      return;
    }

    setScheduling(true);
    const { error } = await supabase
      .from("scheduled_posts")
      .insert({
        client_id: user.id,
        platform: platformKey,
        content_payload: { text: generatedContent },
        scheduled_for: scheduledFor.toISOString(),
        status: "pending",
      });

    if (error) {
      toast.error(`Failed to schedule: ${error.message}`);
    } else {
      toast.success(`Scheduled for ${format(scheduledFor, "PPP 'at' p")}`);
      setScheduleDate(undefined);
    }
    setScheduling(false);
  };

  const isConnected = !!connection;

  if (loading) return null;

  return (
    <Card className="mt-3 border-dashed">
      <CardContent className="pt-3 pb-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className={cn(
              "w-2.5 h-2.5 rounded-full",
              isConnected ? "bg-success" : "bg-muted-foreground/40"
            )} />
            <span className="text-xs font-medium text-muted-foreground">
              {isConnected ? "Connected" : "Not connected"}
            </span>
          </div>

          {/* Settings gear */}
          <Popover open={showSettings} onOpenChange={setShowSettings}>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7">
                <Settings className="w-3.5 h-3.5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-3" align="end">
              <div className="space-y-2">
                <p className="text-xs font-medium text-foreground">{platform} Connection</p>
                {isConnected ? (
                  <>
                    <p className="text-xs text-muted-foreground">
                      Connected {connection?.connected_at ? format(new Date(connection.connected_at), "PPP") : ""}
                    </p>
                    <Button variant="destructive" size="sm" className="w-full" onClick={handleDisconnect}>
                      <X className="w-3 h-3 mr-1" /> Disconnect
                    </Button>
                  </>
                ) : (
                  <Button size="sm" className="w-full" onClick={handleConnect} disabled={connecting}>
                    {connecting ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Check className="w-3 h-3 mr-1" />}
                    Connect {platform}
                  </Button>
                )}
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span>
                  <Button
                    size="sm"
                    onClick={handlePostNow}
                    disabled={!isConnected || !generatedContent || posting}
                    className="gap-1.5"
                  >
                    {posting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                    Post Now
                  </Button>
                </span>
              </TooltipTrigger>
              {(!isConnected || !generatedContent) && (
                <TooltipContent>
                  {!isConnected
                    ? "Connect your account first"
                    : "Generate content first"}
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>

          {/* Schedule */}
          <Popover>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={!isConnected || !generatedContent}
                        className="gap-1.5"
                      >
                        <CalendarIcon className="w-3.5 h-3.5" />
                        Schedule
                      </Button>
                    </PopoverTrigger>
                  </span>
                </TooltipTrigger>
                {(!isConnected || !generatedContent) && (
                  <TooltipContent>
                    {!isConnected
                      ? "Connect your account first"
                      : "Generate content first"}
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
            <PopoverContent className="w-auto p-3" align="start">
              <div className="space-y-3">
                <Calendar
                  mode="single"
                  selected={scheduleDate}
                  onSelect={setScheduleDate}
                  disabled={(date) => date < new Date()}
                  className="p-0 pointer-events-auto"
                />
                <div className="flex items-center gap-2">
                  <label className="text-xs font-medium text-muted-foreground">Time:</label>
                  <Input
                    type="time"
                    value={scheduleTime}
                    onChange={(e) => setScheduleTime(e.target.value)}
                    className="w-28 h-8 text-xs"
                  />
                </div>
                <Button
                  size="sm"
                  className="w-full"
                  onClick={handleSchedule}
                  disabled={!scheduleDate || scheduling}
                >
                  {scheduling ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <CalendarIcon className="w-3 h-3 mr-1" />}
                  Confirm Schedule
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </CardContent>
    </Card>
  );
}
