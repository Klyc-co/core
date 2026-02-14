import AnimateOnScroll from "./AnimateOnScroll";
import { X, Zap } from "lucide-react";

const traditionalProblems = [
  { label: "Delayed campaigns", detail: "Weeks of planning before a single post" },
  { label: "Under-leveraged networks", detail: "Employee reach sitting idle" },
  { label: "Inconsistent messaging", detail: "Brand voice fragments across teams" },
  { label: "Reactive analytics", detail: "Insights arrive after momentum dies" },
  { label: "Missed amplification windows", detail: "Virality detected too late" },
  { label: "Limited distribution velocity", detail: "One channel, one post at a time" },
];

const traditionalSteps = ["Idea", "Planning", "Review", "Production", "Distribution", "Optimization"];
const klycSteps = ["Idea", "Distributed Execution", "Velocity Detection", "Amplification"];

const LandingCostSection = () => {
  return (
    <section className="py-24 sm:py-32 lg:py-40 px-4 sm:px-6 bg-[#0a0a0f] text-white">
      <div className="max-w-6xl mx-auto">
        <AnimateOnScroll>
          <p className="text-xs font-mono uppercase tracking-[0.25em] text-white/30 mb-6">
            The real problem
          </p>
          <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.1] mb-4">
            The Hidden Cost Isn't
            <br />
            Your Budget.
          </h2>
          <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.1] mb-16 bg-gradient-to-r from-white/40 to-white/20 bg-clip-text text-transparent">
            It's Lost Momentum.
          </h2>
        </AnimateOnScroll>

        {/* Problems grid */}
        <AnimateOnScroll delay={100}>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-20">
            {traditionalProblems.map((item, i) => (
              <AnimateOnScroll key={i} delay={120 + i * 60}>
                <div className="group relative p-5 rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:border-white/[0.12] transition-all duration-300 hover:bg-white/[0.05]">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 w-5 h-5 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center flex-shrink-0">
                      <X className="w-3 h-3 text-red-400" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white/90 mb-1">{item.label}</p>
                      <p className="text-xs text-white/40 leading-relaxed">{item.detail}</p>
                    </div>
                  </div>
                </div>
              </AnimateOnScroll>
            ))}
          </div>
        </AnimateOnScroll>

        {/* Quote */}
        <AnimateOnScroll delay={200}>
          <div className="text-center mb-20">
            <p className="text-xl sm:text-2xl md:text-3xl font-medium text-white/90 leading-relaxed">
              Every delay compounds.
            </p>
            <p className="text-xl sm:text-2xl md:text-3xl font-medium text-white/40 leading-relaxed">
              Every missed moment costs reach.
            </p>
          </div>
        </AnimateOnScroll>

        {/* Timeline comparison */}
        <AnimateOnScroll delay={250}>
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Traditional */}
            <div className="relative p-6 sm:p-8 rounded-2xl bg-white/[0.02] border border-white/[0.06] overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-red-500/20 to-transparent" />
              <p className="text-[10px] font-mono uppercase tracking-[0.3em] text-red-400/60 mb-8">Traditional Marketing</p>
              <div className="space-y-3">
                {traditionalSteps.map((step, i) => (
                  <div key={step} className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-[10px] text-white/30 font-mono">
                      {i + 1}
                    </span>
                    <span className="text-sm text-white/50">{step}</span>
                    {i < traditionalSteps.length - 1 && (
                      <span className="ml-auto text-white/10 text-xs">· · ·</span>
                    )}
                  </div>
                ))}
              </div>
              <div className="mt-6 pt-4 border-t border-white/[0.06]">
                <p className="text-xs font-mono text-red-400/50 tracking-wider">⏱ Weeks to execute</p>
              </div>
            </div>

            {/* KLYC */}
            <div className="relative p-6 sm:p-8 rounded-2xl bg-gradient-to-br from-[#2dd4a8]/[0.06] to-[#6b8de3]/[0.04] border border-[#2dd4a8]/20 overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-[#2dd4a8]/40 to-transparent" />
              <div className="flex items-center gap-2 mb-8">
                <Zap className="w-3.5 h-3.5 text-[#2dd4a8]" />
                <p className="text-[10px] font-mono uppercase tracking-[0.3em] text-[#2dd4a8]">KLYC</p>
              </div>
              <div className="space-y-3">
                {klycSteps.map((step, i) => (
                  <div key={step} className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-[#2dd4a8]/10 border border-[#2dd4a8]/20 flex items-center justify-center text-[10px] text-[#2dd4a8] font-mono">
                      {i + 1}
                    </span>
                    <span className="text-sm text-white/80 font-medium">{step}</span>
                    {i < klycSteps.length - 1 && (
                      <span className="ml-auto text-[#2dd4a8]/30 text-xs">→</span>
                    )}
                  </div>
                ))}
              </div>
              <div className="mt-6 pt-4 border-t border-[#2dd4a8]/10">
                <p className="text-xs font-mono text-[#2dd4a8] tracking-wider">⚡ Minutes to deploy</p>
              </div>
            </div>
          </div>
        </AnimateOnScroll>
      </div>
    </section>
  );
};

export default LandingCostSection;
