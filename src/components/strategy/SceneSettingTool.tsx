import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const SETTING_TYPES = ["Studio", "Outdoor", "Office", "Home", "Urban", "Nature", "Abstract", "Custom"];
const MOOD_OPTIONS = ["Warm", "Cool", "Energetic", "Calm", "Professional", "Playful", "Dramatic", "Natural", "Luxurious", "Gritty"];
const LIGHTING_OPTIONS = ["Natural", "Studio", "Golden Hour", "Moody", "Bright & Airy", "Neon", "Dramatic Shadows"];

function PillSelector({ options, selected, onToggle, multi = false }: { options: string[]; selected: string | string[]; onToggle: (v: string) => void; multi?: boolean }) {
  const isActive = (v: string) => multi ? (selected as string[]).includes(v) : selected === v;
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((opt) => (
        <button
          key={opt} type="button" onClick={() => onToggle(opt)}
          className={`px-2.5 py-1 rounded-md border text-xs font-medium transition-all ${
            isActive(opt) ? "border-primary bg-primary/10 text-primary" : "border-border bg-background text-muted-foreground hover:border-primary/50"
          }`}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

export default function SceneSettingTool() {
  const [settingType, setSettingType] = useState("");
  const [settingDescription, setSettingDescription] = useState("");
  const [moods, setMoods] = useState<string[]>([]);
  const [lighting, setLighting] = useState("");
  const [backgroundNotes, setBackgroundNotes] = useState("");
  const [referenceUrl, setReferenceUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      const { data } = await supabase
        .from("client_scene_settings")
        .select("*")
        .eq("client_id", user.id)
        .maybeSingle();
      if (data) {
        setSettingType(data.setting_type || "");
        setSettingDescription(data.setting_description || "");
        setMoods((data.mood_atmosphere as string[]) || []);
        setLighting(data.lighting || "");
        setBackgroundNotes(data.background_notes || "");
        setReferenceUrl(data.reference_image_url || "");
      }
      setLoading(false);
    })();
  }, []);

  const toggleMood = (m: string) => setMoods((p) => p.includes(m) ? p.filter((x) => x !== m) : [...p, m]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase.from("client_scene_settings").upsert({
        client_id: user.id,
        setting_type: settingType || null,
        setting_description: settingDescription || null,
        mood_atmosphere: moods,
        lighting: lighting || null,
        background_notes: backgroundNotes || null,
        reference_image_url: referenceUrl || null,
      }, { onConflict: "client_id" });
      if (error) throw error;
      toast({ title: "Scene settings saved" });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-4">
      <div>
        <label className="text-xs font-medium mb-1.5 block text-muted-foreground">Setting Type</label>
        <PillSelector options={SETTING_TYPES} selected={settingType} onToggle={setSettingType} />
      </div>
      <div>
        <label className="text-xs font-medium mb-1 block text-muted-foreground">Setting Description</label>
        <Textarea placeholder="Describe the scene environment in detail..." value={settingDescription} onChange={(e) => setSettingDescription(e.target.value)} className="min-h-[60px]" />
      </div>
      <div>
        <label className="text-xs font-medium mb-1.5 block text-muted-foreground">Mood / Atmosphere</label>
        <PillSelector options={MOOD_OPTIONS} selected={moods} onToggle={toggleMood} multi />
      </div>
      <div>
        <label className="text-xs font-medium mb-1.5 block text-muted-foreground">Lighting</label>
        <PillSelector options={LIGHTING_OPTIONS} selected={lighting} onToggle={setLighting} />
      </div>
      <div>
        <label className="text-xs font-medium mb-1 block text-muted-foreground">Background Notes</label>
        <Textarea placeholder="Additional background/prop details..." value={backgroundNotes} onChange={(e) => setBackgroundNotes(e.target.value)} className="min-h-[60px]" />
      </div>
      <div>
        <label className="text-xs font-medium mb-1 block text-muted-foreground">Reference Image URL</label>
        <Input placeholder="https://..." value={referenceUrl} onChange={(e) => setReferenceUrl(e.target.value)} />
      </div>
      <Button onClick={handleSave} disabled={saving} className="w-full bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white">
        {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
        Save Scene Settings
      </Button>
    </div>
  );
}
