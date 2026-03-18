import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparkles, ArrowRight, Play, Image as ImageIcon, Megaphone } from "lucide-react";

const exampleAds = [
  {
    platform: "Instagram Reels",
    format: "Short-form video",
    hook: "Your next best customer is already scrolling.",
    angle: "Problem → transformation",
    result: "High scroll-stopping potential",
    description:
      "Fast-paced opening, customer pain point in the first 2 seconds, then a simple before-and-after payoff with a direct CTA.",
  },
  {
    platform: "Facebook Feed",
    format: "Static image ad",
    hook: "Cut wasted spend. Keep the conversions.",
    angle: "Cost-saving proof",
    result: "Clear direct-response structure",
    description:
      "Single bold headline, one outcome-focused benefit, and a short supporting line designed to drive clicks without over-explaining.",
  },
  {
    platform: "TikTok",
    format: "UGC-style ad",
    hook: "I didn’t expect this to work, but it did.",
    angle: "Creator testimonial",
    result: "Native platform feel",
    description:
      "Casual first-person delivery, light product demo, and a believable reaction arc that feels organic instead of overly produced.",
  },
];

export default function ExampleAdsSection() {
  const navigate = useNavigate();

  return (
    <Card>
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <CardTitle className="text-base sm:text-lg flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Example Ads
          </CardTitle>
          <p className="text-sm text-muted-foreground max-w-2xl">
            A few proven ad directions you can reference before building your next campaign.
          </p>
        </div>

        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => navigate("/campaigns/generate")}>
          Build from example
          <ArrowRight className="w-3.5 h-3.5" />
        </Button>
      </CardHeader>

      <CardContent>
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          {exampleAds.map((ad) => {
            const FormatIcon = ad.format.toLowerCase().includes("video") ? Play : ImageIcon;

            return (
              <article
                key={`${ad.platform}-${ad.hook}`}
                className="rounded-xl border border-border bg-muted/30 p-5 transition-colors hover:border-primary/40"
              >
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="space-y-2 min-w-0">
                    <Badge variant="outline" className="w-fit bg-background/80">
                      {ad.platform}
                    </Badge>
                    <h3 className="font-semibold text-foreground leading-snug">
                      {ad.hook}
                    </h3>
                  </div>
                  <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <FormatIcon className="w-4 h-4" />
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary">{ad.format}</Badge>
                    <Badge variant="secondary">{ad.angle}</Badge>
                  </div>

                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {ad.description}
                  </p>

                  <div className="rounded-lg border border-border bg-background/80 p-3">
                    <div className="flex items-center gap-2 text-sm font-medium text-foreground mb-1">
                      <Megaphone className="w-4 h-4 text-primary" />
                      Why this works
                    </div>
                    <p className="text-sm text-muted-foreground">{ad.result}</p>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
