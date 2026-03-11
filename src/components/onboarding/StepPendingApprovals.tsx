import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Check, X, Pencil, Sparkles, Linkedin, Instagram, Facebook, Youtube } from "lucide-react";

interface StepPendingApprovalsProps {
  posts: any[];
}

const platformIcons: Record<string, any> = {
  LinkedIn: Linkedin,
  Instagram: Instagram,
  Facebook: Facebook,
  YouTube: Youtube,
  TikTok: () => <span className="text-[10px] font-bold">TT</span>,
};

const StepPendingApprovals = ({ posts }: StepPendingApprovalsProps) => {
  const navigate = useNavigate();
  const goToDashboard = () => navigate("/home");

  const displayPosts = posts.length > 0 ? posts : defaultPosts;

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-4xl animate-fade-in">
        <div className="text-center mb-10">
          <div
            className="w-12 h-12 mx-auto mb-4 rounded-full flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, hsl(185 75% 45%), hsl(250 60% 60%))" }}
          >
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-3">Pending Approvals</h1>
          <p className="text-muted-foreground">
            Your first content is ready. Review and approve what Klyc generated.
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-3 mb-10">
          {displayPosts.map((post: any, idx: number) => (
            <div
              key={post.id || idx}
              className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden flex flex-col"
            >
              {/* Preview area */}
              <div className="h-48 bg-secondary/50 flex items-center justify-center overflow-hidden">
                {post.imageUrl ? (
                  <img
                    src={post.imageUrl}
                    alt={post.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Sparkles className="w-10 h-10 text-muted-foreground/20" />
                )}
              </div>

              <div className="p-5 flex flex-col flex-1">
                <h3 className="text-sm font-semibold text-foreground mb-1">{post.title}</h3>
                <p className="text-xs text-muted-foreground mb-4 flex-1 line-clamp-3">
                  {post.caption || post.description}
                </p>

                {/* Platforms */}
                <div className="flex gap-1.5 mb-4">
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

                {/* Actions */}
                <div className="flex gap-2">
                  <Button size="sm" className="flex-1 h-8 text-xs font-medium">
                    <Check className="w-3 h-3 mr-1" />
                    Approve
                  </Button>
                  <Button size="sm" variant="outline" className="h-8 w-8 p-0">
                    <Pencil className="w-3 h-3" />
                  </Button>
                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-destructive hover:text-destructive">
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-center">
          <Button onClick={goToDashboard} size="lg" className="h-12 px-10 text-base font-semibold">
            Go to Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
};

const defaultPosts = [
  { id: 1, title: "Brand Story Introduction", description: "Introduce your brand's mission.", platforms: ["LinkedIn", "Instagram"], imageUrl: null },
  { id: 2, title: "Product Spotlight", description: "Highlight your key offering.", platforms: ["Instagram", "Facebook"], imageUrl: null },
  { id: 3, title: "Industry Insight", description: "Share a thought leadership insight.", platforms: ["LinkedIn", "YouTube"], imageUrl: null },
];

export default StepPendingApprovals;
