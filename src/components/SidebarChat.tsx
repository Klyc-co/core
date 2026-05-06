import { useRef, useEffect, useState, useCallback } from "react";
import klycFace from "@/assets/klyc-face.png";
import { useNavigate, useLocation } from "react-router-dom";
import { Send, Zap, RefreshCw, Mic } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useClientContext } from "@/contexts/ClientContext";
import { supabase } from "@/integrations/supabase/client";
import ReactMarkdown from "react-markdown";
import VoiceInterviewMode, { type InterviewType } from "@/components/VoiceInterviewMode";
import { runCampaignPipeline } from "@/lib/agents/orchestrator";
import { useToast } from "@/hooks/use-toast";

const FALLBACK_QUOTES: Array<{ quote: string; author: string }> = [
  { quote: "If you don't like what's being said, change the conversation.", author: "Don Draper" },
  { quote: "The consumer isn't a moron; she is your wife.", author: "David Ogilvy" },
  { quote: "Nobody reads advertising. People read what interests them.", author: "David Ogilvy" },
  { quote: "Make it simple. Make it memorable. Make it inviting to look at.", author: "Leo Burnett" },
  { quote: "Good advertising does not just circulate information.", author: "Leo Burnett" },
  { quote: "The best marketing doesn't feel like marketing.", author: "Tom Fishburne" },
  { quote: "Content is fire. Social media is gasoline.", author: "Jay Baer" },
  { quote: "Marketing is no longer about the stuff that you make, but about the stories you tell.", author: "Seth Godin" },
  { quote: "People don't buy what you do; they buy why you do it.", author: "Simon Sinek" },
  { quote: "In marketing I've seen only one strategy that can't miss — and that is to market to your best customers first.", author: "John Romero" },
];

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  intent?: string;
  nav_target?: string;
  next_questions?: Array<{ field: string; question: string; type: string; options?: string[] }>;
  draft_updates?: Record<string, any>;
  requires_approval?: boolean;
  risk_level?: string;
};

function useSpeechToText(onResult: (text: string) => void) {
  const [isListening, setIsListening] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);
  const shouldListenRef = useRef(false);
  const interimRef = useRef<string>("");

  const startListening = useCallback(async () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setMicError("Voice input requires Chrome or Edge.");
      return;
    }
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      setMicError(null);
    } catch (err: any) {
      if (err.name === "NotAllowedError") {
        setMicError("Microphone blocked — allow it in your browser's site settings.");
      } else if (err.name === "NotFoundError") {
        setMicError("No microphone found. Plug one in and try again.");
      } else {
        setMicError("Microphone unavailable. Check your system settings.");
      }
      return;
    }

    shouldListenRef.current = true;
    interimRef.current = "";

    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: any) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          onResult(t);
          interimRef.current = "";
        } else {
          interimRef.current = t;
        }
      }
    };

    recognition.onend = () => {
      if (shouldListenRef.current) {
        try { recognition.start(); } catch (_) { setIsListening(false); shouldListenRef.current = false; }
      } else {
        setIsListening(false);
      }
    };

    recognition.onerror = (event: any) => {
      if (event.error === "no-speech") return;
      if (event.error === "aborted") return;
      if (event.error === "not-allowed") {
        setMicError("Microphone blocked — click the 🔒 icon in your address bar, set Microphone to Allow, then reload.");
      } else {
        setMicError("Voice input stopped. Tap the mic to try again.");
      }
      shouldListenRef.current = false;
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  }, [onResult]);

  const stopListening = useCallback(() => {
    shouldListenRef.current = false;
    recognitionRef.current?.stop();
    setIsListening(false);
  }, []);

  return { isListening, micError, setMicError, startListening, stopListening };
}

const SidebarChat = () => {
  const { getEffectiveUserId, selectedClientId } = useClientContext();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [campaignDraft, setCampaignDraft] = useState<Record<string, any>>({});
  const [currentDraftId, setCurrentDraftId] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showQuote, setShowQuote] = useState(true);
  const [randomQuote] = useState(() => FALLBACK_QUOTES[Math.floor(Math.random() * FALLBACK_QUOTES.length)]);
  const [voiceMode, setVoiceMode] = useState<InterviewType | null>(null);
  const [lastPromptedRoute, setLastPromptedRoute] = useState<string | null>(null);
  const [backgroundTask, setBackgroundTask] = useState<{ label: string; done: boolean } | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { isListening, micError, setMicError, startListening, stopListening } = useSpeechToText((transcript) => {
    setInput((prev) => (prev ? prev + " " + transcript : transcript));
  });

  const buildPageContext = useCallback((): string | undefined => {
    if (location.pathname === "/profile/company") {
      return "page=business_profile\nprofile_incomplete=true\ninstruction=Ask the user for their website URL to auto-fill their business profile.";
    }
    return undefined;
  }, [location.pathname]);

  // ── Route-based proactive messages ────────────────────────────────────────
  useEffect(() => {
    const path = location.pathname;

    if (path === "/campaigns/generate" && lastPromptedRoute !== "/campaigns/generate") {
      setLastPromptedRoute("/campaigns/generate");
      setMessages((prev) => [
        ...prev,
        {
          id: `auto-${Date.now()}`,
          role: "assistant",
          content: "Ready to build. What's the product or campaign?",
          timestamp: new Date(),
          intent: "other",
        },
      ]);
    } else if ((path === "/creative" || path === "/creative-studio") && lastPromptedRoute !== path) {
      setLastPromptedRoute(path);
      setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          {
            id: `creative-${Date.now()}`,
            role: "assistant",
            content: "Hey! Can I help with what you're building? Turn on audio 🎙️ and just talk through your idea — I'd love to listen to what you're creatively developing and help shape it.",
            timestamp: new Date(),
            intent: "other",
          },
        ]);
        setShowQuote(false);
      }, 1200);
    }
  }, [location.pathname, lastPromptedRoute]);

  // ── Proactive calendar sensor ──────────────────────────────────────────────
  useEffect(() => {
    const checkAndOfferContent = async () => {
      const userId = getEffectiveUserId();
      if (!userId) return;
      if (messages.length > 0) return;

      const now = new Date();
      const weekEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

      const { data: profile } = await supabase
        .from("client_profiles")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();

      const { data: upcomingPosts } = profile
        ? await supabase
            .from("scheduled_posts")
            .select("id")
            .eq("client_id", profile.id)
            .gte("scheduled_for", now.toISOString())
            .lte("scheduled_for", weekEnd.toISOString())
            .limit(1)
        : { data: [] };

      if (upcomingPosts && upcomingPosts.length > 0) return;

      const { data: anyDrafts } = await supabase
        .from("campaign_drafts")
        .select("id")
        .eq("user_id", userId)
        .limit(1);

      const isFirstTime = !anyDrafts || anyDrafts.length === 0;
      const message = isFirstTime
        ? "Hey! I noticed you have no campaigns set up for the next 7 days. I'd love to get started on that and show you what I can do — just say \"fill my calendar\" and I'll build a full week of posts tailored to your brand."
        : "Hey! Your calendar is clear for the next 7 days. Want to get that sorted? Just say \"fill my calendar\" and you can have a full week of content ready in 5–15 minutes.";

      setTimeout(() => {
        setMessages([{
          id: `proactive-${Date.now()}`,
          role: "assistant",
          content: message,
          timestamp: new Date(),
          intent: "other",
        }]);
        setShowQuote(false);
      }, 2000);
    };

    checkAndOfferContent();
  }, []);

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // ── Auto-expand textarea up to 4 lines, scroll beyond ────────────────────
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    const lineHeight = 18;
    const maxHeight = lineHeight * 4 + 16; // 4 lines + padding
    ta.style.height = Math.min(ta.scrollHeight, maxHeight) + "px";
    ta.style.overflowY = ta.scrollHeight > maxHeight ? "auto" : "hidden";
  }, [input]);

  const handleSendMessage = useCallback(async (overrideInput?: string) => {
    const text = (overrideInput ?? input).trim();
    if (!text || isLoading) return;

    const userId = getEffectiveUserId();
    if (!userId) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: text,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);
    setShowQuote(false);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("No session");

      const requestId = `req-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const pageContext = buildPageContext();

      const conversationMessages = [...messages, userMessage].map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/klyc-chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
          apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          messages: conversationMessages,
          client_id: selectedClientId || undefined,
          campaign_draft: campaignDraft,
          draft_id: currentDraftId,
          request_id: requestId,
          timestamp: new Date().toISOString(),
          page_context: pageContext,
        }),
      });

      if (!resp.ok) {
        const errData = await resp.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(errData.error || `HTTP ${resp.status}`);
      }

      const data = await resp.json();

      if (data.nav_target) {
        navigate(data.nav_target);
      }

      if (data.draft_updates) {
        const { _draft_id, _onboarding_complete, _campaign_complete,
                _profile_scan_requested, _campaign_brief_requested,
                _audience_intel_requested, _competitor_watch_requested,
                _competitor_url, _calendar_fill_requested,
                campaign_draft, ...rest } = data.draft_updates;

        if (_draft_id) setCurrentDraftId(_draft_id);
        setCampaignDraft((prev) => ({ ...prev, ...rest, ...(campaign_draft || {}) }));

        if (_profile_scan_requested && rest.website) triggerProfileScan(rest.website, session.access_token);
        if (_campaign_brief_requested) triggerCampaignBrief(session.access_token);
        if (_audience_intel_requested) triggerAudienceIntel(session.access_token);
        if (_competitor_watch_requested) triggerCompetitorWatch(_competitor_url, session.access_token);
        if (_calendar_fill_requested) triggerCalendarFill(session.access_token);
        if (_campaign_complete) triggerKnpPipeline(campaign_draft || rest, session.access_token);
      }

      setMessages((prev) => [...prev, {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: data.message || "Got it!",
        timestamp: new Date(),
        intent: data.intent,
        nav_target: data.nav_target,
        next_questions: data.next_questions,
        draft_updates: data.draft_updates,
        requires_approval: data.requires_approval,
        risk_level: data.risk_level,
      }]);
    } catch (err: any) {
      console.error("Chat error:", err);
      setMessages((prev) => [...prev, {
        id: `error-${Date.now()}`,
        role: "assistant",
        content: "Something went wrong. Try again in a moment.",
        timestamp: new Date(),
        intent: "other",
      }]);
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, messages, campaignDraft, currentDraftId, selectedClientId, getEffectiveUserId, navigate, buildPageContext]);

  // ── Specialist trigger functions ───────────────────────────────────────────
  const triggerProfileScan = useCallback(async (website: string, token: string) => {
    setBackgroundTask({ label: "Scanning your website…", done: false });
    try {
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/scan-website`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, apikey: import.meta.env.VITE_SUPABASE_ANON_KEY },
        body: JSON.stringify({ url: website }),
      });
      const data = await resp.json();
      setBackgroundTask({ label: "Website scanned!", done: true });
      setTimeout(() => setBackgroundTask(null), 3000);
      if (data.success) {
        setMessages((prev) => [...prev, {
          id: `scan-${Date.now()}`, role: "assistant",
          content: `Done! I scanned ${website} and found: **${data.businessSummary?.businessName || "your business"}** — ${data.businessSummary?.description?.slice(0, 120) || "profile updated"}. Your business profile is now filled in!`,
          timestamp: new Date(), intent: "profile_assist",
        }]);
      }
    } catch (e) { setBackgroundTask(null); console.error("Profile scan error:", e); }
  }, []);

  const triggerCampaignBrief = useCallback(async (token: string) => {
    setBackgroundTask({ label: "Building your campaign brief…", done: false });
    try {
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/campaign-brief-ai`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, apikey: import.meta.env.VITE_SUPABASE_ANON_KEY },
        body: JSON.stringify({}),
      });
      const data = await resp.json();
      setBackgroundTask({ label: "Brief ready!", done: true });
      setTimeout(() => setBackgroundTask(null), 3000);
      if (data.success && data.brief) {
        const b = data.brief;
        setMessages((prev) => [...prev, {
          id: `brief-${Date.now()}`, role: "assistant",
          content: `Here's your campaign brief:\n\n**${b.campaign_name}**\n*${b.theme}*\n\nGoal: ${b.goal} · Platforms: ${(b.platforms || []).join(", ")} · ${b.posts_per_week}x/week for ${b.duration_days} days\n\nTop angles:\n${(b.content_angles || []).slice(0, 3).map((a: string) => `• ${a}`).join("\n")}\n\n**Why now:** ${b.why_now}`,
          timestamp: new Date(), intent: "campaign_brief",
        }]);
      }
    } catch (e) { setBackgroundTask(null); console.error("Campaign brief error:", e); }
  }, []);

  const triggerAudienceIntel = useCallback(async (token: string) => {
    setBackgroundTask({ label: "Analyzing your audience…", done: false });
    try {
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/audience-intel-ai`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, apikey: import.meta.env.VITE_SUPABASE_ANON_KEY },
        body: JSON.stringify({}),
      });
      const data = await resp.json();
      setBackgroundTask({ label: "Audience analysis ready!", done: true });
      setTimeout(() => setBackgroundTask(null), 3000);
      if (data.success && data.insights) {
        const ins = data.insights;
        setMessages((prev) => [...prev, {
          id: `intel-${Date.now()}`, role: "assistant",
          content: `**Audience intel:**\n\n${ins.primary_audience}\n\n**Growth opportunity:** ${ins.growth_opportunity}\n\n**Best posting times:** ${(ins.best_posting_times || []).join(", ")}\n\n**Recommended tone:** ${ins.recommended_tone}`,
          timestamp: new Date(), intent: "audience_intel",
        }]);
      }
    } catch (e) { setBackgroundTask(null); console.error("Audience intel error:", e); }
  }, []);

  const triggerCompetitorWatch = useCallback(async (competitorUrl: string | undefined, token: string) => {
    if (!competitorUrl) return;
    setBackgroundTask({ label: `Scanning ${competitorUrl}…`, done: false });
    try {
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/competitor-watch-ai`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, apikey: import.meta.env.VITE_SUPABASE_ANON_KEY },
        body: JSON.stringify({ competitor_url: competitorUrl }),
      });
      const data = await resp.json();
      setBackgroundTask({ label: "Competitor intel ready!", done: true });
      setTimeout(() => setBackgroundTask(null), 3000);
      if (data.success && data.analysis) {
        const a = data.analysis;
        setMessages((prev) => [...prev, {
          id: `comp-${Date.now()}`, role: "assistant",
          content: `**Competitor intel: ${data.competitorName}**\n\n${a.intelligence_summary}\n\n**Threat level:** ${a.threat_level}\n\n**Opportunities for us:**\n${(a.opportunities_for_us || []).map((o: string) => `• ${o}`).join("\n")}`,
          timestamp: new Date(), intent: "competitor_watch",
        }]);
      }
    } catch (e) { setBackgroundTask(null); console.error("Competitor watch error:", e); }
  }, []);

  const triggerCalendarFill = useCallback(async (token: string) => {
    setBackgroundTask({ label: "Filling your calendar…", done: false });
    try {
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/calendar-fill-ai`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, apikey: import.meta.env.VITE_SUPABASE_ANON_KEY },
        body: JSON.stringify({}),
      });
      const data = await resp.json();
      setBackgroundTask({ label: `${data.postsCreated || 0} posts scheduled!`, done: true });
      setTimeout(() => setBackgroundTask(null), 3000);
      if (data.success) {
        setMessages((prev) => [...prev, {
          id: `cal-${Date.now()}`, role: "assistant",
          content: `Done! I scheduled ${data.postsCreated} posts across the next 7 days. Check your calendar to see the full lineup — you can edit any post before it goes out.`,
          timestamp: new Date(), intent: "calendar_fill",
        }]);
      }
    } catch (e) { setBackgroundTask(null); console.error("Calendar fill error:", e); }
  }, []);

  const triggerKnpPipeline = useCallback(async (draft: Record<string, any>, token: string) => {
    setBackgroundTask({ label: "Generating your campaign…", done: false });
    try {
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/normalize-input`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, apikey: import.meta.env.VITE_SUPABASE_ANON_KEY },
        body: JSON.stringify({ campaign_draft: draft }),
      });
      const knpEnvelope = await resp.json();
      const orchResp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/klyc-orchestrator`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, apikey: import.meta.env.VITE_SUPABASE_ANON_KEY },
        body: JSON.stringify({ knp_envelope: knpEnvelope, meta: knpEnvelope.meta || {} }),
      });
      await orchResp.json();
      setBackgroundTask({ label: "Campaign generated!", done: true });
      setTimeout(() => setBackgroundTask(null), 3000);
    } catch (e) { setBackgroundTask(null); console.error("KNP pipeline error:", e); }
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  }, [handleSendMessage]);

  const handleQuestionClick = useCallback((question: string) => {
    handleSendMessage(question);
  }, [handleSendMessage]);

  const handleReset = useCallback(() => {
    setMessages([]);
    setCampaignDraft({});
    setCurrentDraftId(null);
    setInput("");
    setShowQuote(true);
  }, []);

  if (voiceMode) {
    return (
      <VoiceInterviewMode
        interviewType={voiceMode}
        onComplete={(data) => { setVoiceMode(null); console.log("Voice interview complete:", data); }}
        onCancel={() => setVoiceMode(null)}
      />
    );
  }

  return (
    <div className={cn(
      "flex flex-col bg-[#0a0a0a] border-l border-white/5 transition-all duration-300",
      isExpanded ? "w-[480px]" : "w-[280px]",
      "h-full relative"
    )}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/5 shrink-0">
        <div className="flex items-center gap-2">
          <img src={klycFace} alt="Klyc" className="w-6 h-6 rounded-full object-cover" />
          <span className="text-[11px] font-medium text-white/70">Klyc Chat</span>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-6 w-6 text-white/40 hover:text-white/70" onClick={handleReset} title="Reset chat">
            <RefreshCw className="h-3 w-3" />
          </Button>
          <Button variant="ghost" size="icon" className="h-6 w-6 text-white/40 hover:text-white/70" onClick={() => setIsExpanded((e) => !e)} title={isExpanded ? "Collapse" : "Expand"}>
            <Zap className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Background task indicator */}
      {backgroundTask && (
        <div className={cn(
          "px-3 py-1.5 text-[10px] flex items-center gap-2 shrink-0 border-b border-white/5",
          backgroundTask.done ? "text-green-400 bg-green-500/5" : "text-amber-400 bg-amber-500/5"
        )}>
          {!backgroundTask.done && <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />}
          {backgroundTask.label}
        </div>
      )}

      {/* Messages */}
      <ScrollArea className="flex-1 min-h-0">
        <div ref={scrollRef} className="flex flex-col gap-3 p-3">
          {showQuote && messages.length === 0 && (
            <div className="mt-4 px-2">
              <p className="text-[11px] text-white/30 italic leading-relaxed">"{randomQuote.quote}"</p>
              <p className="text-[10px] text-white/20 mt-1">— {randomQuote.author}</p>
            </div>
          )}

          {messages.map((message) => (
            <div key={message.id} className={cn("flex flex-col gap-1", message.role === "user" ? "items-end" : "items-start")}>
              <div className={cn(
                "rounded-lg px-3 py-2 max-w-[90%] text-[11px] leading-relaxed",
                message.role === "user" ? "bg-white/10 text-white/90" : "bg-white/5 text-white/80"
              )}>
                {message.role === "assistant" ? (
                  <ReactMarkdown
                    components={{
                      p: ({ children }) => <p className="mb-1 last:mb-0">{children}</p>,
                      strong: ({ children }) => <strong className="text-white font-semibold">{children}</strong>,
                      ul: ({ children }) => <ul className="list-disc list-inside space-y-0.5 my-1">{children}</ul>,
                      li: ({ children }) => <li className="text-white/70">{children}</li>,
                      code: ({ children }) => <code className="bg-white/10 px-1 rounded text-[10px]">{children}</code>,
                    }}
                  >
                    {message.content}
                  </ReactMarkdown>
                ) : message.content}
              </div>

              {message.role === "assistant" && message.next_questions && message.next_questions.length > 0 && (
                <div className="flex flex-col gap-1 w-full max-w-[90%]">
                  {message.next_questions.filter((q) => q.type === "button").map((q, i) => (
                    <button
                      key={i}
                      onClick={() => handleQuestionClick(q.question)}
                      className="text-left px-3 py-1.5 rounded-md bg-white/5 hover:bg-white/10 text-[11px] text-white/70 hover:text-white/90 transition-colors border border-white/5 hover:border-white/10"
                    >
                      {q.question}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="flex items-start">
              <div className="bg-white/5 rounded-lg px-3 py-2 flex items-center gap-1.5">
                <span className="w-1 h-1 rounded-full bg-white/40 animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-1 h-1 rounded-full bg-white/40 animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-1 h-1 rounded-full bg-white/40 animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Mic error banner */}
      {micError && (
        <div className="px-3 py-1.5 bg-red-500/10 border-t border-red-500/20 flex items-center justify-between gap-2 shrink-0">
          <p className="text-[10px] text-red-400 leading-tight flex-1">{micError}</p>
          <button
            className="text-[10px] text-red-400 underline underline-offset-2 shrink-0 hover:text-red-300"
            onClick={() => { setMicError(null); startListening(); }}
          >
            Try again
          </button>
        </div>
      )}

      {/* Input area */}
      <div className="p-2 border-t border-white/5 shrink-0">
        <div className="flex items-end gap-1.5">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isListening ? "🎙️ Listening…" : "Ask Klyc…"}
            className="flex-1 min-h-[36px] resize-none bg-white/5 border-white/10 text-white/90 placeholder:text-white/30 text-[11px] py-2 px-3 rounded-lg focus:ring-0 focus:border-white/20"
            rows={1}
            style={{ overflowY: "hidden" }}
          />
          <Button
            size="icon"
            onClick={isListening ? stopListening : startListening}
            title={isListening ? "Stop listening" : "Start voice input"}
            variant={isListening ? "default" : "ghost"}
            className={cn("h-7 w-7 shrink-0", isListening && "animate-pulse bg-red-500 hover:bg-red-600")}
          >
            <Mic className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="icon"
            onClick={() => handleSendMessage()}
            disabled={!input.trim() || isLoading}
            className="h-7 w-7 shrink-0 bg-white/10 hover:bg-white/20 disabled:opacity-30"
          >
            <Send className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SidebarChat;
