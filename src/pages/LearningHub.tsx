import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Lightbulb, TrendingUp, FlaskConical, BookOpen, Sparkles } from "lucide-react";

export default function LearningHub() {
  return (
    <div className="max-w-5xl mx-auto py-6 px-4 space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Lightbulb className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">Learning Hub</h1>
          <p className="text-sm text-muted-foreground">Insights, experiments, and strategic recommendations from campaign performance</p>
        </div>
      </div>

      <Tabs defaultValue="insights">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="insights">This Week</TabsTrigger>
          <TabsTrigger value="experiments">Experiments</TabsTrigger>
          <TabsTrigger value="strategy">Strategy Updates</TabsTrigger>
          <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
        </TabsList>

        <TabsContent value="insights" className="mt-4 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" />
                This Week's Insights
              </CardTitle>
              <CardDescription>Performance patterns detected across your campaigns</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <InsightCard
                  title="Engagement peaks on Tuesday mornings"
                  description="Posts published between 8-10am on Tuesdays show 23% higher engagement than weekly average."
                  type="timing"
                />
                <InsightCard
                  title="Story-driven hooks outperform question hooks"
                  description="Narrative-style opening hooks drove 18% more click-throughs in the last 7 days."
                  type="content"
                />
                <InsightCard
                  title="LinkedIn audience responding to thought leadership"
                  description="Authority-positioned content on LinkedIn generated 2.3x more profile visits."
                  type="platform"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="experiments" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <FlaskConical className="w-4 h-4 text-primary" />
                Active Experiments
              </CardTitle>
              <CardDescription>A/B tests and content experiments in progress</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground py-8 text-center">
                No active experiments. Start a campaign with multiple variants to begin testing.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="strategy" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-primary" />
                Strategy Updates
              </CardTitle>
              <CardDescription>Strategic adjustments based on cumulative learning</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground py-8 text-center">
                The Learning Engine needs 5+ completed campaigns to generate strategy updates. Campaign data is being collected.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recommendations" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                Recommendations
              </CardTitle>
              <CardDescription>AI-generated recommendations based on performance data</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground py-8 text-center">
                Recommendations will appear here once enough campaign data has been processed.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function InsightCard({ title, description, type }: { title: string; description: string; type: string }) {
  const typeColors: Record<string, string> = {
    timing: "bg-primary/10 text-primary border-primary/20",
    content: "bg-accent/10 text-accent border-accent/20",
    platform: "bg-success/10 text-success border-success/20",
  };
  return (
    <div className="p-3 rounded-lg border border-border/60 space-y-1">
      <div className="flex items-center gap-2">
        <p className="text-sm font-medium text-foreground">{title}</p>
        <Badge variant="outline" className={`text-[10px] h-5 ${typeColors[type] || ""}`}>{type}</Badge>
      </div>
      <p className="text-xs text-muted-foreground">{description}</p>
    </div>
  );
}
