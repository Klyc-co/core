import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AppHeader from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Copy, Check, X, Loader2, Share2 } from "lucide-react";
import type { User } from "@supabase/supabase-js";

// TikTok logo as inline SVG component
const TikTokIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
  </svg>
);

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
  const [user, setUser] = useState<User | null>(null);
  const [draft, setDraft] = useState<CampaignDraft | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState("");
  const [scenePrompts, setScenePrompts] = useState<{ time: string; title: string; prompt: string }[]>([]);

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
          
          <Button
            variant="outline"
            onClick={() => {
              // TikTok share intent - opens TikTok with content ready to post
              const shareText = encodeURIComponent(
                `${draft?.campaign_idea || ''}\n\n${tags.join(' ')}`
              );
              window.open(`https://www.tiktok.com/upload`, '_blank');
            }}
            className="gap-2"
          >
            <TikTokIcon className="w-4 h-4" />
            Share to TikTok
          </Button>
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
        </div>
      </main>
    </div>
  );
};

export default CampaignDraftView;
