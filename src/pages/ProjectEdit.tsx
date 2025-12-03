import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Play, Download, Loader2, Sparkles } from "lucide-react";
import SegmentCard from "@/components/SegmentCard";
import Logo from "@/components/Logo";

interface Project {
  id: string;
  title: string;
  status: string;
  original_video_url: string | null;
  final_video_url: string | null;
  duration_seconds: number | null;
}

interface Segment {
  id: string;
  index: number;
  start_seconds: number;
  end_seconds: number;
  transcript_snippet: string | null;
  visual_prompt: string | null;
  use_broll: boolean;
  broll_status: string;
  broll_video_url: string | null;
}

const statusLabels: Record<string, { label: string; class: string }> = {
  uploaded: { label: "Uploaded", class: "status-badge--processing" },
  processing: { label: "Processing", class: "status-badge--processing" },
  ready_for_edit: { label: "Ready to Edit", class: "status-badge--ready" },
  rendering: { label: "Rendering", class: "status-badge--generating" },
  complete: { label: "Complete", class: "status-badge--ready" },
};

const ProjectEdit = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [project, setProject] = useState<Project | null>(null);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [loading, setLoading] = useState(true);
  const [generatingAll, setGeneratingAll] = useState(false);
  const [rendering, setRendering] = useState(false);

  useEffect(() => {
    if (!id) return;
    fetchProject();
    fetchSegments();
  }, [id]);

  const fetchProject = async () => {
    const { data, error } = await supabase
      .from("projects")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      navigate("/dashboard");
    } else if (!data) {
      toast({ title: "Not found", description: "Project not found", variant: "destructive" });
      navigate("/dashboard");
    } else {
      setProject(data);
    }
    setLoading(false);
  };

  const fetchSegments = async () => {
    const { data, error } = await supabase
      .from("segments")
      .select("*")
      .eq("project_id", id)
      .order("index");

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setSegments(data || []);
    }
  };

  const handleSegmentUpdate = (updatedSegment: Segment) => {
    setSegments((prev) =>
      prev.map((s) => (s.id === updatedSegment.id ? updatedSegment : s))
    );
  };

  const handleGenerateAll = async () => {
    const toGenerate = segments.filter(
      (s) => s.use_broll && (s.broll_status === "not_generated" || s.broll_status === "failed")
    );

    if (toGenerate.length === 0) {
      toast({ title: "Nothing to generate", description: "Toggle B-roll on for segments first" });
      return;
    }

    setGeneratingAll(true);

    for (const segment of toGenerate) {
      handleSegmentUpdate({ ...segment, broll_status: "generating" });

      try {
        const { data, error } = await supabase.functions.invoke("generate-broll", {
          body: { segmentId: segment.id, prompt: segment.visual_prompt },
        });

        if (error) throw error;

        handleSegmentUpdate({
          ...segment,
          broll_status: "generated",
          broll_video_url: data.videoUrl,
        });
      } catch (error: any) {
        handleSegmentUpdate({ ...segment, broll_status: "failed" });
      }
    }

    setGeneratingAll(false);
    toast({ title: "Generation complete!", description: "B-roll videos have been generated" });
    fetchSegments();
  };

  const handleRender = async () => {
    const needsGeneration = segments.filter(
      (s) => s.use_broll && s.broll_status !== "generated"
    );

    if (needsGeneration.length > 0) {
      toast({
        title: "Missing B-roll",
        description: `${needsGeneration.length} segment(s) need B-roll generated first`,
        variant: "destructive",
      });
      return;
    }

    setRendering(true);
    setProject((prev) => prev ? { ...prev, status: "rendering" } : null);

    try {
      const { data, error } = await supabase.functions.invoke("render-video", {
        body: { projectId: id },
      });

      if (error) throw error;

      // Render completed - update with final video URL
      setProject((prev) => prev ? { 
        ...prev, 
        status: "complete",
        final_video_url: data.videoUrl 
      } : null);
      
      toast({ title: "Video rendered!", description: "Your final video is ready" });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      // Refetch project to get actual status
      fetchProject();
    } finally {
      setRendering(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!project) return null;

  const brollCount = segments.filter((s) => s.use_broll).length;
  const generatedCount = segments.filter(
    (s) => s.use_broll && s.broll_status === "generated"
  ).length;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={() => navigate("/dashboard")} className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
            <Logo />
            <span className="text-muted-foreground">|</span>
            <h1 className="font-medium text-foreground">{project.title}</h1>
            <div className={`status-badge ${statusLabels[project.status]?.class}`}>
              {statusLabels[project.status]?.label}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={handleGenerateAll}
              disabled={generatingAll || brollCount === 0}
            >
              {generatingAll ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              Generate All B-roll
            </Button>
            <Button
              variant="glow"
              onClick={handleRender}
              disabled={rendering || project.status === "rendering"}
            >
              {rendering || project.status === "rendering" ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Play className="w-4 h-4" />
              )}
              Render Final Video
            </Button>
            {project.status === "complete" && project.final_video_url && (
              <Button asChild variant="success">
                <a href={project.final_video_url} download>
                  <Download className="w-4 h-4" />
                  Download MP4
                </a>
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="flex flex-col" style={{ height: 'calc(100vh - 4rem)' }}>
        {/* Videos Section - Top with independent scroll */}
        <div className="flex-1 min-h-0 px-6 py-6 overflow-auto border-b border-border">
          <div className="flex gap-8 items-start">
            {/* Original Video - Horizontal/Large */}
            <div className="space-y-3 flex-1">
              <h2 className="text-lg font-semibold text-foreground">Original Video</h2>
              <div className="video-player aspect-video w-full max-w-2xl">
                {project.original_video_url ? (
                  <video
                    src={project.original_video_url}
                    controls
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    No video
                  </div>
                )}
              </div>
            </div>

            {/* Final Video - Vertical */}
            <div className="space-y-3 flex-shrink-0">
              <h2 className="text-lg font-semibold text-foreground">Final Video</h2>
              <div className="video-player aspect-[9/16] w-[200px]">
                {project.status === "complete" && project.final_video_url ? (
                  <video
                    src={project.final_video_url}
                    controls
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground text-sm text-center px-2">
                    {project.status === "rendering" ? "Rendering..." : "Not rendered yet"}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Storyboard - Bottom with independent scroll (horizontal & vertical) */}
        <div className="flex-shrink-0 h-[320px] bg-card/50 backdrop-blur-sm flex flex-col">
          <div className="px-6 py-2 flex items-center justify-between flex-shrink-0 border-b border-border/50">
            <h2 className="text-lg font-semibold text-foreground">
              Storyboard ({segments.length} segments)
            </h2>
            {brollCount > 0 && (
              <span className="text-sm text-muted-foreground">
                {generatedCount}/{brollCount} B-roll generated
              </span>
            )}
          </div>
          
          <div className="flex-1 overflow-auto p-4">
            <div className="flex gap-4 px-6 min-w-max">
              {segments.map((segment, index) => (
                <div key={segment.id} className="w-[320px] flex-shrink-0">
                  <SegmentCard
                    segment={segment}
                    onUpdate={handleSegmentUpdate}
                    style={{ animationDelay: `${index * 50}ms` }}
                  />
                </div>
              ))}

              {segments.length === 0 && (
                <div className="glass rounded-xl p-8 text-center w-full">
                  <p className="text-muted-foreground">
                    No segments yet. Processing may still be in progress.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ProjectEdit;
