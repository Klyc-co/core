import { useRef, useEffect, useState, useCallback } from "react";
import klycFace from "@/assets/klyc-face.png";
import { useChatHeight } from "@/contexts/ChatHeightContext";
import { useNavigate } from "react-router-dom";
import { MessageSquare, Send, Loader2, Mic, Zap, ExternalLink, ChevronUp, ChevronDown, RefreshCw, Eye, EyeOff } from "lucide-react";
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

import { runCampaignPipeline } from "@/lib/agents/orchestrator";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";

interface NextQuestion {
  field: string;
  question: string;
  type: "text" | "select" | "date" | "bool" | "button" | "fill_in";
  options?: string[];
  nav_target?: string;
}

interface StructuredResponse {
  intent?: string;
  message: string;
  next_questions: NextQuestion[];
  draft_updates: Record<string, any>;
  risk_level?: "low" | "medium" | "high";
  requires_approval?: boolean;
  session_id?: string;
}

interface CompressionStats {
  originalTokens: number;
  compressedTokens: number;
  ratio: number;
}

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  structured?: StructuredResponse;
  compressionStats?: CompressionStats;
};

const ORCHESTRATOR_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/orchestrator`;

const BottomChatPanel = () => {
  const { getEffectiveUserId, selectedClientId } = useClientContext();
  const { toast } = useToast();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "assistant", content: "Hey! I'm Klyc, your AI marketing strategist. What would you like to work on?" },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [questionAnswers, setQuestionAnswers] = useState<Record<string, string>>({});
  const [interviewMode, setInterviewMode] = useState<InterviewType | null>(null);
  const [pendingQueueNav, setPendingQueueNav] = useState(false);
  const [lastFailedText, setLastFailedText] = useState<string | null>(null);
  const [showCompressionStats, setShowCompressionStats] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const resp = await fetch(ORCHESTRATOR_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ action: "health" }),
        });
        const data = await resp.json();
        console.log("[Klyc Orchestrator] Health check:", data);
      } catch (err) {
        console.warn("[Klyc Orchestrator] Health check failed:", err);
      }
    };
    checkHealth();
  }, []);

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      if (scrollRef.current) {
        const viewport = scrollRef.current.querySelector("[data-radix-scroll-area-viewport]");
        const el = viewport || scrollRef.current;
        el.scrollTop = el.scrollHeight;
      }
    });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading, scrollToBottom]);

  const calcCompressionStats = (text: string, usage?: { input_tokens: number; output_tokens: number }): CompressionStats => {
    if (usage && usage.input_tokens > 0 && usage.output_tokens > 0) {
      const total = usage.input_tokens + usage.output_tokens;
      const compressed = usage.output_tokens;
      return { originalTokens: total, compressedTokens: compressed, ratio: Math.max(1, Math.round(total / compressed)) };
    }
    const originalTokens = Math.round(text.length * 3);
    const compressedTokens = Math.max(1, Math.round(text.length / 4));
    return { originalTokens, compressedTokens, ratio: Math.round(originalTokens / compressedTokens) };
  };

  const callOrchestrator = async (action: string, payload: Record<string, any>) => {
    const session = await supabase.auth.getSession();
    const token = session.data.session?.access_token;
    if (!token) throw new Error("Not authenticated");

    const resp = await fetch(ORCHESTRATOR_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      },
      body: JSON.stringify({ action, ...payload }),
    });

    if (!resp.ok) {
      const errorData = await resp.json().catch(() => ({}));
      throw new Error(errorData.error || `Request failed (${resp.status})`);
    }

    return await resp.json();
  };

  const FALLBACK_MSG = "I'm having trouble connecting right now. Please try again in a moment.";

  const extractResponseText = (data: any): string => {
    if (typeof data === "string") {
      // Try parsing JSON strings
      try {
        const parsed = JSON.parse(data);
        if (typeof parsed === "object" && parsed !== null) {
          return extractResponseText(parsed);
        }
      } catch {
        return data;
      }
      return data;
    }
    if (!data || typeof data !== "object") return "";

    // Check known fields in priority order — use explicit typeof check for empty strings
    for (const key of ["reply", "response", "text", "content", "message", "result"]) {
      const val = data[key];
      if (typeof val === "string" && val.trim().length > 0) return val;
    }

    if (data?.stages && Array.isArray(data.stages) && data.stages.length > 0) {
      const stageData = data.stages[0].data;
      if (typeof stageData === "string") {
        try {
          const parsed = JSON.parse(stageData);
          return parsed.raw || parsed.content || parsed.message || stageData;
        } catch {
          return stageData;
        }
      }
      if (typeof stageData === "object" && stageData !== null) {
        return stageData.raw || stageData.content || stageData.message || "";
      }
    }

    // Never show raw JSON to user
    return "";
  };

  const toStructuredResponse = (orchestratorResponse: any): StructuredResponse => {
    const responseText = extractResponseText(orchestratorResponse) || FALLBACK_MSG;

    let nextQuestions: NextQuestion[] = [];
    if (Array.isArray(orchestratorResponse?.next_questions)) {
      nextQuestions = orchestratorResponse.next_questions.map((q: any, i: number) => {
        if (typeof q === "string") {
          return { field: `suggestion_${i}`, question: q, type: "button" as const };
        }
        return q;
      });
    }

    return {
      intent: orchestratorResponse?.intent,
      message: responseText,
      next_questions: nextQuestions,
      draft_updates: orchestratorResponse?.draft_updates || {},
      risk_level: orchestratorResponse?.risk_level || "low",
      requires_approval: orchestratorResponse?.requires_approval || false,
      session_id: orchestratorResponse?.session_id,
    };
  };

  const streamOrchestrator = async (
    payload: { message: string; history?: Array<{ role: string; content: string }> },
    onChunk: (content: string) => void,
  ): Promise<{ text: string; usage?: { input_tokens: number; output_tokens: number } }> => {
    const session = await supabase.auth.getSession();
    const token = session.data.session?.access_token;
    if (!token) throw new Error("Not authenticated");

    const resp = await fetch(ORCHESTRATOR_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      },
      body: JSON.stringify(payload),
    });

    if (!resp.ok) {
      const errorData = await resp.json().catch(() => ({}));
      throw new Error(errorData.error || `Request failed (${resp.status})`);
    }

    if (!resp.body) {
      const data = await resp.json();
      const text = extractResponseText(data) || FALLBACK_MSG;
      return { text };
    }

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let fullText = "";
    let usage: { input_tokens: number; output_tokens: number } | undefined;

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let newlineIdx: number;
      while ((newlineIdx = buffer.indexOf("\n")) !== -1) {
        const line = buffer.slice(0, newlineIdx).trim();
        buffer = buffer.slice(newlineIdx + 1);

        if (!line || !line.startsWith("data: ")) continue;
        const jsonStr = line.slice(6);
        if (jsonStr === "[DONE]") continue;

        // Check for event type from the previous line
        // Our SSE format uses "event: chunk" and "event: done"
        try {
          const parsed = JSON.parse(jsonStr);
          if (parsed.delta) {
            fullText += parsed.delta;
            onChunk(fullText);
          }
          if (parsed.usage) {
            usage = parsed.usage;
          }
        } catch {
          // Ignore parse errors on partial data
        }
      }
    }

    return { text: fullText || FALLBACK_MSG, usage };
  };

  const sendToKlyc = async (allMessages: ChatMessage[]): Promise<StructuredResponse> => {
    const lastUserMsg = allMessages.filter((m) => m.role === "user").pop();
    const userText = lastUserMsg?.content || "";

    const orchestratorResponse = await callOrchestrator("chat", {
      message: userText,
      session_id: sessionId || undefined,
      client_id: selectedClientId !== "default" ? selectedClientId : undefined,
    });

    return toStructuredResponse(orchestratorResponse);
  };

  const sendForInterview = async (text: string, brainContext?: string) => {
    const userMsg: ChatMessage = { role: "user", content: text };
    const updated = [...messages, userMsg];
    setMessages(updated);

    try {
      const structured = await sendToKlyc(updated);

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: structured.message, structured },
      ]);

      if (structured.draft_updates?._draft_id) {
        setDraftId(structured.draft_updates._draft_id);
      }
      if (structured.session_id) {
        setSessionId(structured.session_id);
      }

      return {
        message: structured.message,
        draft_updates: structured.draft_updates,
        next_questions: structured.next_questions,
        session_id: structured.session_id,
      };
    } catch (err) {
      const fallback: StructuredResponse = {
        message: "Sorry, I encountered an error. Please try again.",
        next_questions: [],
        draft_updates: {},
      };
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: fallback.message, structured: fallback },
      ]);
      return { message: fallback.message, draft_updates: {}, next_questions: [], session_id: undefined };
    }
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

    setLastFailedText(null);
    const userMsg: ChatMessage = { role: "user", content: text };
    const assistantPlaceholder: ChatMessage = { role: "assistant", content: "" };
    const updated = [...messages, userMsg, assistantPlaceholder];
    setMessages(updated);
    if (!overrideText) setInput("");
    setIsLoading(true);
    setQuestionAnswers({});

    try {
      const structured = await streamOrchestrator(
        "chat",
        {
          message: text,
          session_id: sessionId || undefined,
          client_id: selectedClientId !== "default" ? selectedClientId : undefined,
        },
        (rawContent) => {
          // Parse out JSON if the stream chunk is JSON with a reply field
          let displayContent = rawContent;
          try {
            if (rawContent.trim().startsWith("{")) {
              const parsed = JSON.parse(rawContent);
              if (typeof parsed === "object" && parsed !== null) {
                displayContent = extractResponseText(parsed) || "";
              }
            }
          } catch {
            // Not complete JSON yet during streaming — show as-is unless it looks like partial JSON
            if (rawContent.trim().startsWith("{") && !rawContent.trim().endsWith("}")) {
              displayContent = ""; // Hide partial JSON during streaming
            }
          }
          setMessages((prev) => {
            const next = [...prev];
            next[next.length - 1] = {
              ...next[next.length - 1],
              role: "assistant",
              content: displayContent,
            };
            return next;
          });
        }
      );

      if (structured.session_id) {
        setSessionId(structured.session_id);
      }

      if (structured.draft_updates?._draft_id) {
        setDraftId(structured.draft_updates._draft_id);
      }

      const isFallback = structured.message === FALLBACK_MSG;
      setMessages((prev) => {
        const next = [...prev];
        next[next.length - 1] = {
          role: "assistant",
          content: structured.message,
          structured,
          compressionStats: isFallback ? undefined : calcCompressionStats(structured.message),
        };
        return next;
      });
    } catch (error) {
      console.error("Chat error:", error);
      setLastFailedText(text);
      setMessages((prev) => {
        const next = [...prev];
        next[next.length - 1] = {
          role: "assistant",
          content: "Sorry, I encountered an error. Click retry or send a new message.",
        };
        return next;
      });
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

  const handleSmartPromptClick = (question: NextQuestion) => {
    // Send the selection as a user message
    handleSend(question.question);
    // Navigate if there's a target
    if (question.nav_target) {
      setTimeout(() => {
        navigate(question.nav_target!, { state: { highlightMissing: true } });
      }, 600);
    }
  };

  const [fillInValue, setFillInValue] = useState("");

  const renderNextQuestions = (questions: NextQuestion[]) => {
    if (!questions.length) return null;

    const buttonQuestions = questions.filter(q => q.type === "button");
    const fillInQuestion = questions.find(q => q.type === "fill_in");
    const legacyQuestions = questions.filter(q => q.type !== "button" && q.type !== "fill_in");

    return (
      <div className="mt-3 space-y-2 border-t border-border pt-3">
        {/* Smart Prompt: Clickable teal buttons for concrete suggestions */}
        {buttonQuestions.length > 0 && (
          <div className="space-y-1.5">
            {buttonQuestions.map((q, i) => (
              <Button
                key={q.field}
                variant="outline"
                size="sm"
                className="w-full justify-start text-left h-auto py-2 px-3 text-xs border-primary/30 text-primary hover:bg-primary hover:text-primary-foreground transition-colors"
                onClick={() => handleSmartPromptClick(q)}
                disabled={isLoading}
              >
                <span className="font-semibold mr-1.5">({i + 1})</span>
                {q.question}
              </Button>
            ))}
          </div>
        )}

        {/* Fill-in option */}
        {fillInQuestion && (
          <div className="flex gap-2 items-center">
            <span className="text-xs text-muted-foreground whitespace-nowrap">({buttonQuestions.length + 1})</span>
            <Input
              className="h-8 text-xs flex-1"
              placeholder="Something else..."
              value={fillInValue}
              onChange={(e) => setFillInValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && fillInValue.trim()) {
                  handleSend(fillInValue.trim());
                  setFillInValue("");
                }
              }}
              disabled={isLoading}
            />
            <Button
              size="sm"
              className="h-8 text-xs"
              disabled={!fillInValue.trim() || isLoading}
              onClick={() => {
                handleSend(fillInValue.trim());
                setFillInValue("");
              }}
            >
              <Send className="h-3 w-3" />
            </Button>
          </div>
        )}

        {/* Legacy form-based questions (select, date, bool, text without button/fill_in type) */}
        {legacyQuestions.length > 0 && (
          <div className="space-y-3">
            {legacyQuestions.map((q) => (
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
            <Button size="sm" className="w-full h-7 text-xs" onClick={() => handleQuestionSubmit(legacyQuestions)} disabled={isLoading}>
              Submit Answers
            </Button>
          </div>
        )}
      </div>
    );
  };

  const { heightVh, setHeightVh } = useChatHeight();
  const isDragging = useRef(false);

  const handleDragStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;
    const onMove = (ev: MouseEvent) => {
      if (!isDragging.current) return;
      const vh = ((window.innerHeight - ev.clientY) / window.innerHeight) * 100;
      setHeightVh(Math.min(70, Math.max(4, vh)));
    };
    const onUp = () => {
      isDragging.current = false;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, [setHeightVh]);

  const nudgeUp = () => setHeightVh(Math.min(70, heightVh + 10));
  const nudgeDown = () => setHeightVh(Math.max(4, heightVh - 10));

  return (
    <div
      className={cn(
        "fixed bottom-0 right-0 bg-card border-t border-border z-40 flex flex-col",
        isMobile ? "left-0" : "left-[220px]"
      )}
      style={{ height: `${isMobile ? Math.max(heightVh, 20) : heightVh}vh` }}
    >
      {/* Resize handle */}
      <div
        className="flex items-center justify-center gap-3 h-5 cursor-row-resize select-none shrink-0 group hover:bg-muted/50 transition-colors"
        onMouseDown={handleDragStart}
      >
        <button onClick={nudgeUp} className="text-muted-foreground/50 hover:text-muted-foreground transition-colors">
          <ChevronUp className="w-3.5 h-3.5" />
        </button>
        <div className="w-8 h-1 rounded-full bg-border group-hover:bg-muted-foreground/30 transition-colors" />
        <button onClick={nudgeDown} className="text-muted-foreground/50 hover:text-muted-foreground transition-colors">
          <ChevronDown className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Header bar - always visible, acts as collapsed state */}
      <div className={cn(
        "px-4 py-2 flex items-center gap-2 shrink-0",
        heightVh > 18 && "border-b border-border"
      )}>
        <img src={klycFace} alt="Klyc" className="w-10 h-10 rounded-full object-cover" />
        <span className="text-sm font-semibold text-foreground">Klyc</span>
        <span className="text-xs text-muted-foreground">AI Command Center</span>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 ml-auto shrink-0 text-muted-foreground"
          onClick={() => setShowCompressionStats((v) => !v)}
          title={showCompressionStats ? "Hide KNP stats" : "Show KNP stats"}
        >
          {showCompressionStats ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
        </Button>
      </div>

      {heightVh <= 18 ? null : interviewMode ? (
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
                        {msg.structured?.draft_updates?._draft_id && (
                          <Button size="sm" className="mt-2 w-full text-xs gap-1.5" onClick={() => navigate("/campaigns/queue")}>
                            <ExternalLink className="h-3 w-3" /> Open Campaign Queue
                          </Button>
                        )}
                        {msg.structured?.next_questions &&
                          i === messages.length - 1 &&
                          renderNextQuestions(msg.structured.next_questions)}
                        {/* Retry button on last error message */}
                        {i === messages.length - 1 && lastFailedText && msg.content.includes("error") && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="mt-2 w-full text-xs gap-1.5"
                            onClick={() => {
                              // Remove last error message and retry
                              setMessages((prev) => prev.slice(0, -1));
                              handleSend(lastFailedText);
                            }}
                            disabled={isLoading}
                          >
                            <RefreshCw className="h-3 w-3" /> Retry
                          </Button>
                        )}
                        {showCompressionStats && msg.compressionStats && (
                          <div className="flex items-center gap-1 mt-1.5 text-[10px] text-muted-foreground/70">
                            <Zap className="h-2.5 w-2.5" />
                            <span>{msg.compressionStats.ratio}x · {msg.compressionStats.originalTokens.toLocaleString()}→{msg.compressionStats.compressedTokens.toLocaleString()} tokens</span>
                          </div>
                        )}
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
