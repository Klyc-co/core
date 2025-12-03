import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Zap, Play, Sparkles, Film, ArrowRight } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/dashboard");
      }
    });
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background overflow-hidden">
      {/* Gradient background */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(185_75%_55%/0.15),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,hsl(200_80%_50%/0.1),transparent_50%)]" />
      </div>

      {/* Header */}
      <header className="relative z-10 px-6 py-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
              <Zap className="w-5 h-5 text-primary" />
            </div>
            <span className="text-2xl font-bold gradient-text">Klyc</span>
          </div>
          <Button onClick={() => navigate("/auth")} variant="outline">
            Sign in
          </Button>
        </div>
      </header>

      {/* Hero */}
      <main className="relative z-10 px-6 pt-20 pb-32">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-8 animate-fade-in">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm text-primary font-medium">
              AI-Powered Video B-Roll Generation
            </span>
          </div>

          <h1 className="text-5xl md:text-7xl font-bold text-foreground leading-tight mb-6 animate-fade-in">
            Transform clips into
            <br />
            <span className="gradient-text">viral shorts</span>
          </h1>

          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10 animate-fade-in" style={{ animationDelay: "100ms" }}>
            Upload your podcast or YouTube clip, and Klyc automatically generates
            stunning AI B-roll to create scroll-stopping vertical shorts.
          </p>

          <div className="flex items-center justify-center gap-4 animate-fade-in" style={{ animationDelay: "200ms" }}>
            <Button onClick={() => navigate("/auth")} variant="glow" size="lg">
              Get Started Free
              <ArrowRight className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="lg">
              <Play className="w-4 h-4" />
              Watch Demo
            </Button>
          </div>

          {/* Features */}
          <div className="grid md:grid-cols-3 gap-6 mt-24">
            {[
              {
                icon: Film,
                title: "Auto Transcription",
                description: "Upload any clip and we'll transcribe it with precise timestamps",
              },
              {
                icon: Sparkles,
                title: "AI Visual Prompts",
                description: "Smart prompts generated for each segment of your video",
              },
              {
                icon: Zap,
                title: "B-Roll Generation",
                description: "One-click generation of professional B-roll footage",
              },
            ].map((feature, index) => (
              <div
                key={feature.title}
                className="glass rounded-2xl p-6 text-left animate-fade-in"
                style={{ animationDelay: `${300 + index * 100}ms` }}
              >
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground text-sm">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;
