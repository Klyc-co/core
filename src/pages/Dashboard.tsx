import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Plus, LogOut, Video, Clock, Loader2 } from "lucide-react";
import type { User } from "@supabase/supabase-js";
import Logo from "@/components/Logo";

interface Project {
  id: string;
  title: string;
  status: string;
  created_at: string;
  duration_seconds: number | null;
}

const statusLabels: Record<string, { label: string; class: string }> = {
  uploaded: { label: "Uploaded", class: "status-badge--processing" },
  processing: { label: "Processing", class: "status-badge--processing" },
  ready_for_edit: { label: "Ready to Edit", class: "status-badge--ready" },
  rendering: { label: "Rendering", class: "status-badge--generating" },
  complete: { label: "Complete", class: "status-badge--ready" },
};

const Dashboard = () => {
  const [user, setUser] = useState<User | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
        if (!session) {
          navigate("/auth");
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
        fetchProjects();
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const fetchProjects = async () => {
    const { data, error } = await supabase
      .from("projects")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setProjects(data || []);
    }
    setLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return "—";
    return `${Math.round(seconds)}s`;
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Logo />

          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">{user?.email}</span>
            <Button variant="ghost" size="icon" onClick={handleLogout}>
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-1">Projects</h1>
            <p className="text-muted-foreground">Create and manage your B-roll videos</p>
          </div>
          <Button onClick={() => navigate("/projects/new")} variant="glow" size="lg">
            <Plus className="w-4 h-4" />
            New Project
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : projects.length === 0 ? (
          <div className="glass rounded-2xl p-12 text-center">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Video className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">No projects yet</h3>
            <p className="text-muted-foreground mb-6">
              Upload your first video clip to get started
            </p>
            <Button onClick={() => navigate("/projects/new")} variant="glow">
              <Plus className="w-4 h-4" />
              Create your first project
            </Button>
          </div>
        ) : (
          <div className="grid gap-4">
            {projects.map((project, index) => (
              <div
                key={project.id}
                className="segment-card p-5 cursor-pointer animate-fade-in"
                style={{ animationDelay: `${index * 50}ms` }}
                onClick={() => {
                  if (project.status === "processing") {
                    navigate(`/projects/${project.id}/processing`);
                  } else {
                    navigate(`/projects/${project.id}/edit`);
                  }
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg bg-secondary flex items-center justify-center">
                      <Video className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div>
                      <h3 className="font-medium text-foreground">{project.title}</h3>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {formatDuration(project.duration_seconds)}
                        </span>
                        <span>•</span>
                        <span>{formatDate(project.created_at)}</span>
                      </div>
                    </div>
                  </div>
                  <div
                    className={`status-badge ${statusLabels[project.status]?.class || ""}`}
                  >
                    {statusLabels[project.status]?.label || project.status}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Dashboard;
