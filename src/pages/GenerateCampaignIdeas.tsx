import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AppHeader from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Music, Image, FileText, Zap, Film, Sparkles } from "lucide-react";
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
    // TODO: Call AI to generate campaign ideas
    console.log({ selectedContentType, targetAudience, customPrompt });
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader user={user} />
      
      <main className="max-w-4xl mx-auto px-6 py-12">
        <div className="flex items-center gap-4 mb-2">
          <Button 
            variant="ghost" 
            onClick={() => navigate("/campaigns")}
            className="text-primary hover:text-primary/80"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Campaigns
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
                      onClick={() => setSelectedContentType(type.id)}
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
        </div>
      </main>
    </div>
  );
};

export default GenerateCampaignIdeas;
