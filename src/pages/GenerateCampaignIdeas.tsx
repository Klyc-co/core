import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AppHeader from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Music, Image, FileText, Film, Sparkles, Copy, Check, X, FileStack, Loader2, Zap, Wand2, Download } from "lucide-react";
import { useZapierIntegration } from "@/hooks/use-zapier-integration";
import { useToast } from "@/hooks/use-toast";
import type { User } from "@supabase/supabase-js";

const contentTypes = [
  { id: "social-video", label: "Social Video", icon: Music },
  { id: "visual-post", label: "Visual Post", icon: Image },
  { id: "written", label: "Written", icon: FileText },
  { id: "video-ad", label: "Video Ad", icon: Film },
];

const GenerateCampaignIdeas = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { triggerZapier, isSending: isSendingToZapier } = useZapierIntegration();
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
  const [selectedImageModel, setSelectedImageModel] = useState<"nano-banana" | "runway" | "fooocus">("nano-banana");

  // Placeholder for products - will be fetched from database when products table exists
  const products: { id: string; name: string }[] = [];

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        navigate("/auth");
      } else {
        setUser(user);
      }
    });
  }, [navigate]);

  const handleGenerate = async () => {
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

  const handleGenerateImage = async () => {
    if (!imagePrompt.trim()) {
      toast({
        title: "No image prompt",
        description: "Please generate a campaign idea first or enter an image prompt.",
        variant: "destructive",
      });
      return;
    }

    setIsGeneratingImage(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-image', {
        body: { 
          prompt: imagePrompt,
          model: selectedImageModel 
        },
      });

      if (error) {
        throw new Error(error.message || "Failed to generate image");
      }
      setGeneratedImageUrl(data.imageUrl);
      
      toast({
        title: "Image generated!",
        description: "Your AI-generated image is ready.",
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
    if (!generatedImageUrl) return;
    
    const link = document.createElement('a');
    link.href = generatedImageUrl;
    link.download = `campaign-image-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSaveDraft = async (sendToZapier: boolean = false) => {
    if (!user) return;
    
    setIsSaving(true);
    try {
      const insertResult = await supabase.from("campaign_drafts" as any).insert({
        user_id: user.id,
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
      
      // Trigger Zapier if requested
      if (sendToZapier && insertResult.data) {
        const draftData = insertResult.data as unknown as { id: string };
        await triggerZapier(draftData.id, "all_data");
      }
      
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
              <Select value={selectedProduct || ""} onValueChange={setSelectedProduct}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a product (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {products.length === 0 ? (
                    <SelectItem value="none" disabled>No products available</SelectItem>
                  ) : (
                    products.map((product) => (
                      <SelectItem key={product.id} value={product.id}>
                        {product.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground mt-2">
                Add product details from your profile to enrich the campaign idea.
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

              {/* Save Buttons */}
              <div className="flex gap-3">
                <Button 
                  className="flex-1 gap-2 py-6 text-lg"
                  onClick={() => handleSaveDraft(false)}
                  disabled={isSaving || isSendingToZapier}
                >
                  {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <FileStack className="w-5 h-5" />}
                  {isSaving ? "Saving..." : "Save Draft"}
                </Button>
                <Button 
                  className="flex-1 gap-2 py-6 text-lg bg-gradient-to-r from-orange-500 to-amber-500 hover:opacity-90"
                  onClick={() => handleSaveDraft(true)}
                  disabled={isSaving || isSendingToZapier}
                >
                  {isSendingToZapier ? <Loader2 className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5" />}
                  {isSendingToZapier ? "Sending..." : "Save & Send to Zapier"}
                </Button>
              </div>
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
                  <p className="text-sm text-muted-foreground mb-3">
                    Edit the prompt below, select an AI model, and click "Generate Image":
                  </p>
                  <Textarea
                    value={imagePrompt}
                    onChange={(e) => setImagePrompt(e.target.value)}
                    placeholder="Your AI-generated image prompt will appear here..."
                    rows={5}
                    className="resize-none bg-muted/50"
                  />
                  
                  {/* Model Selection */}
                  <div className="mt-4 mb-4">
                    <p className="text-sm font-medium text-foreground mb-2">Select AI Model:</p>
                    <div className="grid grid-cols-3 gap-2">
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
                    disabled={isGeneratingImage || !imagePrompt.trim() || selectedImageModel === "fooocus"}
                  >
                    {isGeneratingImage ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Generating with {selectedImageModel === "nano-banana" ? "Nano Banana" : "Runway"}...
                      </>
                    ) : (
                      <>
                        <Wand2 className="w-4 h-4" />
                        Generate Image with {selectedImageModel === "nano-banana" ? "Nano Banana" : selectedImageModel === "runway" ? "Runway" : "Fooocus"}
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
                    <div className="rounded-lg overflow-hidden border border-border">
                      <img 
                        src={generatedImageUrl} 
                        alt="AI Generated Campaign Image" 
                        className="w-full h-auto"
                      />
                    </div>
                    <p className="text-sm text-muted-foreground mt-3">
                      Right-click to save, or use the download button above.
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

              {/* Save Buttons */}
              <div className="flex gap-3">
                <Button 
                  className="flex-1 gap-2 py-6 text-lg"
                  onClick={() => handleSaveDraft(false)}
                  disabled={isSaving || isSendingToZapier}
                >
                  {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <FileStack className="w-5 h-5" />}
                  {isSaving ? "Saving..." : "Save Draft"}
                </Button>
                <Button 
                  className="flex-1 gap-2 py-6 text-lg bg-gradient-to-r from-orange-500 to-amber-500 hover:opacity-90"
                  onClick={() => handleSaveDraft(true)}
                  disabled={isSaving || isSendingToZapier}
                >
                  {isSendingToZapier ? <Loader2 className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5" />}
                  {isSendingToZapier ? "Sending..." : "Save & Send to Zapier"}
                </Button>
              </div>
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

              {/* Save Buttons */}
              <div className="flex gap-3">
                <Button 
                  className="flex-1 gap-2 py-6 text-lg"
                  onClick={() => handleSaveDraft(false)}
                  disabled={isSaving || isSendingToZapier}
                >
                  {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <FileStack className="w-5 h-5" />}
                  {isSaving ? "Saving..." : "Save Draft"}
                </Button>
                <Button 
                  className="flex-1 gap-2 py-6 text-lg bg-gradient-to-r from-orange-500 to-amber-500 hover:opacity-90"
                  onClick={() => handleSaveDraft(true)}
                  disabled={isSaving || isSendingToZapier}
                >
                  {isSendingToZapier ? <Loader2 className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5" />}
                  {isSendingToZapier ? "Sending..." : "Save & Send to Zapier"}
                </Button>
              </div>
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

              {/* Save Buttons */}
              <div className="flex gap-3">
                <Button 
                  className="flex-1 gap-2 py-6 text-lg"
                  onClick={() => handleSaveDraft(false)}
                  disabled={isSaving || isSendingToZapier}
                >
                  {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <FileStack className="w-5 h-5" />}
                  {isSaving ? "Saving..." : "Save Draft"}
                </Button>
                <Button 
                  className="flex-1 gap-2 py-6 text-lg bg-gradient-to-r from-orange-500 to-amber-500 hover:opacity-90"
                  onClick={() => handleSaveDraft(true)}
                  disabled={isSaving || isSendingToZapier}
                >
                  {isSendingToZapier ? <Loader2 className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5" />}
                  {isSendingToZapier ? "Sending..." : "Save & Send to Zapier"}
                </Button>
              </div>
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

export default GenerateCampaignIdeas;
