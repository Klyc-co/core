import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AppHeader from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Music, Image, FileText, Film, Sparkles, Copy, Check, X, FileStack, Loader2, Wand2, Download, Upload, ImageIcon, FolderOpen, RefreshCw, Volume2, Square, Mic, Trophy, TrendingUp, ExternalLink } from "lucide-react";
import ElevenLabsIcon from "@/components/icons/ElevenLabsIcon";
import { useToast } from "@/hooks/use-toast";
import type { User } from "@supabase/supabase-js";
import ImageSourcePicker from "@/components/ImageSourcePicker";
import { useClientContext } from "@/contexts/ClientContext";

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
  { id: "visual-post", label: "Visual Post", icon: Image },
  { id: "written", label: "Written", icon: FileText },
  { id: "video-ad", label: "Video Ad", icon: Film },
];

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
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [selectedImageModel, setSelectedImageModel] = useState<"nano-banana" | "runway" | "fooocus" | "style-transfer">("nano-banana");
  const [referenceImages, setReferenceImages] = useState<Array<{ url: string; name: string }>>([]);
  const [isSavingToLibrary, setIsSavingToLibrary] = useState(false);
  const [isRegeneratingPrompt, setIsRegeneratingPrompt] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [sampleCampaigns, setSampleCampaigns] = useState<Array<{ brand: string; campaign: string; platform: string; result: string; whyItWorked: string }>>([]);
  const [productDescription, setProductDescription] = useState("");
  const [isLoadingSamples, setIsLoadingSamples] = useState(false);
  const [showSamplesPreGenerate, setShowSamplesPreGenerate] = useState(false);
  const { getEffectiveUserId } = useClientContext();

  // Voiceover state
  const [voiceoverSource, setVoiceoverSource] = useState<"script" | "objective">("script");
  const [selectedVoice, setSelectedVoice] = useState("JBFqnCBsd6RMkjVDRZzb");
  const [isGeneratingVoiceover, setIsGeneratingVoiceover] = useState(false);
  const [voiceoverAudioUrl, setVoiceoverAudioUrl] = useState<string | null>(null);
  const [isPlayingVoiceover, setIsPlayingVoiceover] = useState(false);
  const [voiceoverAudioRef] = useState<{ current: HTMLAudioElement | null }>({ current: null });

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


    if (!selectedContentType) return;
    
    setIsLoading(true);
    setShowResults(false);
    
    try {
      const { data, error } = await supabase.functions.invoke('generate-campaign-idea', {
        body: {
          contentType: selectedContentType,
          targetAudience,
          prompt: customPrompt,
          productInfo: selectedProduct || null,
        },
      });

      if (error) {
        throw new Error(error.message || "Failed to generate campaign idea");
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
        setGeneratedImageUrl(null); // Reset image when generating new idea
      } else if (selectedContentType === "written") {
        setArticleOutline(data.articleOutline || "");
      }
      
      setShowResults(true);
    } catch (error) {
      console.error("Error generating campaign idea:", error);
      alert(error instanceof Error ? error.message : "Failed to generate campaign idea");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = async (text: string, field: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
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
        description: "Please generate a campaign idea first or enter an image prompt.",
        variant: "destructive",
      });
      return;
    }

    // For style-transfer, inspiration image is required
    if (selectedImageModel === "style-transfer" && referenceImages.length === 0) {
      toast({
        title: "No reference image",
        description: "Please add at least one reference image for Style Transfer.",
        variant: "destructive",
      });
      return;
    }

    setIsGeneratingImage(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-image', {
        body: { 
          prompt: imagePrompt,
          model: selectedImageModel,
          inspirationImageUrl: referenceImages.length > 0 ? referenceImages[0].url : undefined,
          referenceImages: referenceImages.map(img => img.url)
        },
      });

      if (error) {
        throw new Error(error.message || "Failed to generate image");
      }
      setGeneratedImageUrl(data.imageUrl);
      
      // Auto-save generated image to Klyc library
      if (data.imageUrl && user) {
        try {
          const imageName = `AI Generated - ${selectedContentType} - ${new Date().toLocaleDateString()}`;
          await supabase.from("brand_assets").insert({
            user_id: user.id,
            asset_type: "image",
            name: imageName,
            value: data.imageUrl,
            metadata: {
              source: "ai-generated",
              model: selectedImageModel,
              prompt: imagePrompt,
              generated_at: new Date().toISOString(),
            }
          });
          
          toast({
            title: "Image generated & saved!",
            description: "Your AI-generated image has been saved to your Klyc library.",
          });
        } catch (saveError) {
          console.error("Error saving image to library:", saveError);
          // Still show success for generation, but note the save failed
          toast({
            title: "Image generated!",
            description: selectedImageModel === "style-transfer" 
              ? "Your style-transferred image is ready. (Failed to save to library)" 
              : "Your AI-generated image is ready. (Failed to save to library)",
          });
        }
      } else {
      toast({
        title: "Image generated!",
        description: selectedImageModel === "style-transfer" 
          ? "Your style-transferred image is ready." 
          : "Your AI-generated image is ready.",
      });
      }
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
    if (!generatedImageUrl) return;
    
    const link = document.createElement('a');
    link.href = generatedImageUrl;
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

  const handleGenerateVoiceover = async () => {
    const textToVoice = voiceoverSource === "script" ? videoScript : campaignObjective;
    if (!textToVoice?.trim()) {
      toast({
        title: "No content to voice",
        description: `Please generate a campaign idea first.`,
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
            Back to Campaigns
          </Button>
          <Button 
            variant="outline"
            onClick={() => navigate("/campaigns/drafts")}
            className="gap-2"
          >
            <FileStack className="w-4 h-4" />
            Campaign Drafts
          </Button>
        </div>
        
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Generate Campaign Ideas</h1>
          <p className="text-muted-foreground">Let AI help you brainstorm campaign concepts</p>
        </div>

        <div className="space-y-6">
          {/* Select Content Type */}
          <Card>
            <CardContent className="p-6">
              <h2 className="text-lg font-semibold text-foreground mb-4">Select Content Type</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {contentTypes.map((type) => {
                  const Icon = type.icon;
                  return (
                    <button
                      key={type.id}
                      onClick={() => {
                        setSelectedContentType(type.id);
                        setShowResults(false);
                      }}
                      className={`flex flex-col items-center justify-center p-6 rounded-lg border-2 transition-all ${
                        selectedContentType === type.id
                          ? "border-primary bg-primary/10"
                          : "border-border hover:border-primary/50 hover:bg-muted/50"
                      }`}
                    >
                      <Icon className="w-7 h-7 mb-3 text-foreground" />
                      <span className="text-sm font-medium text-foreground">{type.label}</span>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Target Audience */}
          <Card>
            <CardContent className="p-6">
              <h2 className="text-lg font-semibold text-foreground mb-4">Target Audience</h2>
              <Textarea
                placeholder="Describe your target audience..."
                value={targetAudience}
                onChange={(e) => setTargetAudience(e.target.value)}
                rows={3}
                className="resize-none"
              />
            </CardContent>
          </Card>

          {/* Prompt */}
          <Card>
            <CardContent className="p-6">
              <h2 className="text-lg font-semibold text-foreground mb-4">Prompt</h2>
              <Textarea
                placeholder="Add any specific details or requirements for your campaign idea..."
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                rows={3}
                className="resize-none"
              />
            </CardContent>
          </Card>

          {/* Products */}
          <Card>
            <CardContent className="p-6">
              <h2 className="text-lg font-semibold text-foreground mb-4">Products</h2>
              <Select value={selectedProduct || "none"} onValueChange={(val) => setSelectedProduct(val === "none" ? null : val)}>
                <SelectTrigger className="w-full" disabled={loadingProducts}>
                  <SelectValue placeholder={loadingProducts ? "Loading products..." : "Select a product (optional)"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {products.length === 0 && !loadingProducts && (
                    <SelectItem value="_empty" disabled>No products saved yet</SelectItem>
                  )}
                  {products.map((product) => (
                      <SelectItem key={product.id} value={product.id}>
                        {product.name}
                      </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground mt-2">
                Select a product from your library to enrich the campaign idea.
              </p>
            </CardContent>
          </Card>

          {/* Generate Button */}
          <Button 
            className="w-full gap-2 bg-gradient-to-r from-purple-500 to-purple-700 hover:opacity-90 py-6 text-lg disabled:opacity-50"
            onClick={handleGenerate}
            disabled={!selectedContentType || isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                Generate Campaign Ideas
              </>
            )}
          </Button>

          {/* Social Video Results */}
          {showResults && selectedContentType === "social-video" && (
            <div className="space-y-6 mt-8">
              {/* Campaign Idea */}
              <Card>
                <CardContent className="p-6">
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">Campaign Idea</h3>
                  <Textarea
                    value={campaignIdea}
                    onChange={(e) => setCampaignIdea(e.target.value)}
                    placeholder="Your AI-generated campaign idea will appear here..."
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
                          Campaign Objective
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

              {/* Save Buttons */}
              <Button 
                className="w-full gap-2 py-6 text-lg"
                onClick={handleSaveDraft}
                disabled={isSaving}
              >
                {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <FileStack className="w-5 h-5" />}
                {isSaving ? "Saving..." : "Save Draft"}
              </Button>
            </div>
          )}

          {/* Visual Post Results */}
          {showResults && selectedContentType === "visual-post" && (
            <div className="space-y-6 mt-8">
              {/* Campaign Idea */}
              <Card>
                <CardContent className="p-6">
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">Campaign Idea</h3>
                  <Textarea
                    value={campaignIdea}
                    onChange={(e) => setCampaignIdea(e.target.value)}
                    placeholder="Your AI-generated campaign idea will appear here..."
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
                    Edit the prompt below, select an AI model, and click "Generate Image":
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
                  
                  {/* Model Selection */}
                  <div className="mt-4 mb-4">
                    <p className="text-sm font-medium text-foreground mb-2">Select AI Model:</p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      <button
                        onClick={() => setSelectedImageModel("nano-banana")}
                        className={`flex flex-col items-center justify-center p-3 rounded-lg border-2 transition-all ${
                          selectedImageModel === "nano-banana"
                            ? "border-primary bg-primary/10"
                            : "border-border hover:border-primary/50 hover:bg-muted/50"
                        }`}
                      >
                        <span className="text-lg mb-1">🍌</span>
                        <span className="text-xs font-medium text-foreground">Nano Banana</span>
                        <span className="text-[10px] text-muted-foreground">Fast & Free</span>
                      </button>
                      <button
                        onClick={() => setSelectedImageModel("style-transfer")}
                        className={`flex flex-col items-center justify-center p-3 rounded-lg border-2 transition-all ${
                          selectedImageModel === "style-transfer"
                            ? "border-primary bg-primary/10"
                            : "border-border hover:border-primary/50 hover:bg-muted/50"
                        }`}
                      >
                        <ImageIcon className="w-5 h-5 mb-1 text-foreground" />
                        <span className="text-xs font-medium text-foreground">Style Transfer</span>
                        <span className="text-[10px] text-muted-foreground">From Reference</span>
                      </button>
                      <button
                        onClick={() => setSelectedImageModel("runway")}
                        className={`flex flex-col items-center justify-center p-3 rounded-lg border-2 transition-all ${
                          selectedImageModel === "runway"
                            ? "border-primary bg-primary/10"
                            : "border-border hover:border-primary/50 hover:bg-muted/50"
                        }`}
                      >
                        <span className="text-lg mb-1">🎬</span>
                        <span className="text-xs font-medium text-foreground">Runway</span>
                        <span className="text-[10px] text-muted-foreground">High Quality</span>
                      </button>
                      <button
                        onClick={() => setSelectedImageModel("fooocus")}
                        className={`flex flex-col items-center justify-center p-3 rounded-lg border-2 transition-all ${
                          selectedImageModel === "fooocus"
                            ? "border-primary bg-primary/10"
                            : "border-border hover:border-primary/50 hover:bg-muted/50"
                        }`}
                      >
                        <span className="text-lg mb-1">🎨</span>
                        <span className="text-xs font-medium text-foreground">Fooocus</span>
                        <span className="text-[10px] text-muted-foreground">Coming Soon</span>
                      </button>
                    </div>
                  </div>

                  <Button 
                    className="w-full gap-2 bg-gradient-to-r from-pink-500 to-rose-500 hover:opacity-90"
                    onClick={handleGenerateImage}
                    disabled={
                      isGeneratingImage || 
                      !imagePrompt.trim() ||
                      selectedImageModel === "fooocus"
                    }
                  >
                    {isGeneratingImage ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Generating with {
                          selectedImageModel === "nano-banana" ? "Nano Banana" : 
                          selectedImageModel === "style-transfer" ? "Style Transfer" :
                          selectedImageModel === "runway" ? "Runway" : "Fooocus"
                        }...
                      </>
                    ) : (
                      <>
                        <Wand2 className="w-4 h-4" />
                        Generate Image with {
                          selectedImageModel === "nano-banana" ? "Nano Banana" : 
                          selectedImageModel === "style-transfer" ? "Style Transfer" :
                          selectedImageModel === "runway" ? "Runway" : "Fooocus"
                        }
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>

              {/* Generated Image Preview */}
              {generatedImageUrl && (
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-foreground">Generated Image</h3>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={handleDownloadImage}
                        className="gap-2"
                      >
                        <Download className="w-4 h-4" />
                        Download
                      </Button>
                    </div>
                    <div className="rounded-lg overflow-hidden border border-border relative">
                      <img 
                        src={generatedImageUrl} 
                        alt="AI Generated Campaign Image" 
                        className="w-full h-auto"
                      />
                      <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2 py-1 bg-primary text-primary-foreground text-xs font-medium rounded-full">
                        <FolderOpen className="w-3 h-3" />
                        Saved to Library
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground mt-3 flex items-center gap-2">
                      <span>✓ Auto-saved to your Klyc library.</span>
                      <span className="text-muted-foreground/70">•</span>
                      <span>Right-click to save locally, or use the download button.</span>
                    </p>
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

              {/* Save Buttons */}
              <Button 
                className="w-full gap-2 py-6 text-lg"
                onClick={handleSaveDraft}
                disabled={isSaving}
              >
                {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <FileStack className="w-5 h-5" />}
                {isSaving ? "Saving..." : "Save Draft"}
              </Button>
            </div>
          )}

          {/* Written Results */}
          {showResults && selectedContentType === "written" && (
            <div className="space-y-6 mt-8">
              {/* Campaign Idea */}
              <Card>
                <CardContent className="p-6">
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">Campaign Idea</h3>
                  <Textarea
                    value={campaignIdea}
                    onChange={(e) => setCampaignIdea(e.target.value)}
                    placeholder="Your AI-generated campaign idea will appear here..."
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

              {/* Save Buttons */}
              <Button 
                className="w-full gap-2 py-6 text-lg"
                onClick={handleSaveDraft}
                disabled={isSaving}
              >
                {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <FileStack className="w-5 h-5" />}
                {isSaving ? "Saving..." : "Save Draft"}
              </Button>
            </div>
          )}

          {/* Video Ad Results */}
          {showResults && selectedContentType === "video-ad" && (
            <div className="space-y-6 mt-8">
              {/* Campaign Idea */}
              <Card>
                <CardContent className="p-6">
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">Campaign Idea</h3>
                  <Textarea
                    value={campaignIdea}
                    onChange={(e) => setCampaignIdea(e.target.value)}
                    placeholder="Your AI-generated campaign idea will appear here..."
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
                      onClick={() => handleCopy(videoScript, 'video-ad-script')}
                      className="gap-2"
                    >
                      {copiedField === 'video-ad-script' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
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
                            onClick={() => handleCopy(scene.prompt, `video-ad-scene-${index}`)}
                            className="gap-2"
                          >
                            {copiedField === `video-ad-scene-${index}` ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
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
                          Campaign Objective
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

              {/* Save Buttons */}
              <Button 
                className="w-full gap-2 py-6 text-lg"
                onClick={handleSaveDraft}
                disabled={isSaving}
              >
                {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <FileStack className="w-5 h-5" />}
                {isSaving ? "Saving..." : "Save Draft"}
              </Button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

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
        <h3 className="text-xl font-bold text-foreground">Campaign Strategy</h3>
      </div>

      <div className="space-y-6">
        <div>
          <h4 className="font-semibold text-foreground mb-3">Campaign Goals & Ideas</h4>
          <Textarea
            value={campaignGoals}
            onChange={(e) => setCampaignGoals(e.target.value)}
            placeholder="AI-generated campaign goals will appear here..."
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
          <h4 className="font-semibold text-foreground mb-2">Campaign Objective</h4>
          <Textarea
            value={campaignObjective}
            onChange={(e) => setCampaignObjective(e.target.value)}
            placeholder="AI-generated campaign objective will appear here..."
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
const SampleCampaigns = ({ campaigns }: { campaigns: Array<{ brand: string; campaign: string; platform: string; result: string; whyItWorked: string }> }) => {
  if (!campaigns || campaigns.length === 0) return null;

  return (
    <Card>
      <CardContent className="p-6">
        <div className="border-l-4 border-accent pl-4 mb-6">
          <h3 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Trophy className="w-5 h-5 text-primary" />
            Sample Winning Campaigns
          </h3>
          <p className="text-sm text-muted-foreground mt-1">Real-world campaigns that performed well for similar products</p>
        </div>

        <div className="grid gap-4">
          {campaigns.map((sample, index) => (
            <div
              key={index}
              className="rounded-xl border border-border bg-muted/30 p-5 space-y-3 hover:border-primary/40 transition-colors"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h4 className="font-semibold text-foreground">{sample.campaign}</h4>
                  <p className="text-sm text-muted-foreground">{sample.brand}</p>
                </div>
                <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary whitespace-nowrap">
                  {sample.platform}
                </span>
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
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default GenerateCampaignIdeas;
