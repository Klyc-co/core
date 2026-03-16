import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Sparkles, Linkedin, Instagram, Facebook, Youtube, ChevronLeft, ChevronRight, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface StepGenerateContentProps {
  onNext: () => void;
  scanData?: any;
  websiteUrl?: string;
  userName?: { firstName: string; lastName: string };
}

const platformIcons: Record<string, any> = {
  LinkedIn: Linkedin,
  Instagram: Instagram,
  Facebook: Facebook,
  YouTube: Youtube,
  TikTok: () => <span className="text-xs font-bold">TT</span>,
};

const platformColors: Record<string, string> = {
  LinkedIn: "bg-blue-600",
  Instagram: "bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400",
  Facebook: "bg-blue-500",
  YouTube: "bg-red-600",
  TikTok: "bg-black",
};

const StepGenerateContent = ({ onNext, scanData, websiteUrl, userName }: StepGenerateContentProps) => {
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [posts, setPosts] = useState<any[]>([]);
  const [statusMessage, setStatusMessage] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

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

    let msgIndex = 0;
    const interval = setInterval(() => {
      msgIndex = (msgIndex + 1) % statusMessages.length;
      setStatusMessage(statusMessages[msgIndex]);
    }, 3000);

    try {
      // Fix: read from businessSummary (AI-generated), not summary (asset counts)
      const biz = scanData?.businessSummary || {};
      const fallback =
        typeof scanData?.summary === "object" && scanData?.summary?.businessName
          ? scanData.summary
          : {};
      const merged = { ...fallback, ...biz };

      const { data, error } = await supabase.functions.invoke("generate-onboarding-posts", {
        body: {
          websiteUrl: websiteUrl || "",
          businessName: merged.businessName || "",
          businessDescription: merged.description || "",
          industry: merged.industry || "",
          targetAudience: merged.targetAudience || merged.audience || "",
          valueProposition: merged.valueProposition || "",
          productCategory: merged.productCategory || "",
          userName: userName || { firstName: "", lastName: "" },
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

  const displayName = userName?.firstName || "there";
  const activePost = posts[activeIndex];
  const primaryPlatform = activePost?.platforms?.[0] || "Instagram";

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-5xl animate-fade-in">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            {generated
              ? `Here's your first content, ${displayName}.`
              : `${displayName}, let's generate your first content.`}
          </h1>
          <p className="text-muted-foreground max-w-lg mx-auto">
            {generated
              ? "Swipe through your AI-generated posts. These are queued for your approval."
              : "Klyc will create 3 custom posts tailored to your business using everything we learned."}
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
            <div className="flex items-center gap-6 justify-center">
              {/* Left arrow */}
              <button
                onClick={() => setActiveIndex((i) => Math.max(0, i - 1))}
                disabled={activeIndex === 0}
                className="w-10 h-10 rounded-full border border-border bg-card flex items-center justify-center hover:bg-accent disabled:opacity-30 disabled:cursor-not-allowed transition-colors flex-shrink-0"
              >
                <ChevronLeft className="w-5 h-5 text-foreground" />
              </button>

              {/* Social media post mockup */}
              <div className="w-full max-w-md flex-shrink-0">
                {/* Platform header bar */}
                <div className={cn(
                  "rounded-t-2xl px-4 py-2.5 flex items-center gap-2",
                  platformColors[primaryPlatform] || "bg-muted"
                )}>
                  {(() => {
                    const Icon = platformIcons[primaryPlatform];
                    return Icon ? <Icon className="w-4 h-4 text-white" /> : null;
                  })()}
                  <span className="text-white text-sm font-medium">{primaryPlatform}</span>
                  <span className="text-white/60 text-xs ml-auto">
                    Post {activeIndex + 1} of {posts.length}
                  </span>
                </div>

                {/* Image area */}
                <div className="relative aspect-square bg-muted border-x border-border overflow-hidden">
                  {activePost?.imageUrl ? (
                    <img
                      src={activePost.imageUrl}
                      alt={activePost.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted to-muted-foreground/10">
                      <Sparkles className="w-12 h-12 text-muted-foreground/20" />
                    </div>
                  )}
                </div>

                {/* Caption area */}
                <div className="bg-card border border-border border-t-0 rounded-b-2xl p-5">
                  <h3 className="text-base font-bold text-foreground mb-2">
                    {activePost?.title}
                  </h3>
                  <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">
                    {activePost?.caption}
                  </p>

                  {/* Platform badges */}
                  {activePost?.platforms?.length > 0 && (
                    <div className="flex gap-2 mt-4 pt-3 border-t border-border">
                      {activePost.platforms.map((p: string) => {
                        const Icon = platformIcons[p];
                        return (
                          <div
                            key={p}
                            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-secondary text-xs text-muted-foreground"
                          >
                            {Icon && <Icon className="w-3 h-3" />}
                            {p}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Right arrow */}
              <button
                onClick={() => setActiveIndex((i) => Math.min(posts.length - 1, i + 1))}
                disabled={activeIndex === posts.length - 1}
                className="w-10 h-10 rounded-full border border-border bg-card flex items-center justify-center hover:bg-accent disabled:opacity-30 disabled:cursor-not-allowed transition-colors flex-shrink-0"
              >
                <ChevronRight className="w-5 h-5 text-foreground" />
              </button>
            </div>

            {/* Dots indicator */}
            <div className="flex justify-center gap-2 mt-4">
              {posts.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setActiveIndex(i)}
                  className={cn(
                    "w-2.5 h-2.5 rounded-full transition-all",
                    i === activeIndex ? "bg-primary scale-110" : "bg-border hover:bg-muted-foreground/40"
                  )}
                />
              ))}
            </div>

            {/* Finish button */}
            <div className="flex justify-center mt-8">
              <Button
                onClick={() => onNext()}
                size="lg"
                className="h-12 px-10 text-base font-semibold"
              >
                Finish & Go to Dashboard
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
