import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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
import { ArrowLeft, Plus, Upload, X, Rocket, CalendarIcon, Clock, Send, Loader2, FileText, FolderOpen, FlaskConical, ChevronDown, ChevronUp } from "lucide-react";
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
  { id: "instagram", name: "Instagram", icon: "https://cdn.simpleicons.org/instagram/FFFFFF", color: "bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400" },
  { id: "facebook", name: "Facebook", icon: "https://cdn.simpleicons.org/facebook/FFFFFF", color: "bg-[#1877F2]" },
  { id: "twitter", name: "X (Twitter)", icon: "https://cdn.simpleicons.org/x/FFFFFF", color: "bg-neutral-900" },
  { id: "linkedin", name: "LinkedIn", icon: linkedinLogo, color: "bg-transparent" },
  { id: "tiktok", name: "TikTok", icon: "https://cdn.simpleicons.org/tiktok/FFFFFF", color: "bg-neutral-900" },
  { id: "youtube", name: "YouTube", icon: "https://cdn.simpleicons.org/youtube/FFFFFF", color: "bg-[#FF0000]" },
  { id: "snapchat", name: "Snapchat", icon: snapchatLogo, color: "bg-transparent" },
  { id: "threads", name: "Threads", icon: "https://cdn.simpleicons.org/threads/FFFFFF", color: "bg-neutral-900" },
];

// No more timeSlots array needed

const NewCampaign = () => {
  const navigate = useNavigate();
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
  const [showLibraryPicker, setShowLibraryPicker] = useState(false);
  const [showGoogleDrivePicker, setShowGoogleDrivePicker] = useState(false);
  const [libraryAssets, setLibraryAssets] = useState<Array<{ id: string; name: string; url: string }>>([]);
  const [isUploading, setIsUploading] = useState(false);
  const { isLaunching: isLaunchingCampaign, lastResult, launch } = useLaunchCampaign();
  const [launchModalOpen, setLaunchModalOpen] = useState(false);
  const [isTestMode, setIsTestMode] = useState(false);
  const [showPayload, setShowPayload] = useState(false);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }
      setUser(user);
      fetchClients(user.id);
    };
    getUser();
  }, [navigate]);

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
    if (!campaignName.trim()) {
      toast({
        title: "Post name required",
        description: "Please enter a post name",
        variant: "destructive",
      });
      return;
    }

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

  const handleLaunchCampaign = async () => {
    if (!campaignName.trim()) {
      toast({
        title: "Post name required",
        description: "Please enter a post name",
        variant: "destructive",
      });
      return;
    }

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

    if (!user) return;

    setIsLaunching(true);
    
    // Separate video and image URLs from library assets
    const videoAsset = libraryAssets.find(a => {
      const ext = a.url.split('.').pop()?.toLowerCase() || '';
      return ['mp4', 'mov', 'webm', 'avi'].includes(ext) || a.name.match(/\.(mp4|mov|webm|avi)$/i);
    });
    const imageAssets = libraryAssets.filter(a => a !== videoAsset);

    const effectiveClientId = getEffectiveUserId();
    const { error } = await supabase.from("scheduled_campaigns").insert({
      user_id: user.id,
      client_id: effectiveClientId || user.id,
      campaign_name: campaignName.trim(),
      product: selectedProduct || null,
      links: links,
      tags: tags,
      platforms: selectedPlatforms,
      scheduled_date: format(scheduledDate, "yyyy-MM-dd"),
      scheduled_time: scheduledTime,
      status: "scheduled",
      video_url: videoAsset?.url || null,
      image_url: imageAssets[0]?.url || null,
      media_urls: libraryAssets.map(a => a.url),
      post_caption: postCaption || campaignName.trim(),
    });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to schedule post. Please try again.",
        variant: "destructive",
      });
      setIsLaunching(false);
      return;
    }
    
    toast({
      title: "Post Scheduled! 🚀",
      description: `Your post "${campaignName}" has been scheduled for ${format(scheduledDate, "PPP")} at ${scheduledTime}`,
    });
    
    setIsLaunching(false);
    navigate("/campaigns/schedule");
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader user={user} />
      
      <main className="container mx-auto px-4 py-8 max-w-3xl">
        <Button 
          variant="ghost" 
          onClick={() => navigate("/campaigns")}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Posts
        </Button>

        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold">Create New Post</h1>
          <div className="flex gap-2">
            <Button
              className="gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:opacity-90"
              onClick={() => { setIsTestMode(false); setLaunchModalOpen(true); }}
            >
              <Rocket className="w-4 h-4" />
              Launch Post
            </Button>
            <Button
              variant="outline"
              className="gap-2 border-muted-foreground/30"
              onClick={() => { setIsTestMode(true); setLaunchModalOpen(true); }}
            >
              <FlaskConical className="w-4 h-4" />
              Test Launch
            </Button>
            <Button
              variant="outline"
              className="gap-2 border-purple-500 text-purple-500 hover:bg-purple-500/10"
              onClick={() => setShowDraftPicker(true)}
            >
              <FileText className="w-4 h-4" />
              Use Draft
            </Button>
          </div>
        </div>

        <div className="space-y-8">
          {/* Post Name */}
          <div className="space-y-2">
            <Label htmlFor="campaignName">Post Name</Label>
            <Input
              id="campaignName"
              placeholder="Enter post name"
              value={campaignName}
              onChange={(e) => setCampaignName(e.target.value)}
            />
          </div>

          {/* Select Product */}
          <div className="space-y-2">
            <Label>Select Product</Label>
            <Select value={selectedProduct} onValueChange={setSelectedProduct}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a product" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="product1">Product 1</SelectItem>
                <SelectItem value="product2">Product 2</SelectItem>
                <SelectItem value="product3">Product 3</SelectItem>
              </SelectContent>
            </Select>
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
            <Label htmlFor="postCaption">Post Caption (Text Above Image)</Label>
            <Textarea
              id="postCaption"
              placeholder="Write your post caption here..."
              value={postCaption}
              onChange={(e) => setPostCaption(e.target.value)}
              rows={4}
            />
          </div>



          {/* Add from Content Library */}
          <div className="space-y-2">
            <Label className="text-base font-semibold">Add from Content Library</Label>
            <p className="text-sm text-muted-foreground">Select images and videos from your sources ({libraryAssets.length}/10)</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Upload from device */}
              <div
                className="border-2 border-dashed border-primary/40 rounded-xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-primary/70 hover:bg-primary/5 transition-all"
                onClick={() => !isUploading && document.getElementById("libraryFileInput")?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
              >
                {isUploading ? (
                  <Loader2 className="w-7 h-7 text-muted-foreground animate-spin" />
                ) : (
                  <Upload className="w-7 h-7 text-muted-foreground" />
                )}
                <span className="font-medium text-sm">{isUploading ? "Uploading..." : "Upload"}</span>
                <span className="text-xs text-muted-foreground">From device</span>
                <input
                  id="libraryFileInput"
                  type="file"
                  multiple
                  className="hidden"
                  accept="image/*,video/*,.pdf,.doc,.docx"
                  onChange={handleFileUpload}
                />
              </div>

              {/* Google Drive */}
              <div
                className="border rounded-xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-primary/50 hover:bg-muted/50 transition-all"
                onClick={() => setShowGoogleDrivePicker(true)}
              >
                <GoogleDriveIcon className="w-7 h-7" />
                <span className="font-medium text-sm">Google Drive</span>
                <span className="text-xs text-muted-foreground">Select files</span>
              </div>

              {/* Klyc Library */}
              <div
                className="border rounded-xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-primary/50 hover:bg-muted/50 transition-all"
                onClick={() => setShowLibraryPicker(true)}
              >
                <FolderOpen className="w-7 h-7 text-primary" />
                <span className="font-medium text-sm">Klyc Library</span>
                <span className="text-xs text-muted-foreground">Your assets</span>
              </div>
            </div>

            {/* Selected library assets */}
            {libraryAssets.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {libraryAssets.map((asset, index) => (
                  <div key={asset.id} className="relative group">
                    <img
                      src={asset.url}
                      alt={asset.name}
                      className="w-16 h-16 rounded-lg object-cover border"
                      onError={(e) => { e.currentTarget.src = "/placeholder.svg"; }}
                    />
                    <button
                      onClick={() => setLibraryAssets(prev => prev.filter(a => a.id !== asset.id))}
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Library Picker Modal */}
          <LibraryAssetPicker
            open={showLibraryPicker}
            onOpenChange={setShowLibraryPicker}
            onAssetsSelected={(assets) => {
              setLibraryAssets(prev => {
                const existing = new Set(prev.map(a => a.id));
                const newOnes = assets.filter(a => !existing.has(a.id));
                return [...prev, ...newOnes].slice(0, 10);
              });
            }}
            maxSelection={10}
            assetTypeFilter="all"
          />

          {/* Google Drive Picker */}
          <GoogleDriveFilePicker
            open={showGoogleDrivePicker}
            onOpenChange={setShowGoogleDrivePicker}
            selectionMode="select"
            onFilesSelected={(files) => {
              const mapped = files.map(f => ({ id: f.id, name: f.name, url: f.thumbnailUrl || f.path || "" }));
              setLibraryAssets(prev => {
                const existing = new Set(prev.map(a => a.id));
                const newOnes = mapped.filter(a => !existing.has(a.id));
                return [...prev, ...newOnes].slice(0, 10);
              });
            }}
          />

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

          {/* Platform Selection */}
          <div className="space-y-4">
            <Label>Select Platforms to Post</Label>
            <p className="text-sm text-muted-foreground">Choose one or multiple platforms to launch your post</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {socialPlatforms.map((platform) => (
                <Card
                  key={platform.id}
                  className={`p-4 cursor-pointer transition-all duration-200 hover:scale-105 ${
                    selectedPlatforms.includes(platform.id)
                      ? "ring-2 ring-primary border-primary bg-primary/5"
                      : "hover:border-primary/50"
                  }`}
                  onClick={() => togglePlatform(platform.id)}
                >
                  <div className="flex flex-col items-center gap-2">
                    <div className={`w-12 h-12 rounded-xl ${platform.color} flex items-center justify-center ${["linkedin", "snapchat"].includes(platform.id) ? "p-0" : "p-2.5"}`}>
                      <img 
                        src={platform.icon} 
                        alt={platform.name}
                        className={platform.id === "linkedin" ? "w-11 h-11 rounded-lg object-contain" : platform.id === "snapchat" ? "w-14 h-14 rounded-lg object-contain" : "w-full h-full object-contain"}
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
            {selectedPlatforms.length > 0 && (
              <p className="text-sm text-muted-foreground">
                {selectedPlatforms.length} platform{selectedPlatforms.length > 1 ? "s" : ""} selected
              </p>
            )}
          </div>

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
              className="w-full"
              onClick={handleLaunchCampaign}
              disabled={isLaunching}
            >
              {isLaunching ? (
                <>Scheduling Post...</>
              ) : (
                <>
                  <Rocket className="mr-2 h-5 w-5" />
                  Launch Post
                </>
              )}
            </Button>
          </div>
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
