import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AppHeader from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Music, Image, FileText, Sparkles, Copy, Check, X, FileStack, Loader2, Wand2, Download, Upload, ImageIcon, FolderOpen, RefreshCw, Volume2, Square, Mic, Trophy, TrendingUp, ExternalLink, Zap, Rocket } from "lucide-react";
import ElevenLabsIcon from "@/components/icons/ElevenLabsIcon";
import { useToast } from "@/hooks/use-toast";
import type { User } from "@supabase/supabase-js";
import ImageSourcePicker from "@/components/ImageSourcePicker";
import { useClientContext } from "@/contexts/ClientContext";
import linkedinLogo from "@/assets/linkedin-logo.png";
import snapchatLogo from "@/assets/snapchat-logo.png";

interface Product {
  id: string;
  name: string;
}

const voices = [
  { id: "JBFqnCBsd6RMkjVDRZzb", name: "George", desc: "British, warm" },
  { id: "EXAVITQu4vr4xnSDxMaL", name: "Sarah", desc: "American, soft" },
  { id: "TX3LPaxmHKxFdv7VOQHJ", name: "Liam", desc: "American, young" },
  { id: "pFZP5JQG7iQjIQuC4Bku", name: "Lily", desc: "British, narration" },
  { id: "nPczCjzI2devNBz1zQrb", name: "Brian", desc: "American, deep" },
  { id: "onwK4e9ZLuTAKqWW03F9", name: "Daniel", desc: "British, authoritative" },
];

const contentTypes = [
  { id: "social-video", label: "Social Video", icon: Music },
  { id: "visual-post", label: "Image Post", icon: Image },
  { id: "written", label: "Written", icon: FileText },
];

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

// Campaign Strategy Component (shared between content types)
const CampaignStrategy = ({ 
  tags, 
  removeTag, 
  newTag, 
  setNewTag, 
  addTag,
  campaignGoals,
  setCampaignGoals,
  targetAudienceDescription,
  setTargetAudienceDescription,
  campaignObjective,
  setCampaignObjective,
}: {
  tags: string[];
  removeTag: (tag: string) => void;
  newTag: string;
  setNewTag: (value: string) => void;
  addTag: () => void;
  campaignGoals: string;
  setCampaignGoals: (value: string) => void;
  targetAudienceDescription: string;
  setTargetAudienceDescription: (value: string) => void;
  campaignObjective: string;
  setCampaignObjective: (value: string) => void;
}) => (
  <Card>
    <CardContent className="p-6">
      <div className="border-l-4 border-primary pl-4 mb-6">
        <h3 className="text-xl font-bold text-foreground">Post Strategy</h3>
      </div>

      <div className="space-y-6">
        <div>
          <h4 className="font-semibold text-foreground mb-3">Post Goals & Ideas</h4>
          <Textarea
            value={campaignGoals}
            onChange={(e) => setCampaignGoals(e.target.value)}
            placeholder="AI-generated post goals will appear here..."
            rows={4}
            className="resize-none bg-muted/50"
          />
        </div>

        <div>
          <h4 className="font-semibold text-foreground mb-2">Target Audience</h4>
          <Textarea
            value={targetAudienceDescription}
            onChange={(e) => setTargetAudienceDescription(e.target.value)}
            placeholder="AI-generated target audience description will appear here..."
            rows={3}
            className="resize-none bg-muted/50"
          />
        </div>

        <div>
          <h4 className="font-semibold text-foreground mb-2">Post Objective</h4>
          <Textarea
            value={campaignObjective}
            onChange={(e) => setCampaignObjective(e.target.value)}
            placeholder="AI-generated post objective will appear here..."
            rows={3}
            className="resize-none bg-muted/50"
          />
        </div>

        <div>
          <h4 className="font-semibold text-foreground mb-3">Tags & Keywords</h4>
          <div className="flex flex-wrap gap-2 mb-3">
            {tags.map((tag) => (
              <span key={tag} className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm">
                {tag}
                <button onClick={() => removeTag(tag)} className="hover:text-primary/70">
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
          <Input
            placeholder="Add a new tag (e.g., #viral, #trending)"
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addTag()}
            className="max-w-sm"
          />
        </div>
      </div>
    </CardContent>
  </Card>
);

// Sample Campaigns Component
const SampleCampaigns = ({ 
  campaigns, 
  selectable = false, 
  selectedIndex, 
  onSelect 
}: { 
  campaigns: Array<{ brand: string; campaign: string; platform: string; result: string; whyItWorked: string }>; 
  selectable?: boolean;
  selectedIndex?: number | null;
  onSelect?: (index: number) => void;
}) => {
  if (!campaigns || campaigns.length === 0) return null;

  return (
    <Card>
      <CardContent className="p-6">
        <div className="border-l-4 border-accent pl-4 mb-6">
          <h3 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Trophy className="w-5 h-5 text-primary" />
            Sample Winning Campaigns
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            {selectable ? "Select a campaign to use as inspiration for your generated idea" : "Real-world campaigns that performed well for similar products"}
          </p>
        </div>

        <div className="grid gap-4">
          {campaigns.map((sample, index) => {
            const isSelected = selectable && selectedIndex === index;
            return (
              <div
                key={index}
                onClick={() => selectable && onSelect?.(index)}
                className={`rounded-xl border p-5 space-y-3 transition-colors ${
                  isSelected
                    ? "border-primary bg-primary/10 ring-2 ring-primary/30"
                    : "border-border bg-muted/30 hover:border-primary/40"
                } ${selectable ? "cursor-pointer" : ""}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h4 className="font-semibold text-foreground">{sample.campaign}</h4>
                    <p className="text-sm text-muted-foreground">{sample.brand}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {isSelected && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground whitespace-nowrap">
                        <Check className="w-3 h-3" />
                        Selected
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary whitespace-nowrap">
                      {sample.platform}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-sm">
                  <TrendingUp className="w-4 h-4 text-green-500" />
                  <span className="font-medium text-foreground">{sample.result}</span>
                </div>

                <p className="text-sm text-muted-foreground leading-relaxed">
                  <span className="font-medium text-foreground">Why it worked: </span>
                  {sample.whyItWorked}
                </p>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

const GenerateCampaignIdeas = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [selectedContentType, setSelectedContentType] = useState<string | null>(null);
  const [targetAudience, setTargetAudience] = useState("");
  const [customPrompt, setCustomPrompt] = useState("");
  const [showResults, setShowResults] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Generated content state
  const [campaignIdea, setCampaignIdea] = useState("");
  const [videoScript, setVideoScript] = useState("");
  const [scenePrompts, setScenePrompts] = useState<{ time: string; title: string; prompt: string }[]>([
    { time: "[0-2s]", title: "Hook - Attention-grabbing opening", prompt: "" },
    { time: "[2-6s]", title: "Problem - Show common pain point", prompt: "" },
    { time: "[6-12s]", title: "Solution - Introduce product", prompt: "" },
    { time: "[12-15s]", title: "CTA - Call to action with trending hook", prompt: "" },
  ]);
  const [postCaption, setPostCaption] = useState("");
  const [imagePrompt, setImagePrompt] = useState("");
  const [articleOutline, setArticleOutline] = useState("");
  const [campaignGoals, setCampaignGoals] = useState("");
  const [targetAudienceDescription, setTargetAudienceDescription] = useState("");
  const [campaignObjective, setCampaignObjective] = useState("");
  const [generatedImageUrls, setGeneratedImageUrls] = useState<string[]>([]);
  const [selectedGeneratedImage, setSelectedGeneratedImage] = useState<string | null>(null);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [referenceImages, setReferenceImages] = useState<Array<{ url: string; name: string }>>([]);
  const [isSavingToLibrary, setIsSavingToLibrary] = useState(false);
  const [isRegeneratingPrompt, setIsRegeneratingPrompt] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [sampleCampaigns, setSampleCampaigns] = useState<Array<{ brand: string; campaign: string; platform: string; result: string; whyItWorked: string }>>([]);
  const [productDescription, setProductDescription] = useState("");
  const [isLoadingSamples, setIsLoadingSamples] = useState(false);
  const [showSamplesPreGenerate, setShowSamplesPreGenerate] = useState(false);
  const [selectedSampleCampaignIndex, setSelectedSampleCampaignIndex] = useState<number | null>(null);
  const { getEffectiveUserId } = useClientContext();
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  // Voiceover state
  const [voiceoverSource, setVoiceoverSource] = useState<"script" | "objective">("script");
  const [selectedVoice, setSelectedVoice] = useState("JBFqnCBsd6RMkjVDRZzb");
  const [isGeneratingVoiceover, setIsGeneratingVoiceover] = useState(false);
  const [voiceoverAudioUrl, setVoiceoverAudioUrl] = useState<string | null>(null);
  const [isPlayingVoiceover, setIsPlayingVoiceover] = useState(false);
  const [voiceoverAudioRef] = useState<{ current: HTMLAudioElement | null }>({ current: null });
  const [uploadedMedia, setUploadedMedia] = useState<{ id: string; name: string; url: string }[]>([]);
  const [pendingUploadFiles, setPendingUploadFiles] = useState<File[]>([]);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);

  const handleUploadOwnContent = (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const validFiles: File[] = [];
    const previewAssets: { id: string; name: string; url: string }[] = [];

    Array.from(files).forEach((file, index) => {
      if (file.size > 50 * 1024 * 1024) {
        toast({ title: "File too large", description: `${file.name} exceeds 50MB.`, variant: "destructive" });
        return;
      }

      validFiles.push(file);
      previewAssets.push({
        id: `${file.name}-${file.lastModified}-${index}-${crypto.randomUUID()}`,
        name: file.name,
        url: URL.createObjectURL(file),
      });
    });

    if (validFiles.length === 0) return;

    setPendingUploadFiles((prev) => [...prev, ...validFiles].slice(0, 10));
    setUploadedMedia((prev) => [...prev, ...previewAssets].slice(0, 10));
    toast({
      title: "Ready to upload",
      description: `${validFiles.length} file${validFiles.length === 1 ? "" : "s"} selected. Press Upload & Continue when you're ready.`,
    });
  };

  const handleConfirmUploadOwnContent = async () => {
    if (pendingUploadFiles.length === 0) {
      toast({ title: "Choose media first", description: "Select an image or video before continuing.", variant: "destructive" });
      return;
    }

    const { data: userResp } = await supabase.auth.getUser();
    const currentUser = userResp?.user;
    if (!currentUser) {
      toast({ title: "Sign in required", description: "Please sign in to upload media.", variant: "destructive" });
      return;
    }

    setIsUploadingMedia(true);
    const newAssets: { id: string; name: string; url: string }[] = [];
    try {
      for (const file of pendingUploadFiles) {
        const ext = file.name.split(".").pop() || "bin";
        const path = `${currentUser.id}/uploads/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const { error: upErr } = await supabase.storage.from("brand-assets").upload(path, file, {
          contentType: file.type || undefined,
          upsert: false,
        });
        if (upErr) throw upErr;
        const { data: pub } = supabase.storage.from("brand-assets").getPublicUrl(path);
        const publicUrl = pub.publicUrl;

        // Save to brand library so it's reusable
        const { data: assetRow } = await supabase
          .from("brand_assets")
          .insert({
            user_id: currentUser.id,
            asset_type: file.type.startsWith("video") ? "video" : "image",
            value: publicUrl,
            name: file.name,
            metadata: { source: "generate-post-ideas-upload" },
          })
          .select("id")
          .single();

        newAssets.push({ id: assetRow?.id || path, name: file.name, url: publicUrl });
      }

      if (newAssets.length > 0) {
        uploadedMedia.forEach((asset) => {
          if (asset.url.startsWith("blob:")) {
            URL.revokeObjectURL(asset.url);
          }
        });
        setPendingUploadFiles([]);
        setUploadedMedia([]);
        toast({ title: "Uploaded ✨", description: `Taking you to Prepare for Launch…` });
        navigate("/campaigns/new", {
          state: {
            contentType: selectedContentType,
            uploadedMediaUrls: newAssets,
            selectedPlatforms,
          },
        });
      }
    } catch (e: any) {
      console.error("Upload failed:", e);
      toast({ title: "Upload failed", description: e?.message || "Could not upload file.", variant: "destructive" });
    } finally {
      setIsUploadingMedia(false);
    }
  };

  const removeUploadedMedia = (indexToRemove: number) => {
    setUploadedMedia((prev) => {
      const target = prev[indexToRemove];
      if (target?.url.startsWith("blob:")) {
        URL.revokeObjectURL(target.url);
      }

      return prev.filter((_, index) => index !== indexToRemove);
    });
    setPendingUploadFiles((prev) => prev.filter((_, index) => index !== indexToRemove));
  };

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        navigate("/auth");
      } else {
        setUser(user);
      }
    });
  }, [navigate]);

  // Fetch products from database
  useEffect(() => {
    const loadProducts = async () => {
      const effectiveUserId = getEffectiveUserId();
      if (!effectiveUserId) return;
      
      setLoadingProducts(true);
      try {
        const { data, error } = await supabase
          .from("products")
          .select("id, name")
          .eq("user_id", effectiveUserId)
          .order("created_at", { ascending: false });
        
        if (error) throw error;
        setProducts(data || []);
      } catch (err) {
        console.error("Failed to load products:", err);
      } finally {
        setLoadingProducts(false);
      }
    };
    
    loadProducts();
  }, [getEffectiveUserId]);

  // Auto-load product images when a product is selected
  useEffect(() => {
    const loadProductAssets = async () => {
      if (!selectedProduct || selectedProduct === "none") {
        return;
      }

      try {
        const { data: assets, error } = await supabase
          .from("product_assets")
          .select("asset_name, asset_url, thumbnail_url")
          .eq("product_id", selectedProduct);

        if (error) throw error;

        if (assets && assets.length > 0) {
          const productImages = assets.map(asset => ({
            url: asset.asset_url,
            name: asset.asset_name,
          }));
          
          // Add product images to reference images (avoid duplicates)
          setReferenceImages(prev => {
            const existingUrls = new Set(prev.map(img => img.url));
            const newImages = productImages.filter(img => !existingUrls.has(img.url));
            return [...prev, ...newImages];
          });
          
          if (productImages.length > 0) {
            toast({
              title: "Product images loaded",
              description: `Added ${productImages.length} image(s) from product to reference images.`,
            });
          }
        }
      } catch (err) {
        console.error("Failed to load product assets:", err);
      }
    };

    loadProductAssets();
  }, [selectedProduct]);

  const handleFetchSampleCampaigns = async () => {
    if (!productDescription.trim()) return;
    
    setIsLoadingSamples(true);
    setSampleCampaigns([]);
    setShowSamplesPreGenerate(false);
    setSelectedSampleCampaignIndex(null);
    
    try {
      const { data, error } = await supabase.functions.invoke('fetch-sample-campaigns', {
        body: { productDescription },
      });

      if (error) throw new Error(error.message || "Failed to fetch sample campaigns");

      setSampleCampaigns(data.sampleCampaigns || []);
      setShowSamplesPreGenerate(true);
    } catch (error) {
      console.error("Error fetching sample campaigns:", error);
      toast({
        title: "Failed to fetch sample campaigns",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsLoadingSamples(false);
    }
  };


  const handleGenerate = async () => {
    if (!selectedContentType) return;
    
    setIsLoading(true);
    setShowResults(false);
    
    try {
      const inspirationCampaign = selectedSampleCampaignIndex !== null && sampleCampaigns[selectedSampleCampaignIndex]
        ? sampleCampaigns[selectedSampleCampaignIndex]
        : null;

      const inspirationText = inspirationCampaign
        ? `\nUse this winning campaign as inspiration: "${inspirationCampaign.campaign}" by ${inspirationCampaign.brand} on ${inspirationCampaign.platform} which achieved ${inspirationCampaign.result}. Key success factor: ${inspirationCampaign.whyItWorked}`
        : "";

      const { data, error } = await supabase.functions.invoke('generate-campaign-idea', {
        body: {
          contentType: selectedContentType,
          targetAudience,
          prompt: (customPrompt + inspirationText).trim(),
          productInfo: selectedProduct || null,
        },
      });

      if (error) {
        throw new Error(error.message || "Failed to generate post idea");
      }

      
      // Populate the fields based on content type
      setCampaignIdea(data.campaignIdea || "");
      setTags(data.tags || []);
      setCampaignGoals(data.campaignGoals || "");
      setTargetAudienceDescription(data.targetAudienceDescription || "");
      setCampaignObjective(data.campaignObjective || "");
      setSampleCampaigns(data.sampleCampaigns || []);
      
      if (selectedContentType === "social-video" || selectedContentType === "video-ad") {
        setVideoScript(data.videoScript || "");
        if (data.scenePrompts) {
          setScenePrompts(data.scenePrompts);
        }
      } else if (selectedContentType === "visual-post") {
        setPostCaption(data.postCaption || "");
        setImagePrompt(data.imagePrompt || "");
        setSelectedGeneratedImage(null); // Reset image when generating new idea
      } else if (selectedContentType === "written") {
        setArticleOutline(data.articleOutline || "");
      }
      
      setShowResults(true);
    } catch (error) {
      console.error("Error generating post idea:", error);
      alert(error instanceof Error ? error.message : "Failed to generate post idea");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = async (text: string, field: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const togglePlatform = (platformId: string) => {
    if (selectedPlatforms.includes(platformId)) {
      setSelectedPlatforms(selectedPlatforms.filter(p => p !== platformId));
    } else {
      setSelectedPlatforms([...selectedPlatforms, platformId]);
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const addTag = () => {
    if (newTag && !tags.includes(newTag)) {
      const formattedTag = newTag.startsWith("#") ? newTag : `#${newTag}`;
      setTags([...tags, formattedTag]);
      setNewTag("");
    }
  };

  const handleRegenerateImagePrompt = async () => {
    setIsRegeneratingPrompt(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-campaign-idea', {
        body: {
          contentType: 'visual-post',
          targetAudience,
          prompt: customPrompt,
          productInfo: selectedProduct || null,
        },
      });
      if (error) throw new Error(error.message);
      if (data?.imagePrompt) {
        setImagePrompt(data.imagePrompt);
        toast({ title: "Prompt regenerated", description: "A new image prompt has been generated for you." });
      }
    } catch (err) {
      console.error("Error regenerating prompt:", err);
      toast({ title: "Failed to regenerate", description: err instanceof Error ? err.message : "Unknown error", variant: "destructive" });
    } finally {
      setIsRegeneratingPrompt(false);
    }
  };

  const handleGenerateImage = async () => {
    if (!imagePrompt.trim()) {
      toast({
        title: "No image prompt",
        description: "Please generate a post idea first or enter an image prompt.",
        variant: "destructive",
      });
      return;
    }

    setIsGeneratingImage(true);
    setGeneratedImageUrls([]);
    setSelectedGeneratedImage(null);
    try {
      // Call generate-image-composite in composite mode → 1 API call → 2×2 grid → 4 sliced tiles
      // aspectRatio: post content defaults to portrait (9:16) for TikTok/Instagram
      const { data, error } = await supabase.functions.invoke('generate-image-composite', {
        body: {
          brief: imagePrompt,
          platforms: ["tiktok@0", "tiktok@1", "tiktok@2", "tiktok@3"],
          mode: "composite",
          aspectRatio: "9:16",
          ...(referenceImages.length > 0 && {
            referenceImages: referenceImages.map((img: { url: string }) => img.url).slice(0, 3),
          }),
        },
      });

      if (error) {
        throw new Error(error.message || "Failed to generate image");
      }

      const tiles: string[] = data?.images ?? [];
      if (tiles.length === 0) {
        throw new Error("No images returned from composite pipeline");
      }

      setGeneratedImageUrls(tiles);
      setSelectedGeneratedImage(tiles[0]);

      toast({
        title: "4 images ready!",
        description: "Pick the best one to pair with your post copy.",
      });
    } catch (error) {
      console.error("Error generating image:", error);
      toast({
        title: "Failed to generate image",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const handleDownloadImage = () => {
    const url = selectedGeneratedImage;
    if (!url) return;
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `campaign-image-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSaveDraft = async () => {
    if (!user) return;
    
    setIsSaving(true);
    try {
      const effectiveClientId = getEffectiveUserId();
      const insertResult = await supabase.from("campaign_drafts" as any).insert({
        user_id: user.id,
        client_id: effectiveClientId || user.id,
        campaign_idea: campaignIdea,
        content_type: selectedContentType,
        target_audience: targetAudience,
        prompt: customPrompt,
        video_script: videoScript,
        scene_prompts: JSON.stringify(scenePrompts),
        post_caption: postCaption,
        image_prompt: imagePrompt,
        article_outline: articleOutline,
        campaign_goals: campaignGoals,
        target_audience_description: targetAudienceDescription,
        campaign_objective: campaignObjective,
        tags,
      }).select().single();

      if (insertResult.error) throw insertResult.error;
      
      navigate("/campaigns/drafts");
    } catch (error) {
      console.error("Error saving draft:", error);
      toast({
        title: "Failed to save draft",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleLaunchPost = () => {
    navigate("/campaigns/new", {
      state: {
        campaignName: campaignIdea || "",
        postCaption: postCaption || "",
        tags: tags || [],
        videoScript: videoScript || "",
        imagePrompt: imagePrompt || "",
        articleOutline: articleOutline || "",
        campaignGoals: campaignGoals || "",
        targetAudienceDescription: targetAudienceDescription || "",
        campaignObjective: campaignObjective || "",
        contentType: selectedContentType || "",
        generatedImageUrl: selectedGeneratedImage || "",
        selectedPlatforms: selectedPlatforms || [],
      },
    });
  };

  const handleGenerateVoiceover = async () => {
    const textToVoice = voiceoverSource === "script" ? videoScript : campaignObjective;
    if (!textToVoice?.trim()) {
      toast({
        title: "No content to voice",
        description: `Please generate a post idea first.`,
        variant: "destructive",
      });
      return;
    }

    setIsGeneratingVoiceover(true);
    setVoiceoverAudioUrl(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-tts`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({ text: textToVoice, voiceId: selectedVoice }),
        }
      );

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Request failed: ${response.status}`);
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      setVoiceoverAudioUrl(audioUrl);

      toast({ title: "Voiceover generated!", description: "Your AI voiceover is ready to play." });
    } catch (error) {
      console.error("Error generating voiceover:", error);
      toast({
        title: "Failed to generate voiceover",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingVoiceover(false);
    }
  };

  const handlePlayPauseVoiceover = () => {
    if (!voiceoverAudioUrl) return;
    if (voiceoverAudioRef.current) {
      if (isPlayingVoiceover) {
        voiceoverAudioRef.current.pause();
        setIsPlayingVoiceover(false);
      } else {
        voiceoverAudioRef.current.play();
        setIsPlayingVoiceover(true);
      }
    } else {
      const audio = new Audio(voiceoverAudioUrl);
      voiceoverAudioRef.current = audio;
      audio.onended = () => setIsPlayingVoiceover(false);
      audio.play();
      setIsPlayingVoiceover(true);
    }
  };

  const handleDownloadVoiceover = () => {
    if (!voiceoverAudioUrl) return;
    const link = document.createElement('a');
    link.href = voiceoverAudioUrl;
    link.download = `voiceover-${Date.now()}.mp3`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader user={user} />
      
      <main className="max-w-4xl mx-auto px-6 py-12">
        <div className="flex items-center justify-between mb-2">
          <Button 
            variant="ghost" 
            onClick={() => navigate("/campaigns")}
            className="text-primary hover:text-primary/80"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
             Back to Posts
          </Button>
          <div className="flex gap-2">
            <Button 
              className="gap-2 bg-gradient-to-r from-primary to-accent hover:opacity-90"
              onClick={() => navigate("/campaigns/command")}
            >
              <Zap className="w-4 h-4" />
              Command Center
            </Button>
            <Button 
              variant="outline"
              onClick={() => navigate("/campaigns/drafts")}
              className="gap-2"
            >
              <FileStack className="w-4 h-4" />
              Post Drafts
            </Button>
          </div>
        </div>
        
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground">
            {selectedContentType 
              ? `Generate ${contentTypes.find(t => t.id === selectedContentType)?.label} Ideas`
              : "Generate Post Ideas"}
          </h1>
          <p className="text-foreground font-bold">Post Center</p>
        </div>

        <div className="space-y-3">
          {/* Select Content Type */}
          <Card>
            <CardContent className="p-4">
              <h2 className="text-lg font-semibold text-foreground mb-3">Select Content Type</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {contentTypes.map((type) => {
                  const Icon = type.icon;
                  return (
                    <button
                      key={type.id}
                      onClick={() => {
                        setSelectedContentType(type.id);
                        setShowResults(false);
                      }}
                      className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border-2 transition-all ${
                        selectedContentType === type.id
                          ? "border-primary bg-primary/10"
                          : "border-border hover:border-primary/50 hover:bg-muted/50"
                      }`}
                    >
                      <Icon className="w-5 h-5 text-foreground shrink-0" />
                      <span className="text-sm font-medium text-foreground">{type.label}</span>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Platform Selection */}
          {selectedContentType && selectedContentType !== "paid-ads" && (
            <Card>
              <CardContent className="p-4">
                <h2 className="text-lg font-semibold text-foreground mb-3">Select Platforms</h2>
                <div className="grid grid-cols-6 gap-2">
                  {socialPlatforms.map((platform) => (
                    <button
                      key={platform.id}
                      onClick={() => togglePlatform(platform.id)}
                      className={`p-2 rounded-xl border-2 transition-all duration-200 hover:scale-105 flex flex-col items-center gap-2 ${
                        selectedPlatforms.includes(platform.id)
                          ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-lg ${platform.color} flex items-center justify-center ${platform.id === "linkedin" ? "p-0" : "p-2"}`}>
                        <img 
                          src={platform.icon} 
                          alt={platform.name}
                          className={platform.id === "linkedin" ? "w-9 h-9 rounded-lg object-contain" : "w-full h-full object-contain"}
                        />
                      </div>
                      <span className="text-xs font-medium text-foreground">{platform.name}</span>
                      {selectedPlatforms.includes(platform.id) && (
                        <div className="w-2 h-2 rounded-full bg-primary" />
                      )}
                    </button>
                  ))}
                </div>
                {selectedPlatforms.length > 0 && (
                  <p className="text-sm text-muted-foreground mt-3">
                    {selectedPlatforms.length} platform{selectedPlatforms.length > 1 ? "s" : ""} selected
                  </p>
                )}
              </CardContent>
            </Card>
          )}


          {/* Post Idea / Prompt — Option A: AI generation */}
          {selectedContentType && selectedContentType !== "paid-ads" && (
            <Card>
              <CardContent className="p-6 space-y-4">
                <div>
                  <h2 className="text-lg font-semibold text-foreground mb-2">Describe Your Post Idea</h2>
                  <p className="text-sm text-muted-foreground mb-3">What should this post be about? Give the AI a general direction.</p>
                </div>
                <Textarea
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  placeholder="e.g. A promotional post for our summer sale featuring our new product line..."
                  rows={4}
                  className="resize-none"
                />
                <Button
                  className="w-full gap-2 bg-gradient-to-r from-primary to-primary/80 hover:opacity-90 py-6 text-lg text-primary-foreground disabled:opacity-50"
                  onClick={handleGenerate}
                  disabled={!selectedContentType || isLoading || !customPrompt.trim()}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5" />
                      {selectedContentType
                        ? `Generate ${contentTypes.find(t => t.id === selectedContentType)?.label} Ideas`
                        : "Generate Post Ideas"}
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* OR divider */}
          {selectedContentType && selectedContentType !== "paid-ads" && (
            <div className="flex items-center gap-4">
              <div className="flex-1 h-px bg-border" />
              <span className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">or</span>
              <div className="flex-1 h-px bg-border" />
            </div>
          )}

          {/* Option B: Upload your own */}
          {selectedContentType && selectedContentType !== "paid-ads" && (
            <Card>
              <CardContent className="p-6 space-y-4">
                <div>
                  <h2 className="text-lg font-semibold text-foreground mb-1">Upload Your Own Content</h2>
                  <p className="text-sm text-muted-foreground">Add images or videos from your computer to use in this post.</p>
                </div>

                <label
                  htmlFor="own-content-upload"
                  className={`flex flex-col items-center justify-center w-full py-8 rounded-lg border-2 border-dashed cursor-pointer transition-colors ${
                    isUploadingMedia ? "opacity-60 cursor-wait" : "hover:border-primary/60 hover:bg-muted/40"
                  } border-border`}
                >
                  {isUploadingMedia ? (
                    <>
                      <Loader2 className="w-6 h-6 mb-2 animate-spin text-primary" />
                      <span className="text-sm text-muted-foreground">Uploading…</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-6 h-6 mb-2 text-muted-foreground" />
                      <span className="text-sm font-medium text-foreground">Click to upload images or videos</span>
                      <span className="text-xs text-muted-foreground mt-1">PNG, JPG, MP4 — up to 50MB each</span>
                    </>
                  )}
                  <input
                    id="own-content-upload"
                    type="file"
                    multiple
                    accept="image/*,video/*"
                    className="hidden"
                    disabled={isUploadingMedia}
                    onChange={(e) => {
                      handleUploadOwnContent(e.target.files);
                      e.target.value = "";
                    }}
                  />
                </label>

                {uploadedMedia.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {uploadedMedia.map((m, index) => {
                      const isVideo = /\.(mp4|mov|webm|m4v)(\?|$)/i.test(m.url);
                      return (
                        <div key={m.id} className="relative group rounded-lg overflow-hidden border border-border bg-muted">
                          {isVideo ? (
                            <video src={m.url} className="w-full h-24 object-cover" muted />
                          ) : (
                            <img src={m.url} alt={m.name} className="w-full h-24 object-cover" />
                          )}
                          <button
                            type="button"
                            onClick={() => removeUploadedMedia(index)}
                            className="absolute top-1 right-1 w-6 h-6 rounded-full bg-background/90 border border-border flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                            aria-label="Remove"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                          <p className="text-[10px] text-muted-foreground truncate px-2 py-1">{m.name}</p>
                        </div>
                      );
                    })}
                  </div>
                )}

                {uploadedMedia.length > 0 && (
                  <Button
                    variant="default"
                    className="w-full gap-2"
                    onClick={handleConfirmUploadOwnContent}
                    disabled={isUploadingMedia || pendingUploadFiles.length === 0}
                  >
                    {isUploadingMedia ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4" />
                        Upload & Continue to Prepare for Launch
                      </>
                    )}
                  </Button>
                )}
              </CardContent>
            </Card>
          )}

          {/* Social Video Results */}
          {showResults && selectedContentType === "social-video" && (
            <div className="space-y-6 mt-8">
              {/* Post Idea */}
              <Card>
                <CardContent className="p-6">
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">Post Idea</h3>
                  <Textarea
                    value={campaignIdea}
                    onChange={(e) => setCampaignIdea(e.target.value)}
                    placeholder="Your AI-generated post idea will appear here..."
                    rows={2}
                    className="resize-none bg-muted/50"
                  />
                </CardContent>
              </Card>

              {/* Video Script */}
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-foreground">Video Script</h3>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleCopy(videoScript, 'script')}
                      className="gap-2"
                    >
                      {copiedField === 'script' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      Copy
                    </Button>
                  </div>
                  <Textarea
                    value={videoScript}
                    onChange={(e) => setVideoScript(e.target.value)}
                    placeholder="Your AI-generated video script will appear here..."
                    rows={6}
                    className="resize-none bg-muted/50"
                  />
                </CardContent>
              </Card>

              {/* Video Generation Prompts */}
              <Card>
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold text-foreground mb-4">Video Generation Prompts (by Scene)</h3>
                  <div className="space-y-4">
                    {scenePrompts.map((scene, index) => (
                      <div key={index} className="border border-border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium text-foreground">{scene.time} {scene.title}</h4>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => handleCopy(scene.prompt, `scene-${index}`)}
                            className="gap-2"
                          >
                            {copiedField === `scene-${index}` ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                            Copy
                          </Button>
                        </div>
                        <Textarea
                          value={scene.prompt}
                          onChange={(e) => {
                            const newPrompts = [...scenePrompts];
                            newPrompts[index] = { ...scene, prompt: e.target.value };
                            setScenePrompts(newPrompts);
                          }}
                          placeholder="AI-generated prompt will appear here..."
                          rows={3}
                          className="resize-none bg-muted/50"
                        />
                      </div>
                    ))}
                  </div>
                  <p className="text-sm text-muted-foreground mt-4">
                    Use these prompts with AI video generation tools like Runway, Synthesia, or comparable video generation services to create each scene.
                  </p>
                </CardContent>
              </Card>

              {/* Voiceover Generation */}
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <ElevenLabsIcon className="w-5 h-5 text-foreground" />
                    <h3 className="text-lg font-semibold text-foreground">AI Voiceover</h3>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <p className="text-sm font-medium text-foreground mb-2">Content to voice:</p>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => { setVoiceoverSource("script"); setVoiceoverAudioUrl(null); voiceoverAudioRef.current = null; }}
                          className={`p-3 rounded-lg border-2 text-sm transition-all ${voiceoverSource === "script" ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"}`}
                        >
                          <Mic className="w-4 h-4 mx-auto mb-1" />
                          Video Script
                        </button>
                        <button
                          onClick={() => { setVoiceoverSource("objective"); setVoiceoverAudioUrl(null); voiceoverAudioRef.current = null; }}
                          className={`p-3 rounded-lg border-2 text-sm transition-all ${voiceoverSource === "objective" ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"}`}
                        >
                          <FileText className="w-4 h-4 mx-auto mb-1" />
                          Post Objective
                        </button>
                      </div>
                    </div>

                    <div>
                      <p className="text-sm font-medium text-foreground mb-2">Select Voice:</p>
                      <div className="grid grid-cols-3 gap-2">
                        {voices.map((voice) => (
                          <button
                            key={voice.id}
                            onClick={() => { setSelectedVoice(voice.id); setVoiceoverAudioUrl(null); voiceoverAudioRef.current = null; }}
                            className={`p-2 rounded-lg border-2 text-center transition-all ${selectedVoice === voice.id ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"}`}
                          >
                            <span className="text-sm font-medium text-foreground block">{voice.name}</span>
                            <span className="text-[10px] text-muted-foreground">{voice.desc}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <Button
                      className="w-full gap-2"
                      onClick={handleGenerateVoiceover}
                      disabled={isGeneratingVoiceover}
                    >
                      {isGeneratingVoiceover ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Generating Voiceover...
                        </>
                      ) : (
                        <>
                          <Volume2 className="w-4 h-4" />
                          Generate Voiceover
                        </>
                      )}
                    </Button>

                    {voiceoverAudioUrl && (
                      <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50 border border-border">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handlePlayPauseVoiceover}
                          className="gap-2"
                        >
                          {isPlayingVoiceover ? <Square className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                          {isPlayingVoiceover ? "Stop" : "Play"}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleDownloadVoiceover}
                          className="gap-2"
                        >
                          <Download className="w-4 h-4" />
                          Download MP3
                        </Button>
                        <span className="text-xs text-muted-foreground ml-auto">Powered by ElevenLabs</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <CampaignStrategy 
                tags={tags} 
                removeTag={removeTag} 
                newTag={newTag} 
                setNewTag={setNewTag} 
                addTag={addTag}
                campaignGoals={campaignGoals}
                setCampaignGoals={setCampaignGoals}
                targetAudienceDescription={targetAudienceDescription}
                setTargetAudienceDescription={setTargetAudienceDescription}
                campaignObjective={campaignObjective}
                setCampaignObjective={setCampaignObjective}
              />

              <SampleCampaigns campaigns={sampleCampaigns} />

              {/* Action Buttons */}
              <div className="space-y-3">
                <Button 
                  className="w-full gap-2 py-6 text-lg bg-gradient-to-r from-emerald-500 to-teal-600 hover:opacity-90"
                  onClick={handleLaunchPost}
                >
                  <Rocket className="w-5 h-5" />
                  Launch This Post
                </Button>
                <Button 
                  variant="outline"
                  className="w-full gap-2 py-6 text-lg"
                  onClick={handleSaveDraft}
                  disabled={isSaving}
                >
                  {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <FileStack className="w-5 h-5" />}
                  {isSaving ? "Saving..." : "Save Draft"}
                </Button>
              </div>
            </div>
          )}

          {/* Visual Post Results */}
          {showResults && selectedContentType === "visual-post" && (
            <div className="space-y-6 mt-8">
              {/* Post Idea */}
              <Card>
                <CardContent className="p-6">
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">Post Idea</h3>
                  <Textarea
                    value={campaignIdea}
                    onChange={(e) => setCampaignIdea(e.target.value)}
                    placeholder="Your AI-generated post idea will appear here..."
                    rows={2}
                    className="resize-none bg-muted/50"
                  />
                </CardContent>
              </Card>

              {/* Post Caption */}
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-foreground">Post Caption (Text Above Image)</h3>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleCopy(postCaption, 'caption')}
                      className="gap-2"
                    >
                      {copiedField === 'caption' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      Copy
                    </Button>
                  </div>
                  <Textarea
                    value={postCaption}
                    onChange={(e) => setPostCaption(e.target.value)}
                    placeholder="Your AI-generated caption will appear here..."
                    rows={5}
                    className="resize-none bg-muted/50"
                  />
                </CardContent>
              </Card>

              {/* Image Generation Prompt */}
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-semibold text-foreground">Image Generation Prompt</h3>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleCopy(imagePrompt, 'image-prompt')}
                      className="gap-2"
                    >
                      {copiedField === 'image-prompt' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      Copy
                    </Button>
                  </div>

                  {/* Reference Image Section - Always visible */}
                  <div className="mb-4 p-4 rounded-lg border border-dashed border-border bg-muted/30">
                    <ImageSourcePicker
                      label="Reference Images (Optional)"
                      description="Add reference images to guide the AI"
                      images={referenceImages}
                      onImagesChange={setReferenceImages}
                      maxImages={10}
                    />
                  </div>

                  <p className="text-sm text-muted-foreground mb-3">
                    Edit the prompt below and click Generate Image — you'll get 4 variations to pick from:
                  </p>
                  <div className="relative">
                    <Textarea
                      value={imagePrompt}
                      onChange={(e) => setImagePrompt(e.target.value)}
                      placeholder="Your AI-generated image prompt will appear here..."
                      rows={5}
                      className="resize-none bg-muted/50 pr-36"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      className="absolute top-2 right-2 gap-1.5 text-xs"
                      onClick={handleRegenerateImagePrompt}
                      disabled={isRegeneratingPrompt}
                    >
                      {isRegeneratingPrompt ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <RefreshCw className="w-3.5 h-3.5" />
                      )}
                      Regenerate Prompt
                    </Button>
                  </div>
                  
                  <Button 
                    className="w-full gap-2 bg-gradient-to-r from-pink-500 to-rose-500 hover:opacity-90"
                    onClick={handleGenerateImage}
                    disabled={isGeneratingImage || !imagePrompt.trim()}
                  >
                    {isGeneratingImage ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Generating 4 images...
                      </>
                    ) : (
                      <>
                        <Wand2 className="w-4 h-4" />
                        Generate Image
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>

              {/* Generated Image Tiles — pick your best */}
              {generatedImageUrls.length > 0 && (
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-foreground">Choose Your Image</h3>
                        <p className="text-xs text-muted-foreground mt-0.5">Click a tile to select it · pair it with your post copy and post</p>
                      </div>
                      {selectedGeneratedImage && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={handleDownloadImage}
                          className="gap-2"
                        >
                          <Download className="w-4 h-4" />
                          Download
                        </Button>
                      )}
                    </div>
                    {/* 2×2 tile grid */}
                    <div className="grid grid-cols-2 gap-2">
                      {generatedImageUrls.map((url, idx) => (
                        <button
                          key={idx}
                          onClick={() => setSelectedGeneratedImage(url)}
                          className={`relative rounded-lg overflow-hidden border-2 transition-all ${
                            selectedGeneratedImage === url
                              ? "border-primary shadow-lg scale-[1.02]"
                              : "border-border hover:border-primary/50"
                          }`}
                        >
                          <img
                            src={url}
                            alt={`Generated image ${idx + 1}`}
                            className="w-full h-auto block"
                          />
                          {selectedGeneratedImage === url && (
                            <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                              <Check className="w-3.5 h-3.5 text-primary-foreground" />
                            </div>
                          )}
                          <div className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded bg-black/50 text-white text-[10px] font-medium">
                            {idx + 1}
                          </div>
                        </button>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              <CampaignStrategy 
                tags={tags} 
                removeTag={removeTag} 
                newTag={newTag} 
                setNewTag={setNewTag} 
                addTag={addTag}
                campaignGoals={campaignGoals}
                setCampaignGoals={setCampaignGoals}
                targetAudienceDescription={targetAudienceDescription}
                setTargetAudienceDescription={setTargetAudienceDescription}
                campaignObjective={campaignObjective}
                setCampaignObjective={setCampaignObjective}
              />

              <SampleCampaigns campaigns={sampleCampaigns} />

              {/* Action Buttons */}
              <div className="space-y-3">
                <Button 
                  className="w-full gap-2 py-6 text-lg bg-gradient-to-r from-emerald-500 to-teal-600 hover:opacity-90"
                  onClick={handleLaunchPost}
                >
                  <Rocket className="w-5 h-5" />
                  Launch This Post
                </Button>
                <Button 
                  variant="outline"
                  className="w-full gap-2 py-6 text-lg"
                  onClick={handleSaveDraft}
                  disabled={isSaving}
                >
                  {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <FileStack className="w-5 h-5" />}
                  {isSaving ? "Saving..." : "Save Draft"}
                </Button>
              </div>
            </div>
          )}

          {/* Written Results */}
          {showResults && selectedContentType === "written" && (
            <div className="space-y-6 mt-8">
              {/* Post Idea */}
              <Card>
                <CardContent className="p-6">
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">Post Idea</h3>
                  <Textarea
                    value={campaignIdea}
                    onChange={(e) => setCampaignIdea(e.target.value)}
                    placeholder="Your AI-generated post idea will appear here..."
                    rows={2}
                    className="resize-none bg-muted/50"
                  />
                </CardContent>
              </Card>

              {/* Article/Blog Content Outline */}
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-foreground">Article/Blog Content Outline</h3>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleCopy(articleOutline, 'article-outline')}
                      className="gap-2"
                    >
                      {copiedField === 'article-outline' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      Copy
                    </Button>
                  </div>
                  <Textarea
                    value={articleOutline}
                    onChange={(e) => setArticleOutline(e.target.value)}
                    placeholder="Your AI-generated article outline will appear here..."
                    rows={8}
                    className="resize-none bg-muted/50"
                  />
                </CardContent>
              </Card>

              <CampaignStrategy 
                tags={tags} 
                removeTag={removeTag} 
                newTag={newTag} 
                setNewTag={setNewTag} 
                addTag={addTag}
                campaignGoals={campaignGoals}
                setCampaignGoals={setCampaignGoals}
                targetAudienceDescription={targetAudienceDescription}
                setTargetAudienceDescription={setTargetAudienceDescription}
                campaignObjective={campaignObjective}
                setCampaignObjective={setCampaignObjective}
              />

              <SampleCampaigns campaigns={sampleCampaigns} />

              {/* Action Buttons */}
              <div className="space-y-3">
                <Button 
                  className="w-full gap-2 py-6 text-lg bg-gradient-to-r from-emerald-500 to-teal-600 hover:opacity-90"
                  onClick={handleLaunchPost}
                >
                  <Rocket className="w-5 h-5" />
                  Launch This Post
                </Button>
                <Button 
                  variant="outline"
                  className="w-full gap-2 py-6 text-lg"
                  onClick={handleSaveDraft}
                  disabled={isSaving}
                >
                  {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <FileStack className="w-5 h-5" />}
                  {isSaving ? "Saving..." : "Save Draft"}
                </Button>
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
};

export default GenerateCampaignIdeas;
