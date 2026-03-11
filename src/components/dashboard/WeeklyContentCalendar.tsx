import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, ArrowRight, ChevronLeft, ChevronRight, Image as ImageIcon, Linkedin, Instagram, Facebook, Youtube } from "lucide-react";
import { format, startOfWeek, addDays, isToday, isSameDay } from "date-fns";

interface ScheduledPost {
  id: string;
  post_text: string | null;
  image_url: string | null;
  content_type: string;
  scheduled_at: string;
  status: string;
}

const platformIcon = (type: string) => {
  const t = type.toLowerCase();
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
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));

  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const from = days[0].toISOString();
      const to = addDays(days[6], 1).toISOString();

      const { data } = await supabase
        .from("post_queue")
        .select("id, post_text, image_url, content_type, scheduled_at, status")
        .eq("user_id", user.id)
        .gte("scheduled_at", from)
        .lt("scheduled_at", to)
        .in("status", ["scheduled", "approved", "pending_approval", "published"])
        .order("scheduled_at", { ascending: true });

      setPosts(data || []);
      setLoading(false);
    };
    load();
  }, [weekStart]);

  const postsForDay = (day: Date) =>
    posts.filter((p) => p.scheduled_at && isSameDay(new Date(p.scheduled_at), day));

  const scroll = (dir: number) => {
    scrollRef.current?.scrollBy({ left: dir * 220, behavior: "smooth" });
  };

  return (
    <Card>
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
                    {dayPosts.map((post) => (
                      <div
                        key={post.id}
                        className="rounded-lg border border-border/50 bg-secondary/30 p-2 cursor-pointer hover:bg-secondary/60 transition-colors"
                        onClick={() => navigate("/campaigns/schedule")}
                      >
                        {post.image_url && (
                          <img
                            src={post.image_url}
                            alt=""
                            className="w-full h-16 object-cover rounded-md mb-1.5"
                          />
                        )}
                        <p className="text-[11px] text-foreground line-clamp-2 leading-tight">
                          {post.post_text?.slice(0, 80) || post.content_type}
                        </p>
                        <div className="flex items-center gap-1.5 mt-1.5">
                          {platformIcon(post.content_type)}
                          <span className="text-[10px] text-muted-foreground">
                            {post.scheduled_at ? format(new Date(post.scheduled_at), "h:mma") : ""}
                          </span>
                        </div>
                      </div>
                    ))}
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
