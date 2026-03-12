import { useRef, useEffect, useState } from "react";
import klycFace from "@/assets/klyc-face.png";
import { useNavigate } from "react-router-dom";
import { MessageSquare, Send, Loader2, Mic, Zap, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useClientContext } from "@/contexts/ClientContext";
import { supabase } from "@/integrations/supabase/client";
import ReactMarkdown from "react-markdown";
import VoiceInterviewMode, { type InterviewType } from "@/components/VoiceInterviewMode";
import { autoPopulateFromDraftUpdates } from "@/lib/onboardingAutoPopulate";
import { signRequest } from "@/lib/security/aiRequestSigning";
import { runCampaignPipeline } from "@/lib/agents/orchestrator";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";

interface NextQuestion {
  field: string;
  question: string;
  type: "text" | "select" | "date" | "bool";
  options?: string[];
}

interface StructuredResponse {
  intent: string;
  message: string;
  next_questions: NextQuestion[];
  draft_updates: Record<string, any>;
  risk_level?: "low" | "medium" | "high";
  requires_approval?: boolean;
}

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  structured?: StructuredResponse;
};

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/klyc-chat`;

const BottomChatPanel = () => {
  const { getEffectiveUserId, selectedClientId } = useClientContext();
  const { toast } = useToast();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "assistant", content: "Hey! I'm Klyc, your AI marketing strategist. How can I help you today?" },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [questionAnswers, setQuestionAnswers] = useState<Record<string, string>>({});
  const [interviewMode, setInterviewMode] = useState<InterviewType | null>(null);
  const [pendingQueueNav, setPendingQueueNav] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendToKlyc = async (allMessages: ChatMessage[]) => {
    const session = await supabase.auth.getSession();
    const token = session.data.session?.access_token;
    if (!token) throw new Error("Not authenticated");

    const effectiveClientId = getEffectiveUserId();

    let marketerClientId: string | undefined;
    if (selectedClientId && selectedClientId !== "default") {
      const { data: mc } = await supabase
        .from("marketer_clients")
        .select("id")
        .eq("client_id", selectedClientId)
        .maybeSingle();
      marketerClientId = mc?.id;
    }

    const contextSummary = selectedClientId && selectedClientId !== "default"
      ? `Active client: ${selectedClientId}. Draft: ${draftId || "none"}.`
      : undefined;

    const signedPayload = signRequest({
      messages: allMessages.map((m) => ({ role: m.role, content: m.content })),
      client_id: effectiveClientId,
      marketer_client_id: marketerClientId,
      context_summary: contextSummary,
      draft_id: draftId,
    });

    const resp = await fetch(CHAT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(signedPayload),
    });

    if (!resp.ok) {
      const errorData = await resp.json().catch(() => ({}));
      throw new Error(errorData.error || `Request failed (${resp.status})`);
    }

    return (await resp.json()) as StructuredResponse;
  };

  const sendForInterview = async (text: string, brainContext?: string) => {
    const userMsg: ChatMessage = { role: "user", content: text };
    const updated = [...messages, userMsg];
    setMessages(updated);

    const session = await supabase.auth.getSession();
    const token = session.data.session?.access_token;
    if (!token) throw new Error("Not authenticated");

    const effectiveClientId = getEffectiveUserId();

    let marketerClientId: string | undefined;
    if (selectedClientId && selectedClientId !== "default") {
      const { data: mc } = await supabase
        .from("marketer_clients")
        .select("id")
        .eq("client_id", selectedClientId)
        .maybeSingle();
      marketerClientId = mc?.id;
    }

    let contextSummary = selectedClientId && selectedClientId !== "default"
      ? `Active client: ${selectedClientId}. Draft: ${draftId || "none"}.`
      : undefined;

    if (brainContext) {
      contextSummary = (contextSummary ? contextSummary + "\n" : "") +
        `CLIENT BRAIN CONTEXT (use to guide questions):\n${brainContext}`;
    }

    const signedPayload = signRequest({
      messages: updated.map((m) => ({ role: m.role, content: m.content })),
      client_id: effectiveClientId,
      marketer_client_id: marketerClientId,
      context_summary: contextSummary,
      draft_id: draftId,
    });

    const resp = await fetch(CHAT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(signedPayload),
    });

    if (!resp.ok) {
      const errorData = await resp.json().catch(() => ({}));
      throw new Error(errorData.error || `Request failed (${resp.status})`);
    }

    const structured = await resp.json() as StructuredResponse;

    setMessages((prev) => [
      ...prev,
      { role: "assistant", content: structured.message, structured },
    ]);

    if (structured.draft_updates?._draft_id) {
      setDraftId(structured.draft_updates._draft_id);
    }

    return {
      message: structured.message,
      draft_updates: structured.draft_updates,
      next_questions: structured.next_questions,
      intent: structured.intent,
    };
  };

  const handleInterviewComplete = async (result?: { draftId?: string; approved?: boolean }) => {
    setInterviewMode(null);

    if (result?.approved && result?.draftId) {
      toast({ title: "Campaign approved!", description: "Starting campaign pipeline..." });

      try {
        const pipelineResult = await runCampaignPipeline(result.draftId, { auto_schedule: false });

        if (pipelineResult.success) {
          const postCount = pipelineResult.post_queue_ids.length;
          toast({ title: "Campaign created!", description: `${postCount} posts generated and queued.` });

          await supabase.from("activity_events").insert({
            user_id: (await supabase.auth.getUser()).data.user?.id,
            event_type: "campaign_ready",
            event_message: `Campaign pipeline complete: ${postCount} posts ready for review`,
            metadata: { draft_id: result.draftId, post_count: postCount },
          });

          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content: `Your campaign is ready! **${postCount} posts** have been generated and queued. Would you like to preview the posts?`,
              structured: {
                intent: "campaign_ready",
                message: `Your campaign is ready! **${postCount} posts** have been generated and queued.`,
                next_questions: [],
                draft_updates: {},
                risk_level: "low",
                requires_approval: false,
              },
            },
          ]);
          setPendingQueueNav(true);
        } else {
          toast({ title: "Pipeline issue", description: pipelineResult.error || "Check drafts.", variant: "destructive" });
        }
      } catch (e) {
        console.error("Pipeline error:", e);
        toast({ title: "Pipeline failed", description: "Campaign draft saved.", variant: "destructive" });
      }
    }
  };

  const handleSend = async (overrideText?: string) => {
    const text = overrideText || input.trim();
    if (!text || isLoading) return;

    const userMsg: ChatMessage = { role: "user", content: text };
    const updated = [...messages, userMsg];
    setMessages(updated);
    if (!overrideText) setInput("");
    setIsLoading(true);
    setQuestionAnswers({});

    try {
      const structured = await sendToKlyc(updated);

      if (structured.draft_updates?._draft_id) {
        setDraftId(structured.draft_updates._draft_id);
      }

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: structured.message, structured },
      ]);
    } catch (error) {
      console.error("Chat error:", error);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Sorry, I encountered an error. Please try again." },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuestionSubmit = (questions: NextQuestion[]) => {
    const answerLines = questions
      .map((q) => {
        const answer = questionAnswers[q.field];
        return answer ? `${q.field}: ${answer}` : null;
      })
      .filter(Boolean);

    if (answerLines.length > 0) {
      handleSend(answerLines.join("\n"));
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const renderNextQuestions = (questions: NextQuestion[]) => {
    if (!questions.length) return null;

    return (
      <div className="mt-3 space-y-3 border-t border-border pt-3">
        {questions.map((q) => (
          <div key={q.field} className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">{q.question}</label>
            {q.type === "select" && q.options ? (
              <Select
                value={questionAnswers[q.field] || ""}
                onValueChange={(v) => setQuestionAnswers((prev) => ({ ...prev, [q.field]: v }))}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent>
                  {q.options.map((opt) => (
                    <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : q.type === "bool" ? (
              <div className="flex gap-2">
                <Button size="sm" variant={questionAnswers[q.field] === "yes" ? "default" : "outline"} className="h-7 text-xs" onClick={() => setQuestionAnswers((prev) => ({ ...prev, [q.field]: "yes" }))}>Yes</Button>
                <Button size="sm" variant={questionAnswers[q.field] === "no" ? "default" : "outline"} className="h-7 text-xs" onClick={() => setQuestionAnswers((prev) => ({ ...prev, [q.field]: "no" }))}>No</Button>
              </div>
            ) : q.type === "date" ? (
              <Input type="date" className="h-8 text-xs" value={questionAnswers[q.field] || ""} onChange={(e) => setQuestionAnswers((prev) => ({ ...prev, [q.field]: e.target.value }))} />
            ) : (
              <Input className="h-8 text-xs" placeholder="Type your answer..." value={questionAnswers[q.field] || ""} onChange={(e) => setQuestionAnswers((prev) => ({ ...prev, [q.field]: e.target.value }))} />
            )}
          </div>
        ))}
        <Button size="sm" className="w-full h-7 text-xs" onClick={() => handleQuestionSubmit(questions)} disabled={isLoading}>
          Submit Answers
        </Button>
      </div>
    );
  };

  return (
    <div className={cn(
      "fixed bottom-0 right-0 bg-card border-t border-border z-40 flex flex-col",
      isMobile ? "left-0 h-[30vh]" : "left-[220px] h-[25vh]"
    )}>
      {/* Slim header bar */}
      <div className="px-4 py-2 border-b border-border flex items-center gap-2 shrink-0">
        <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
          <MessageSquare className="h-3 w-3 text-primary-foreground" />
        </div>
        <span className="text-sm font-semibold text-foreground">Klyc</span>
        <span className="text-xs text-muted-foreground">AI Command Center</span>
      </div>

      {interviewMode ? (
        <VoiceInterviewMode
          interviewType={interviewMode}
          onComplete={handleInterviewComplete}
          onSendMessage={sendForInterview}
          clientId={selectedClientId !== "default" ? selectedClientId || undefined : undefined}
        />
      ) : (
        <div className="flex-1 flex flex-col min-h-0">
          {/* Messages */}
          <ScrollArea className="flex-1 px-4 py-2" ref={scrollRef}>
            <div className="flex gap-3 flex-wrap">
              {messages.map((msg, i) => (
                <div key={i} className={cn("flex w-full", msg.role === "user" ? "justify-end" : "justify-start")}>
                  <div
                    className={cn(
                      "max-w-[70%] rounded-lg px-3 py-2 text-sm",
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-foreground"
                    )}
                  >
                    {msg.role === "assistant" ? (
                      <>
                        <div className="prose prose-sm dark:prose-invert max-w-none [&_p]:my-1 [&_ul]:my-1 [&_ol]:my-1 [&_li]:my-0.5">
                          <ReactMarkdown
                            skipHtml={true}
                            components={{
                              a: ({ href, children }) => (
                                <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>
                              ),
                            }}
                          >
                            {msg.content}
                          </ReactMarkdown>
                        </div>
                        {msg.structured?.intent && msg.structured.intent !== "other" && (
                          <Badge variant="secondary" className="mt-2 text-[10px]">
                            {msg.structured.intent.replace("_", " ")}
                          </Badge>
                        )}
                        {msg.structured?.intent === "campaign_ready" && (
                          <Button size="sm" className="mt-2 w-full text-xs gap-1.5" onClick={() => navigate("/campaigns/queue")}>
                            <ExternalLink className="h-3 w-3" /> Open Campaign Queue
                          </Button>
                        )}
                        {msg.structured?.next_questions &&
                          i === messages.length - 1 &&
                          msg.structured.intent !== "campaign_ready" &&
                          renderNextQuestions(msg.structured.next_questions)}
                      </>
                    ) : (
                      msg.content
                    )}
                  </div>
                </div>
              ))}
              {isLoading && messages[messages.length - 1]?.role === "user" && (
                <div className="flex justify-start w-full">
                  <div className="bg-muted rounded-lg px-3 py-2">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Input */}
          <div className="px-4 py-2 border-t border-border flex items-center gap-2 shrink-0">
            <Button variant="outline" size="icon" className="h-9 w-9 shrink-0" onClick={() => setInterviewMode("onboarding")} title="Voice Onboarding">
              <Mic className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" className="h-9 w-9 shrink-0" onClick={() => setInterviewMode("campaign")} title="Voice Campaign">
              <Zap className="h-4 w-4" />
            </Button>
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask Klyc anything..."
              className="min-h-[36px] max-h-20 resize-none flex-1 text-sm"
              rows={1}
            />
            <Button onClick={() => handleSend()} disabled={!input.trim() || isLoading} size="icon" className="h-9 w-9 shrink-0">
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default BottomChatPanel;
