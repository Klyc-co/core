import { useRef, useEffect, useState } from "react";
import { MessageSquare, Send, X, Loader2, Mic } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useSidebarContext } from "@/contexts/SidebarContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { useClientContext } from "@/contexts/ClientContext";
import { supabase } from "@/integrations/supabase/client";
import ReactMarkdown from "react-markdown";
import VoiceInterviewMode from "@/components/VoiceInterviewMode";
import { autoPopulateFromDraftUpdates } from "@/lib/onboardingAutoPopulate";

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

const ChatSidebar = () => {
  const { isOpen, setIsOpen } = useSidebarContext();
  const isMobile = useIsMobile();
  const { getEffectiveUserId, selectedClientId } = useClientContext();
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "assistant", content: "Hey! I'm Klyc, your AI marketing strategist. How can I help you today?" },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [questionAnswers, setQuestionAnswers] = useState<Record<string, string>>({});
  const [interviewMode, setInterviewMode] = useState(false);
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

    // Resolve marketer_client_id for message persistence
    let marketerClientId: string | undefined;
    if (selectedClientId && selectedClientId !== "default") {
      const { data: mc } = await supabase
        .from("marketer_clients")
        .select("id")
        .eq("client_id", selectedClientId)
        .maybeSingle();
      marketerClientId = mc?.id;
    }

    // Build lightweight context summary from brain
    const contextSummary = selectedClientId && selectedClientId !== "default"
      ? `Active client: ${selectedClientId}. Draft: ${draftId || "none"}.`
      : undefined;

    const resp = await fetch(CHAT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        messages: allMessages.map((m) => ({ role: m.role, content: m.content })),
        client_id: effectiveClientId,
        marketer_client_id: marketerClientId,
        context_summary: contextSummary,
        draft_id: draftId,
      }),
    });

    if (!resp.ok) {
      const errorData = await resp.json().catch(() => ({}));
      throw new Error(errorData.error || `Request failed (${resp.status})`);
    }

    return (await resp.json()) as StructuredResponse;
  };

  // Handler for VoiceInterviewMode - sends message and returns structured response
  const sendForInterview = async (text: string) => {
    const userMsg: ChatMessage = { role: "user", content: text };
    const updated = [...messages, userMsg];
    setMessages(updated);

    const structured = await sendToKlyc(updated);

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
    };
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

      // Track draft_id across conversation
      if (structured.draft_updates?._draft_id) {
        setDraftId(structured.draft_updates._draft_id);
      }

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: structured.message,
          structured,
        },
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
    // Compile answers into a message
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
      <div className="mt-3 space-y-3 border-t border-sidebar-border pt-3">
        {questions.map((q) => (
          <div key={q.field} className="space-y-1">
            <label className="text-xs font-medium text-sidebar-foreground/80">{q.question}</label>
            {q.type === "select" && q.options ? (
              <Select
                value={questionAnswers[q.field] || ""}
                onValueChange={(v) => setQuestionAnswers((prev) => ({ ...prev, [q.field]: v }))}
              >
                <SelectTrigger className="h-8 text-xs bg-sidebar-accent border-sidebar-border">
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent>
                  {q.options.map((opt) => (
                    <SelectItem key={opt} value={opt}>
                      {opt}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : q.type === "bool" ? (
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant={questionAnswers[q.field] === "yes" ? "default" : "outline"}
                  className="h-7 text-xs"
                  onClick={() => setQuestionAnswers((prev) => ({ ...prev, [q.field]: "yes" }))}
                >
                  Yes
                </Button>
                <Button
                  size="sm"
                  variant={questionAnswers[q.field] === "no" ? "default" : "outline"}
                  className="h-7 text-xs"
                  onClick={() => setQuestionAnswers((prev) => ({ ...prev, [q.field]: "no" }))}
                >
                  No
                </Button>
              </div>
            ) : q.type === "date" ? (
              <Input
                type="date"
                className="h-8 text-xs bg-sidebar-accent border-sidebar-border"
                value={questionAnswers[q.field] || ""}
                onChange={(e) => setQuestionAnswers((prev) => ({ ...prev, [q.field]: e.target.value }))}
              />
            ) : (
              <Input
                className="h-8 text-xs bg-sidebar-accent border-sidebar-border"
                placeholder="Type your answer..."
                value={questionAnswers[q.field] || ""}
                onChange={(e) => setQuestionAnswers((prev) => ({ ...prev, [q.field]: e.target.value }))}
              />
            )}
          </div>
        ))}
        <Button
          size="sm"
          className="w-full h-7 text-xs"
          onClick={() => handleQuestionSubmit(questions)}
          disabled={isLoading}
        >
          Submit Answers
        </Button>
      </div>
    );
  };

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed left-4 bottom-4 z-50 h-12 w-12 rounded-full bg-primary shadow-lg hover:bg-primary/90"
        size="icon"
      >
        <MessageSquare className="h-5 w-5" />
      </Button>
    );
  }

  return (
    <>
      {isMobile && (
        <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setIsOpen(false)} />
      )}
      <div
        className={cn(
          "fixed left-0 top-0 h-screen bg-sidebar border-r border-sidebar-border flex flex-col z-50",
          isMobile ? "w-[85vw] max-w-80" : "w-80"
        )}
      >
        {/* Header */}
        <div className="p-4 border-b border-sidebar-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
              <MessageSquare className="h-4 w-4 text-primary-foreground" />
            </div>
            <div>
              <h2 className="font-semibold text-sidebar-foreground">Klyc</h2>
              <p className="text-xs text-sidebar-foreground/60">AI Command Center</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsOpen(false)}
            className="h-8 w-8 text-sidebar-foreground/60 hover:text-sidebar-foreground"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {interviewMode ? (
          <VoiceInterviewMode
            onComplete={() => setInterviewMode(false)}
            onSendMessage={sendForInterview}
          />
        ) : (
          <>
            {/* Messages */}
            <ScrollArea className="flex-1 p-4" ref={scrollRef}>
              <div className="space-y-4">
                {messages.map((msg, i) => (
                  <div key={i} className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}>
                    <div
                      className={cn(
                        "max-w-[85%] rounded-lg px-3 py-2 text-sm",
                        msg.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-sidebar-accent text-sidebar-accent-foreground"
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
                          {msg.structured?.next_questions &&
                            i === messages.length - 1 &&
                            renderNextQuestions(msg.structured.next_questions)}
                        </>
                      ) : (
                        msg.content
                      )}
                    </div>
                  </div>
                ))}
                {isLoading && messages[messages.length - 1]?.role === "user" && (
                  <div className="flex justify-start">
                    <div className="bg-sidebar-accent text-sidebar-accent-foreground rounded-lg px-3 py-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* Input */}
            <div className="p-4 border-t border-sidebar-border space-y-2">
              <div className="flex gap-2">
                <Textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask Klyc anything..."
                  className="min-h-[44px] max-h-32 resize-none bg-sidebar-accent border-sidebar-border text-sidebar-foreground placeholder:text-sidebar-foreground/50"
                  rows={1}
                />
                <Button onClick={() => handleSend()} disabled={!input.trim() || isLoading} size="icon" className="h-11 w-11 shrink-0">
                  <Send className="h-4 w-4" />
                </Button>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full text-xs border-sidebar-border"
                onClick={() => setInterviewMode(true)}
              >
                <Mic className="h-3 w-3 mr-1" /> Start Voice Onboarding
              </Button>
            </div>
          </>
        )}
      </div>
    </>
  );
};

export default ChatSidebar;
