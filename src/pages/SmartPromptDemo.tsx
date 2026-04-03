import { SmartPromptCard } from "@/components/SmartPromptCard";

const SmartPromptDemo = () => (
  <div className="min-h-screen bg-background p-6 space-y-6 max-w-lg mx-auto">
    <h1 className="text-xl font-bold text-foreground">SmartPromptCard Demo</h1>

    {/* 1. Strategy Decision */}
    <SmartPromptCard
      question="Which campaign direction should we pursue?"
      category="strategy"
      options={[
        { id: "bold", label: "Bold & Disruptive", description: "Push boundaries with edgy creative that challenges industry norms.", confidence: 0.82 },
        { id: "trust", label: "Trust-First Approach", description: "Lead with social proof, testimonials, and data-backed claims.", confidence: 0.71 },
        { id: "story", label: "Narrative-Driven", description: "Build an emotional story arc across platforms over 4 weeks.", confidence: 0.65 },
      ]}
      onSelect={(v) => console.log("Strategy:", v)}
    />

    {/* 2. Viral Score Card */}
    <SmartPromptCard
      question="Review viral potential for 'Your jeans have a past life' campaign"
      category="creative"
      viralScore={{
        score: 0.72,
        components: { engagement: 0.8, velocity: 0.7, novelty: 0.75, dwell: 0.65, community_spread: 0.6, emotional_energy: 0.8 },
        recommendation: "MONITOR",
      }}
      options={[
        { id: "amplify", label: "Amplify Now", description: "Boost budget and expand to additional platforms.", confidence: 0.6 },
        { id: "iterate", label: "Iterate First", description: "Refine hook and CTA before scaling.", confidence: 0.85 },
        { id: "hold", label: "Hold & Watch", description: "Monitor organic performance for 48h before deciding.", confidence: 0.55 },
      ]}
      onSelect={(v) => console.log("Viral:", v)}
    />

    {/* 3. Approval Gate */}
    <SmartPromptCard
      question="Content approval: 'Recycled Denim Collection' Instagram post"
      category="approval"
      approvalData={{
        factual: 0.85,
        brand: 0.92,
        audience: 0.78,
        quality: 0.88,
        composite: 0.86,
        decision: "revision_requested",
        revisionNotes: "CTA could be stronger — consider action-oriented language.",
        iteration: 1,
      }}
      options={[]}
      allowCustom={false}
      onSelect={(v) => console.log("Approval:", v)}
    />
  </div>
);

export default SmartPromptDemo;
