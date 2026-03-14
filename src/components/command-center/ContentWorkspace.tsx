import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Pencil, Check, X, Image as ImageIcon, Type, MessageSquare,
  MousePointerClick, Loader2, RefreshCw, ChevronDown, ChevronUp,
  FileText, Info,
} from "lucide-react";
import { toast } from "sonner";

interface ContentItem {
  id: string;
  post_text: string | null;
  image_url: string | null;
  content_type: string;
  status: string;
  created_at: string;
  scheduled_at: string | null;
  // Derived fields for inline editing
  headline: string;
  body: string;
  cta: string;
}

function parseContent(raw: string | null): { headline: string; body: string; cta: string } {
  if (!raw) return { headline: "", body: "", cta: "" };
  const lines = raw.split("\n").filter(Boolean);
  if (lines.length === 0) return { headline: "", body: "", cta: "" };
  if (lines.length === 1) return { headline: "", body: lines[0], cta: "" };

  // Heuristic: first line = headline, last line with CTA keywords = CTA, rest = body
  const ctaKeywords = ["learn more", "sign up", "get started", "click", "visit", "subscribe", "buy", "shop", "try", "join", "register", "download", "book", "contact"];
  let ctaIndex = -1;
  for (let i = lines.length - 1; i >= 1; i--) {
    if (ctaKeywords.some((k) => lines[i].toLowerCase().includes(k))) {
      ctaIndex = i;
      break;
    }
  }

  const headline = lines[0];
  const cta = ctaIndex > 0 ? lines[ctaIndex] : "";
  const bodyLines = lines.slice(1, ctaIndex > 0 ? ctaIndex : undefined);
  return { headline, body: bodyLines.join("\n"), cta };
}

function reassemble(headline: string, body: string, cta: string): string {
  return [headline, body, cta].filter(Boolean).join("\n\n");
}

const STATUS_STYLE: Record<string, string> = {
  draft: "bg-muted text-muted-foreground border-border",
  pending_approval: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
  scheduled: "bg-primary/10 text-primary border-primary/20",
  published: "bg-primary/15 text-primary border-primary/25",
  failed: "bg-destructive/10 text-destructive border-destructive/20",
};

interface EditState {
  id: string;
  headline: string;
  body: string;
  cta: string;
}

export default function ContentWorkspace() {
  const [items, setItems] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [editState, setEditState] = useState<EditState | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchContent = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const { data, error } = await supabase
      .from("post_queue")
      .select("id, post_text, image_url, content_type, status, created_at, scheduled_at")
      .eq("user_id", user.id)
      .in("status", ["draft", "pending_approval", "scheduled"])
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) { toast.error("Failed to load content"); setLoading(false); return; }

    const mapped: ContentItem[] = (data ?? []).map((row) => {
      const parsed = parseContent(row.post_text);
      return { ...row, ...parsed };
    });
    setItems(mapped);
    setLoading(false);
  }, []);

  useEffect(() => { fetchContent(); }, [fetchContent]);

  const startEdit = (item: ContentItem) => {
    setEditState({ id: item.id, headline: item.headline, body: item.body, cta: item.cta });
    setExpandedId(item.id);
  };

  const cancelEdit = () => setEditState(null);

  const saveEdit = async () => {
    if (!editState) return;
    setSaving(editState.id);
    const newText = reassemble(editState.headline, editState.body, editState.cta);

    const { error } = await supabase
      .from("post_queue")
      .update({ post_text: newText, updated_at: new Date().toISOString() })
      .eq("id", editState.id);

    if (error) {
      toast.error("Failed to save changes");
    } else {
      toast.success("Content updated");
      setItems((prev) =>
        prev.map((item) =>
          item.id === editState.id
            ? { ...item, post_text: newText, headline: editState.headline, body: editState.body, cta: editState.cta }
            : item
        )
      );
      setEditState(null);
    }
    setSaving(null);
  };

  const isEditing = (id: string) => editState?.id === id;

  return (
    <Card className="border-border/60">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary" />
            Content Review Workspace
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[10px] h-5 font-mono">
              {items.length} items
            </Badge>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={fetchContent} disabled={loading}>
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <Info className="w-8 h-8 text-muted-foreground/40 mb-2" />
            <p className="text-sm text-muted-foreground">No content to review</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Generated posts will appear here for editing</p>
          </div>
        ) : (
          items.map((item) => {
            const editing = isEditing(item.id);
            const expanded = expandedId === item.id;

            return (
              <div
                key={item.id}
                className={`rounded-lg border transition-colors ${
                  editing ? "border-primary/30 bg-primary/[0.02]" : "border-border bg-card"
                }`}
              >
                {/* Header row */}
                <div
                  className="flex items-center gap-3 px-3 py-2.5 cursor-pointer"
                  onClick={() => !editing && setExpandedId(expanded ? null : item.id)}
                >
                  <div className="w-8 h-8 rounded bg-muted flex items-center justify-center shrink-0">
                    {item.image_url ? (
                      <ImageIcon className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <Type className="w-4 h-4 text-muted-foreground" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground truncate">
                      {item.headline || item.body?.slice(0, 60) || "Untitled post"}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {item.content_type} · {new Date(item.created_at).toLocaleDateString()}
                    </p>
                  </div>

                  <Badge variant="outline" className={`text-[10px] h-5 shrink-0 ${STATUS_STYLE[item.status] ?? ""}`}>
                    {item.status.replace("_", " ")}
                  </Badge>

                  {!editing && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 shrink-0"
                      onClick={(e) => { e.stopPropagation(); startEdit(item); }}
                    >
                      <Pencil className="w-3 h-3" />
                    </Button>
                  )}

                  {expanded ? (
                    <ChevronUp className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  )}
                </div>

                {/* Expanded content */}
                {(expanded || editing) && (
                  <div className="px-3 pb-3 space-y-3 border-t border-border/50">
                    {/* Image preview */}
                    {item.image_url && (
                      <div className="mt-3 rounded-lg overflow-hidden border border-border bg-muted/30">
                        <img
                          src={item.image_url}
                          alt="Post visual"
                          className="w-full h-40 object-cover"
                          loading="lazy"
                        />
                      </div>
                    )}

                    {editing && editState ? (
                      <div className="mt-3 space-y-3">
                        {/* Headline */}
                        <FieldEditor
                          label="Headline"
                          icon={<Type className="w-3 h-3" />}
                          value={editState.headline}
                          onChange={(v) => setEditState({ ...editState, headline: v })}
                          type="input"
                        />
                        {/* Body */}
                        <FieldEditor
                          label="Post Body"
                          icon={<MessageSquare className="w-3 h-3" />}
                          value={editState.body}
                          onChange={(v) => setEditState({ ...editState, body: v })}
                          type="textarea"
                        />
                        {/* CTA */}
                        <FieldEditor
                          label="Call-to-Action"
                          icon={<MousePointerClick className="w-3 h-3" />}
                          value={editState.cta}
                          onChange={(v) => setEditState({ ...editState, cta: v })}
                          type="input"
                        />

                        <div className="flex items-center gap-2 pt-1">
                          <Button
                            size="sm"
                            className="h-7 text-xs gap-1.5"
                            onClick={saveEdit}
                            disabled={saving === item.id}
                          >
                            {saving === item.id ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <Check className="w-3 h-3" />
                            )}
                            Save
                          </Button>
                          <Button variant="ghost" size="sm" className="h-7 text-xs gap-1.5" onClick={cancelEdit}>
                            <X className="w-3 h-3" />
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-3 space-y-2">
                        {item.headline && (
                          <div>
                            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Headline</span>
                            <p className="text-sm text-foreground font-medium mt-0.5">{item.headline}</p>
                          </div>
                        )}
                        {item.body && (
                          <div>
                            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Body</span>
                            <p className="text-xs text-foreground/80 mt-0.5 whitespace-pre-line leading-relaxed">{item.body}</p>
                          </div>
                        )}
                        {item.cta && (
                          <div>
                            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">CTA</span>
                            <p className="text-xs text-primary font-medium mt-0.5">{item.cta}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}

function FieldEditor({
  label,
  icon,
  value,
  onChange,
  type,
}: {
  label: string;
  icon: React.ReactNode;
  value: string;
  onChange: (v: string) => void;
  type: "input" | "textarea";
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1.5">
        {icon}
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</span>
      </div>
      {type === "textarea" ? (
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="text-xs min-h-[80px] bg-card border-border focus:border-primary/40"
          placeholder={`Enter ${label.toLowerCase()}…`}
        />
      ) : (
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="text-xs h-8 bg-card border-border focus:border-primary/40"
          placeholder={`Enter ${label.toLowerCase()}…`}
        />
      )}
    </div>
  );
}
