import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Trash2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import ReferenceMediaField from "@/components/strategy/ReferenceMediaField";

interface Character {
  id?: string;
  name: string;
  role: string;
  description: string;
  reference_image_url: string;
  tags: string[];
  sort_order: number;
}

const emptyCharacter = (): Character => ({
  name: "", role: "", description: "", reference_image_url: "", tags: [], sort_order: 0,
});

export default function CharactersTool() {
  const [characters, setCharacters] = useState<Character[]>([emptyCharacter()]);
  const [tagInput, setTagInput] = useState<Record<number, string>>({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      const { data } = await supabase
        .from("client_characters")
        .select("*")
        .eq("client_id", user.id)
        .order("sort_order");
      if (data && data.length > 0) {
        setCharacters(data.map((d) => ({
          id: d.id, name: d.name || "", role: d.role || "",
          description: d.description || "", reference_image_url: d.reference_image_url || "",
          tags: (d.tags as string[]) || [], sort_order: d.sort_order ?? 0,
        })));
      }
      setLoading(false);
    })();
  }, []);

  const update = (i: number, field: keyof Character, value: any) => {
    setCharacters((prev) => prev.map((c, j) => j === i ? { ...c, [field]: value } : c));
  };

  const addTag = (i: number) => {
    const val = (tagInput[i] || "").trim();
    if (!val) return;
    update(i, "tags", [...characters[i].tags, val]);
    setTagInput((p) => ({ ...p, [i]: "" }));
  };

  const removeTag = (i: number, ti: number) => {
    update(i, "tags", characters[i].tags.filter((_, j) => j !== ti));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // delete existing
      await supabase.from("client_characters").delete().eq("client_id", user.id);

      // insert all
      const rows = characters.map((c, i) => ({
        client_id: user.id, name: c.name, role: c.role, description: c.description,
        reference_image_url: c.reference_image_url || null,
        tags: c.tags, sort_order: i,
      }));
      const { error } = await supabase.from("client_characters").insert(rows);
      if (error) throw error;
      toast({ title: "Characters saved" });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-4">
      {characters.map((char, i) => (
        <Card key={i} className="border-border/50">
          <CardContent className="pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-foreground">Character {i + 1}</span>
              {characters.length > 1 && (
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive" onClick={() => setCharacters((p) => p.filter((_, j) => j !== i))}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium mb-1 block text-muted-foreground">Name</label>
                <Input placeholder="e.g. Sarah" value={char.name} onChange={(e) => update(i, "name", e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block text-muted-foreground">Role</label>
                <Input placeholder="e.g. Main spokesperson" value={char.role} onChange={(e) => update(i, "role", e.target.value)} />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block text-muted-foreground">Description</label>
              <Textarea placeholder="Physical appearance, personality, vibe..." value={char.description} onChange={(e) => update(i, "description", e.target.value)} className="min-h-[60px]" />
            </div>
            <ReferenceMediaField
              value={char.reference_image_url}
              onChange={(url) => update(i, "reference_image_url", url)}
              label="Reference Image / Video"
              storagePath="characters"
            />
            <div>
              <label className="text-xs font-medium mb-1 block text-muted-foreground">Tags</label>
              <div className="flex gap-2">
                <Input
                  placeholder="Add tag..."
                  value={tagInput[i] || ""}
                  onChange={(e) => setTagInput((p) => ({ ...p, [i]: e.target.value }))}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(i); } }}
                  className="flex-1"
                />
                <Button variant="outline" size="sm" onClick={() => addTag(i)} disabled={!(tagInput[i] || "").trim()}>Add</Button>
              </div>
              {char.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {char.tags.map((t, ti) => (
                    <Badge key={ti} variant="secondary" className="text-xs cursor-pointer" onClick={() => removeTag(i, ti)}>
                      {t} <X className="w-3 h-3 ml-1" />
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
      <Button variant="outline" size="sm" onClick={() => setCharacters((p) => [...p, emptyCharacter()])} className="w-full">
        <Plus className="w-3.5 h-3.5 mr-1.5" /> Add Character
      </Button>
      <Button onClick={handleSave} disabled={saving} className="w-full bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white">
        {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
        Save Characters
      </Button>
    </div>
  );
}
