import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useClientContext } from "@/contexts/ClientContext";
import AppHeader from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Plus, Upload, X, Rocket, CalendarIcon, Clock, Send, Loader2, FileText, FolderOpen, FlaskConical, ChevronDown, ChevronUp, Link2, Unlink } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { User } from "@supabase/supabase-js";
import linkedinLogo from "@/assets/linkedin-logo.png";
import snapchatLogo from "@/assets/snapchat-logo.png";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import CampaignDraftPicker from "@/components/social-post-editor/CampaignDraftPicker";
import type { CampaignDraft } from "@/components/social-post-editor/types";
import { Textarea } from "@/components/ui/textarea";
import LibraryAssetPicker from "@/components/LibraryAssetPicker";
import GoogleDriveFilePicker from "@/components/GoogleDriveFilePicker";
import GoogleDriveIcon from "@/components/icons/GoogleDriveIcon";
import { useLaunchCampaign } from "@/hooks/use-launch-campaign";
import { ScrollArea } from "@/components/ui/scroll-area";

interface SocialPlatform {
  id: string;
  name: string;
  icon: string;
  color: string;
}

const socialPlatforms: SocialPlatform[] = [
  { id: "youtube", name: "YouTube", icon: "https://cdn.simpleicons.org/youtube/FFFFFF", color: "bg-[#FF0000]" },
  { id: "tiktok", name: "TikTok", icon: "https://cdn.simpleicons.org/tiktok/FFFFFF", color: "bg-neutral-900" },
  { id: "instagram", name: "Instagram", icon: "https://cdn.simpleicons.org/instagram/FFFFFF", color: "bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400" },
  { id: "linkedin", name: "LinkedIn", icon: linkedinLogo, color: "bg-transparent" },
  { id: "twitter", name: "X (Twitter)", icon: "https://cdn.simpleicons.org/x/FFFFFF", color: "bg-neutral-900" },
  { id: "facebook", name: "Facebook", icon: "https://cdn.simpleicons.org/facebook/FFFFFF", color: "bg-[#1877F2]" },
];

// No more timeSlots array needed

const NewCampaign = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const generatedData = location.state as {
    campaignName?: string;
    postCaption?: string;
    tags?: string[];
    videoScript?: string;
    imagePrompt?: string;
    articleOutline?: string;
    campaignGoals?: string;
    targetAudienceDescription?: string;
    campaignObjective?: string;
    contentType?: string;
    generatedImageUrl?: string;
    selectedPlatforms?: string[];
    uploadedMediaUrls?: { id: string; name: string; url: string }[];
  } | null;
  const { getEffectiveUserId } = useClientContext();
  const [user, setUser] = useState<User | null>(null);
  const [campaignName, setCampaignName] = useState("");
  const [selectedProduct, setSelectedProduct] = useState("");
  const [links, setLinks] = useState<string[]>([]);
  const [newLink, setNewLink] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState("");
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [scheduledDate, setScheduledDate] = useState<Date | undefined>(undefined);
  const [scheduledTime, setScheduledTime] = useState("");
  const [isLaunching, setIsLaunching] = useState(false);
  const [isSendingForApproval, setIsSendingForApproval] = useState(false);
  const [showClientDialog, setShowClientDialog] = useState(false);
  const [clients, setClients] = useState<{ id: string; client_id: string; client_name: string }[]>([]);
  const [selectedClientId, setSelectedClientId] = useState("");
  const [showDraftPicker, setShowDraftPicker] = useState(false);
  const [postCaption, setPostCaption] = useState("");
  const [captionDraft, setCaptionDraft] = useState("");
  const [isEditingCaption, setIsEditingCaption] = useState(true);
  const [showLibraryPicker, setShowLibraryPicker] = useState(false);
  const [showGoogleDrivePicker, setShowGoogleDrivePicker] = useState(false);
  const [libraryAssets, setLibraryAssets] = useState<Array<{ id: string; name: string; url: string }>>([]);
  const [isUploading, setIsUploading] = useState(false);
  const { isLaunching: isLaunchingCampaign, lastResult, launch } = useLaunchCampaign();
  const [launchModalOpen, setLaunchModalOpen] = useState(false);
  const [isTestMode, setIsTestMode] = useState(false);
  const [showPayload, setShowPayload] = useState(false);
  const [platformConnections, setPlatformConnections] = useState<Record<string, boolean>>({});
  const [connectingPlatform, setConnectingPlatform] = useState<string | null>(null);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }
      setUser(user);
      fetchClients(user.id);
      fetchPlatformConnections(user.id);
    };
    getUser();
  }, [navigate]);

  // Check for OAuth callback
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const oauthSuccess = params.get("oauth_success");
    if (oauthSuccess) {
      toast({ title: `${oauthSuccess} connected! ✅` });
      setPlatformConnections(prev => ({ ...prev, [oauthSuccess]: true }));
      const url = new URL(window.location.href);
      url.searchParams.delete("oauth_success");
      window.history.replaceState({}, "", url.toString());
    }
    const oauthError = params.get("oauth_error");
    if (oauthError) {
      toast({ title: "Connection failed", description: oauthError, variant: "destructive" });
      const url = new URL(window.location.href);
      url.searchParams.delete("oauth_error");
      window.history.replaceState({}, "", url.toString());
    }
  }, []);

  const fetchPlatformConnections = async (userId: string) => {
    const { data } = await supabase
      .from("client_platform_connections")
      .select("platform")
      .eq("client_id", userId)
      .eq("status", "active");
    if (data) {
      const map: Record<string, boolean> = {};
      data.forEach(r => { map[r.platform] = true; });
      setPlatformConnections(map);
    }
  };

  const OAUTH_FUNCTION_MAP: Record<string, { functionName: string; urlKey: string }> = {
    linkedin: { functionName: "linkedin-oauth-initiate", urlKey: "auth_url" },
    tiktok: { functionName: "tiktok-auth-url", urlKey: "authUrl" },
    instagram: { functionName: "instagram-auth-url", urlKey: "url" },
    snapchat: { functionName: "snapchat-auth-url", urlKey: "authUrl" },
    threads: { functionName: "threads-auth-url", urlKey: "authUrl" },
  };

  const handleConnectPlatform = async (platformId: string) => {
    const oauthConfig = OAUTH_FUNCTION_MAP[platformId];
    if (oauthConfig) {
      setConnectingPlatform(platformId);
      try {
        const body = platformId === "linkedin"
          ? { redirect_uri: window.location.origin + window.location.pathname }
          : { returnTo: `${window.location.pathname}${window.location.search}`, originUrl: window.location.origin };
        const { data, error } = await supabase.functions.invoke(oauthConfig.functionName, { body });
        if (error) throw error;
        const authUrl = data?.[oauthConfig.urlKey];
        if (authUrl) {
          window.open(authUrl, '_blank', 'noopener,noreferrer');
          toast({ title: `Complete ${platformId} authorization in the new window` });
          setConnectingPlatform(null);
          return;
        }
        throw new Error("No auth URL returned");
      } catch (e: any) {
        toast({ title: "Connection failed", description: e.message, variant: "destructive" });
      }
      setConnectingPlatform(null);
      return;
    }
    // Mock connect for other platforms
    if (!user) return;
    setConnectingPlatform(platformId);
    const { error } = await supabase
      .from("client_platform_connections")
      .upsert({
        client_id: user.id,
        platform: platformId,
        access_token: `mock_token_${platformId}_${Date.now()}`,
        status: "active",
        connected_at: new Date().toISOString(),
      }, { onConflict: "client_id,platform" });
    if (!error) {
      setPlatformConnections(prev => ({ ...prev, [platformId]: true }));
      toast({ title: `${platformId} connected! ✅` });
    }
    setConnectingPlatform(null);
  };

  const handleDisconnectPlatform = async (platformId: string) => {
    if (!user) return;
    const { error } = await supabase
      .from("client_platform_connections")
      .delete()
      .eq("client_id", user.id)
      .eq("platform", platformId);
    if (!error) {
      setPlatformConnections(prev => {
        const next = { ...prev };
        delete next[platformId];
        return next;
      });
      toast({ title: `${platformId} disconnected` });
    } else {
      toast({ title: "Failed to disconnect", description: error.message, variant: "destructive" });
    }
  };

  // Pre-fill from generated post data
  useEffect(() => {
    if (generatedData) {
      if (generatedData.campaignName) setCampaignName(generatedData.campaignName);
      if (generatedData.postCaption) {
        setPostCaption(generatedData.postCaption);
        setCaptionDraft(generatedData.postCaption);
        setIsEditingCaption(false);
      }
      if (generatedData.tags && generatedData.tags.length > 0) setTags(generatedData.tags);
      if (generatedData.selectedPlatforms && generatedData.selectedPlatforms.length > 0) setSelectedPlatforms(generatedData.selectedPlatforms);
      if (generatedData.uploadedMediaUrls && generatedData.uploadedMediaUrls.length > 0) {
        setLibraryAssets(prev => {
          const existingUrls = new Set(prev.map(a => a.url));
          const incoming = generatedData.uploadedMediaUrls!.filter(a => !existingUrls.has(a.url));
          return [...prev, ...incoming].slice(0, 20);
        });
      } else if (generatedData.generatedImageUrl) {
        setLibraryAssets(prev => {
          if (prev.some(a => a.url === generatedData.generatedImageUrl)) return prev;
          return [...prev, { id: "generated-image", name: "Generated Image", url: generatedData.generatedImageUrl! }];
        });
      }
    }
  }, []);

  const fetchClients = async (userId: string) => {
    const { data, error } = await supabase
      .from("marketer_clients")
      .select("id, client_id, client_name")
      .eq("marketer_id", userId)
      .eq("status", "active");
    
    if (!error && data) {
      setClients(data);
    }
  };

  const handleSendForApproval = async () => {

    if (selectedPlatforms.length === 0) {
      toast({
        title: "Select platforms",
        description: "Please select at least one platform to post to",
        variant: "destructive",
      });
      return;
    }

    if (!scheduledDate) {
      toast({
        title: "Select date",
        description: "Please select a date for your post",
        variant: "destructive",
      });
      return;
    }

    if (!scheduledTime) {
      toast({
        title: "Select time",
        description: "Please select a time for your post",
        variant: "destructive",
      });
      return;
    }

    // Check if there are clients to send to
    if (clients.length === 0) {
      toast({
        title: "No clients available",
        description: "You need to add a client first before sending for approval.",
        variant: "destructive",
      });
      return;
    }

    setShowClientDialog(true);
  };

  const confirmSendForApproval = async () => {
    if (!user || !selectedClientId) return;

    setIsSendingForApproval(true);

    try {
      // First create the scheduled campaign with pending_approval status
      const { data: campaignData, error: campaignError } = await supabase
        .from("scheduled_campaigns")
        .insert({
          user_id: user.id,
          client_id: selectedClientId || user.id,
          campaign_name: campaignName.trim(),
          product: selectedProduct || null,
          links: links,
          tags: tags,
          platforms: selectedPlatforms,
          scheduled_date: format(scheduledDate!, "yyyy-MM-dd"),
          scheduled_time: scheduledTime,
          status: "pending_approval",
        })
        .select()
        .single();

      if (campaignError) throw campaignError;

      // Then create the approval request
      const { error: approvalError } = await supabase
        .from("campaign_approvals")
        .insert({
          scheduled_campaign_id: campaignData.id,
          marketer_id: user.id,
          client_id: selectedClientId,
          status: "pending",
        });

      if (approvalError) throw approvalError;

      toast({
        title: "Sent for Approval! 📩",
        description: `Your post "${campaignName}" has been sent for client approval.`,
      });

      setShowClientDialog(false);
      navigate("/campaigns/pending");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to send post for approval.",
        variant: "destructive",
      });
    } finally {
      setIsSendingForApproval(false);
    }
  };

  const handleAddLink = () => {
    if (newLink.trim() && isValidUrl(newLink.trim())) {
      setLinks([...links, newLink.trim()]);
      setNewLink("");
    } else {
      toast({
        title: "Invalid URL",
        description: "Please enter a valid URL",
        variant: "destructive",
      });
    }
  };

  const isValidUrl = (string: string) => {
    try {
      new URL(string);
      return true;
    } catch (_) {
      return false;
    }
  };

  const handleRemoveLink = (index: number) => {
    setLinks(links.filter((_, i) => i !== index));
  };

  const handleAddTag = () => {
    if (newTag.trim()) {
      setTags([...tags, newTag.trim()]);
      setNewTag("");
    }
  };

  const handleRemoveTag = (index: number) => {
    setTags(tags.filter((_, i) => i !== index));
  };

  const uploadFilesToLibrary = async (files: File[]) => {
    if (!user || files.length === 0) return;
    setIsUploading(true);
    try {
      for (const file of files) {
        const ext = file.name.split(".").pop() || "bin";
        const fileName = `${user.id}/${Date.now()}_${crypto.randomUUID()}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from("brand-assets")
          .upload(fileName, file, { contentType: file.type, cacheControl: "3600" });

        if (uploadError) {
          console.error("Upload failed:", uploadError);
          toast({ title: "Upload failed", description: `Could not upload ${file.name}: ${uploadError.message}`, variant: "destructive" });
          continue;
        }

        const { data: urlData } = supabase.storage.from("brand-assets").getPublicUrl(fileName);
        const publicUrl = urlData.publicUrl;

        const isVideo = file.type.startsWith("video/");
        const assetType = isVideo ? "video" : "image";

        const { data: assetRow, error: insertError } = await supabase
          .from("brand_assets")
          .insert({
            user_id: user.id,
            asset_type: assetType,
            name: file.name,
            value: publicUrl,
            metadata: { source: "campaign_upload", original_name: file.name, mime_type: file.type, size: file.size },
          })
          .select()
          .single();

        if (insertError) {
          console.error("Library save failed:", insertError);
          continue;
        }

        setLibraryAssets(prev => [...prev, { id: assetRow.id, name: file.name, url: publicUrl }].slice(0, 10));
      }
      toast({ title: "Uploaded! ✨", description: `${files.length} file(s) uploaded and saved to your library.` });
    } catch (err: any) {
      toast({ title: "Upload error", description: err.message, variant: "destructive" });
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      uploadFilesToLibrary(Array.from(files));
    }
    e.target.value = "";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files) {
      uploadFilesToLibrary(Array.from(files));
    }
  };

  const handleRemoveFile = (index: number) => {
    setUploadedFiles(uploadedFiles.filter((_, i) => i !== index));
  };

  const togglePlatform = (platformId: string) => {
    if (selectedPlatforms.includes(platformId)) {
      setSelectedPlatforms(selectedPlatforms.filter(p => p !== platformId));
    } else {
      setSelectedPlatforms([...selectedPlatforms, platformId]);
    }
  };

  const validateBasics = (requireSchedule: boolean) => {
    if (!campaignName.trim()) {
      toast({ title: "Post name required", description: "Please enter a post name", variant: "destructive" });
      return false;
    }
    if (selectedPlatforms.length === 0) {
      toast({ title: "Select platforms", description: "Please select at least one platform to post to", variant: "destructive" });
      return false;
    }
    const unconnected = selectedPlatforms.filter(p => !platformConnections[p]);
    if (unconnected.length > 0) {
      toast({ title: "Platforms not connected", description: `Please connect ${unconnected.join(", ")} first using the Connect button above.`, variant: "destructive" });
      return false;
    }
    if (requireSchedule && !scheduledDate) {
      toast({ title: "Select date", description: "Please select a date for your post", variant: "destructive" });
      return false;
    }
    if (requireSchedule && !scheduledTime) {
      toast({ title: "Select time", description: "Please select a time for your post", variant: "destructive" });
      return false;
    }
    if (selectedPlatforms.includes("instagram") && libraryAssets.length === 0) {
      toast({
        title: "Image required for Instagram",
        description: "Instagram posts must include an image or video. Please upload media before posting.",
        variant: "destructive",
      });
      return false;
    }
    return true;
  };

  const splitMedia = () => {
    const videoAsset = libraryAssets.find(a => {
      const ext = a.url.split('.').pop()?.toLowerCase() || '';
      return ['mp4', 'mov', 'webm', 'avi'].includes(ext) || a.name.match(/\.(mp4|mov|webm|avi)$/i);
    });
    const imageAssets = libraryAssets.filter(a => a !== videoAsset);
    return { videoAsset, imageAssets };
  };

  const isVideoAsset = (asset: { name: string; url: string }) => {
    const ext = asset.url.split('.').pop()?.toLowerCase() || '';
    return ['mp4', 'mov', 'webm', 'avi', 'm4v'].includes(ext) || /\.(mp4|mov|webm|avi|m4v)$/i.test(asset.name);
  };

  const handleSchedulePost = async () => {
    if (!validateBasics(true)) return;
    if (!user) return;

    setIsLaunching(true);
    const { videoAsset, imageAssets } = splitMedia();
    const effectiveClientId = getEffectiveUserId();
    const effectiveName = campaignName.trim() || `Post ${format(new Date(), "PPp")}`;

    const { error } = await supabase.from("scheduled_campaigns").insert({
      user_id: user.id,
      client_id: effectiveClientId || user.id,
      campaign_name: effectiveName,
      product: selectedProduct || null,
      links: links,
      tags: tags,
      platforms: selectedPlatforms,
      scheduled_date: format(scheduledDate!, "yyyy-MM-dd"),
      scheduled_time: scheduledTime,
      status: "scheduled",
      video_url: videoAsset?.url || null,
      image_url: imageAssets[0]?.url || null,
      media_urls: libraryAssets.map(a => a.url),
      post_caption: postCaption || effectiveName,
    });

    setIsLaunching(false);

    if (error) {
      toast({ title: "Error", description: "Failed to schedule post. Please try again.", variant: "destructive" });
      return;
    }

    toast({
      title: "Post Scheduled! 🗓️",
      description: `"${effectiveName}" will publish on ${format(scheduledDate!, "PPP")} at ${scheduledTime}`,
    });
    navigate("/campaigns/schedule");
  };

  const handlePostNow = async () => {
    if (!validateBasics(false)) return;
    if (!user) return;

    setIsLaunching(true);
    const { videoAsset, imageAssets } = splitMedia();
    const effectiveClientId = getEffectiveUserId();
    const fallbackName = campaignName.trim() || `Post ${format(new Date(), "PPp")}`;
    const contentToPost = postCaption || campaignName.trim() || "";

    const { data: campaignRow } = await supabase.from("scheduled_campaigns").insert({
      user_id: user.id,
      client_id: effectiveClientId || user.id,
      campaign_name: fallbackName,
      product: selectedProduct || null,
      links: links,
      tags: tags,
      platforms: selectedPlatforms,
      scheduled_date: format(new Date(), "yyyy-MM-dd"),
      scheduled_time: format(new Date(), "HH:mm:ss"),
      status: "publishing",
      video_url: videoAsset?.url || null,
      image_url: imageAssets[0]?.url || null,
      media_urls: libraryAssets.map(a => a.url),
      post_caption: contentToPost,
    }).select().single();

    const postResults: { platform: string; success: boolean; permalink?: string; error?: string }[] = [];
    for (const platformId of selectedPlatforms) {
      try {
        const { data, error: fnError } = await supabase.functions.invoke("post-to-platform", {
          body: {
            platform: platformId,
            content: contentToPost,
            imageUrl: imageAssets[0]?.url || null,
            videoUrl: videoAsset?.url || null,
          },
        });
        if (fnError) {
          postResults.push({ platform: platformId, success: false, error: fnError.message });
        } else if (data?.success) {
          postResults.push({ platform: platformId, success: true, permalink: data.permalink });
        } else {
          postResults.push({ platform: platformId, success: false, error: data?.error || "Unknown error" });
        }
      } catch (e: any) {
        postResults.push({ platform: platformId, success: false, error: e.message });
      }
    }

    const succeeded = postResults.filter(r => r.success);
    const failed = postResults.filter(r => !r.success);

    if (campaignRow?.id) {
      const firstPermalink = succeeded.find(r => r.permalink)?.permalink || null;
      await supabase
        .from("scheduled_campaigns")
        .update({
          status: failed.length === 0 ? "published" : succeeded.length > 0 ? "partial" : "failed",
          permalink: firstPermalink,
        })
        .eq("id", campaignRow.id);
    }

    if (succeeded.length > 0) {
      const linkedinResult = succeeded.find(r => r.platform === "linkedin");
      toast({
        title: "Posted! 🚀",
        description: (
          <div className="space-y-1">
            <p>Posted to {succeeded.map(r => r.platform).join(", ")}!</p>
            {linkedinResult?.permalink && (
              <a href={linkedinResult.permalink} target="_blank" rel="noopener noreferrer" className="text-primary underline text-xs">
                View LinkedIn post →
              </a>
            )}
          </div>
        ),
      });
    }
    if (failed.length > 0) {
      toast({
        title: "Some platforms failed",
        description: failed.map(r => `${r.platform}: ${r.error}`).join("; "),
        variant: "destructive",
      });
    }

    setIsLaunching(false);
    if (succeeded.length > 0) navigate("/campaigns/schedule");
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader user={user} />
      
      <main className="container mx-auto px-4 py-8 max-w-3xl">
        <Button 
          variant="ghost" 
          onClick={() => navigate("/campaigns/generate")}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Post Generator
        </Button>

        <div className="mb-8">
          <h1 className="text-3xl font-bold">Prepare for Launch</h1>
        </div>

        <div className="space-y-8">
          {/* Post Name */}
          <div className="space-y-2">
            <Label htmlFor="campaignName">
              Post Name <span className="text-muted-foreground font-normal">(optional)</span>
            </Label>
            <Input
              id="campaignName"
              placeholder="Enter post name (optional)"
              value={campaignName}
              onChange={(e) => setCampaignName(e.target.value)}
            />
          </div>



          {/* Add Links */}
          <div className="space-y-2">
            <Label>Add Links</Label>
            <p className="text-sm text-muted-foreground">Paste URLs that will appear in the post description</p>
            <div className="flex gap-2">
              <Input
                placeholder="Paste URL here (e.g., https://example.com)"
                value={newLink}
                onChange={(e) => setNewLink(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleAddLink()}
              />
              <Button onClick={handleAddLink} className="shrink-0">
                <Plus className="mr-2 h-4 w-4" />
                Add
              </Button>
            </div>
            {links.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {links.map((link, index) => (
                  <div key={index} className="flex items-center gap-1 bg-secondary px-3 py-1 rounded-full text-sm">
                    <span className="max-w-[200px] truncate">{link}</span>
                    <button onClick={() => handleRemoveLink(index)} className="hover:text-destructive">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Post Caption */}
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="postCaption">Post Caption (Text Above Image)</Label>
              {!isEditingCaption && postCaption && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setCaptionDraft(postCaption);
                    setIsEditingCaption(true);
                  }}
                >
                  Edit
                </Button>
              )}
            </div>
            {isEditingCaption ? (
              <>
                <Textarea
                  id="postCaption"
                  placeholder="Write your post caption here..."
                  value={captionDraft}
                  onChange={(e) => setCaptionDraft(e.target.value)}
                  rows={4}
                />
                <div className="flex gap-2">
                  <Button
                    type="button"
                    onClick={() => {
                      setPostCaption(captionDraft.trim());
                      setIsEditingCaption(false);
                      toast({ title: postCaption ? "Caption updated" : "Caption added", description: "Shown in the platform preview below." });
                    }}
                    disabled={!captionDraft.trim()}
                  >
                    {postCaption ? "Save" : "Add"} Caption
                  </Button>
                  {postCaption && (
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => {
                        setCaptionDraft(postCaption);
                        setIsEditingCaption(false);
                      }}
                    >
                      Cancel
                    </Button>
                  )}
                </div>
              </>
            ) : (
              <div className="rounded-md border bg-muted/30 p-3 text-sm whitespace-pre-wrap">
                {postCaption}
              </div>
            )}
          </div>



          {/* Attached media preview (from previous page) */}
          {libraryAssets.length > 0 && (
            <div className="space-y-2">
              <Label>Attached Media ({libraryAssets.length})</Label>
              <div className="flex flex-wrap gap-2">
                {libraryAssets.map((asset) => {
                  const isVideo = /\.(mp4|webm|mov|m4v)(\?|$)/i.test(asset.url);
                  return (
                    <div key={asset.id} className="relative group">
                      {isVideo ? (
                        <video
                          src={asset.url}
                          className="w-16 h-16 rounded-lg object-cover border bg-muted"
                          muted
                        />
                      ) : (
                        <img
                          src={asset.url}
                          alt={asset.name}
                          className="w-16 h-16 rounded-lg object-cover border"
                          onError={(e) => { e.currentTarget.src = "/placeholder.svg"; }}
                        />
                      )}
                      <button
                        type="button"
                        onClick={() =>
                          setLibraryAssets(prev => prev.filter(a => a.id !== asset.id))
                        }
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center shadow opacity-0 group-hover:opacity-100 transition-opacity"
                        aria-label={`Remove ${asset.name}`}
                        title="Remove"
                      >
                        <X className="w-3 h-3" />
                      </button>
                      {isVideo && (
                        <div className="absolute bottom-0 left-0 px-1 py-0.5 bg-black/60 text-white text-[9px] rounded-tr-md uppercase pointer-events-none">
                          video
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          {/* Tags & Keywords */}
          <div className="space-y-2">
            <Label>Tags & Keywords</Label>
            <div className="flex gap-2">
              <Input
                placeholder="Add relevant keywords or hashtags"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleAddTag()}
              />
              <Button variant="outline" onClick={handleAddTag} className="shrink-0">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {tags.map((tag, index) => (
                  <div key={index} className="flex items-center gap-1 bg-primary/10 text-primary px-3 py-1 rounded-full text-sm">
                    <span>#{tag}</span>
                    <button onClick={() => handleRemoveTag(index)} className="hover:text-destructive">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Platform Preview */}
          {selectedPlatforms.length > 0 && (
            <div className="space-y-4">
              <Label>Platform Previews</Label>
              <p className="text-sm text-muted-foreground">How your post will appear on each selected platform</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {selectedPlatforms.map((platformId) => {
                  const platform = socialPlatforms.find(p => p.id === platformId);
                  if (!platform) return null;
                  const previewAsset = libraryAssets[0];
                  const previewImage = previewAsset?.url || generatedData?.generatedImageUrl;
                  const previewIsVideo = previewAsset ? isVideoAsset(previewAsset) : false;

                  // Platform-specific aspect ratios and dimensions
                  const platformSpecs: Record<string, { aspect: string; dimensions: string }> = {
                    instagram: { aspect: "aspect-square", dimensions: "1080 × 1080" },
                    facebook: { aspect: "aspect-video", dimensions: "1200 × 630" },
                    twitter: { aspect: "aspect-video", dimensions: "1600 × 900" },
                    linkedin: { aspect: "aspect-[1.91/1]", dimensions: "1200 × 627" },
                    tiktok: { aspect: "aspect-[9/16]", dimensions: "1080 × 1920" },
                    youtube: { aspect: "aspect-video", dimensions: "1280 × 720" },
                    snapchat: { aspect: "aspect-[9/16]", dimensions: "1080 × 1920" },
                    threads: { aspect: "aspect-square", dimensions: "1080 × 1080" },
                  };
                  const spec = platformSpecs[platformId] || { aspect: "aspect-square", dimensions: "1080 × 1080" };

                  return (
                    <Card key={platformId} className="overflow-hidden">
                      {/* Platform header */}
                      <div className={`${platform.color} px-4 py-2.5 flex items-center justify-between`}>
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 flex items-center justify-center">
                            <img 
                              src={platform.icon} 
                              alt={platform.name}
                              className="w-full h-full object-contain"
                            />
                          </div>
                          <span className="text-white text-sm font-medium">{platform.name}</span>
                        </div>
                        <span className="text-white/70 text-[10px] font-mono">{spec.dimensions}</span>
                      </div>
                      {/* Preview body */}
                      <div className="p-4 space-y-3">
                        {postCaption && (
                          <p className="text-sm text-foreground whitespace-pre-wrap">{postCaption}</p>
                        )}
                        {previewImage && (
                          <div className={`${spec.aspect} rounded-lg overflow-hidden bg-muted ${["tiktok", "snapchat"].includes(platformId) ? "max-h-[300px]" : ""}`}>
                            {previewIsVideo ? (
                              <video src={previewImage} className="w-full h-full object-cover" controls muted playsInline />
                            ) : (
                              <img src={previewImage} alt="Post preview" className="w-full h-full object-cover" />
                            )}
                          </div>
                        )}
                        {tags.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {tags.map((tag, i) => (
                              <span key={i} className="text-xs text-primary">#{tag}</span>
                            ))}
                          </div>
                        )}
                        {!previewImage && !postCaption && (
                          <div className={`${spec.aspect} rounded-lg bg-muted flex items-center justify-center ${["tiktok", "snapchat"].includes(platformId) ? "max-h-[300px]" : ""}`}>
                            <span className="text-sm text-muted-foreground">No content preview available</span>
                          </div>
                        )}
                        {/* Per-platform upload control */}
                        {(() => {
                          const requiresMedia = ["instagram", "tiktok", "snapchat", "youtube"].includes(platformId);
                          const missingRequired = requiresMedia && !previewImage;
                          const inputId = `media-upload-${platformId}`;
                          return (
                            <div
                              className={`rounded-lg border-2 border-dashed p-3 space-y-2 ${
                                missingRequired
                                  ? "border-amber-400 bg-amber-50 dark:bg-amber-950/20"
                                  : "border-border bg-muted/30"
                              }`}
                            >
                              {missingRequired ? (
                                <>
                                  <p className="text-xs font-medium text-amber-900 dark:text-amber-200">
                                    ⚠️ {platform.name} requires an image or video
                                  </p>
                                  <p className="text-[11px] text-amber-700 dark:text-amber-300">
                                    Text-only posts can't be published to {platform.name}. Upload media to continue.
                                  </p>
                                </>
                              ) : (
                                <p className="text-[11px] text-muted-foreground">
                                  {previewImage ? `Add or replace media for ${platform.name}` : `Upload an image or video for ${platform.name}`}
                                </p>
                              )}
                              <label htmlFor={inputId} className="block">
                                <input
                                  id={inputId}
                                  type="file"
                                  accept="image/*,video/*"
                                  multiple
                                  className="hidden"
                                  onChange={handleFileUpload}
                                />
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  disabled={isUploading}
                                  className={`w-full gap-2 ${
                                    missingRequired
                                      ? "border-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/40"
                                      : ""
                                  }`}
                                  asChild
                                >
                                  <span className="cursor-pointer">
                                    {isUploading ? (
                                      <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Uploading…</>
                                    ) : (
                                      <><Upload className="h-3.5 w-3.5" /> {previewImage ? "Replace media" : "Upload image or video"}</>
                                    )}
                                  </span>
                                </Button>
                              </label>
                            </div>
                          );
                        })()}
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {/* Platform selection — always available so users can switch/add platforms */}
          {(
            <div className="space-y-4">
              <Label>Select Platforms to Post</Label>
              <p className="text-sm text-muted-foreground">Choose one or multiple platforms to launch your post. Click to toggle.</p>
              <div className="grid grid-cols-6 gap-2">
                {socialPlatforms.map((platform) => (
                  <Card
                    key={platform.id}
                    className={`p-2 cursor-pointer transition-all duration-200 hover:scale-105 ${
                      selectedPlatforms.includes(platform.id)
                        ? "ring-2 ring-primary border-primary bg-primary/5"
                        : "hover:border-primary/50"
                    }`}
                    onClick={() => togglePlatform(platform.id)}
                  >
                    <div className="flex flex-col items-center gap-2">
                      <div className={`w-12 h-12 rounded-xl ${platform.color} flex items-center justify-center ${platform.id === "linkedin" ? "p-0" : "p-2.5"}`}>
                        <img 
                          src={platform.icon} 
                          alt={platform.name}
                          className={platform.id === "linkedin" ? "w-11 h-11 rounded-lg object-contain" : "w-full h-full object-contain"}
                        />
                      </div>
                      <span className="text-sm font-medium text-center">{platform.name}</span>
                      {selectedPlatforms.includes(platform.id) && (
                        <div className="w-2 h-2 rounded-full bg-primary" />
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}



          {/* Schedule Date & Time */}
          <div className="space-y-4">
            <Label>Schedule Post</Label>
            <p className="text-sm text-muted-foreground">Choose when to launch your post</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Date Picker */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !scheduledDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {scheduledDate ? format(scheduledDate, "PPP") : "Select date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={scheduledDate}
                      onSelect={setScheduledDate}
                      disabled={(date) => {
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        return date < today;
                      }}
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Time Picker */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Time</Label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="e.g. 9:30"
                      className="pl-9"
                      value={scheduledTime.replace(/ (AM|PM)$/, "")}
                      onChange={(e) => {
                        let val = e.target.value.replace(/[^0-9:]/g, "");
                        // Auto-insert colon after hour digits
                        if (val.length === 2 && !val.includes(":")) val += ":";
                        if (val.length > 5) val = val.slice(0, 5);
                        const period = scheduledTime.includes("PM") ? "PM" : "AM";
                        setScheduledTime(val ? `${val} ${period}` : "");
                      }}
                    />
                  </div>
                  <div className="flex rounded-lg border overflow-hidden">
                    <button
                      type="button"
                      className={cn(
                        "px-3 py-2 text-sm font-medium transition-colors",
                        (!scheduledTime || scheduledTime.includes("AM"))
                          ? "bg-primary text-primary-foreground"
                          : "bg-background text-muted-foreground hover:bg-muted"
                      )}
                      onClick={() => setScheduledTime(prev => prev.replace(/ PM$/, " AM") || "")}
                    >
                      AM
                    </button>
                    <button
                      type="button"
                      className={cn(
                        "px-3 py-2 text-sm font-medium transition-colors",
                        scheduledTime.includes("PM")
                          ? "bg-primary text-primary-foreground"
                          : "bg-background text-muted-foreground hover:bg-muted"
                      )}
                      onClick={() => setScheduledTime(prev => {
                        if (!prev) return "";
                        return prev.includes("AM") ? prev.replace(" AM", " PM") : prev.replace(/ PM$/, " PM");
                      })}
                    >
                      PM
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-4 space-y-3">
            <Button
              size="lg"
              variant="outline"
              className="w-full border-amber-500 text-amber-500 hover:bg-amber-500/10"
              onClick={handleSendForApproval}
              disabled={isSendingForApproval}
            >
              {isSendingForApproval ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-5 w-5" />
                  Send for Approval
                </>
              )}
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="w-full"
              onClick={handlePostNow}
              disabled={isLaunching || (selectedPlatforms.includes("instagram") && libraryAssets.length === 0)}
            >
              {isLaunching ? (
                <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Posting...</>
              ) : (
                <><Send className="mr-2 h-5 w-5" /> Post Now</>
              )}
            </Button>
            <Button
              size="lg"
              className="w-full"
              onClick={handleSchedulePost}
              disabled={isLaunching || (selectedPlatforms.includes("instagram") && libraryAssets.length === 0)}
            >
              {isLaunching ? (
                <>Scheduling...</>
              ) : (
                <><CalendarIcon className="mr-2 h-5 w-5" /> Schedule for Later</>
              )}
            </Button>
          </div>
          {selectedPlatforms.includes("instagram") && libraryAssets.length === 0 && (
            <div className="mt-3 rounded-lg border border-amber-400 bg-amber-50 dark:bg-amber-950/20 px-4 py-3 text-sm text-amber-900 dark:text-amber-200">
              ⚠️ Instagram requires an image or video. Upload media in the Instagram preview above to enable scheduling.
            </div>
          )}
        </div>

        {/* Draft Picker */}
        <CampaignDraftPicker
          open={showDraftPicker}
          onOpenChange={setShowDraftPicker}
          onSelectDraft={(draft: CampaignDraft) => {
            if (draft.campaign_idea) setCampaignName(draft.campaign_idea);
            if (draft.post_caption) setPostCaption(draft.post_caption);
            if (draft.tags && draft.tags.length > 0) setTags(draft.tags);
            toast({
              title: "Draft loaded! ✨",
              description: "Post fields have been populated from your draft.",
            });
          }}
        />

        {/* Client Selection Dialog */}
        <Dialog open={showClientDialog} onOpenChange={setShowClientDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Send for Client Approval</DialogTitle>
              <DialogDescription>
                Select which client should review and approve this post.
              </DialogDescription>
            </DialogHeader>
            
            <div className="py-4">
              <Label>Select Client</Label>
              <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Choose a client..." />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.client_id}>
                      {client.client_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowClientDialog(false)}>
                Cancel
              </Button>
              <Button 
                onClick={confirmSendForApproval}
                disabled={!selectedClientId || isSendingForApproval}
                className="bg-amber-500 hover:bg-amber-600"
              >
                {isSendingForApproval ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Send className="mr-2 h-4 w-4" />
                )}
                Send for Approval
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>

      {/* Launch Post Dialog */}
      <Dialog open={launchModalOpen} onOpenChange={setLaunchModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {isTestMode ? <FlaskConical className="w-5 h-5" /> : <Rocket className="w-5 h-5" />}
              {isTestMode ? "Test Post Launch" : "Launch Post"}
            </DialogTitle>
            <DialogDescription>
              {isTestMode
                ? "Generate a test post context payload and inspect the result."
                : "Build and process the full post context through the KLYC orchestrator."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2 flex-1 overflow-auto">
            <Button
              className="w-full gap-2"
              disabled={isLaunchingCampaign}
              onClick={async () => {
                await launch(undefined, isTestMode);
                if (!isTestMode) setLaunchModalOpen(false);
              }}
            >
              {isLaunchingCampaign ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {isTestMode ? "Generating..." : "Launching..."}
                </>
              ) : (
                <>
                  {isTestMode ? <FlaskConical className="w-4 h-4" /> : <Rocket className="w-4 h-4" />}
                  {isTestMode ? "Generate Test Payload" : "Launch Now"}
                </>
              )}
            </Button>

            {isTestMode && lastResult?.campaignContext && (
              <div className="space-y-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1 text-xs"
                  onClick={() => setShowPayload(!showPayload)}
                >
                  {showPayload ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  {showPayload ? "Hide" : "Show"} Full Payload
                </Button>
                {showPayload && (
                  <ScrollArea className="h-[300px] rounded border border-border">
                    <pre className="p-3 text-[10px] leading-tight font-mono text-foreground">
                      {JSON.stringify(lastResult.campaignContext, null, 2)}
                    </pre>
                  </ScrollArea>
                )}
              </div>
            )}

            {lastResult?.error && (
              <p className="text-sm text-destructive">{lastResult.error}</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default NewCampaign;
