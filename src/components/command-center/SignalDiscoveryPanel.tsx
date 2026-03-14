import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Radar, Globe, Building2, Users, Target, Shield, Package, Crosshair } from "lucide-react";

export interface SignalDiscoveryState {
  /** Maps to input_as_text – the primary campaign brief */
  campaignGoal: string;
  geo: string;
  industry: string;
  customerSize: string;
  competitor: string;
  addressableMarket: string;
  businessNeed: string;
  regulatoryDriver: string;
  productDefinition: string;
  mode: string;
}

interface Props {
  state: SignalDiscoveryState;
  onChange: (state: SignalDiscoveryState) => void;
}

const INDUSTRIES = ["SaaS", "E-Commerce", "Healthcare", "Finance", "Education", "Real Estate", "Agency", "Retail", "Manufacturing", "Other"];
const CUSTOMER_SIZES = ["SMB (1-50)", "Mid-Market (51-500)", "Enterprise (500+)", "Consumer / D2C"];
const GEOS = ["North America", "Europe", "APAC", "LATAM", "MEA", "Global"];

export default function SignalDiscoveryPanel({ state, onChange }: Props) {
  const update = (patch: Partial<SignalDiscoveryState>) => onChange({ ...state, ...patch });

  return (
    <Card className="border-border/60 bg-card/80 backdrop-blur-sm">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <Radar className="w-4 h-4 text-primary" />
          Signal Discovery
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Campaign Brief – maps to input_as_text */}
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Campaign Brief</Label>
          <Textarea
            className="text-sm min-h-[72px] bg-background/60 border-border/50 resize-none"
            placeholder="Describe what you want to achieve — this is the primary input for the AI..."
            value={state.campaignGoal}
            onChange={(e) => update({ campaignGoal: e.target.value })}
          />
        </div>

        {/* Row 1: Geo / Industry / Customer Size */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <FieldSelect icon={<Globe className="w-3.5 h-3.5" />} label="Geography" value={state.geo} options={GEOS} onChange={(v) => update({ geo: v })} />
          <FieldSelect icon={<Building2 className="w-3.5 h-3.5" />} label="Industry" value={state.industry} options={INDUSTRIES} onChange={(v) => update({ industry: v })} />
          <FieldSelect icon={<Users className="w-3.5 h-3.5" />} label="Customer Size" value={state.customerSize} options={CUSTOMER_SIZES} onChange={(v) => update({ customerSize: v })} />
        </div>

        {/* Row 2: Competitor / Addressable Market */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FieldInput icon={<Target className="w-3.5 h-3.5" />} label="Competitor" placeholder="e.g. HubSpot, Mailchimp" value={state.competitor} onChange={(v) => update({ competitor: v })} />
          <FieldInput icon={<Crosshair className="w-3.5 h-3.5" />} label="Addressable Market" placeholder="e.g. 50K SMBs in North America" value={state.addressableMarket} onChange={(v) => update({ addressableMarket: v })} />
        </div>

        {/* Row 3: Business Need / Regulatory */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FieldInput icon={<Package className="w-3.5 h-3.5" />} label="Business Need" placeholder="Core problem to solve" value={state.businessNeed} onChange={(v) => update({ businessNeed: v })} />
          <FieldInput icon={<Shield className="w-3.5 h-3.5" />} label="Regulatory Driver" placeholder="e.g. GDPR, HIPAA, SOC2" value={state.regulatoryDriver} onChange={(v) => update({ regulatoryDriver: v })} />
        </div>

        {/* Product Definition */}
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Product Definition</Label>
          <Textarea
            className="text-sm min-h-[60px] bg-background/60 border-border/50 resize-none"
            placeholder="What are you marketing? Describe the product or service..."
            value={state.productDefinition}
            onChange={(e) => update({ productDefinition: e.target.value })}
          />
        </div>

        {/* Mode Toggle */}
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Strategy Mode</Label>
          <ToggleGroup
            type="single"
            value={state.mode}
            onValueChange={(v) => v && update({ mode: v })}
            className="justify-start"
          >
            <ToggleGroupItem value="reactive" className="text-xs px-3 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
              Reactive
            </ToggleGroupItem>
            <ToggleGroupItem value="proactive" className="text-xs px-3 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
              Proactive
            </ToggleGroupItem>
            <ToggleGroupItem value="hybrid" className="text-xs px-3 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
              Hybrid
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      </CardContent>
    </Card>
  );
}

function FieldSelect({ icon, label, value, options, onChange }: { icon: React.ReactNode; label: string; value: string; options: string[]; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground flex items-center gap-1">{icon}{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="text-sm bg-background/60 border-border/50 h-9">
          <SelectValue placeholder={`Select ${label.toLowerCase()}`} />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o} value={o}>{o}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function FieldInput({ icon, label, placeholder, value, onChange }: { icon: React.ReactNode; label: string; placeholder: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground flex items-center gap-1">{icon}{label}</Label>
      <Input className="text-sm bg-background/60 border-border/50 h-9" placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
