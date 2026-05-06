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
  { quote: "Nobody reads advertising. People read what interests them.", author: "Howard Gossage" },
  { quote: "A principle isn't a principle until it costs you something.", author: "Bill Bernbach" },
  { quote: "Marketing is no longer about the stuff that you make, but about the stories you tell.", author: "Seth Godin" },
  { quote: "In God we trust. All others must bring data.", author: "W. Edwards Deming" },
  { quote: "Change is neither good nor bad. It simply is.", author: "Don Draper" },
  { quote: "Your brand is what other people say about you when you're not in the room.", author: "Jeff Bezos" },
  { quote: "Curiosity about life in all of its aspects is the secret of great creative people.", author: "Leo Burnett" },
  { quote: "Advertising is the most fun you can have with your clothes on.", author: "Jerry Della Femina" },
  { quote: "Design is not just what it looks like. Design is how it works.", author: "Steve Jobs" },
  { quote: "Stopping advertising to save money is like stopping your watch to save time.", author: "Henry Ford" },
  { quote: "By all means, move at a glacial pace. You know how that thrills me.", author: "Miranda Priestly" },
  { quote: "The best marketing doesn't feel like marketing.", author: "Tom Fishburne" },
  { quote: "Content is fire. Social media is gasoline.", author: "Jay Baer" },
  { quote: "Make it simple. Make it memorable. Make it inviting to look at.", author: "Leo Burnett" },
  { quote: "Either write something worth reading or do something worth writing about.", author: "Benjamin Franklin" },
  { quote: "Positioning is not what you do to a product. It's what you do to the mind of the prospect.", author: "Al Ries" },
  { quote: "Word of mouth is the best medium of all.", author: "Bill Bernbach" },
  { quote: "You can't use up creativity. The more you use, the more you have.", author: "Maya Angelou" },
];

const CLIENT_FIELD_OPTIONS: Record<string, string[]> = {
  goal: ["Launch a product", "Grow my audience", "Drive sales", "Build brand awareness"],
  platform: ["Instagram", "LinkedIn", "TikTok", "Twitter/X"],
  tone: ["Bold & direct", "Witty & fun", "Friendly & warm", "Professional"],
  vibe: ["Bold & direct", "Witty & fun", "Friendly & warm", "Professional"],
  style: ["Bold & direct", "Witty & fun", "Friendly & warm", "Professional"],
  voice: ["Bold & direct", "Witty & fun", "Friendly & warm", "Professional"],
  audience: ["Gen Z consumers", "B2B decision makers", "Local community", "Niche enthusiasts"],
  format: ["Short-form video", "Static image post", "Carousel", "Long-form article"],
  budget: ["Under $500", "$500-$2k", "$2k-$10k", "$10k+"],
  timeline: ["This week", "This month", "Next quarter", "Flexible"],
  industry: ["E-commerce", "SaaS / Tech", "Food & Beverage", "Health & Wellness"],
  content_type: ["Educational", "Promotional", "Behind-the-scenes", "User-generated"],
};

function extractFrontendQuestion(text: string): string {
  const lines = text.split("\n").filter((l) => l.trim().length > 0);
  for (let i = lines.length - 1; i >= 0; i--) {
    if (lines[i].trim().endsWith("?")) return lines[i].trim();
  }
  return lines[lines.length - 1] || text;
}

function enforceFrontendButtons(nq: NextQuestion[]): NextQuestion[] {
  if (nq.length === 0) return nq;
  const buttons = nq.filter((q) => q.type !== "fill_in");
  const hasFillIn = nq.some((q) => q.type === "fill_in");
  const realButtons = buttons.filter((q) => !q.question?.trim().endsWith("?"));
  if (realButtons.length >= 3) {
    return hasFillIn ? nq : [...nq, { field: "custom", question: "Something else...", type: "fill_in" as const }];
  }
  const field = (nq[0]?.field || "goal").toLowerCase().replace(/[^a-z_]/g, "");
  const options = CLIENT_FIELD_OPTIONS[field] || CLIENT_FIELD_OPTIONS["goal"];
  return [
    ...options.map((opt) => ({ field, question: opt, type: "button" as const })),
    { field: "custom", question: "Something else...", type: "fill_in" as const },
  ];
}

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

const NAV_INTENTS: Array<{ pattern: RegExp; route: string; reply: string }> = [
  {
    pattern: /make (a |my )?(first |new )?post|create (a |new )?post|generate (a |new )?post|write (a |new )?post|where.*make.*post|show me.*post|take me.*post/i,
    route: "/campaigns/generate",
    reply: "Taking you there now - let's build something.",
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

const KLYC_CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/klyc-chat`;
const SCAN_WEBSITE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/scan-website`;
const CAMPAIGN_BRIEF_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/campaign-brief-ai`;
const AUDIENCE_INTEL_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/audience-intel-ai`;
const COMPETITOR_WATCH_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/competitor-watch-ai`;
const CALENDAR_FILL_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/calendar-fill-ai`;
const FALLBACK_MSG = "I'm having trouble connecting right now. Please try again in a moment.";

function extractPostsFromPipeline(pipeline: any): any[] | null {
  if (!pipeline) return null;
  try {
    const sigmaO = pipeline["σo"] || pipeline;
    const aLane = sigmaO?.a_lane_envelopes || sigmaO?.final_products;
    const copyLane = aLane?.copy;
    if (!copyLane) return null;
    const posts = copyLane.posts || copyLane["σo"] || copyLane.packages;
    if (!Array.isArray(posts) || posts.length === 0) return null;
    return posts;
  } catch {
    return null;
  }
}

function formatPostsForChat(posts: any[]): string {
  const platformEmoji: Record<string, string> = {
    linkedin: "💼",
    twitter: "🐦",
    instagram: "📷",
    tiktok: "🎵",
    youtube: "▶️",
    facebook: "📘",
  };
  let out = "✅ **Posts ready! Here's what I built:**\n\n";
  for (const p of posts) {
    const pl = (p.platform || "").toLowerCase();
    const em = platformEmoji[pl] || "📱";
    out += `---\n**${em} ${pl.toUpperCase()}**\n\n`;
    if (p.hook) out += `**Hook:** ${p.hook}\n\n`;
    if (p.body) out += `${p.body}\n\n`;
    if (p.cta) out += `**CTA:** ${p.cta}\n\n`;
    if (Array.isArray(p.hashtags) && p.hashtags.length) {
      out += p.hashtags.map((h: string) => (h.startsWith("#") ? h : `#${h}`)).join(" ") + "\n\n";
    }
    if (p.posting_time?.primary) out += `🕐 *Best time: ${p.posting_time.primary}*\n\n`;
  }
  return out.trim();
}

// ── Voice-to-text via Web Speech API ────────────────────────────────────────
function useSpeechToText(onResult: (text: string) => void) {
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  const startListening = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Voice input isn't supported in this browser. Try Chrome.");
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      onResult(transcript);
    };
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);
    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  }, [onResult]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setIsListening(false);
  }, []);

  return { isListening, startListening, stopListening };
}

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
  const [loadingQuote, setLoadingQuote] = useState<{ quote: string; author: string } | null>(null);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [questionAnswers, setQuestionAnswers] = useState<Record<string, string>>({});
  const [interviewMode, setInterviewMode] = useState<InterviewType | null>(null);
  const [pendingQueueNav, setPendingQueueNav] = useState(false);
  const [lastFailedText, setLastFailedText] = useState<string | null>(null);
  const [lastPromptedRoute, setLastPromptedRoute] = useState<string | null>(null);
  const [profileScanTriggered, setProfileScanTriggered] = useState(false);
  const [campaignBriefSensorFired, setCampaignBriefSensorFired] = useState(false);
  const [audienceIntelSensorFired, setAudienceIntelSensorFired] = useState(false);
  const [calendarFillSensorFired, setCalendarFillSensorFired] = useState(false);
  // Background task indicator — shows pulsing bar while any model runs detached
  const [backgroundTask, setBackgroundTask] = useState<{ label: string; done: boolean } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { isListening, startListening, stopListening } = useSpeechToText((transcript) => {
    setInput((prev) => (prev ? prev + " " + transcript : transcript));
  });

  const buildPageContext = useCallback((): string | undefined => {
    if (location.pathname === "/profile/company") {
      return "page=business_profile\nprofile_incomplete=true\ninstruction=Ask the user for their website URL to auto-fill their business profile.";
    }
    return undefined;
  }, [location.pathname]);

  useEffect(() => {
    if (location.pathname === "/campaigns/generate" && lastPromptedRoute !== "/campaigns/generate") {
      setLastPromptedRoute("/campaigns/generate");
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "📝 **Let's create a post!**\n\nTell me about your post — what's the idea, what are you promoting, and who's your target audience?",
        },
      ]);
    }
  }, [location.pathname]);

  // ── Proactive profile assist: fires when description is empty ────────────
  useEffect(() => {
    const checkAndOfferProfileAssist = async () => {
      if (location.pathname !== "/profile/company") return;
      if (profileScanTriggered) return;
      if (lastPromptedRoute === "/profile/company") return;
      setProfileScanTriggered(true);
      await new Promise((r) => setTimeout(r, 1200));
      try {
        const session = await supabase.auth.getSession();
        const userId = session.data.session?.user?.id;
        if (!userId) return;
        const { data: profile } = await supabase
          .from("client_profiles")
          .select("business_name, description")
          .eq("user_id", userId)
          .maybeSingle();
        const isEmpty = !profile || !profile.description;
        if (!isEmpty) return;
        setLastPromptedRoute("/profile/company");
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: "👋 Your business profile needs filling in! Drop your website URL and I'll scan it and fill everything in for your review. You can keep browsing while I work — I'll notify you when it's done.",
          },
        ]);
      } catch { /* non-blocking */ }
    };
    checkAndOfferProfileAssist();
  }, [location.pathname, profileScanTriggered]);

  // ── Proactive campaign brief sensor: fires on dashboard/campaigns when no recent campaign ──
  useEffect(() => {
    const checkAndOfferCampaignBrief = async () => {
      if (!["dashboard", "/campaigns"].includes(location.pathname)) return;
      if (campaignBriefSensorFired) return;
      setCampaignBriefSensorFired(true);
      await new Promise((r) => setTimeout(r, 3000));
      try {
        const session = await supabase.auth.getSession();
        const userId = session.data.session?.user?.id;
        if (!userId) return;
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
        const { data: recentCampaigns } = await supabase
          .from("campaign_drafts")
          .select("id")
          .eq("user_id", userId)
          .gte("created_at", sevenDaysAgo)
          .limit(1);
        if (recentCampaigns && recentCampaigns.length > 0) return;
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: "💡 No campaigns in the last 7 days — want me to build you a campaign brief? I'll analyze your profile and post history and put together a full strategy. Just say \"build me a brief\" or \"campaign brief\".",
          },
        ]);
      } catch { /* non-blocking */ }
    };
    checkAndOfferCampaignBrief();
  }, [location.pathname, campaignBriefSensorFired]);

  // ── Proactive audience intel sensor: fires on profile page when audience_data is empty ──
  useEffect(() => {
    const checkAndOfferAudienceIntel = async () => {
      if (location.pathname !== "/profile/company") return;
      if (audienceIntelSensorFired) return;
      setAudienceIntelSensorFired(true);
      await new Promise((r) => setTimeout(r, 5000));
      try {
        const session = await supabase.auth.getSession();
        const userId = session.data.session?.user?.id;
        if (!userId) return;
        const { data: profile } = await supabase
          .from("client_profiles")
          .select("audience_data, target_audience")
          .eq("user_id", userId)
          .maybeSingle();
        const noAudienceData = !profile?.audience_data && !profile?.target_audience;
        if (!noAudienceData) return;
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: "🎯 No audience data yet — want me to analyze your content and build your audience profile? Say \"analyze my audience\" and I'll dig through your posts.",
          },
        ]);
      } catch { /* non-blocking */ }
    };
    checkAndOfferAudienceIntel();
  }, [location.pathname, audienceIntelSensorFired]);

  // ── Proactive calendar fill sensor: fires on campaigns page when no posts scheduled this week ──
  useEffect(() => {
    const checkAndOfferCalendarFill = async () => {
      if (location.pathname !== "/campaigns") return;
      if (calendarFillSensorFired) return;
      setCalendarFillSensorFired(true);
      await new Promise((r) => setTimeout(r, 4000));
      try {
        const session = await supabase.auth.getSession();
        const userId = session.data.session?.user?.id;
        if (!userId) return;
        const weekEnd = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
        const { data: scheduledPosts } = await supabase
          .from("scheduled_posts")
          .select("id")
          .eq("user_id", userId)
          .lte("scheduled_at", weekEnd)
          .gte("scheduled_at", new Date().toISOString())
          .limit(1);
        if (scheduledPosts && scheduledPosts.length > 0) return;
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: "📅 Nothing scheduled for the next 7 days — want me to fill your content calendar? Say \"fill my calendar\" and I'll build a full week of posts based on your brand.",
          },
        ]);
      } catch { /* non-blocking */ }
    };
    checkAndOfferCalendarFill();
  }, [location.pathname, calendarFillSensorFired]);

  const fetchLoadingQuote = useCallback(async (excludeAuthor?: string) => {
    try {
      const { data, error } = await (supabase.rpc as any)("get_random_quote", { p_exclude_author: excludeAuthor || null });
      if (!error && data) {
        const rows = Array.isArray(data) ? data : [data];
        if (rows.length > 0 && rows[0]?.quote) {
          setLoadingQuote({ quote: rows[0].quote, author: rows[0].author });
          return rows[0].author as string;
        }
      }
    } catch {}
    const pool = excludeAuthor ? FALLBACK_QUOTES.filter((q) => q.author !== excludeAuthor) : FALLBACK_QUOTES;
    const pick = pool[Math.floor(Math.random() * pool.length)] || FALLBACK_QUOTES[0];
    setLoadingQuote(pick);
    return pick.author;
  }, []);

  useEffect(() => {
    if (!isLoading) { setLoadingQuote(null); return; }
    let currentAuthor: string | undefined;
    fetchLoadingQuote().then((a) => { currentAuthor = a; });
    const id = setInterval(() => { fetchLoadingQuote(currentAuthor).then((a) => { currentAuthor = a; }); }, 4500);
    return () => clearInterval(id);
  }, [isLoading, fetchLoadingQuote]);

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
    for (const key of ["message", "reply", "response", "text", "content", "result"]) {
      const val = data[key];
      if (typeof val === "string" && val.trim().length > 0) return val;
    }
    return "";
  };

  const callOrchestrator = async (
    payload: { message: string; history?: Array<{ role: string; content: string }> },
  ): Promise<{ text: string; usage?: { input_tokens: number; output_tokens: number }; nav_target?: string; next_questions?: NextQuestion[]; _knp_fired?: boolean; pipeline?: any; draft_updates?: Record<string, any> }> => {
    const session = await supabase.auth.getSession();
    const token = session.data.session?.access_token;
    if (!token) throw new Error("Not authenticated");
    const msgs = [...(payload.history || []), { role: "user", content: payload.message }];
    const pageCtx = buildPageContext();
    const resp = await fetch(KLYC_CHAT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      },
      body: JSON.stringify({ messages: msgs, request_id: crypto.randomUUID(), ...(pageCtx ? { page_context: pageCtx } : {}) }),
    });
    if (!resp.ok) {
      const errorData = await resp.json().catch(() => ({}));
      throw new Error(errorData.message || errorData.error || `Request failed (${resp.status})`);
    }
    const data = await resp.json();
    let finalText = extractResponseText(data) || FALLBACK_MSG;
    let finalNQ: NextQuestion[] = (data.next_questions || []) as NextQuestion[];
    if (finalNQ.length > 0) {
      if (finalText.includes("?")) {
        finalText = extractFrontendQuestion(finalText);
        finalNQ = enforceFrontendButtons(finalNQ);
      } else {
        finalNQ = [];
        const firstLine = finalText.split("\n").find((l) => l.trim().length > 0)?.trim();
        if (firstLine) finalText = firstLine;
      }
    }
    return { text: finalText, usage: data.usage, nav_target: data.nav_target as string | undefined, next_questions: finalNQ, _knp_fired: data._knp_fired as boolean | undefined, pipeline: data.pipeline, draft_updates: data.draft_updates };
  };

  // ── Auth helper ─────────────────────────────────────────────────────────────
  const getAuthToken = async (): Promise<string> => {
    const session = await supabase.auth.getSession();
    const token = session.data.session?.access_token;
    if (!token) throw new Error("Not authenticated");
    return token;
  };

  // ── Model 1: Profile scan — fully detached ──────────────────────────────────
  const runProfileScanInBackground = useCallback(async (scanUrl: string) => {
    setBackgroundTask({ label: `Scanning ${scanUrl}…`, done: false });

    const narrationTimers: ReturnType<typeof setTimeout>[] = [];
    narrationTimers.push(setTimeout(() => {
      setMessages(prev => [...prev, { role: "assistant", content: "🕷️ Crawling your site — pulling every page I can find…" }]);
    }, 2500));
    narrationTimers.push(setTimeout(() => {
      setMessages(prev => [...prev, { role: "assistant", content: "📄 Reading through your content — extracting what matters…" }]);
    }, 12000));
    narrationTimers.push(setTimeout(() => {
      setMessages(prev => [...prev, { role: "assistant", content: "🧠 Analyzing your brand, products, and positioning…" }]);
    }, 22000));

    const clearNarration = () => narrationTimers.forEach(t => clearTimeout(t));

    try {
      const token = await getAuthToken();
      const scanResp = await fetch(SCAN_WEBSITE_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({ url: scanUrl }),
      });

      clearNarration();

      if (scanResp.ok) {
        const scanData = await scanResp.json();
        const bizName = scanData.businessSummary?.businessName;
        const pagesCount = scanData.pagesScanned || 1;

        window.dispatchEvent(new CustomEvent("klyc-profile-updated", { detail: scanData.businessSummary }));
        setBackgroundTask({ label: "Profile filled in!", done: true });
        setTimeout(() => setBackgroundTask(null), 4000);

        toast({
          title: "✅ Profile filled in!",
          description: `Found ${bizName || "your business"} — scanned ${pagesCount} page${pagesCount !== 1 ? "s" : ""}. Go review it.`,
          duration: 8000,
        });

        setMessages(prev => [
          ...prev,
          {
            role: "assistant",
            content: `✅ Done! Found **${bizName || "your business"}** — scanned ${pagesCount} page${pagesCount !== 1 ? "s" : ""} and pre-filled your profile. Review the fields and hit **Save Profile** when you're happy!`,
          },
        ]);
      } else {
        const errData = await scanResp.json().catch(() => ({}));
        setBackgroundTask(null);
        setMessages(prev => [...prev, { role: "assistant", content: `Couldn't scan that URL — ${errData.error || "check the address and try again"}.` }]);
      }
    } catch (err) {
      clearNarration();
      setBackgroundTask(null);
      setMessages(prev => [...prev, { role: "assistant", content: "Scan hit an error — make sure the URL is reachable and try again." }]);
    }
  }, [toast]);

  // ── Model 2: Campaign Brief — fully detached ────────────────────────────────
  const runCampaignBriefInBackground = useCallback(async () => {
    setBackgroundTask({ label: "Building campaign brief…", done: false });

    const narrationTimers: ReturnType<typeof setTimeout>[] = [];
    narrationTimers.push(setTimeout(() => {
      setMessages(prev => [...prev, { role: "assistant", content: "📊 Pulling your profile and post history…" }]);
    }, 2000));
    narrationTimers.push(setTimeout(() => {
      setMessages(prev => [...prev, { role: "assistant", content: "🧠 Analyzing your brand positioning and content patterns…" }]);
    }, 9000));

    const clearNarration = () => narrationTimers.forEach(t => clearTimeout(t));

    try {
      const token = await getAuthToken();
      const resp = await fetch(CAMPAIGN_BRIEF_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({}),
      });

      clearNarration();

      if (resp.ok) {
        const data = await resp.json();
        const brief = data.brief;
        setBackgroundTask({ label: "Campaign brief ready!", done: true });
        setTimeout(() => setBackgroundTask(null), 4000);

        toast({ title: "📋 Campaign brief ready!", description: "Your strategy has been built.", duration: 6000 });

        const briefMsg = brief
          ? `✅ **Campaign Brief — ${brief.campaign_name || "Your Next Campaign"}**\n\n**Theme:** ${brief.theme}\n**Goal:** ${brief.goal}\n**Platforms:** ${(brief.platforms || []).join(", ")}\n**Duration:** ${brief.duration_days} days · ${brief.posts_per_week} posts/week\n**CTA:** ${brief.cta}\n\n**Why now:** ${brief.why_now}`
          : "✅ Campaign brief built and saved. Check your drafts.";

        setMessages(prev => [...prev, { role: "assistant", content: briefMsg }]);
      } else {
        const errData = await resp.json().catch(() => ({}));
        setBackgroundTask(null);
        setMessages(prev => [...prev, { role: "assistant", content: `Couldn't build the brief — ${errData.error || "try again in a moment"}.` }]);
      }
    } catch (err) {
      clearNarration();
      setBackgroundTask(null);
      setMessages(prev => [...prev, { role: "assistant", content: "Brief generation hit an error — try again." }]);
    }
  }, [toast]);

  // ── Model 3: Audience Intelligence — fully detached ─────────────────────────
  const runAudienceIntelInBackground = useCallback(async () => {
    setBackgroundTask({ label: "Analyzing your audience…", done: false });

    const narrationTimers: ReturnType<typeof setTimeout>[] = [];
    narrationTimers.push(setTimeout(() => {
      setMessages(prev => [...prev, { role: "assistant", content: "📱 Pulling your post history and engagement data…" }]);
    }, 2000));
    narrationTimers.push(setTimeout(() => {
      setMessages(prev => [...prev, { role: "assistant", content: "🔍 Cross-referencing patterns across your content…" }]);
    }, 9000));

    const clearNarration = () => narrationTimers.forEach(t => clearTimeout(t));

    try {
      const token = await getAuthToken();
      const resp = await fetch(AUDIENCE_INTEL_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({}),
      });

      clearNarration();

      if (resp.ok) {
        const data = await resp.json();
        const insights = data.insights;
        setBackgroundTask({ label: "Audience analysis done!", done: true });
        setTimeout(() => setBackgroundTask(null), 4000);

        toast({ title: "🎯 Audience analysis done!", description: "Your audience profile has been updated.", duration: 6000 });

        const insightMsg = insights
          ? `✅ **Audience Intelligence Report**\n\n**Primary Audience:** ${insights.primary_audience_segment}\n**Best Platforms:** ${(insights.top_platforms || []).join(", ")}\n**Strongest Content:** ${insights.strongest_content_type}\n**Best Post Time:** ${insights.optimal_posting_time}\n\n**Key Insight:** ${insights.key_insight}`
          : "✅ Audience analysis complete — your profile has been updated.";

        setMessages(prev => [...prev, { role: "assistant", content: insightMsg }]);
      } else {
        const errData = await resp.json().catch(() => ({}));
        setBackgroundTask(null);
        setMessages(prev => [...prev, { role: "assistant", content: `Couldn't run audience analysis — ${errData.error || "try again in a moment"}.` }]);
      }
    } catch (err) {
      clearNarration();
      setBackgroundTask(null);
      setMessages(prev => [...prev, { role: "assistant", content: "Audience analysis hit an error — try again." }]);
    }
  }, [toast]);

  // ── Model 4: Competitor Watch — fully detached ──────────────────────────────
  const runCompetitorWatchInBackground = useCallback(async (competitorUrl: string) => {
    const displayName = competitorUrl.replace(/^https?:\/\//, "").split("/")[0];
    setBackgroundTask({ label: `Scanning ${displayName}…`, done: false });

    const narrationTimers: ReturnType<typeof setTimeout>[] = [];
    narrationTimers.push(setTimeout(() => {
      setMessages(prev => [...prev, { role: "assistant", content: `🕵️ Crawling ${displayName} — pulling their pages and content…` }]);
    }, 2000));
    narrationTimers.push(setTimeout(() => {
      setMessages(prev => [...prev, { role: "assistant", content: "🧠 Comparing their positioning against yours…" }]);
    }, 14000));

    const clearNarration = () => narrationTimers.forEach(t => clearTimeout(t));

    try {
      const token = await getAuthToken();
      const resp = await fetch(COMPETITOR_WATCH_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({ competitor_url: competitorUrl, competitor_name: displayName }),
      });

      clearNarration();

      if (resp.ok) {
        const data = await resp.json();
        const analysis = data.analysis;
        setBackgroundTask({ label: "Competitor intel ready!", done: true });
        setTimeout(() => setBackgroundTask(null), 4000);

        toast({ title: "🕵️ Competitor intel ready!", description: `Analysis of ${data.competitorName || displayName} complete.`, duration: 6000 });

        const intelMsg = analysis
          ? `✅ **Competitor Intel — ${data.competitorName || displayName}**\n\n**Their Positioning:** ${analysis.positioning}\n**Their Strengths:** ${analysis.key_strengths}\n**Gaps We Can Exploit:** ${analysis.opportunities_for_us}\n**Threat Level:** ${analysis.threat_level}\n\n**Bottom Line:** ${analysis.intelligence_summary}`
          : `✅ Competitor analysis on ${displayName} complete — saved to your intel file.`;

        setMessages(prev => [...prev, { role: "assistant", content: intelMsg }]);
      } else {
        const errData = await resp.json().catch(() => ({}));
        setBackgroundTask(null);
        setMessages(prev => [...prev, { role: "assistant", content: `Couldn't scan ${displayName} — ${errData.error || "check the URL and try again"}.` }]);
      }
    } catch (err) {
      clearNarration();
      setBackgroundTask(null);
      setMessages(prev => [...prev, { role: "assistant", content: "Competitor scan hit an error — try again." }]);
    }
  }, [toast]);

  // ── Model 5: Calendar Fill — fully detached ─────────────────────────────────
  const runCalendarFillInBackground = useCallback(async () => {
    setBackgroundTask({ label: "Filling your content calendar…", done: false });

    const narrationTimers: ReturnType<typeof setTimeout>[] = [];
    narrationTimers.push(setTimeout(() => {
      setMessages(prev => [...prev, { role: "assistant", content: "📅 Checking your schedule and brand voice…" }]);
    }, 2000));
    narrationTimers.push(setTimeout(() => {
      setMessages(prev => [...prev, { role: "assistant", content: "✍️ Writing posts for each day of the week…" }]);
    }, 9000));

    const clearNarration = () => narrationTimers.forEach(t => clearTimeout(t));

    try {
      const token = await getAuthToken();
      const resp = await fetch(CALENDAR_FILL_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({}),
      });

      clearNarration();

      if (resp.ok) {
        const data = await resp.json();
        const count = data.postsCreated || 0;
        const schedule = data.schedule || [];
        setBackgroundTask({ label: `${count} posts scheduled!`, done: true });
        setTimeout(() => setBackgroundTask(null), 4000);

        toast({ title: "📅 Calendar filled!", description: `${count} posts drafted for this week.`, duration: 6000 });

        const schedMsg = schedule.length > 0
          ? `✅ **${count} posts drafted for the week:**\n\n${schedule.slice(0, 5).map((p: any) => `• **Day ${p.day_offset} · ${p.platform}** — ${p.topic} *(${p.content_type})*`).join("\n")}${schedule.length > 5 ? `\n• …and ${schedule.length - 5} more` : ""}\n\nAll saved as drafts — review them in Campaigns.`
          : `✅ Content calendar filled — ${count} posts drafted for this week.`;

        setMessages(prev => [...prev, { role: "assistant", content: schedMsg }]);
      } else {
        const errData = await resp.json().catch(() => ({}));
        setBackgroundTask(null);
        setMessages(prev => [...prev, { role: "assistant", content: `Couldn't fill the calendar — ${errData.error || "try again in a moment"}.` }]);
      }
    } catch (err) {
      clearNarration();
      setBackgroundTask(null);
      setMessages(prev => [...prev, { role: "assistant", content: "Calendar fill hit an error — try again." }]);
    }
  }, [toast]);

  const handleInterviewComplete = async (result?: { draftId?: string; approved?: boolean }) => {
    setInterviewMode(null);
    if (result?.approved && result?.draftId) {
      toast({ title: "Campaign approved!", description: "Starting campaign pipeline..." });
      try {
        const pipelineResult = await runCampaignPipeline(result.draftId, { auto_schedule: false });
        if (pipelineResult.success) {
          const postCount = pipelineResult.post_queue_ids.length;
          toast({ title: "Campaign created!", description: `${postCount} posts generated and queued.` });
          setMessages((prev) => [...prev, { role: "assistant", content: `Your campaign is ready! **${postCount} posts** have been generated and queued.` }]);
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

    const isNavOnlyMessage = text.trim().length <= 80;
    const navMatch = isNavOnlyMessage ? NAV_INTENTS.find((n) => n.pattern.test(text)) : null;
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

      if (result.nav_target) setTimeout(() => navigate(result.nav_target!), 700);

      // Guard 3: campaign pipeline
      if (result.draft_updates?._campaign_complete && result.draft_updates?._draft_id) {
        const guardDraftId = result.draft_updates._draft_id as string;
        runCampaignPipeline(guardDraftId, { auto_schedule: false })
          .then((pr) => {
            if (pr.success) {
              const count = pr.post_queue_ids?.length || 0;
              toast({ title: "Campaign ready!", description: `${count} posts generated.` });
              setMessages((prev) => [...prev, { role: "assistant", content: `✅ **${count} posts** generated and queued. Taking you to campaigns now.` }]);
              setTimeout(() => navigate("/campaigns"), 600);
            }
          })
          .catch((e) => {
            console.error("[KLYC] pipeline error:", e);
            toast({ title: "Generation issue", description: "Brief saved — try from Campaigns.", variant: "destructive" });
          });
      }

      if (result._knp_fired && result.pipeline) {
        const posts = extractPostsFromPipeline(result.pipeline);
        if (posts && posts.length > 0) {
          setTimeout(() => { setMessages((prev) => [...prev, { role: "assistant", content: formatPostsForChat(posts) }]); }, 400);
          setTimeout(() => navigate("/campaigns"), 2200);
        }
      }

      // ── Model 1: Profile scan ─────────────────────────────────────────────
      if (result.draft_updates?._profile_scan_requested && result.draft_updates?.website) {
        runProfileScanInBackground(result.draft_updates.website as string);
      }

      // ── Model 2: Campaign Brief ───────────────────────────────────────────
      if (result.draft_updates?._campaign_brief_requested) {
        runCampaignBriefInBackground();
      }

      // ── Model 3: Audience Intelligence ────────────────────────────────────
      if (result.draft_updates?._audience_intel_requested) {
        runAudienceIntelInBackground();
      }

      // ── Model 4: Competitor Watch ─────────────────────────────────────────
      if (result.draft_updates?._competitor_watch_requested) {
        const competitorUrl = result.draft_updates._competitor_url as string | undefined;
        if (competitorUrl) {
          runCompetitorWatchInBackground(competitorUrl);
        }
      }

      // ── Model 5: Calendar Fill ────────────────────────────────────────────
      if (result.draft_updates?._calendar_fill_requested) {
        runCalendarFillInBackground();
      }

    } catch (error) {
      console.error("Chat error:", error);
      setLastFailedText(text);
      setMessages((prev) => [...prev, { role: "assistant", content: "Sorry, I encountered an error. Click retry or send a new message." }]);
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

      {/* Background task indicator — pulsing while any model runs detached */}
      {backgroundTask && (
        <div className={cn(
          "px-3 py-1.5 border-b flex items-center gap-2 text-[10px] shrink-0 transition-colors",
          backgroundTask.done
            ? "bg-green-500/10 border-green-500/20 text-green-400"
            : "bg-primary/10 border-primary/20 text-primary"
        )}>
          <div className={cn(
            "w-1.5 h-1.5 rounded-full",
            backgroundTask.done ? "bg-green-400" : "bg-primary animate-pulse"
          )} />
          <span>{backgroundTask.label}</span>
        </div>
      )}

      <ScrollArea className="flex-1 px-3 py-2" ref={scrollRef}>
        <div className="space-y-2">
          {messages.map((msg, i) => (
            <div key={i} className={cn("flex w-full", msg.role === "user" ? "justify-end" : "justify-start")}>
              {msg.role === "assistant" && (
                <img src={klycFace} alt="Klyc" className="w-6 h-6 rounded-full object-cover mr-1.5 mt-1 flex-shrink-0" />
              )}
              <div className={cn(
                "max-w-[85%] rounded-lg px-2.5 py-1.5 text-xs",
                msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
              )}>
                {msg.role === "assistant" ? (
                  <>
                    <div className="prose prose-xs dark:prose-invert max-w-none [&_p]:my-0.5 [&_ul]:my-0.5 [&_ol]:my-0.5 [&_li]:my-0">
                      <ReactMarkdown skipHtml>{msg.content}</ReactMarkdown>
                    </div>
                    {i === messages.length - 1 && lastFailedText && msg.content.includes("error") && (
                      <Button size="sm" variant="outline" className="mt-1.5 w-full text-[10px] gap-1 h-6"
                        onClick={() => { setMessages((prev) => prev.slice(0, -1)); handleSend(lastFailedText); }}
                        disabled={isLoading}>
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
                        {msg.next_questions.map((q, qi) =>
                          q.type === "fill_in" ? (
                            <div key={qi} className="flex gap-1 w-full mt-0.5">
                              <Input
                                value={fillInValue}
                                onChange={(e) => setFillInValue(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter" && fillInValue.trim()) {
                                    setMessages((prev) => prev.map((m, mi) => mi === i ? { ...m, next_questions: [] } : m));
                                    handleSend(fillInValue.trim());
                                    setFillInValue("");
                                  }
                                }}
                                placeholder={q.question || "Type your answer..."}
                                className="text-[11px] h-7 flex-1"
                                disabled={isLoading}
                              />
                              <Button size="sm" disabled={!fillInValue.trim() || isLoading}
                                onClick={() => {
                                  setMessages((prev) => prev.map((m, mi) => mi === i ? { ...m, next_questions: [] } : m));
                                  handleSend(fillInValue.trim());
                                  setFillInValue("");
                                }}
                                className="h-7 text-[10px] px-2 shrink-0">
                                <Send className="h-2.5 w-2.5" />
                              </Button>
                            </div>
                          ) : (
                            <button key={qi}
                              onClick={() => {
                                setMessages((prev) => prev.map((m, mi) => mi === i ? { ...m, next_questions: [] } : m));
                                handleSend(q.question || q.field);
                              }}
                              disabled={isLoading}
                              className="text-[11px] px-2.5 py-1 rounded-md border border-primary/50 text-primary hover:bg-primary/10 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed font-medium">
                              {q.question || q.field}
                            </button>
                          )
                        )}
                      </div>
                    )}
                  </>
                ) : msg.content}
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start w-full items-start">
              <img src={klycFace} alt="Klyc" className="w-6 h-6 rounded-full object-cover mr-1.5 mt-1 flex-shrink-0" />
              <div className="bg-muted rounded-lg px-2.5 py-1.5 text-xs text-muted-foreground italic animate-pulse max-w-[85%]">
                {loadingQuote ? (
                  <>
                    <span>{loadingQuote.quote}</span>
                    <span className="block mt-0.5 text-[9px] not-italic opacity-60">— {loadingQuote.author}</span>
                  </>
                ) : <span>...</span>}
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="px-2 py-1.5 border-t border-border flex items-center gap-1.5 shrink-0">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={isListening ? "🎙️ Listening…" : "Ask Klyc…"}
          className="min-h-[32px] max-h-16 resize-none flex-1 text-xs"
          rows={1}
        />
        <Button
          onClick={isListening ? stopListening : startListening}
          size="icon"
          variant={isListening ? "default" : "ghost"}
          className={cn("h-7 w-7 shrink-0", isListening && "animate-pulse bg-red-500 hover:bg-red-600")}
          title="Voice input"
        >
          <Mic className="h-3 w-3" />
        </Button>
        <Button onClick={() => handleSend()} disabled={!input.trim() || isLoading} size="icon" className="h-7 w-7 shrink-0">
          <Send className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
};

export default SidebarChat;
