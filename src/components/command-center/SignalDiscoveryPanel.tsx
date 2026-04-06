import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Radar, Globe, Building2, Users, Target, Shield, Package, Crosshair, FileText, Settings2 } from "lucide-react";

export interface SignalDiscoveryState {
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
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <Radar className="w-4 h-4 text-primary" />
          Signal Discovery
        </CardTitle>
      </CardHeader>
      <CardContent className="pb-4">
        <ScrollArea className="w-full">
          <div className="flex gap-3 pb-3" style={{ minWidth: "max-content" }}>
            {/* Campaign Brief */}
            <SignalBox icon={<FileText className="w-3.5 h-3.5 text-primary" />} label="Campaign Brief" className="min-w-[260px] max-w-[280px]">
              <Textarea
                className="text-sm min-h-[68px] bg-background/60 border-border/50 resize-none"
                placeholder="Describe what you want to achieve..."
                value={state.campaignGoal}
                onChange={(e) => update({ campaignGoal: e.target.value })}
              />
            </SignalBox>

            {/* Geography */}
            <SignalBox icon={<Globe className="w-3.5 h-3.5 text-primary" />} label="Geography" className="min-w-[180px]">
              <Select value={state.geo} onValueChange={(v) => update({ geo: v })}>
                <SelectTrigger className="text-sm bg-background/60 border-border/50 h-9">
                  <SelectValue placeholder="Select geo" />
                </SelectTrigger>
                <SelectContent>
                  {GEOS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                </SelectContent>
              </Select>
            </SignalBox>

            {/* Industry */}
            <SignalBox icon={<Building2 className="w-3.5 h-3.5 text-primary" />} label="Industry" className="min-w-[180px]">
              <Select value={state.industry} onValueChange={(v) => update({ industry: v })}>
                <SelectTrigger className="text-sm bg-background/60 border-border/50 h-9">
                  <SelectValue placeholder="Select industry" />
                </SelectTrigger>
                <SelectContent>
                  {INDUSTRIES.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                </SelectContent>
              </Select>
            </SignalBox>

            {/* Customer Size */}
            <SignalBox icon={<Users className="w-3.5 h-3.5 text-primary" />} label="Customer Size" className="min-w-[200px]">
              <Select value={state.customerSize} onValueChange={(v) => update({ customerSize: v })}>
                <SelectTrigger className="text-sm bg-background/60 border-border/50 h-9">
                  <SelectValue placeholder="Select size" />
                </SelectTrigger>
                <SelectContent>
                  {CUSTOMER_SIZES.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                </SelectContent>
              </Select>
            </SignalBox>

            {/* Competitor */}
            <SignalBox icon={<Target className="w-3.5 h-3.5 text-primary" />} label="Competitor" className="min-w-[200px]">
              <Input className="text-sm bg-background/60 border-border/50 h-9" placeholder="e.g. HubSpot" value={state.competitor} onChange={(e) => update({ competitor: e.target.value })} />
            </SignalBox>

            {/* Addressable Market */}
            <SignalBox icon={<Crosshair className="w-3.5 h-3.5 text-primary" />} label="Addressable Market" className="min-w-[220px]">
              <Input className="text-sm bg-background/60 border-border/50 h-9" placeholder="e.g. 50K SMBs" value={state.addressableMarket} onChange={(e) => update({ addressableMarket: e.target.value })} />
            </SignalBox>

            {/* Business Need */}
            <SignalBox icon={<Package className="w-3.5 h-3.5 text-primary" />} label="Business Need" className="min-w-[200px]">
              <Input className="text-sm bg-background/60 border-border/50 h-9" placeholder="Core problem" value={state.businessNeed} onChange={(e) => update({ businessNeed: e.target.value })} />
            </SignalBox>

            {/* Regulatory */}
            <SignalBox icon={<Shield className="w-3.5 h-3.5 text-primary" />} label="Regulatory Driver" className="min-w-[200px]">
              <Input className="text-sm bg-background/60 border-border/50 h-9" placeholder="e.g. GDPR, HIPAA" value={state.regulatoryDriver} onChange={(e) => update({ regulatoryDriver: e.target.value })} />
            </SignalBox>

            {/* Product Definition */}
            <SignalBox icon={<Package className="w-3.5 h-3.5 text-primary" />} label="Product Definition" className="min-w-[260px] max-w-[280px]">
              <Textarea
                className="text-sm min-h-[68px] bg-background/60 border-border/50 resize-none"
                placeholder="What are you marketing?"
                value={state.productDefinition}
                onChange={(e) => update({ productDefinition: e.target.value })}
              />
            </SignalBox>

            {/* Strategy Mode */}
            <SignalBox icon={<Settings2 className="w-3.5 h-3.5 text-primary" />} label="Strategy Mode" className="min-w-[200px]">
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
            </SignalBox>
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

function SignalBox({ icon, label, children, className }: { icon: React.ReactNode; label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`flex-shrink-0 rounded-lg border border-border/50 bg-background/40 p-3 space-y-2 ${className || ""}`}>
      <Label className="text-xs text-muted-foreground flex items-center gap-1.5 font-medium">
        {icon}{label}
      </Label>
      {children}
    </div>
  );
}
