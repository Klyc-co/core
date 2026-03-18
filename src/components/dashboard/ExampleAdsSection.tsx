import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparkles, ArrowRight, Play, Megaphone } from "lucide-react";

const videoModules = import.meta.glob("../../assets/example-ads/*.mp4", {
  eager: true,
  import: "default",
}) as Record<string, string>;

const getDisplayName = (filePath: string) => {
  const fileName = filePath.split("/").pop()?.replace(/\.mp4$/i, "") ?? "example-ad";
  return fileName.replace(/[_-]+/g, " ").trim();
};

export default function ExampleAdsSection() {
  const navigate = useNavigate();

  const exampleAds = useMemo(
    () =>
      Object.entries(videoModules)
        .sort(([pathA], [pathB]) => pathA.localeCompare(pathB, undefined, { numeric: true }))
        .map(([filePath, videoUrl], index) => ({
          id: filePath,
          title: `Example Ad ${String(index + 1).padStart(2, "0")}`,
          fileLabel: getDisplayName(filePath),
          videoUrl,
          platform: "Video ad",
          angle: "Creative reference",
          result: "Use this as inspiration for pacing, framing, and creative structure.",
        })),
    []
  );

  return (
    <Card>
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Sparkles className="h-5 w-5 text-primary" />
            Example Ads
          </CardTitle>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Review your uploaded ad examples here before building your next campaign.
          </p>
        </div>

        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => navigate("/campaigns/generate")}>
          Build from example
          <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      </CardHeader>

      <CardContent>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {exampleAds.map((ad) => (
            <article
              key={ad.id}
              className="overflow-hidden rounded-xl border border-border bg-muted/30 transition-colors hover:border-primary/40"
            >
              <div className="border-b border-border bg-background/80">
                <video
                  className="aspect-[9/16] w-full bg-muted object-cover"
                  controls
                  muted
                  playsInline
                  preload="metadata"
                  src={ad.videoUrl}
                >
                  Your browser does not support the video tag.
                </video>
              </div>

              <div className="space-y-3 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 space-y-2">
                    <Badge variant="outline" className="w-fit bg-background/80">
                      {ad.platform}
                    </Badge>
                    <div className="space-y-1">
                      <h3 className="font-semibold leading-snug text-foreground">{ad.title}</h3>
                      <p className="text-xs text-muted-foreground">{ad.fileLabel}</p>
                    </div>
                  </div>
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Play className="h-4 w-4" />
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">Uploaded file</Badge>
                  <Badge variant="secondary">{ad.angle}</Badge>
                </div>

                <div className="rounded-lg border border-border bg-background/80 p-3">
                  <div className="mb-1 flex items-center gap-2 text-sm font-medium text-foreground">
                    <Megaphone className="h-4 w-4 text-primary" />
                    Why this works
                  </div>
                  <p className="text-sm text-muted-foreground">{ad.result}</p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
