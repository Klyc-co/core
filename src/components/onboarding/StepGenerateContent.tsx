import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight, Loader2, Sparkles, Linkedin, Instagram, Facebook, Youtube } from "lucide-react";

interface StepGenerateContentProps {
  onNext: (posts: any[]) => void;
}

const mockPosts = [
  {
    id: 1,
    title: "Brand Story Introduction",
    description: "Introduce your brand's origin story and mission to build authentic connection with your audience.",
    platforms: ["LinkedIn", "Instagram", "Facebook"],
  },
  {
    id: 2,
    title: "Product/Service Spotlight",
    description: "Highlight your key offering with benefit-driven messaging and a strong visual hook.",
    platforms: ["Instagram", "TikTok", "Facebook"],
  },
  {
    id: 3,
    title: "Industry Insight & Authority",
    description: "Share a valuable insight from your industry to position your brand as a thought leader.",
    platforms: ["LinkedIn", "YouTube", "Facebook"],
  },
];

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

  const handleGenerate = async () => {
    setGenerating(true);
    // Simulate generation delay
    await new Promise((r) => setTimeout(r, 3000));
    setGenerated(true);
    setGenerating(false);
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
          <div className="flex justify-center">
            <Button
              onClick={handleGenerate}
              disabled={generating}
              size="lg"
              className="h-14 px-10 text-lg font-semibold"
            >
              {generating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  Generating your content...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5 mr-2" />
                  Generate My First 3 Posts
                </>
              )}
            </Button>
          </div>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-3 mb-10">
              {mockPosts.map((post) => (
                <div
                  key={post.id}
                  className="bg-card rounded-2xl border border-border p-5 shadow-sm flex flex-col animate-fade-in"
                >
                  <div className="w-full h-32 rounded-xl bg-secondary/50 mb-4 flex items-center justify-center">
                    <Sparkles className="w-8 h-8 text-muted-foreground/30" />
                  </div>
                  <h3 className="text-sm font-semibold text-foreground mb-1">{post.title}</h3>
                  <p className="text-xs text-muted-foreground mb-4 flex-1">{post.description}</p>
                  <div className="flex gap-1.5">
                    {post.platforms.map((p) => {
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
                onClick={() => onNext(mockPosts)}
                size="lg"
                className="h-12 px-10 text-base font-semibold"
              >
                View Pending Approvals
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default StepGenerateContent;
