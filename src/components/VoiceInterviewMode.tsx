import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Mic, MicOff, Volume2, VolumeX, Keyboard, Loader2, Check, Edit, Target, Calendar, BarChart3, Layers, Users, Megaphone } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { useTTS } from "@/hooks/useTTS";
import { autoPopulateFromDraftUpdates, saveOnboardingTranscript } from "@/lib/onboardingAutoPopulate";
import { saveCampaignInterviewTranscript, upsertCampaignDraftFromInterview } from "@/lib/campaignInterviewHelpers";
import { supabase } from "@/integrations/supabase/client";
import { useClientContext } from "@/contexts/ClientContext";
import { loadClientBrain } from "@/lib/client/clientBrainLoader";

const ONBOARDING_STEPS = [
  "Business Profile",
  "Description",
  "Target Audience",
  "Products & Services",
  "Brand Voice",
  "Competitors",
  "Social Platforms",
  "Review",
];

const CAMPAIGN_STEPS = [
  "Goal",
  "Platforms",
  "Theme",
  "Content Frequency",
  "Audience",
  "CTA",
  "Review",
];

export type InterviewType = "onboarding" | "campaign";

interface CampaignPreview {
  campaign_name: string;
  goal: string;
  theme: string;
  platforms: string[];
  duration_days: number;
  posts_per_week: number;
  cta: string;
  audience_segment: string;
  product_focus: string;
  estimated_posts: number;
  predicted_engagement: string;
}

interface VoiceInterviewModeProps {
  onComplete: (result?: { draftId?: string; approved?: boolean }) => void;
  onSendMessage: (text: string, brainContext?: string) => Promise<{ message: string; draft_updates?: Record<string, any>; next_questions?: any[]; intent?: string }>;
  interviewType?: InterviewType;
  clientId?: string;
}

function buildCampaignPreview(accumulated: Record<string, any>): CampaignPreview {
  const platforms = Array.isArray(accumulated.platforms)
    ? accumulated.platforms
    : accumulated.platforms
      ? [accumulated.platforms]
      : [];
  const durationDays = accumulated.duration_days || 30;
  const postsPerWeek = accumulated.posts_per_week || 3;
  const estimatedPosts = Math.round((durationDays / 7) * postsPerWeek);

  // Simple predicted engagement heuristic
  let predicted = "Moderate";
  if (platforms.length >= 3) predicted = "High";
  if (postsPerWeek >= 5) predicted = "Very High";
  if (postsPerWeek <= 1) predicted = "Low";

  return {
    campaign_name: accumulated.campaign_name || "Untitled Campaign",
    goal: accumulated.goal || "—",
    theme: accumulated.theme || "—",
    platforms,
    duration_days: durationDays,
    posts_per_week: postsPerWeek,
    cta: accumulated.cta || "—",
    audience_segment: accumulated.audience_segment || accumulated.target_audience_description || "—",
    product_focus: accumulated.product_focus || "—",
    estimated_posts: estimatedPosts,
    predicted_engagement: predicted,
  };
}

function CampaignPreviewCard({ preview }: { preview: CampaignPreview }) {
  return (
    <Card className="border-primary/30 bg-sidebar-accent/50 shadow-sm">
      <CardHeader className="pb-2 pt-3 px-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2 text-sidebar-foreground">
          <Megaphone className="h-4 w-4 text-primary" />
          {preview.campaign_name}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-3 pb-3 space-y-2">
        <div className="grid grid-cols-2 gap-2 text-[11px]">
          <div className="flex items-start gap-1.5">
            <Target className="h-3 w-3 text-primary mt-0.5 shrink-0" />
            <div>
              <p className="text-sidebar-foreground/50 font-medium">Goal</p>
              <p className="text-sidebar-foreground capitalize">{preview.goal}</p>
            </div>
          </div>
          <div className="flex items-start gap-1.5">
            <Layers className="h-3 w-3 text-primary mt-0.5 shrink-0" />
            <div>
              <p className="text-sidebar-foreground/50 font-medium">Theme</p>
              <p className="text-sidebar-foreground">{preview.theme}</p>
            </div>
          </div>
          <div className="flex items-start gap-1.5">
            <Users className="h-3 w-3 text-primary mt-0.5 shrink-0" />
            <div>
              <p className="text-sidebar-foreground/50 font-medium">Audience</p>
              <p className="text-sidebar-foreground">{preview.audience_segment}</p>
            </div>
          </div>
          <div className="flex items-start gap-1.5">
            <Calendar className="h-3 w-3 text-primary mt-0.5 shrink-0" />
            <div>
              <p className="text-sidebar-foreground/50 font-medium">Duration</p>
              <p className="text-sidebar-foreground">{preview.duration_days} days</p>
            </div>
          </div>
        </div>

        <Separator className="bg-sidebar-border" />

        <div className="flex items-center justify-between text-[11px]">
          <div className="flex flex-wrap gap-1">
            {preview.platforms.map((p) => (
              <Badge key={p} variant="secondary" className="text-[9px] px-1.5 py-0 capitalize">
                {p}
              </Badge>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-1 text-center">
          <div className="bg-sidebar-accent rounded p-1.5">
            <p className="text-[10px] text-sidebar-foreground/50">Posts</p>
            <p className="text-sm font-bold text-sidebar-foreground">{preview.estimated_posts}</p>
          </div>
          <div className="bg-sidebar-accent rounded p-1.5">
            <p className="text-[10px] text-sidebar-foreground/50">Per week</p>
            <p className="text-sm font-bold text-sidebar-foreground">{preview.posts_per_week}</p>
          </div>
          <div className="bg-sidebar-accent rounded p-1.5">
            <p className="text-[10px] text-sidebar-foreground/50">Engagement</p>
            <p className="text-sm font-bold text-primary">{preview.predicted_engagement}</p>
          </div>
        </div>

        {preview.cta !== "—" && (
          <div className="text-[10px] text-sidebar-foreground/60 italic">
            CTA: "{preview.cta}"
          </div>
        )}
        {preview.product_focus !== "—" && (
          <div className="text-[10px] text-sidebar-foreground/60">
            Product: {preview.product_focus}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function VoiceInterviewMode({
  onComplete,
  onSendMessage,
  interviewType = "onboarding",
  clientId,
}: VoiceInterviewModeProps) {
  const steps = interviewType === "campaign" ? CAMPAIGN_STEPS : ONBOARDING_STEPS;

  const [step, setStep] = useState(0);
  const [mode, setMode] = useState<"voice" | "text">("voice");
  const [aiMessage, setAiMessage] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [textInput, setTextInput] = useState("");
  const [fullTranscript, setFullTranscript] = useState<string[]>([]);
  const [hasStarted, setHasStarted] = useState(false);
  const [campaignDraftId, setCampaignDraftId] = useState<string | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [brainContextMin, setBrainContextMin] = useState<string | null>(null);
  const [accumulatedDraft, setAccumulatedDraft] = useState<Record<string, any>>({});
  const [campaignPreview, setCampaignPreview] = useState<CampaignPreview | null>(null);

  const { isListening, transcript, interimTranscript, startListening, stopListening, isSupported, error: sttError } = useSpeechRecognition();
  const { speak, stop: stopSpeaking, isSpeaking } = useTTS();
  const { getEffectiveUserId, selectedClientId } = useClientContext();
  const pendingTranscriptRef = useRef("");

  // Fallback to text mode if mic not supported
  useEffect(() => {
    if (!isSupported && mode === "voice") {
      setMode("text");
    }
  }, [isSupported, mode]);

  // Auto-start the interview
  useEffect(() => {
    if (!hasStarted) {
      setHasStarted(true);
      startInterview();
    }
  }, [hasStarted]);

  const getStartPrompt = () => {
    if (interviewType === "campaign") {
      return "Start a campaign creation interview. Ask me questions one at a time to build a campaign draft. Begin with the campaign goal. intent: campaign_interview, interview_mode: voice";
    }
    return "Start my onboarding interview. Ask me questions one at a time about my business. Begin with my business name. intent: onboarding_interview, interview_mode: voice";
  };

  const startInterview = async () => {
    setIsProcessing(true);
    try {
      // Load client brain for campaign interviews (400 token budget)
      let brainCtx: string | undefined;
      if (interviewType === "campaign") {
        const effectiveId = clientId || selectedClientId;
        if (effectiveId && effectiveId !== "default") {
          try {
            const brain = await loadClientBrain(effectiveId, 400);
            brainCtx = brain.brain_context_min;
            setBrainContextMin(brainCtx);
          } catch (e) {
            console.warn("Could not load client brain:", e);
          }
        }
      }

      const result = await onSendMessage(getStartPrompt(), brainCtx);
      setAiMessage(result.message);
      if (result.draft_updates) {
        await handleDraftUpdates(result.draft_updates);
      }
      if (mode === "voice") {
        await speak(result.message);
      }
    } catch {
      const fallback = interviewType === "campaign"
        ? "Welcome! Let's create a campaign. What's the main goal for this campaign?"
        : "Welcome! Let's set up your brand profile. What's your business name?";
      setAiMessage(fallback);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDraftUpdates = async (draftUpdates: Record<string, any>) => {
    if (interviewType === "campaign") {
      // Handle campaign draft upsert
      if (draftUpdates.campaign_draft) {
        // Accumulate draft fields for preview
        setAccumulatedDraft((prev) => {
          const merged = { ...prev, ...draftUpdates.campaign_draft };
          return merged;
        });

        const effectiveClientId = clientId || selectedClientId || undefined;
        const newDraftId = await upsertCampaignDraftFromInterview(
          draftUpdates.campaign_draft,
          campaignDraftId || undefined,
          effectiveClientId
        );
        if (newDraftId) setCampaignDraftId(newDraftId);
      }
    } else {
      await autoPopulateFromDraftUpdates(draftUpdates);
    }
    // Advance progress
    setStep((s) => Math.min(s + 1, steps.length - 1));
  };

  // When transcript finalizes after stop
  useEffect(() => {
    if (!isListening && pendingTranscriptRef.current) {
      const finalText = pendingTranscriptRef.current;
      pendingTranscriptRef.current = "";
      handleSubmitAnswer(finalText);
    }
  }, [isListening]);

  // Track transcript changes
  useEffect(() => {
    if (transcript) {
      pendingTranscriptRef.current = transcript;
    }
  }, [transcript]);

  const handleMicToggle = () => {
    if (isListening) {
      stopListening();
    } else {
      stopSpeaking();
      startListening();
    }
  };

  const handleSubmitAnswer = async (answer: string) => {
    if (!answer.trim() || isProcessing) return;

    setFullTranscript((prev) => [...prev, `You: ${answer}`, ""]);
    setIsProcessing(true);

    try {
      const result = await onSendMessage(answer, brainContextMin || undefined);
      setAiMessage(result.message);
      setFullTranscript((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = `Klyc: ${result.message}`;
        return updated;
      });

      if (result.draft_updates) {
        await handleDraftUpdates(result.draft_updates);
      }

      // Check completion
      const isComplete = interviewType === "campaign"
        ? result.draft_updates?._campaign_complete || result.intent === "campaign_summary"
        : result.draft_updates?._onboarding_complete;

      if (isComplete || step >= steps.length - 1) {
        if (interviewType === "campaign") {
          // Build preview from accumulated draft data
          const finalDraft = result.draft_updates?.campaign_draft
            ? { ...accumulatedDraft, ...result.draft_updates.campaign_draft }
            : accumulatedDraft;
          setCampaignPreview(buildCampaignPreview(finalDraft));
          setShowConfirmation(true);
          if (mode === "voice") await speak(result.message);
          return;
        }
        await saveOnboardingTranscript(fullTranscript.join("\n"), getEffectiveUserId() || undefined);
        onComplete();
        return;
      }

      if (mode === "voice") {
        await speak(result.message);
      }
    } catch {
      setAiMessage("Sorry, I didn't catch that. Could you try again?");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleTextSubmit = () => {
    if (textInput.trim()) {
      handleSubmitAnswer(textInput.trim());
      setTextInput("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleTextSubmit();
    }
  };

  const handleApproveCampaign = async () => {
    // Save transcript
    await saveCampaignInterviewTranscript(
      fullTranscript.join("\n"),
      campaignDraftId || undefined,
      clientId || selectedClientId || undefined
    );
    onComplete({ draftId: campaignDraftId || undefined, approved: true });
  };

  const handleEditCampaign = () => {
    setShowConfirmation(false);
    setCampaignPreview(null);
    // Resume at the first step so user can walk through again
    setStep(0);
    setAiMessage("Sure, let's revise. Which part would you like to change? You can say the topic (e.g. 'platforms' or 'audience').");
  };

  const progress = ((step + 1) / steps.length) * 100;

  return (
    <div className="flex flex-col h-full">
      {/* Progress Header */}
      <div className="p-3 border-b border-sidebar-border space-y-2">
        <div className="flex items-center justify-between">
          <Badge variant="secondary" className="text-[10px]">
            {showConfirmation ? "Preview" : `Step ${step + 1} of ${steps.length}`}
          </Badge>
          <span className="text-[10px] text-sidebar-foreground/60">
            {showConfirmation ? "Campaign Preview" : steps[step]}
          </span>
        </div>
        <Progress value={showConfirmation ? 100 : progress} className="h-1.5" />
        {interviewType === "campaign" && (
          <p className="text-[10px] text-primary/70 font-medium">
            {showConfirmation ? "✅ Review & Approve" : "🎯 Campaign Interview"}
          </p>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {/* AI Message */}
        <div className="flex items-start gap-2">
          <div
            className={cn(
              "w-8 h-8 rounded-full bg-primary flex items-center justify-center shrink-0 transition-all",
              isSpeaking && "animate-pulse ring-2 ring-primary/40"
            )}
          >
            {isSpeaking ? (
              <Volume2 className="h-4 w-4 text-primary-foreground" />
            ) : (
              <VolumeX className="h-4 w-4 text-primary-foreground" />
            )}
          </div>
          <div className="bg-sidebar-accent text-sidebar-accent-foreground rounded-lg px-3 py-2 text-sm max-w-[85%]">
            {isProcessing && !aiMessage ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              aiMessage || "Starting interview..."
            )}
          </div>
        </div>

        {/* Campaign Preview Card */}
        {showConfirmation && campaignPreview && (
          <CampaignPreviewCard preview={campaignPreview} />
        )}

        {/* Live Transcript */}
        {!showConfirmation && (isListening || interimTranscript || transcript) && (
          <div className="flex justify-end">
            <div className="bg-primary/10 border border-primary/20 rounded-lg px-3 py-2 text-sm max-w-[85%]">
              <span className="text-[10px] uppercase tracking-wide text-primary/60 block mb-1">
                {isListening ? "🔴 Listening…" : "Transcript"}
              </span>
              <span className="text-sidebar-foreground">
                {transcript}
                {interimTranscript && (
                  <span className="text-sidebar-foreground/50"> {interimTranscript}</span>
                )}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="p-4 border-t border-sidebar-border space-y-3">
        {showConfirmation ? (
          <div className="space-y-2">
            <Button onClick={handleApproveCampaign} className="w-full h-11 gap-2">
              <Check className="h-4 w-4" /> Approve Campaign
            </Button>
            <Button onClick={handleEditCampaign} variant="outline" className="w-full h-11 gap-2 border-sidebar-border">
              <Edit className="h-4 w-4" /> Edit Campaign
            </Button>
          </div>
        ) : mode === "voice" ? (
          <div className="flex items-center gap-2">
            <Button
              onClick={handleMicToggle}
              disabled={isProcessing || isSpeaking}
              variant={isListening ? "destructive" : "default"}
              className="flex-1 h-11"
            >
              {isListening ? (
                <>
                  <MicOff className="h-4 w-4 mr-2" /> Stop & Send
                </>
              ) : (
                <>
                  <Mic className="h-4 w-4 mr-2" /> {isProcessing ? "Processing…" : "Tap to Speak"}
                </>
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-11 w-11 shrink-0"
              onClick={() => setMode("text")}
              title="Switch to typing"
            >
              <Keyboard className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex gap-2">
              <Textarea
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type your answer…"
                className="min-h-[44px] max-h-24 resize-none bg-sidebar-accent border-sidebar-border text-sidebar-foreground"
                rows={1}
              />
              <Button
                onClick={handleTextSubmit}
                disabled={!textInput.trim() || isProcessing}
                size="icon"
                className="h-11 w-11 shrink-0"
              >
                {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : "→"}
              </Button>
            </div>
            {isSupported && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-xs"
                onClick={() => setMode("voice")}
              >
                <Mic className="h-3 w-3 mr-1" /> Switch to voice
              </Button>
            )}
          </div>
        )}

        {sttError && (
          <p className="text-[10px] text-destructive">
            Microphone error: {sttError}. Using text mode.
          </p>
        )}
      </div>
    </div>
  );
}
