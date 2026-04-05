import { useRef, useEffect, useState, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Send, Loader2, Mic, Zap, ExternalLink, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useClientContext } from "@/contexts/ClientContext";
import { supabase } from "@/integrations/supabase/client";
import ReactMarkdown from "react-markdown";
import VoiceInterviewMode, { type InterviewType } from "@/components/VoiceInterviewMode";
import { autoPopulateFromDraftUpdates } from "@/lib/onboardingAutoPopulate";
import { runCampaignPipeline } from "@/lib/agents/orchestrator";
import { useToast } from "@/hooks/use-toast";

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
const FALLBACK_MSG = "I'm having trouble connecting right now. Please try again in a moment.";

const SidebarChat = () => {
  const { getEffectiveUserId, selectedClientId } = useClientContext();
  const { toast } = useToast();
  const navigate = useNavigate();
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
  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      if (scrollRef.current) {
        const viewport = scrollRef.current.querySelector("[data-radix-scroll-area-viewport]");
        const el = viewport || scrollRef.current;
        el.scrollTop = el.scrollHeight;
      }
    });
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, isLoading, scrollToBottom]);

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

  const extractResponseText = (data: any): string => {
    if (typeof data === "string") {
      try { const parsed = JSON.parse(data); if (typeof parsed === "object" && parsed !== null) return extractResponseText(parsed); } catch {}
      return data;
    }
    if (!data || typeof data !== "object") return "";
    for (const key of ["reply", "response", "text", "content", "message", "result"]) {
      const val = data[key];
      if (typeof val === "string" && val.trim().length > 0) return val;
    }
    return "";
  };

  const callOrchestrator = async (
    payload: { message: string; history?: Array<{ role: string; content: string }> },
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
      throw new Error(errorData.reply || errorData.error || `Request failed (${resp.status})`);
    }

    const data = await resp.json();
    const text = extractResponseText(data) || FALLBACK_MSG;
    return { text, usage: data.usage };
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
          setMessages((prev) => [...prev, {
            role: "assistant",
            content: `Your campaign is ready! **${postCount} posts** have been generated and queued.`,
          }]);
          setPendingQueueNav(true);
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
    const placeholder: ChatMessage = { role: "assistant", content: "" };
    setMessages((prev) => [...prev, userMsg, placeholder]);
    if (!overrideText) setInput("");
    setIsLoading(true);
    setQuestionAnswers({});

    try {
      const history = messages.filter((m) => m.content.trim()).map((m) => ({ role: m.role, content: m.content }));
      const result = await callOrchestrator({ message: text, history });

      setMessages((prev) => {
        const next = [...prev];
        next[next.length - 1] = {
          role: "assistant",
          content: result.text,
          compressionStats: result.text !== FALLBACK_MSG ? calcCompressionStats(result.text, result.usage) : undefined,
        };
        return next;
      });
    } catch (error) {
      console.error("Chat error:", error);
      setLastFailedText(text);
      setMessages((prev) => {
        const next = [...prev];
        next[next.length - 1] = { role: "assistant", content: "Sorry, I encountered an error. Click retry or send a new message." };
        return next;
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const [fillInValue, setFillInValue] = useState("");

  if (interviewMode) {
    return (
      <div className="flex-1 min-h-0 flex flex-col">
        <VoiceInterviewMode
          interviewType={interviewMode}
          onComplete={handleInterviewComplete}
          onSendMessage={async (text) => {
            const userMsg: ChatMessage = { role: "user", content: text };
            const updated = [...messages, userMsg];
            setMessages(updated);
            try {
              const history = updated.filter((m) => m.content.trim()).map((m) => ({ role: m.role, content: m.content }));
              const result = await callOrchestrator({ message: text, history });
              setMessages((prev) => [...prev, { role: "assistant", content: result.text }]);
              return { message: result.text, draft_updates: {}, next_questions: [], session_id: undefined };
            } catch {
              setMessages((prev) => [...prev, { role: "assistant", content: "Sorry, an error occurred." }]);
              return { message: "Error", draft_updates: {}, next_questions: [], session_id: undefined };
            }
          }}
          clientId={selectedClientId !== "default" ? selectedClientId || undefined : undefined}
        />
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      {/* Messages */}
      <ScrollArea className="flex-1 px-3 py-2" ref={scrollRef}>
        <div className="space-y-2">
          {messages.map((msg, i) => (
            <div key={i} className={cn("flex w-full", msg.role === "user" ? "justify-end" : "justify-start")}>
              <div
                className={cn(
                  "max-w-[85%] rounded-lg px-2.5 py-1.5 text-xs",
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-foreground"
                )}
              >
                {msg.role === "assistant" ? (
                  <>
                    <div className="prose prose-xs dark:prose-invert max-w-none [&_p]:my-0.5 [&_ul]:my-0.5 [&_ol]:my-0.5 [&_li]:my-0">
                      <ReactMarkdown skipHtml>{msg.content}</ReactMarkdown>
                    </div>
                    {i === messages.length - 1 && lastFailedText && msg.content.includes("error") && (
                      <Button size="sm" variant="outline" className="mt-1.5 w-full text-[10px] gap-1 h-6" onClick={() => { setMessages((prev) => prev.slice(0, -1)); handleSend(lastFailedText); }} disabled={isLoading}>
                        <RefreshCw className="h-2.5 w-2.5" /> Retry
                      </Button>
                    )}
                    {msg.compressionStats && (
                      <div className="flex items-center gap-1 mt-1 text-[9px] text-muted-foreground/60">
                        <Zap className="h-2 w-2" />
                        <span>{msg.compressionStats.ratio}x · {msg.compressionStats.originalTokens.toLocaleString()}→{msg.compressionStats.compressedTokens.toLocaleString()}</span>
                      </div>
                    )}
                  </>
                ) : msg.content}
              </div>
            </div>
          ))}
          {isLoading && messages[messages.length - 1]?.role === "user" && (
            <div className="flex justify-start w-full">
              <div className="bg-muted rounded-lg px-2.5 py-1.5">
                <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="px-2 py-1.5 border-t border-border flex items-center gap-1.5 shrink-0">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask Klyc..."
          className="min-h-[32px] max-h-16 resize-none flex-1 text-xs"
          rows={1}
        />
        <Button onClick={() => handleSend()} disabled={!input.trim() || isLoading} size="icon" className="h-7 w-7 shrink-0">
          <Send className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
};

export default SidebarChat;
