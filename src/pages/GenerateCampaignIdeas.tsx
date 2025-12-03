import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AppHeader from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Music, Image, FileText, Zap, Film, Sparkles, Copy, Check, X, FileStack } from "lucide-react";
import type { User } from "@supabase/supabase-js";

const contentTypes = [
  { id: "social-video", label: "Social Video", icon: Music },
  { id: "visual-post", label: "Visual Post", icon: Image },
  { id: "written", label: "Written", icon: FileText },
  { id: "audio", label: "Audio", icon: Zap },
  { id: "video-ad", label: "Video Ad", icon: Film },
];

const GenerateCampaignIdeas = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [selectedContentType, setSelectedContentType] = useState<string | null>(null);
  const [targetAudience, setTargetAudience] = useState("");
  const [customPrompt, setCustomPrompt] = useState("");
  const [showResults, setShowResults] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [tags, setTags] = useState(["#viral", "#socialmedia", "#trending", "#productlaunch", "#reels", "#shorts", "#tiktok", "#engagement"]);
  const [newTag, setNewTag] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        navigate("/auth");
      } else {
        setUser(user);
      }
    });
  }, [navigate]);

  const handleGenerate = () => {
    if (selectedContentType === "social-video" || selectedContentType === "visual-post" || selectedContentType === "written") {
      setShowResults(true);
    }
    console.log({ selectedContentType, targetAudience, customPrompt });
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
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {contentTypes.map((type) => {
                  const Icon = type.icon;
                  return (
                    <button
                      key={type.id}
                      onClick={() => {
                        setSelectedContentType(type.id);
                        setShowResults(false);
                      }}
                      className={`flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-all ${
                        selectedContentType === type.id
                          ? "border-primary bg-primary/10"
                          : "border-border hover:border-primary/50 hover:bg-muted/50"
                      }`}
                    >
                      <Icon className="w-6 h-6 mb-2 text-foreground" />
                      <span className="text-sm text-foreground">{type.label}</span>
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

          {/* Custom Prompt */}
          <Card>
            <CardContent className="p-6">
              <h2 className="text-lg font-semibold text-foreground mb-4">Add Custom Prompt (Optional)</h2>
              <Textarea
                placeholder="Add any specific details or requirements for your campaign idea..."
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                rows={3}
                className="resize-none"
              />
              <p className="text-sm text-muted-foreground mt-2">
                Optional. Provide additional details to customize the generated idea.
              </p>
            </CardContent>
          </Card>

          {/* Generate Button */}
          <Button 
            className="w-full gap-2 bg-gradient-to-r from-purple-500 to-purple-700 hover:opacity-90 py-6 text-lg"
            onClick={handleGenerate}
          >
            <Sparkles className="w-5 h-5" />
            Generate Campaign Ideas
          </Button>

          {/* Social Video Results */}
          {showResults && selectedContentType === "social-video" && (
            <div className="space-y-6 mt-8">
              {/* Campaign Idea */}
              <Card>
                <CardContent className="p-6">
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">Campaign Idea</h3>
                  <p className="text-foreground font-medium">Viral Social Video for Social Media Marketing Blueprint</p>
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
                      onClick={() => handleCopy('Scene 1: Hook - "Wait for the ending"\nScene 2: Problem - Show common pain point\nScene 3: Solution - Introduce Social Media Marketing Blueprint\nScene 4: CTA - "Swipe up for 50% off"', 'script')}
                      className="gap-2"
                    >
                      {copiedField === 'script' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      Copy
                    </Button>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-4 space-y-2 text-sm text-foreground">
                    <p>Scene 1: Hook - "Wait for the ending"</p>
                    <p>Scene 2: Problem - Show common pain point</p>
                    <p>Scene 3: Solution - Introduce Social Media Marketing Blueprint</p>
                    <p>Scene 4: CTA - "Swipe up for 50% off"</p>
                  </div>
                </CardContent>
              </Card>

              {/* Video Generation Prompts */}
              <Card>
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold text-foreground mb-4">Video Generation Prompts (by Scene)</h3>
                  <div className="space-y-4">
                    {[
                      { time: "[0-2s]", title: "Hook - Attention-grabbing opening", prompt: "Dramatic, eye-catching opening shot, fast-paced movement, viral-worthy moment, trending audio compatible, bold visuals, TikTok/Reel aesthetic, short-form video format, 9:16 vertical video, high energy, stop-scroll worthy content" },
                      { time: "[2-6s]", title: "Problem - Show common pain point", prompt: "Relatable problem scenario showing user frustration or challenge, realistic everyday situation, authentic emotion, fast cuts between shots, trending sound effects or dialogue overlay, trending TikTok/Instagram Reel style, before-state visualization" },
                      { time: "[6-12s]", title: "Solution - Introduce ${selectedProduct?.name}", prompt: "Product reveal with Social Media Marketing Blueprint as the solution, product transition with effects, transformation moment, trending transitions, smooth cuts synchronized with audio, product benefit demonstration, after-state showing improvement" },
                      { time: "[12-15s]", title: "CTA - Call to action with trending hook", prompt: "Compelling call-to-action overlay text, trending caption styles, swipe-up prompt or link text, urgency elements (limited offer, trending now), eye-catching colors, trending TikTok/Reel CTA format, brand consistency, audience engagement prompt" },
                    ].map((scene, index) => (
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
                        <p className="text-sm text-muted-foreground">{scene.prompt}</p>
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
              />

              {/* Save Button */}
              <Button 
                className="w-full gap-2 py-6 text-lg"
                onClick={() => console.log("Save to drafts")}
              >
                <FileStack className="w-5 h-5" />
                Save to Campaign Drafts
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
                  <p className="text-foreground font-medium">Viral Social Video for Social Media Marketing Blueprint</p>
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
                      onClick={() => handleCopy('', 'caption')}
                      className="gap-2"
                    >
                      {copiedField === 'caption' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      Copy
                    </Button>
                  </div>
                  <Textarea
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
                      onClick={() => handleCopy('', 'image-prompt')}
                      className="gap-2"
                    >
                      {copiedField === 'image-prompt' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      Copy
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    Use this prompt with an AI image generator like DALL-E, Midjourney, or Stable Diffusion:
                  </p>
                  <Textarea
                    placeholder="Your AI-generated image prompt will appear here..."
                    rows={5}
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
              />

              {/* Save Button */}
              <Button 
                className="w-full gap-2 py-6 text-lg"
                onClick={() => console.log("Save to drafts")}
              >
                <FileStack className="w-5 h-5" />
                Save to Campaign Drafts
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
                  <p className="text-foreground font-medium">Viral Social Video for Social Media Marketing Blueprint</p>
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
                      onClick={() => handleCopy('', 'article-outline')}
                      className="gap-2"
                    >
                      {copiedField === 'article-outline' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      Copy
                    </Button>
                  </div>
                  <Textarea
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
              />

              {/* Save Button */}
              <Button 
                className="w-full gap-2 py-6 text-lg"
                onClick={() => console.log("Save to drafts")}
              >
                <FileStack className="w-5 h-5" />
                Save to Campaign Drafts
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
  addTag 
}: {
  tags: string[];
  removeTag: (tag: string) => void;
  newTag: string;
  setNewTag: (value: string) => void;
  addTag: () => void;
}) => (
  <Card>
    <CardContent className="p-6">
      <div className="border-l-4 border-primary pl-4 mb-6">
        <h3 className="text-xl font-bold text-foreground">Campaign Strategy</h3>
      </div>

      <div className="space-y-6">
        <div>
          <h4 className="font-semibold text-foreground mb-3">Campaign Goals & Ideas</h4>
          <div className="space-y-2">
            {["Increase engagement and viral potential", "Drive product awareness and discovery", "Boost brand credibility and social proof", "Generate user-generated content"].map((goal, index) => (
              <div key={index} className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center">
                  <Check className="w-3 h-3 text-primary" />
                </div>
                <span className="text-foreground">{goal}</span>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h4 className="font-semibold text-foreground mb-2">Target Audience</h4>
          <div className="bg-muted/50 rounded-lg p-4">
            <p className="text-foreground">Young adults aged 18-35, trend-conscious, active on social media platforms like TikTok and Instagram, interested in innovative products</p>
          </div>
        </div>

        <div>
          <h4 className="font-semibold text-foreground mb-2">Campaign Objective</h4>
          <div className="bg-muted/50 rounded-lg p-4">
            <p className="text-foreground">Create shareable, entertaining content that drives viral reach and brand awareness through authentic storytelling and social trends</p>
          </div>
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
