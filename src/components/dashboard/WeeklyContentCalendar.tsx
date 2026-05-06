import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, ArrowRight, ChevronLeft, ChevronRight, Linkedin, Instagram, Facebook, Youtube } from "lucide-react";
import { format, addDays, isToday, isSameDay } from "date-fns";

interface ScheduledPost {
  id: string;
  platform: string;
  content_payload: Record<string, string> | null;
  scheduled_for: string;
  status: string;
}

const platformIcon = (platform: string) => {
  const t = platform.toLowerCase();
  if (t.includes("linkedin")) return <Linkedin className="w-3 h-3" />;
  if (t.includes("instagram")) return <Instagram className="w-3 h-3" />;
  if (t.includes("facebook")) return <Facebook className="w-3 h-3" />;
  if (t.includes("youtube")) return <Youtube className="w-3 h-3" />;
  return null;
};

const WeeklyContentCalendar = () => {
  const navigate = useNavigate();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [posts, setPosts] = useState<ScheduledPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [weekStart, setWeekStart] = useState(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  });

  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  useEffect(() => {
    const load = async () => {
      setLoading(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      // Resolve client_id through client_profiles (scheduled_posts has no user_id column)
      const { data: profile } = await supabase
        .from("client_profiles")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!profile) { setPosts([]); setLoading(false); return; }

      const from = days[0].toISOString();
      const to = addDays(days[6], 1).toISOString();

      const { data } = await supabase
        .from("scheduled_posts")
        .select("id, platform, content_payload, scheduled_for, status")
        .eq("client_id", profile.id)
        .gte("scheduled_for", from)
        .lt("scheduled_for", to)
        .in("status", ["pending", "scheduled", "approved", "published"])
        .order("scheduled_for", { ascending: true });

      setPosts(data || []);
      setLoading(false);
    };
    load();
  }, [weekStart]);

  const postsForDay = (day: Date) =>
    posts.filter((p) => p.scheduled_for && isSameDay(new Date(p.scheduled_for), day));

  return (
    <Card className="max-h-[320px]">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-primary" />
            This Week's Content
          </CardTitle>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setWeekStart(addDays(weekStart, -7))}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setWeekStart(addDays(weekStart, 7))}>
              <ChevronRight className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" className="text-xs h-7 ml-1" onClick={() => navigate("/campaigns/schedule")}>
              Full Calendar <ArrowRight className="w-3 h-3 ml-1" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0 relative">
        <div ref={scrollRef} className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin">
          {days.map((day) => {
            const dayPosts = postsForDay(day);
            const today = isToday(day);
            return (
              <div
                key={day.toISOString()}
                className={`flex-shrink-0 w-[180px] rounded-xl border p-3 transition-colors ${
                  today ? "border-primary/50 bg-primary/5" : "border-border bg-card"
                }`}
              >
                <div className="flex items-center justify-between mb-2.5">
                  <div>
                    <p className={`text-xs font-medium ${today ? "text-primary" : "text-muted-foreground"}`}>
                      {format(day, "EEE")}
                    </p>
                    <p className={`text-lg font-bold ${today ? "text-primary" : "text-foreground"}`}>
                      {format(day, "d")}
                    </p>
                  </div>
                  {dayPosts.length > 0 && (
                    <Badge variant="secondary" className="text-[10px] h-5">{dayPosts.length}</Badge>
                  )}
                </div>

                {loading ? (
                  <div className="space-y-2">
                    <div className="h-16 rounded-lg bg-muted/50 animate-pulse" />
                  </div>
                ) : dayPosts.length === 0 ? (
                  <p className="text-xs text-muted-foreground/50 text-center py-4">No posts</p>
                ) : (
                  <div className="space-y-2 max-h-[200px] overflow-y-auto">
                    {dayPosts.map((post) => {
                      const payload = post.content_payload as any;
                      const postText: string = payload?.post_text || payload?.topic || "";
                      return (
                        <div
                          key={post.id}
                          className="rounded-lg border border-border/50 bg-secondary/30 p-2 cursor-pointer hover:bg-secondary/60 transition-colors"
                          onClick={() => navigate("/campaigns/schedule")}
                        >
                          <p className="text-[11px] text-foreground line-clamp-2 leading-tight">
                            {postText.slice(0, 80) || post.platform}
                          </p>
                          <div className="flex items-center gap-1.5 mt-1.5">
                            {platformIcon(post.platform)}
                            <span className="text-[10px] text-muted-foreground capitalize">{post.platform}</span>
                            <span className="text-[10px] text-muted-foreground ml-auto">
                              {post.scheduled_for ? format(new Date(post.scheduled_for), "h:mma") : ""}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default WeeklyContentCalendar;
