import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AppHeader from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Copy, Check, X, Loader2, Share2, Sparkles, Zap, Send, Youtube } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useZapierIntegration } from "@/hooks/use-zapier-integration";
import { useClientContext } from "@/contexts/ClientContext";
import type { User } from "@supabase/supabase-js";

// TikTok logo as inline SVG component
const TikTokIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
  </svg>
);

// Platform icons
const InstagramIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
  </svg>
);

const LinkedInIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
  </svg>
);

const TwitterIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
  </svg>
);

interface PlatformCaption {
  caption: string;
  hashtags: string[];
}

interface GeneratedCaptions {
  tiktok: PlatformCaption;
  instagram: PlatformCaption;
  linkedin: PlatformCaption;
  twitter: PlatformCaption;
}

interface CampaignDraft {
  id: string;
  campaign_idea: string | null;
  content_type: string | null;
  target_audience: string | null;
  prompt: string | null;
  video_script: string | null;
  scene_prompts: string | null;
  post_caption: string | null;
  image_prompt: string | null;
  article_outline: string | null;
  campaign_goals: string | null;
  target_audience_description: string | null;
  campaign_objective: string | null;
  tags: string[] | null;
  created_at: string;
}

const CampaignDraftView = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const { triggerZapier, isSending: isSendingToZapier } = useZapierIntegration();
  const { selectedClientUserId, selectedClientName, isDefaultClient } = useClientContext();
  const [user, setUser] = useState<User | null>(null);
  const [draft, setDraft] = useState<CampaignDraft | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState("");
  const [scenePrompts, setScenePrompts] = useState<{ time: string; title: string; prompt: string }[]>([]);
  const [generatedCaptions, setGeneratedCaptions] = useState<GeneratedCaptions | null>(null);
  const [isGeneratingCaptions, setIsGeneratingCaptions] = useState(false);
  const [isSendingForApproval, setIsSendingForApproval] = useState(false);
  const [isPostingToYouTube, setIsPostingToYouTube] = useState(false);

  const handleSendToZapier = async () => {
    if (!id) return;
    await triggerZapier(id, "all_data");
  };

  const handleSendForApproval = async () => {
    if (!id || !user) return;
    
    // Check if a client is selected
    if (isDefaultClient || !selectedClientUserId) {
      toast({
        title: "No client selected",
        description: "Please select a client from the client switcher to send for approval.",
        variant: "destructive",
      });
      return;
    }

    setIsSendingForApproval(true);
    try {
      const { error } = await supabase
        .from("campaign_approvals")
        .insert({
          campaign_draft_id: id,
          marketer_id: user.id,
          client_id: selectedClientUserId,
          status: "pending",
        });

      if (error) throw error;

      toast({
        title: "Sent for approval!",
        description: `Campaign draft sent to ${selectedClientName} for approval.`,
      });
      
      navigate("/campaigns/pending");
    } catch (error) {
      console.error("Error sending for approval:", error);
      toast({
        title: "Failed to send for approval",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsSendingForApproval(false);
    }
  };

  const handlePostToYouTube = async () => {
    if (!id || !user || !draft) return;

    setIsPostingToYouTube(true);
    try {
      // Check YouTube connection
      const { data: ytConnection } = await supabase
        .from("social_connections")
        .select("id")
        .eq("user_id", user.id)
        .eq("platform", "youtube")
        .maybeSingle();

      if (!ytConnection) {
        toast({
          title: "YouTube not connected",
          description: "Please connect your YouTube account first from the Import Brand Sources page.",
          variant: "destructive",
        });
        return;
      }

      // Create a post_queue entry
      const { data: postEntry, error: postError } = await supabase
        .from("post_queue")
        .insert({
          user_id: user.id,
          campaign_draft_id: id,
          content_type: draft.content_type || "text",
          post_text: draft.campaign_idea || draft.post_caption || "",
          video_url: null, // User will need video content
          status: "publishing",
        })
        .select()
        .single();

      if (postError || !postEntry) throw postError || new Error("Failed to create post entry");

      // Create YouTube platform target
      const { error: targetError } = await supabase
        .from("post_platform_targets")
        .insert({
          post_queue_id: postEntry.id,
          platform: "youtube",
          status: "pending",
        });

      if (targetError) throw targetError;

      // Trigger the publish function
      const { data: publishResult, error: publishError } = await supabase.functions.invoke("publish-post", {
        body: { postQueueId: postEntry.id },
      });

      if (publishError) throw publishError;

      if (publishResult?.success) {
        toast({
          title: "Posted to YouTube!",
          description: "Your campaign has been published to YouTube successfully.",
        });
      } else {
        const errorMsg = publishResult?.results?.[0]?.error || "Publishing failed";
        toast({
          title: "YouTube posting failed",
          description: errorMsg,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error posting to YouTube:", error);
      toast({
        title: "Failed to post to YouTube",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsPostingToYouTube(false);
    }
  };

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        navigate("/auth");
      } else {
        setUser(user);
        if (id) fetchDraft(id);
      }
    });
  }, [navigate, id]);

  const fetchDraft = async (draftId: string) => {
    try {
      const { data, error } = await supabase
        .from("campaign_drafts" as any)
        .select("*")
        .eq("id", draftId)
        .single();

      if (error) throw error;
      const draftData = data as unknown as CampaignDraft;
      setDraft(draftData);
      setTags(draftData.tags || []);
      
      if (draftData.scene_prompts) {
        try {
          setScenePrompts(JSON.parse(draftData.scene_prompts));
        } catch {
          setScenePrompts([]);
        }
      }
    } catch (error) {
      console.error("Error fetching draft:", error);
      navigate("/campaigns/drafts");
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

  const getContentTypeLabel = (type: string | null) => {
    const types: Record<string, string> = {
      "social-video": "Social Video",
      "visual-post": "Visual Post",
      "written": "Written",
      "video-ad": "Video Ad",
    };
    return types[type || ""] || type || "Unknown";
  };

  const handleGenerateCaptions = async () => {
    if (!draft) return;
    
    setIsGeneratingCaptions(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-captions", {
        body: {
          campaignIdea: draft.campaign_idea,
          targetAudience: draft.target_audience_description || draft.target_audience,
          contentType: draft.content_type,
          tags: tags,
        },
      });

      if (error) throw error;

      if (data?.captions) {
        setGeneratedCaptions(data.captions);
        toast({
          title: "Captions generated!",
          description: "Platform-specific captions are ready to copy.",
        });
      }
    } catch (error) {
      console.error("Error generating captions:", error);
      toast({
        title: "Failed to generate captions",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingCaptions(false);
    }
  };

  const getPlatformUrl = (platform: string): string => {
    const platformUrls: Record<string, string> = {
      tiktok: "https://www.tiktok.com/upload",
      instagram: "https://www.instagram.com/",
      linkedin: "https://www.linkedin.com/feed/",
      twitter: "https://twitter.com/compose/tweet",
    };
    return platformUrls[platform] || "#";
  };

  const handleCopyCaption = async (platform: string, caption: string) => {
    await navigator.clipboard.writeText(caption);
    setCopiedField(`caption-${platform}`);
    toast({
      title: "Caption copied!",
      description: `Now paste it on ${platform}`,
    });
    setTimeout(() => setCopiedField(null), 2000);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader user={user} />
        <main className="max-w-4xl mx-auto px-6 py-12">
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        </main>
      </div>
    );
  }

  if (!draft) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader user={user} />
        <main className="max-w-4xl mx-auto px-6 py-12">
          <p className="text-muted-foreground">Draft not found</p>
        </main>
      </div>
    );
  }

  const contentType = draft.content_type;

  return (
    <div className="min-h-screen bg-background">
      <AppHeader user={user} />
      
      <main className="max-w-4xl mx-auto px-6 py-12">
        <div className="flex items-center justify-between mb-2">
          <Button 
            variant="ghost" 
            onClick={() => navigate("/campaigns/drafts")}
            className="text-primary hover:text-primary/80"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Campaign Drafts
          </Button>
          
          <div className="flex gap-2 flex-wrap">
            <Button
              variant="outline"
              onClick={handlePostToYouTube}
              disabled={isPostingToYouTube}
              className="gap-2 border-red-600 text-red-600 hover:bg-red-600/10"
            >
              {isPostingToYouTube ? <Loader2 className="w-4 h-4 animate-spin" /> : <Youtube className="w-4 h-4" />}
              {isPostingToYouTube ? "Posting..." : "Post to YouTube"}
            </Button>
            <Button
              variant="outline"
              onClick={handleSendToZapier}
              disabled={isSendingToZapier}
              className="gap-2 border-orange-500 text-orange-500 hover:bg-orange-500/10"
            >
              {isSendingToZapier ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
              {isSendingToZapier ? "Sending..." : "Send to Zapier"}
            </Button>
            <Button
              onClick={handleSendForApproval}
              disabled={isSendingForApproval}
              className="gap-2"
            >
              {isSendingForApproval ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {isSendingForApproval ? "Sending..." : "Send for Approval"}
            </Button>
          </div>
        </div>
        
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">{draft.campaign_idea || "Untitled Campaign"}</h1>
          <p className="text-muted-foreground">{getContentTypeLabel(contentType)} • Created {new Date(draft.created_at).toLocaleDateString()}</p>
        </div>

        <div className="space-y-6">
          {/* Campaign Idea */}
          <Card>
            <CardContent className="p-6">
              <h3 className="text-sm font-medium text-muted-foreground mb-2">Campaign Idea</h3>
              <p className="text-foreground">{draft.campaign_idea || "No campaign idea"}</p>
            </CardContent>
          </Card>

          {/* Target Audience Input */}
          {draft.target_audience && (
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-foreground mb-2">Target Audience (Input)</h3>
                <p className="text-foreground">{draft.target_audience}</p>
              </CardContent>
            </Card>
          )}

          {/* Custom Prompt */}
          {draft.prompt && (
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-foreground mb-2">Prompt</h3>
                <p className="text-foreground">{draft.prompt}</p>
              </CardContent>
            </Card>
          )}

          {/* Social Video / Video Ad Content */}
          {(contentType === "social-video" || contentType === "video-ad") && (
            <>
              {/* Video Script */}
              {draft.video_script && (
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-foreground">Video Script</h3>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleCopy(draft.video_script || "", 'script')}
                        className="gap-2"
                      >
                        {copiedField === 'script' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        Copy
                      </Button>
                    </div>
                    <p className="text-foreground whitespace-pre-wrap">{draft.video_script}</p>
                  </CardContent>
                </Card>
              )}

              {/* Video Generation Prompts */}
              {scenePrompts.length > 0 && (
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
                          <p className="text-foreground whitespace-pre-wrap">{scene.prompt}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}

          {/* Visual Post Content */}
          {contentType === "visual-post" && (
            <>
              {draft.post_caption && (
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-foreground">Post Caption</h3>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleCopy(draft.post_caption || "", 'caption')}
                        className="gap-2"
                      >
                        {copiedField === 'caption' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        Copy
                      </Button>
                    </div>
                    <p className="text-foreground whitespace-pre-wrap">{draft.post_caption}</p>
                  </CardContent>
                </Card>
              )}

              {draft.image_prompt && (
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-foreground">Image Generation Prompt</h3>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleCopy(draft.image_prompt || "", 'image')}
                        className="gap-2"
                      >
                        {copiedField === 'image' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        Copy
                      </Button>
                    </div>
                    <p className="text-foreground whitespace-pre-wrap">{draft.image_prompt}</p>
                  </CardContent>
                </Card>
              )}
            </>
          )}

          {/* Written Content */}
          {contentType === "written" && draft.article_outline && (
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-foreground">Article/Blog Outline</h3>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handleCopy(draft.article_outline || "", 'outline')}
                    className="gap-2"
                  >
                    {copiedField === 'outline' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    Copy
                  </Button>
                </div>
                <p className="text-foreground whitespace-pre-wrap">{draft.article_outline}</p>
              </CardContent>
            </Card>
          )}

          {/* Campaign Strategy */}
          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">Campaign Strategy</h3>
              <div className="space-y-4">
                {/* Tags */}
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">Tags</h4>
                  <div className="flex flex-wrap gap-2">
                    {tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm"
                      >
                        {tag}
                      </span>
                    ))}
                    {tags.length === 0 && <span className="text-muted-foreground text-sm">No tags</span>}
                  </div>
                </div>

                {/* Campaign Goals */}
                {draft.campaign_goals && (
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-2">Campaign Goals</h4>
                    <p className="text-foreground">{draft.campaign_goals}</p>
                  </div>
                )}

                {/* Target Audience Description */}
                {draft.target_audience_description && (
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-2">Target Audience Description</h4>
                    <p className="text-foreground">{draft.target_audience_description}</p>
                  </div>
                )}

                {/* Campaign Objective */}
                {draft.campaign_objective && (
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-2">Campaign Objective</h4>
                    <p className="text-foreground">{draft.campaign_objective}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Social Media Captions Generator */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-foreground">Social Media Captions</h3>
                  <p className="text-sm text-muted-foreground">Generate platform-specific captions optimized for each social network</p>
                </div>
                <Button
                  onClick={handleGenerateCaptions}
                  disabled={isGeneratingCaptions}
                  className="gap-2"
                >
                  {isGeneratingCaptions ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4" />
                  )}
                  {isGeneratingCaptions ? "Generating..." : "Generate Captions"}
                </Button>
              </div>

              {generatedCaptions && (
                <div className="grid gap-4 md:grid-cols-2">
                  {/* TikTok */}
                  <div className="border border-border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <TikTokIcon className="w-5 h-5" />
                        <span className="font-medium">TikTok</span>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCopyCaption("tiktok", generatedCaptions.tiktok.caption)}
                        className="gap-2"
                      >
                        {copiedField === "caption-tiktok" ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        Copy Caption
                      </Button>
                    </div>
                    <p className="text-sm text-foreground whitespace-pre-wrap mb-3">{generatedCaptions.tiktok.caption}</p>
                    <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
                      <span className="text-xs text-muted-foreground flex-1">Open in new tab:</span>
                      <code className="text-xs bg-background px-2 py-1 rounded select-all">tiktok.com/upload</code>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          navigator.clipboard.writeText("https://www.tiktok.com/upload");
                          toast({ title: "URL copied!", description: "Paste in a new browser tab" });
                        }}
                        className="h-7 px-2"
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>

                  {/* Instagram */}
                  <div className="border border-border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <InstagramIcon className="w-5 h-5" />
                        <span className="font-medium">Instagram</span>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCopyCaption("instagram", generatedCaptions.instagram.caption)}
                        className="gap-2"
                      >
                        {copiedField === "caption-instagram" ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        Copy Caption
                      </Button>
                    </div>
                    <p className="text-sm text-foreground whitespace-pre-wrap mb-3">{generatedCaptions.instagram.caption}</p>
                    <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
                      <span className="text-xs text-muted-foreground flex-1">Open in new tab:</span>
                      <code className="text-xs bg-background px-2 py-1 rounded select-all">instagram.com</code>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          navigator.clipboard.writeText("https://www.instagram.com/");
                          toast({ title: "URL copied!", description: "Paste in a new browser tab" });
                        }}
                        className="h-7 px-2"
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>

                  {/* LinkedIn */}
                  <div className="border border-border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <LinkedInIcon className="w-5 h-5" />
                        <span className="font-medium">LinkedIn</span>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCopyCaption("linkedin", generatedCaptions.linkedin.caption)}
                        className="gap-2"
                      >
                        {copiedField === "caption-linkedin" ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        Copy Caption
                      </Button>
                    </div>
                    <p className="text-sm text-foreground whitespace-pre-wrap mb-3">{generatedCaptions.linkedin.caption}</p>
                    <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
                      <span className="text-xs text-muted-foreground flex-1">Open in new tab:</span>
                      <code className="text-xs bg-background px-2 py-1 rounded select-all">linkedin.com/feed</code>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          navigator.clipboard.writeText("https://www.linkedin.com/feed/");
                          toast({ title: "URL copied!", description: "Paste in a new browser tab" });
                        }}
                        className="h-7 px-2"
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>

                  {/* Twitter/X */}
                  <div className="border border-border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <TwitterIcon className="w-5 h-5" />
                        <span className="font-medium">X (Twitter)</span>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCopyCaption("twitter", generatedCaptions.twitter.caption)}
                        className="gap-2"
                      >
                        {copiedField === "caption-twitter" ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        Copy Caption
                      </Button>
                    </div>
                    <p className="text-sm text-foreground whitespace-pre-wrap mb-3">{generatedCaptions.twitter.caption}</p>
                    <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
                      <span className="text-xs text-muted-foreground flex-1">Open in new tab:</span>
                      <code className="text-xs bg-background px-2 py-1 rounded select-all">x.com/compose/post</code>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          navigator.clipboard.writeText("https://x.com/compose/post");
                          toast({ title: "URL copied!", description: "Paste in a new browser tab" });
                        }}
                        className="h-7 px-2"
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {!generatedCaptions && (
                <div className="text-center py-8 text-muted-foreground">
                  <p>Click "Generate Captions" to create platform-specific captions for TikTok, Instagram, LinkedIn, and X.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default CampaignDraftView;
