import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Sparkles, Linkedin, Instagram, Facebook, Youtube } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface StepGenerateContentProps {
  onNext: () => void;
}

const platformIcons: Record<string, any> = {
  LinkedIn: Linkedin,
  Instagram: Instagram,
  Facebook: Facebook,
  YouTube: Youtube,
  TikTok: () => <span className="text-xs font-bold">TT</span>,
};

const StepGenerateContent = ({ onNext }: StepGenerateContentProps) => {
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [posts, setPosts] = useState<any[]>([]);
  const [statusMessage, setStatusMessage] = useState("");

  const statusMessages = [
    "Analyzing your brand profile...",
    "Crafting content strategy...",
    "Writing post captions...",
    "Generating visuals with AI...",
    "Polishing your content...",
    "Almost there...",
  ];

  const handleGenerate = async () => {
    setGenerating(true);
    setStatusMessage(statusMessages[0]);

    // Rotate status messages
    let msgIndex = 0;
    const interval = setInterval(() => {
      msgIndex = (msgIndex + 1) % statusMessages.length;
      setStatusMessage(statusMessages[msgIndex]);
    }, 3000);

    try {
      const { data, error } = await supabase.functions.invoke("generate-onboarding-posts", {
        body: {
          businessSummary: "",
          businessType: "",
          websiteUrl: "",
        },
      });

      clearInterval(interval);

      if (error) throw error;

      if (data?.posts && data.posts.length > 0) {
        setPosts(data.posts);
        setGenerated(true);
      } else {
        throw new Error("No posts returned");
      }
    } catch (e: any) {
      clearInterval(interval);
      console.error("Generation error:", e);
      toast.error("Content generation failed. Please try again.");
    } finally {
      setGenerating(false);
      setStatusMessage("");
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-3xl animate-fade-in">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-foreground mb-3">
            Generate this week's content.
          </h1>
          <p className="text-muted-foreground max-w-lg mx-auto">
            Klyc can now create your first content set based on your website, profile, and brand library.
          </p>
        </div>

        {!generated ? (
          <div className="flex flex-col items-center gap-4">
            <Button
              onClick={handleGenerate}
              disabled={generating}
              size="lg"
              className="h-14 px-10 text-lg font-semibold"
            >
              {generating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5 mr-2" />
                  Generate My First 3 Posts
                </>
              )}
            </Button>
            {generating && statusMessage && (
              <p className="text-sm text-muted-foreground animate-fade-in">
                {statusMessage}
              </p>
            )}
          </div>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-3 mb-10">
              {posts.map((post, idx) => (
                <div
                  key={idx}
                  className="bg-card rounded-2xl border border-border p-5 shadow-sm flex flex-col animate-fade-in"
                >
                  <div className="w-full h-40 rounded-xl bg-secondary/50 mb-4 overflow-hidden flex items-center justify-center">
                    {post.imageUrl ? (
                      <img
                        src={post.imageUrl}
                        alt={post.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Sparkles className="w-8 h-8 text-muted-foreground/30" />
                    )}
                  </div>
                  <h3 className="text-sm font-semibold text-foreground mb-1">{post.title}</h3>
                  <p className="text-xs text-muted-foreground mb-4 flex-1 line-clamp-3">{post.caption}</p>
                  <div className="flex gap-1.5">
                    {(post.platforms || []).map((p: string) => {
                      const Icon = platformIcons[p];
                      return (
                        <div
                          key={p}
                          className="w-7 h-7 rounded-lg bg-secondary flex items-center justify-center"
                          title={p}
                        >
                          {Icon && <Icon className="w-3.5 h-3.5 text-muted-foreground" />}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-center">
              <Button
                onClick={() => onNext()}
                size="lg"
                className="h-12 px-10 text-base font-semibold"
              >
                Finish
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default StepGenerateContent;
