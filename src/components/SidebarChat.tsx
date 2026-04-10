import { useRef, useEffect, useState, useCallback } from "react";
import klycFace from "@/assets/klyc-face.png";
import { useNavigate, useLocation } from "react-router-dom";
import { Send, Zap, ExternalLink, RefreshCw } from "lucide-react";
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

// ── Funny loading messages ────────────────────────────────────────────────────
const LOADING_MESSAGES = [
  "Focusing objectives...",
  "Warning VPS of incoming data...",
  "Calculating viral potential...",
  "Consulting the engagement oracle...",
  "Untangling the feed algorithm...",
  "Downloading more RAM for your campaign...",
  "Finding the right platform to be mad on...",
  "Summoning the marketing spirits...",
  "Bribing the content gods...",
  "Running A/B tests in parallel universes...",
  "Interrogating the algorithm...",
  "Compressing genius into pixels...",
  "Asking the audience what they want (they lied)...",
  "Converting caffeine into strategy...",
  "Aligning the brand chakras...",
];

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
  nav_target?: string;
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
  next_questions?: NextQuestion[];
};

// ── Client-side navigation intent detection (instant redirect, no AI round-trip needed) ──
const NAV_INTENTS: Array<{ pattern: RegExp; route: string; reply: string }> = [
  {
    pattern: /make (a |my )?(first |new )?post|create (a |new )?post|generate (a |new )?post|write (a |new )?post|where.*make.*post|show me.*post|take me.*post/i,
    route: "/campaigns/generate",
    reply: "Taking you there now — let's build something. 🚀",
  },
  {
    pattern: /\b(go to|take me to|open|show me|navigate to)\b.*\b(campaign|campaigns)\b/i,
    route: "/campaigns",
    reply: "Opening your campaigns now.",
  },
  {
    pattern: /\b(go to|take me to|open|show me)\b.*\bdashboard\b/i,
    route: "/dashboard",
    reply: "Taking you to the dashboard.",
  },
  {
    pattern: /\b(go to|take me to|open|show me)\b.*\bsettings\b/i,
    route: "/settings",
    reply: "Opening settings.",
  },
  {
    pattern: /\b(go to|take me to|open|show me)\b.*\bonboard/i,
    route: "/onboarding",
    reply: "Taking you to onboarding.",
  },
];

// ── Route all chat through klyc-chat (C-lane entry point) ───────────────────
const KLYC_CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/klyc-chat`;
const FALLBACK_MSG = "I'm having trouble connecting right now. Please try again in a moment.";

const SidebarChat = () => {
  const { getEffectiveUserId, selectedClientId } = useClientContext();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "assistant", content: "Hey! I'm Klyc, your AI marketing strategist. What would you like to work on?" },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMsgIdx, setLoadingMsgIdx] = useState(0);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [questionAnswers, setQuestionAnswers] = useState<Record<string, string>>({});
  const [interviewMode, setInterviewMode] = useState<InterviewType | null>(null);
  const [pendingQueueNav, setPendingQueueNav] = useState(false);
  const [lastFailedText, setLastFailedText] = useState<string | null>(null);
  const [lastPromptedRoute, setLastPromptedRoute] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-prompt when user lands on the generate page
  useEffect(() => {
    if (location.pathname === "/campaigns/generate" && lastPromptedRoute !== "/campaigns/generate") {
      setLastPromptedRoute("/campaigns/generate");
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "📝 **Let's create a post!**\n\nTell me about your post — what's the idea, what are you promoting, and who's your target audience? I'll help shape the strategy while you pick your content type on the right.",
        },
      ]);
    }
  }, [location.pathname]);

  // ── Cycle loading messages while waiting ────────────────────────────────────
  useEffect(() => {
    if (!isLoading) { setLoadingMsgIdx(0); return; }
    const id = setInterval(() => setLoadingMsgIdx((i) => (i + 1) % LOADING_MESSAGES.length), 1800);
    return () => clearInterval(id);
  }, [isLoading]);

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
    // klyc-chat returns structured response with .message as primary text field
    for (const key of ["message", "reply", "response", "text", "content", "result"]) {
      const val = data[key];
      if (typeof val === "string" && val.trim().length > 0) return val;
    }
    return "";
  };

  const callOrchestrator = async (
    payload: { message: string; history?: Array<{ role: string; content: string }> },
  ): Promise<{ text: string; usage?: { input_tokens: number; output_tokens: number }; nav_target?: string; next_questions?: NextQuestion[] }> => {
    const session = await supabase.auth.getSession();
    const token = session.data.session?.access_token;
    if (!token) throw new Error("Not authenticated");

    // Build messages array for klyc-chat: history + current user message
    const messages = [
      ...(payload.history || []),
      { role: "user", content: payload.message },
    ];

    const resp = await fetch(KLYC_CHAT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      },
      body: JSON.stringify({
        messages,
        request_id: crypto.randomUUID(),
      }),
    });

    if (!resp.ok) {
      const errorData = await resp.json().catch(() => ({}));
      throw new Error(errorData.message || errorData.error || `Request failed (${resp.status})`);
    }

    const data = await resp.json();
    const text = extractResponseText(data) || FALLBACK_MSG;
    return {
      text,
      usage: data.usage,
      nav_target: data.nav_target as string | undefined,
      next_questions: (data.next_questions || []) as NextQuestion[],
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
    setMessages((prev) => [...prev, userMsg]);
    if (!overrideText) setInput("");
    setQuestionAnswers({});

    // ── Client-side nav intent: instant redirect without waiting for AI ──
    const navMatch = NAV_INTENTS.find((n) => n.pattern.test(text));
    if (navMatch) {
      setMessages((prev) => [...prev, { role: "assistant", content: navMatch.reply }]);
      setTimeout(() => navigate(navMatch.route), 400);
      return;
    }

    setIsLoading(true);

    try {
      const history = messages.filter((m) => m.content.trim()).map((m) => ({ role: m.role, content: m.content }));
      const result = await callOrchestrator({ message: text, history });

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: result.text,
          compressionStats: result.text !== FALLBACK_MSG ? calcCompressionStats(result.text, result.usage) : undefined,
          next_questions: result.next_questions?.length ? result.next_questions : undefined,
        },
      ]);

      // ── Navigate if AI returned a route ──────────────────────────────────
      if (result.nav_target) {
        setTimeout(() => navigate(result.nav_target!), 700);
      }
    } catch (error) {
      console.error("Chat error:", error);
      setLastFailedText(text);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Sorry, I encountered an error. Click retry or send a new message." },
      ]);
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
              {msg.role === "assistant" && (
                <img src={klycFace} alt="Klyc" className="w-6 h-6 rounded-full object-cover mr-1.5 mt-1 flex-shrink-0" />
              )}
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
                    {msg.next_questions && msg.next_questions.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {msg.next_questions.map((q, qi) => (
                          <button
                            key={qi}
                            onClick={() => {
                              setMessages((prev) =>
                                prev.map((m, mi) => mi === i ? { ...m, next_questions: [] } : m)
                              );
                              handleSend(q.question || q.field);
                            }}
                            disabled={isLoading}
                            className="text-[11px] px-2.5 py-1 rounded-md border border-primary/50 text-primary hover:bg-primary/10 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed font-medium"
                          >
                            {q.question || q.field}
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                ) : msg.content}
              </div>
            </div>
          ))}

          {/* ── Animated loading message ── */}
          {isLoading && (
            <div className="flex justify-start w-full items-start">
              <img src={klycFace} alt="Klyc" className="w-6 h-6 rounded-full object-cover mr-1.5 mt-1 flex-shrink-0" />
              <div className="bg-muted rounded-lg px-2.5 py-1.5 text-xs text-muted-foreground italic animate-pulse">
                {LOADING_MESSAGES[loadingMsgIdx]}
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
