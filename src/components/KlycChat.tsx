import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Send, Paperclip, Bot, User, ChevronDown, ChevronRight, Download, AlertTriangle, Shield, Eye, Zap, ToggleLeft, ToggleRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { SmartPrompt, ViralScoreCard, ApprovalPrompt } from "@/components/SmartPrompt";
import { useIsMobile } from "@/hooks/use-mobile";
import ReactMarkdown from "react-markdown";
import type {
  ConversationMessage,
  CompetitorAlert,
  SoloModeDecision,
  KlycOrchestratorState,
} from "@/hooks/useKlycOrchestrator";

// ---- Inline chart placeholder (renders recharts if chartData present) ----
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import type { ChartDescriptor } from "@/hooks/useKlycOrchestrator";

function InlineChart({ chart }: { chart: ChartDescriptor }) {
  const ChartComponent = chart.type === "line" ? LineChart : BarChart;
  const DataComponent = chart.type === "line" ? Line : Bar;

  return (
    <div className="rounded-lg border border-border bg-card p-3 my-2">
      <p className="text-xs font-medium text-foreground mb-2">{chart.title}</p>
      <ResponsiveContainer width="100%" height={180}>
        <ChartComponent data={chart.data}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
          <XAxis dataKey={chart.xKey} tick={{ fontSize: 10 }} className="text-muted-foreground" />
          <YAxis tick={{ fontSize: 10 }} className="text-muted-foreground" />
          <Tooltip />
          {chart.yKeys.map((key, i) => (
            <DataComponent
              key={key}
              type="monotone"
              dataKey={key}
              fill={`hsl(var(--primary))`}
              stroke={`hsl(var(--primary))`}
              {...(chart.type === "bar" ? { radius: [4, 4, 0, 0] } : {})}
            />
          ))}
        </ChartComponent>
      </ResponsiveContainer>
    </div>
  );
}

// ---- Thinking indicator ----
function ThinkingIndicator() {
  return (
    <div className="flex items-start gap-2.5 px-4 py-2">
      <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
        <Bot className="w-3.5 h-3.5 text-primary" />
      </div>
      <div className="flex items-center gap-1 pt-2">
        <span className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: "0ms" }} />
        <span className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: "150ms" }} />
        <span className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: "300ms" }} />
      </div>
    </div>
  );
}

// ---- Solo mode decisions ----
function SoloDecisionChain({ decisions }: { decisions: SoloModeDecision[] }) {
  const [open, setOpen] = useState(false);
  return (
    <Collapsible open={open} onOpenChange={setOpen} className="my-2">
      <CollapsibleTrigger className="flex items-center gap-1.5 text-xs text-primary hover:underline cursor-pointer">
        {open ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        Decision Chain ({decisions.length} steps)
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-1.5 space-y-1.5 pl-4 border-l-2 border-primary/20">
        {decisions.map((d, i) => (
          <div key={i} className="text-xs">
            <span className="font-mono text-primary">{d.submind}</span>
            <span className="text-muted-foreground"> → {d.action}</span>
            <p className="text-muted-foreground/80 mt-0.5">{d.reasoning}</p>
          </div>
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
}

// ---- Competitor alert card ----
function CompetitorAlertCard({
  alert,
  onDismiss,
  onAct,
}: {
  alert: CompetitorAlert;
  onDismiss: () => void;
  onAct: () => void;
}) {
  const isHigh = alert.urgency === "HIGH" || alert.clientRelevanceScore > 0.7;

  return (
    <Card className={cn("border", isHigh ? "border-destructive/40" : "border-border")}>
      <CardContent className="p-3 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <Badge
              className={cn(
                "text-[10px] border-0",
                isHigh ? "bg-destructive/15 text-destructive" : "bg-warning/15 text-warning"
              )}
            >
              {isHigh ? "HIGH" : "MEDIUM"} RELEVANCE
            </Badge>
            <span className="text-sm font-medium text-foreground">{alert.competitorName}</span>
          </div>
          <span className="text-[10px] text-muted-foreground">
            {Math.round(alert.confidence * 100)}% confidence
          </span>
        </div>

        <div className="space-y-1 text-xs">
          <p className="text-muted-foreground">
            <span className="text-foreground font-medium">Observed: </span>
            {alert.observedAction}
          </p>
          <p className="text-muted-foreground">
            <span className="text-foreground font-medium">Inferred: </span>
            {alert.inferredStrategy}
          </p>
          <p className="text-muted-foreground">
            <span className="text-foreground font-medium">Recommendation: </span>
            {alert.recommendation}
          </p>
        </div>

        <div className="flex items-center gap-2 pt-1">
          <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={onDismiss}>
            Dismiss
          </Button>
          <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => {}}>
            <Eye className="w-3 h-3 mr-1" />
            Details
          </Button>
          <Button size="sm" className="h-7 text-[11px]" onClick={onAct}>
            <Zap className="w-3 h-3 mr-1" />
            Act on this
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ---- Message bubble ----
function MessageBubble({
  message,
  onSmartPromptSelect,
  onViralCardSelect,
  onApproval,
}: {
  message: ConversationMessage;
  onSmartPromptSelect: (choice: string) => void;
  onViralCardSelect: (variantId: string) => void;
  onApproval: (decision: "this_time" | "all_time" | "blocked") => void;
}) {
  const isUser = message.role === "user";
  const [selectedCard, setSelectedCard] = useState<string | null>(null);

  return (
    <div className={cn("flex gap-2.5 px-4 py-1.5", isUser ? "flex-row-reverse" : "flex-row")}>
      {/* Avatar */}
      <div
        className={cn(
          "w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5",
          isUser ? "bg-secondary" : "bg-primary/10"
        )}
      >
        {isUser ? (
          <User className="w-3.5 h-3.5 text-secondary-foreground" />
        ) : (
          <Bot className="w-3.5 h-3.5 text-primary" />
        )}
      </div>

      {/* Content */}
      <div className={cn("max-w-[80%] min-w-0 space-y-2", isUser ? "items-end" : "items-start")}>
        {/* Text content */}
        {message.content && (
          <div
            className={cn(
              "rounded-xl px-3.5 py-2.5 text-sm",
              isUser
                ? "bg-primary text-primary-foreground rounded-br-sm"
                : "bg-card border border-border text-foreground rounded-bl-sm"
            )}
          >
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <ReactMarkdown>{message.content}</ReactMarkdown>
            </div>
          </div>
        )}

        {/* Smart Prompt */}
        {message.smartPrompt && (
          <SmartPrompt
            question={message.smartPrompt.question}
            options={message.smartPrompt.options}
            fillInLabel={message.smartPrompt.fillInLabel}
            onSelect={onSmartPromptSelect}
          />
        )}

        {/* Viral Score Cards */}
        {message.viralCards && message.viralCards.length > 0 && (
          <div className="grid gap-2 sm:grid-cols-3">
            {message.viralCards.map((card) => (
              <ViralScoreCard
                key={card.variantId}
                campaignName={card.campaignName}
                platform={card.platform}
                headlineText={card.headlineText}
                imageUrl={card.imageUrl}
                scores={card.scores}
                modelType={card.modelType}
                voiceType={card.voiceType}
                thresholdStatus={card.thresholdStatus}
                selected={selectedCard === card.variantId}
                onSelect={() => {
                  setSelectedCard(card.variantId);
                  onViralCardSelect(card.variantId);
                }}
              />
            ))}
          </div>
        )}

        {/* Approval Prompt */}
        {message.approvalPrompt && (
          <ApprovalPrompt
            urgency={message.approvalPrompt.urgency}
            category={message.approvalPrompt.category}
            proposedAction={message.approvalPrompt.proposedAction}
            originalRequest={message.approvalPrompt.originalRequest}
            isNonNegotiable={message.approvalPrompt.isNonNegotiable}
            onApproveThisTime={() => onApproval("this_time")}
            onApproveAllTime={() => onApproval("all_time")}
            onBlock={() => onApproval("blocked")}
          />
        )}

        {/* Chart */}
        {message.chartData && <InlineChart chart={message.chartData} />}

        {/* PDF download */}
        {message.pdfUrl && (
          <a
            href={message.pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
          >
            <Download className="w-3.5 h-3.5" />
            Download Report (PDF)
          </a>
        )}

        {/* Solo mode decision chain */}
        {message.soloDecisions && message.soloDecisions.length > 0 && (
          <SoloDecisionChain decisions={message.soloDecisions} />
        )}

        {/* Timestamp */}
        <p className={cn("text-[10px] text-muted-foreground", isUser ? "text-right" : "text-left")}>
          {message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </p>
      </div>
    </div>
  );
}

// ---- Main KlycChat ----

interface KlycChatProps {
  messages: ConversationMessage[];
  isThinking: boolean;
  mode: "guided" | "solo";
  pendingApprovals: KlycOrchestratorState["pendingApprovals"];
  competitorAlerts: CompetitorAlert[];
  onSendMessage: (text: string) => void;
  onSelectOption: (messageId: string, choice: string) => void;
  onApproval: (approvalId: string, decision: "this_time" | "all_time" | "blocked") => void;
  onToggleMode: () => void;
  onDismissAlert: (alertId: string) => void;
  onActOnAlert: (alertId: string) => void;
  onFileAttach?: (file: File) => void;
}

export default function KlycChat({
  messages,
  isThinking,
  mode,
  pendingApprovals,
  competitorAlerts,
  onSendMessage,
  onSelectOption,
  onApproval,
  onToggleMode,
  onDismissAlert,
  onActOnAlert,
  onFileAttach,
}: KlycChatProps) {
  const isMobile = useIsMobile();
  const [input, setInput] = useState("");
  const [activeTab, setActiveTab] = useState<"chat" | "strategy">("chat");
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isThinking]);

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed || isThinking) return;
    setInput("");
    onSendMessage(trimmed);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onFileAttach) onFileAttach(file);
    e.target.value = "";
  };

  const highAlerts = competitorAlerts.filter(
    (a) => a.urgency === "HIGH" || a.clientRelevanceScore > 0.7
  );

  // ---- Strategy panel ----
  const strategyPanel = (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-border">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">Strategy</h2>
          {pendingApprovals.length > 0 && (
            <Badge className="text-[10px] bg-destructive/15 text-destructive border-0">
              {pendingApprovals.length}
            </Badge>
          )}
        </div>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {/* Pending approvals */}
          {pendingApprovals.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider">
                Pending Approvals
              </h3>
              {[...pendingApprovals]
                .sort((a, b) => {
                  const order = { BLOCKING: 0, ADVISORY: 1, INFORMATIONAL: 2 };
                  return (order[a.urgency] ?? 3) - (order[b.urgency] ?? 3);
                })
                .map((ap) => (
                  <Card key={ap.id} className="border-border">
                    <CardContent className="p-3 space-y-2">
                      <div className="flex items-center gap-1.5">
                        <Shield className="w-3.5 h-3.5 text-destructive" />
                        <Badge variant="outline" className="text-[10px]">
                          {ap.urgency}
                        </Badge>
                        <Badge variant="outline" className="text-[10px]">
                          {ap.category}
                        </Badge>
                      </div>
                      <p className="text-xs text-foreground">{ap.proposedAction}</p>
                      <div className="flex gap-1.5">
                        <Button
                          size="sm"
                          className="h-6 text-[10px]"
                          onClick={() => onApproval(ap.id, "this_time")}
                        >
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-6 text-[10px] text-destructive"
                          onClick={() => onApproval(ap.id, "blocked")}
                        >
                          Block
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </div>
          )}

          {/* Competitor alerts */}
          {competitorAlerts.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider">
                Competitor Alerts
              </h3>
              {competitorAlerts.map((alert) => (
                <CompetitorAlertCard
                  key={alert.id}
                  alert={alert}
                  onDismiss={() => onDismissAlert(alert.id)}
                  onAct={() => onActOnAlert(alert.id)}
                />
              ))}
            </div>
          )}

          {competitorAlerts.length === 0 && pendingApprovals.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-8">
              No pending items. Strategy insights will appear here.
            </p>
          )}
        </div>
      </ScrollArea>
    </div>
  );

  // ---- Chat panel ----
  const chatPanel = (
    <div className="flex flex-col h-full">
      {/* Solo mode banner */}
      {mode === "solo" && (
        <div className="px-4 py-2 bg-warning/10 border-b border-warning/30 flex items-center gap-2">
          <AlertTriangle className="w-3.5 h-3.5 text-warning shrink-0" />
          <p className="text-xs text-warning">
            Solo Mode active — decisions are made autonomously. Permanent gates still require your
            approval.
          </p>
        </div>
      )}

      {/* High-urgency alert banner */}
      {highAlerts.length > 0 && (
        <div className="px-4 py-1.5 bg-destructive/5 border-b border-destructive/20 flex items-center gap-2">
          <Shield className="w-3.5 h-3.5 text-destructive shrink-0" />
          <p className="text-xs text-destructive">
            {highAlerts.length} high-relevance competitor alert{highAlerts.length > 1 ? "s" : ""}
          </p>
          {isMobile && (
            <Button
              size="sm"
              variant="ghost"
              className="h-6 text-[10px] ml-auto text-destructive"
              onClick={() => setActiveTab("strategy")}
            >
              View
            </Button>
          )}
        </div>
      )}

      {/* Messages */}
      <ScrollArea className="flex-1" ref={scrollRef}>
        <div className="py-4 space-y-1">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                <Bot className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-sm font-medium text-foreground mb-1">KLYC Command Center</h3>
              <p className="text-xs text-muted-foreground max-w-xs">
                Start a conversation. Describe your campaign idea, and I'll guide you through
                research, creative, scheduling, and optimization.
              </p>
            </div>
          )}

          {messages.map((msg) => (
            <MessageBubble
              key={msg.id}
              message={msg}
              onSmartPromptSelect={(choice) => onSelectOption(msg.id, choice)}
              onViralCardSelect={(variantId) => onSelectOption(msg.id, variantId)}
              onApproval={(decision) =>
                onApproval(msg.approvalPrompt ? msg.id : "", decision)
              }
            />
          ))}

          {isThinking && <ThinkingIndicator />}
        </div>
      </ScrollArea>

      {/* Input bar */}
      <div className="border-t border-border px-3 py-2.5 bg-card/50">
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept="image/*"
            onChange={handleFileChange}
          />
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0 text-muted-foreground"
            onClick={() => fileInputRef.current?.click()}
          >
            <Paperclip className="w-4 h-4" />
          </Button>

          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
            placeholder="Describe your campaign idea…"
            disabled={isThinking}
            className="h-9 text-sm flex-1"
          />

          <Button
            size="icon"
            className="h-8 w-8 shrink-0"
            disabled={!input.trim() || isThinking}
            onClick={handleSend}
          >
            <Send className="w-4 h-4" />
          </Button>

          {/* Solo mode toggle */}
          <Button
            variant="ghost"
            size="icon"
            className={cn("h-8 w-8 shrink-0", mode === "solo" ? "text-warning" : "text-muted-foreground")}
            onClick={onToggleMode}
            title={mode === "solo" ? "Switch to Guided Mode" : "Switch to Solo Mode"}
          >
            {mode === "solo" ? (
              <ToggleRight className="w-4 h-4" />
            ) : (
              <ToggleLeft className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );

  // ---- Mobile layout (tabs) ----
  if (isMobile) {
    return (
      <div className="flex flex-col h-full">
        {/* Tab header */}
        <div className="flex border-b border-border bg-card">
          <button
            onClick={() => setActiveTab("chat")}
            className={cn(
              "flex-1 py-2.5 text-xs font-medium transition-colors text-center",
              activeTab === "chat"
                ? "text-primary border-b-2 border-primary"
                : "text-muted-foreground"
            )}
          >
            Chat
          </button>
          <button
            onClick={() => setActiveTab("strategy")}
            className={cn(
              "flex-1 py-2.5 text-xs font-medium transition-colors text-center relative",
              activeTab === "strategy"
                ? "text-primary border-b-2 border-primary"
                : "text-muted-foreground"
            )}
          >
            Strategy
            {(pendingApprovals.length + competitorAlerts.length) > 0 && (
              <Badge className="absolute -top-0.5 right-1/4 text-[9px] h-4 min-w-[16px] bg-destructive text-destructive-foreground border-0">
                {pendingApprovals.length + competitorAlerts.length}
              </Badge>
            )}
          </button>
        </div>
        {activeTab === "chat" ? chatPanel : strategyPanel}
      </div>
    );
  }

  // ---- Desktop layout (side-by-side) ----
  return (
    <div className="flex h-full">
      <div className="flex-1 min-w-0 border-r border-border">{chatPanel}</div>
      <div className="w-72 shrink-0">{strategyPanel}</div>
    </div>
  );
}
