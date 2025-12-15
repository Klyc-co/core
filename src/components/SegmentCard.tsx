import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { useSignedUrl } from "@/hooks/use-signed-url";
import { RefreshCw, Sparkles, Loader2, CheckCircle, XCircle, Clock, Timer, StopCircle } from "lucide-react";

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

interface SegmentCardProps {
  segment: Segment;
  onUpdate: (segment: Segment) => void;
  style?: React.CSSProperties;
}

const statusConfig: Record<string, { icon: React.ElementType; label: string; class: string }> = {
  not_generated: { icon: Clock, label: "Not generated", class: "text-muted-foreground" },
  generating: { icon: Loader2, label: "Generating...", class: "text-primary" },
  generated: { icon: CheckCircle, label: "Ready", class: "text-success" },
  failed: { icon: XCircle, label: "Failed", class: "text-destructive" },
};

// Runway typically takes 2-4 minutes
const ESTIMATED_GENERATION_TIME = 180; // 3 minutes in seconds

const SegmentCard = ({ segment, onUpdate, style }: SegmentCardProps) => {
  const [prompt, setPrompt] = useState(segment.visual_prompt || "");
  const [regenerating, setRegenerating] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const startTimeRef = useRef<number | null>(null);
  const { toast } = useToast();
  
  // Get signed URL for B-roll video
  const { signedUrl: brollSignedUrl } = useSignedUrl(segment.broll_video_url);

  // Track elapsed time when generating
  useEffect(() => {
    if (segment.broll_status === "generating") {
      if (!startTimeRef.current) {
        startTimeRef.current = Date.now();
      }
      
      const interval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTimeRef.current!) / 1000);
        setElapsedTime(elapsed);
      }, 1000);

      return () => clearInterval(interval);
    } else {
      startTimeRef.current = null;
      setElapsedTime(0);
    }
  }, [segment.broll_status]);

  const formatTime = (seconds: number) => {
    return `${Math.floor(seconds)}s`;
  };

  const formatElapsedTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getEstimatedRemaining = () => {
    const remaining = Math.max(0, ESTIMATED_GENERATION_TIME - elapsedTime);
    if (remaining === 0 && elapsedTime > ESTIMATED_GENERATION_TIME) {
      return "Almost done...";
    }
    const mins = Math.floor(remaining / 60);
    const secs = remaining % 60;
    return `~${mins}:${secs.toString().padStart(2, '0')} remaining`;
  };

  const getProgress = () => {
    return Math.min(95, (elapsedTime / ESTIMATED_GENERATION_TIME) * 100);
  };

  const handleToggleBroll = async (checked: boolean) => {
    const { error } = await supabase
      .from("segments")
      .update({ use_broll: checked })
      .eq("id", segment.id);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      onUpdate({ ...segment, use_broll: checked });
    }
  };

  const handlePromptChange = async (value: string) => {
    setPrompt(value);
    
    const { error } = await supabase
      .from("segments")
      .update({ visual_prompt: value })
      .eq("id", segment.id);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      onUpdate({ ...segment, visual_prompt: value });
    }
  };

  const handleRegeneratePrompt = async () => {
    setRegenerating(true);

    try {
      const { data, error } = await supabase.functions.invoke("regenerate-prompt", {
        body: { segmentId: segment.id, transcript: segment.transcript_snippet },
      });

      if (error) throw error;

      setPrompt(data.prompt);
      onUpdate({ ...segment, visual_prompt: data.prompt });
      toast({ title: "Prompt regenerated!" });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setRegenerating(false);
    }
  };

  const handleGenerateBroll = async () => {
    setGenerating(true);
    startTimeRef.current = Date.now();
    onUpdate({ ...segment, broll_status: "generating" });

    try {
      const { error } = await supabase.functions.invoke("generate-broll", {
        body: { segmentId: segment.id, prompt: prompt },
      });

      if (error) throw error;

      toast({ title: "Generation started", description: "This may take 2-4 minutes" });
    } catch (error: any) {
      onUpdate({ ...segment, broll_status: "failed" });
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  const handleStopGeneration = async () => {
    // Update status to not_generated - the background task will check this
    const { error } = await supabase
      .from("segments")
      .update({ broll_status: "not_generated", broll_video_url: null })
      .eq("id", segment.id);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      onUpdate({ ...segment, broll_status: "not_generated", broll_video_url: null });
      toast({ title: "Generation stopped", description: "You can restart generation anytime" });
    }
  };

  const StatusIcon = statusConfig[segment.broll_status]?.icon || Clock;
  const statusLabel = statusConfig[segment.broll_status]?.label || segment.broll_status;
  const statusClass = statusConfig[segment.broll_status]?.class || "";

  return (
    <div className="segment-card p-5 animate-fade-in" style={style}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-medium text-foreground">
            Segment #{segment.index + 1}
          </h3>
          <p className="text-sm text-muted-foreground">
            {formatTime(segment.start_seconds)} – {formatTime(segment.end_seconds)}
          </p>
        </div>

        <div className={`flex items-center gap-1.5 text-sm ${statusClass}`}>
          <StatusIcon className={`w-4 h-4 ${segment.broll_status === "generating" ? "animate-spin" : ""}`} />
          {statusLabel}
        </div>
      </div>

      {/* Generation Progress Indicator */}
      {segment.broll_status === "generating" && (
        <div className="mb-4 p-3 rounded-lg bg-primary/10 border border-primary/20">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-sm text-primary">
              <Timer className="w-4 h-4" />
              <span>Elapsed: {formatElapsedTime(elapsedTime)}</span>
            </div>
            <span className="text-xs text-muted-foreground">
              {getEstimatedRemaining()}
            </span>
          </div>
          <Progress value={getProgress()} className="h-2" />
          <div className="flex items-center justify-between mt-2">
            <p className="text-xs text-muted-foreground">
              AI is generating your B-roll video...
            </p>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleStopGeneration}
              className="h-7 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <StopCircle className="w-3.5 h-3.5 mr-1" />
              Stop
            </Button>
          </div>
        </div>
      )}

      {segment.transcript_snippet && (
        <div className="mb-4 p-3 rounded-lg bg-secondary/50 border border-border">
          <p className="text-sm text-muted-foreground font-mono leading-relaxed">
            "{segment.transcript_snippet}"
          </p>
        </div>
      )}

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label htmlFor={`prompt-${segment.id}`} className="text-sm font-medium">
            Visual Prompt
          </Label>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRegeneratePrompt}
            disabled={regenerating}
          >
            {regenerating ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <RefreshCw className="w-3.5 h-3.5" />
            )}
            Regenerate
          </Button>
        </div>
        <Textarea
          id={`prompt-${segment.id}`}
          value={prompt}
          onChange={(e) => handlePromptChange(e.target.value)}
          className="bg-secondary border-border min-h-[80px] text-sm"
          placeholder="Describe the visual for this segment..."
        />
      </div>

      <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
        <div className="flex items-center gap-3">
          <Switch
            id={`broll-${segment.id}`}
            checked={segment.use_broll}
            onCheckedChange={handleToggleBroll}
          />
          <Label htmlFor={`broll-${segment.id}`} className="text-sm cursor-pointer">
            Use B-roll for this segment
          </Label>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleGenerateBroll}
          disabled={!segment.use_broll || generating || segment.broll_status === "generating"}
        >
          {generating || segment.broll_status === "generating" ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Sparkles className="w-3.5 h-3.5" />
          )}
          Generate B-roll
        </Button>
      </div>

      {segment.broll_status === "generated" && brollSignedUrl && (
        <div className="mt-4 pt-4 border-t border-border">
          <video
            src={brollSignedUrl}
            controls
            className="w-full rounded-lg aspect-[9/16] max-w-[200px] bg-muted"
          />
        </div>
      )}
    </div>
  );
};

export default SegmentCard;
