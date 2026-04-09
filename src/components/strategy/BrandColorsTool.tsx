import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import { Loader2, Check, X } from "lucide-react";

type ColorRole = "primary" | "secondary" | "accent" | "background" | "text";

interface BrandColor {
  role: ColorRole;
  hex: string;
  h: number;
  s: number;
  l: number;
}

const ROLE_META: Record<ColorRole, { label: string; desc: string }> = {
  primary: { label: "Primary", desc: "Buttons, headers, key actions" },
  secondary: { label: "Secondary", desc: "Accents, highlights" },
  accent: { label: "Accent", desc: "CTAs, badges, attention" },
  background: { label: "Background", desc: "Page & card fills" },
  text: { label: "Text", desc: "Body copy, headings" },
};

const ROLES: ColorRole[] = ["primary", "secondary", "accent", "background", "text"];

const DEFAULTS: Record<ColorRole, string> = {
  primary: "#6366f1",
  secondary: "#0ea5e9",
  accent: "#f59e0b",
  background: "#ffffff",
  text: "#0f172a",
};

// --- Color conversion helpers ---
function hexToHsl(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;
  }
  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
}

function hslToHex(h: number, s: number, l: number): string {
  const s1 = s / 100, l1 = l / 100;
  const a = s1 * Math.min(l1, 1 - l1);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l1 - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

function isValidHex(v: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(v);
}

function contrastRatio(hex1: string, hex2: string): number {
  const lum = (hex: string) => {
    const [r, g, b] = [hex.slice(1, 3), hex.slice(3, 5), hex.slice(5, 7)].map((c) => {
      const v = parseInt(c, 16) / 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const l1 = lum(hex1), l2 = lum(hex2);
  const lighter = Math.max(l1, l2), darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

function makeDefaultColors(): BrandColor[] {
  return ROLES.map((role) => {
    const hex = DEFAULTS[role];
    const [h, s, l] = hexToHsl(hex);
    return { role, hex, h, s, l };
  });
}

// --- Color Wheel Component ---
function ColorWheel({ hue, onHueChange }: { hue: number; onHueChange: (h: number) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const size = 200;
  const cx = size / 2, cy = size / 2;
  const outerR = 90, innerR = 65;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, size, size);
    // Draw hue ring
    for (let angle = 0; angle < 360; angle++) {
      const startAngle = ((angle - 1) * Math.PI) / 180;
      const endAngle = ((angle + 1) * Math.PI) / 180;
      ctx.beginPath();
      ctx.arc(cx, cy, (outerR + innerR) / 2, startAngle, endAngle);
      ctx.lineWidth = outerR - innerR;
      ctx.strokeStyle = `hsl(${angle}, 100%, 50%)`;
      ctx.stroke();
    }
    // Draw indicator
    const rad = (hue * Math.PI) / 180;
    const ix = cx + Math.cos(rad) * ((outerR + innerR) / 2);
    const iy = cy + Math.sin(rad) * ((outerR + innerR) / 2);
    ctx.beginPath();
    ctx.arc(ix, iy, 10, 0, Math.PI * 2);
    ctx.fillStyle = `hsl(${hue}, 100%, 50%)`;
    ctx.fill();
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 3;
    ctx.stroke();
  }, [hue]);

  const handleInteraction = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const x = e.clientX - rect.left - cx;
    const y = e.clientY - rect.top - cy;
    const dist = Math.sqrt(x * x + y * y);
    if (dist < innerR - 5 || dist > outerR + 5) return;
    let angle = Math.atan2(y, x) * (180 / Math.PI);
    if (angle < 0) angle += 360;
    onHueChange(Math.round(angle));
  }, [onHueChange]);

  const dragging = useRef(false);

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      className="cursor-crosshair mx-auto"
      onMouseDown={(e) => { dragging.current = true; handleInteraction(e); }}
      onMouseMove={(e) => { if (dragging.current) handleInteraction(e); }}
      onMouseUp={() => { dragging.current = false; }}
      onMouseLeave={() => { dragging.current = false; }}
    />
  );
}

// --- Main Component ---
export default function BrandColorsTool() {
  const [colors, setColors] = useState<BrandColor[]>(makeDefaultColors());
  const [activeRole, setActiveRole] = useState<ColorRole>("primary");
  const [hexInput, setHexInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const active = colors.find((c) => c.role === activeRole)!;

  // Load existing colors
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      const { data } = await supabase
        .from("client_brand_colors")
        .select("*")
        .eq("client_id", user.id);
      if (data && data.length > 0) {
        const loaded = makeDefaultColors();
        data.forEach((row: any) => {
          const idx = loaded.findIndex((c) => c.role === row.role);
          if (idx !== -1) {
            loaded[idx] = { role: row.role, hex: row.hex_value, h: row.hue ?? 0, s: row.saturation ?? 0, l: row.lightness ?? 50 };
          }
        });
        setColors(loaded);
      }
      setLoading(false);
    })();
  }, []);

  useEffect(() => { setHexInput(active.hex); }, [activeRole, active.hex]);

  const updateColor = (role: ColorRole, h: number, s: number, l: number) => {
    const hex = hslToHex(h, s, l);
    setColors((prev) => prev.map((c) => c.role === role ? { role, hex, h, s, l } : c));
  };

  const handleHexChange = (val: string) => {
    setHexInput(val);
    if (isValidHex(val)) {
      const [h, s, l] = hexToHsl(val);
      setColors((prev) => prev.map((c) => c.role === activeRole ? { role: activeRole, hex: val.toLowerCase(), h, s, l } : c));
    }
  };

  const handleSave = async () => {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { toast.error("Not authenticated"); setSaving(false); return; }
    for (const c of colors) {
      const { error } = await supabase.from("client_brand_colors").upsert(
        { client_id: user.id, role: c.role, hex_value: c.hex, hue: c.h, saturation: c.s, lightness: c.l },
        { onConflict: "client_id,role" }
      );
      if (error) { toast.error(`Failed to save ${c.role}: ${error.message}`); setSaving(false); return; }
    }
    toast.success("Brand colors saved!");
    setSaving(false);
  };

  const ratio = contrastRatio(
    colors.find((c) => c.role === "text")!.hex,
    colors.find((c) => c.role === "background")!.hex
  );
  const passAA = ratio >= 4.5;
  const passAAA = ratio >= 7;

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  const bgColor = colors.find((c) => c.role === "background")!.hex;
  const textColor = colors.find((c) => c.role === "text")!.hex;
  const primaryColor = colors.find((c) => c.role === "primary")!.hex;
  const secondaryColor = colors.find((c) => c.role === "secondary")!.hex;
  const accentColor = colors.find((c) => c.role === "accent")!.hex;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* LEFT COLUMN */}
      <div className="space-y-5">
        {/* Role Selector */}
        <Card>
          <CardContent className="p-4">
            <h3 className="text-sm font-semibold text-foreground mb-3">Color Role</h3>
            <div className="flex flex-wrap gap-2">
              {ROLES.map((role) => {
                const c = colors.find((c) => c.role === role)!;
                const isActive = activeRole === role;
                return (
                  <button
                    key={role}
                    onClick={() => setActiveRole(role)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                      isActive
                        ? "border-primary bg-primary/10 text-primary ring-2 ring-primary/30"
                        : "border-border bg-card text-muted-foreground hover:border-primary/40"
                    }`}
                  >
                    <span className="w-3 h-3 rounded-full border border-border/50 shrink-0" style={{ backgroundColor: c.hex }} />
                    {ROLE_META[role].label}
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground mt-2">{ROLE_META[activeRole].desc}</p>
          </CardContent>
        </Card>

        {/* Color Wheel */}
        <Card>
          <CardContent className="p-4 space-y-4">
            <h3 className="text-sm font-semibold text-foreground">Color Wheel</h3>
            <ColorWheel hue={active.h} onHueChange={(h) => updateColor(activeRole, h, active.s, active.l)} />

            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Saturation: {active.s}%</label>
                <div className="relative h-3 rounded-full" style={{
                  background: `linear-gradient(to right, hsl(${active.h},0%,${active.l}%), hsl(${active.h},100%,${active.l}%))`
                }}>
                  <Slider
                    min={0} max={100} step={1}
                    value={[active.s]}
                    onValueChange={([v]) => updateColor(activeRole, active.h, v, active.l)}
                    className="absolute inset-0"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Lightness: {active.l}%</label>
                <div className="relative h-3 rounded-full" style={{
                  background: `linear-gradient(to right, hsl(${active.h},${active.s}%,5%), hsl(${active.h},${active.s}%,50%), hsl(${active.h},${active.s}%,95%))`
                }}>
                  <Slider
                    min={5} max={95} step={1}
                    value={[active.l]}
                    onValueChange={([v]) => updateColor(activeRole, active.h, active.s, v)}
                    className="absolute inset-0"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg border border-border shadow-inner" style={{ backgroundColor: active.hex }} />
                <Input
                  value={hexInput}
                  onChange={(e) => handleHexChange(e.target.value)}
                  placeholder="#000000"
                  className={`font-mono text-sm w-28 ${hexInput && !isValidHex(hexInput) ? "border-destructive" : ""}`}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* RIGHT COLUMN */}
      <div className="space-y-5">
        {/* Palette Strip */}
        <Card>
          <CardContent className="p-4">
            <h3 className="text-sm font-semibold text-foreground mb-3">Palette Strip</h3>
            <div className="flex h-12 rounded-lg overflow-hidden border border-border">
              {ROLES.map((role) => {
                const c = colors.find((c) => c.role === role)!;
                const isActive = activeRole === role;
                return (
                  <button
                    key={role}
                    onClick={() => setActiveRole(role)}
                    className="flex-1 transition-all relative"
                    style={{ backgroundColor: c.hex }}
                  >
                    {isActive && (
                      <span className="absolute inset-0 border-2 border-white rounded-sm shadow-lg" />
                    )}
                  </button>
                );
              })}
            </div>
            <div className="flex mt-1">
              {ROLES.map((role) => (
                <span key={role} className="flex-1 text-[10px] text-center text-muted-foreground capitalize">{role}</span>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Live Preview */}
        <Card>
          <CardContent className="p-4">
            <h3 className="text-sm font-semibold text-foreground mb-3">Live Preview</h3>
            <div className="rounded-lg overflow-hidden border border-border" style={{ backgroundColor: bgColor }}>
              <div className="h-2" style={{ backgroundColor: primaryColor }} />
              <div className="p-4 space-y-3">
                <h4 className="text-sm font-bold" style={{ color: textColor }}>Campaign Update</h4>
                <p className="text-xs leading-relaxed" style={{ color: textColor }}>
                  Your latest campaign reached 12.4K impressions with a 3.8% engagement rate. Performance exceeded benchmarks.
                </p>
                <div className="flex items-center gap-2 flex-wrap">
                  <button className="px-3 py-1 rounded text-xs font-medium text-white" style={{ backgroundColor: primaryColor }}>
                    View Report
                  </button>
                  <button className="px-3 py-1 rounded text-xs font-medium border" style={{ borderColor: secondaryColor, color: secondaryColor }}>
                    Share
                  </button>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold text-white" style={{ backgroundColor: accentColor }}>
                    Trending
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Color Values Table */}
        <Card>
          <CardContent className="p-4">
            <h3 className="text-sm font-semibold text-foreground mb-3">Color Values</h3>
            <div className="space-y-1.5">
              {colors.map((c) => (
                <div key={c.role} className="flex items-center gap-3 text-xs">
                  <span className="w-4 h-4 rounded border border-border" style={{ backgroundColor: c.hex }} />
                  <span className="w-20 capitalize text-foreground font-medium">{c.role}</span>
                  <span className="font-mono text-muted-foreground">{c.hex}</span>
                  <span className="font-mono text-muted-foreground">hsl({c.h}, {c.s}%, {c.l}%)</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Contrast Checker */}
        <Card>
          <CardContent className="p-4">
            <h3 className="text-sm font-semibold text-foreground mb-3">Contrast Checker</h3>
            <p className="text-xs text-muted-foreground mb-2">Text on Background — ratio: <span className="font-mono font-semibold text-foreground">{ratio.toFixed(2)}:1</span></p>
            <div className="flex gap-3">
              <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium ${passAA ? "bg-green-500/10 text-green-400" : "bg-destructive/10 text-destructive"}`}>
                {passAA ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />} WCAG AA
              </div>
              <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium ${passAAA ? "bg-green-500/10 text-green-400" : "bg-destructive/10 text-destructive"}`}>
                {passAAA ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />} WCAG AAA
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Save */}
        <Button
          onClick={handleSave}
          disabled={saving}
          className="w-full bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white font-semibold"
        >
          {saving ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Saving...</> : "Save Brand Colors"}
        </Button>
      </div>
    </div>
  );
}
