import AnimateOnScroll from "./AnimateOnScroll";
import klycMascot from "@/assets/klyc-mascot.png";
import { Network, Layers, Globe, Zap, Shield, Activity, Rocket, Fingerprint, TrendingUp, BarChart3 } from "lucide-react";

const features = [
  { icon: Network, bold: "Turn your company into a distributed media network", desc: "Activate employees, leadership, and sales to multiply organic reach instantly." },
  { icon: Layers, bold: "Replace fragmented marketing tools with one unified execution system", desc: "Strategy, content, publishing, and performance — connected." },
  { icon: Globe, bold: "Generate platform-native content automatically", desc: "LinkedIn, X, Instagram, TikTok, YouTube — formatted correctly, every time." },
  { icon: Zap, bold: "Eliminate planning bottlenecks", desc: "Go from campaign idea to live distribution in minutes, not weeks." },
  { icon: Shield, bold: "Enforce brand consistency at scale", desc: "Tone, positioning, and constraints applied automatically across all outputs." },
  { icon: Activity, bold: "Detect momentum in real time", desc: "Measure early engagement velocity within the first 2 hours." },
  { icon: Rocket, bold: "Trigger intelligent amplification at the right moment", desc: "Capture rising attention before it disappears in the feed." },
  { icon: Fingerprint, bold: "Prevent repetitive or redundant messaging", desc: "Built-in uniqueness engine ensures every post adds new signal." },
  { icon: TrendingUp, bold: "Scale output without scaling headcount", desc: "Increase visibility without hiring more marketers." },
  { icon: BarChart3, bold: "Create a measurable visibility infrastructure", desc: "Move from \"posting content\" to building compounding attention systems." },
];

const LandingMeetKlyc = () => {
  return (
    <section className="py-20 sm:py-28 lg:py-36 px-4 sm:px-6 bg-white">
      <div className="max-w-6xl mx-auto">
        <AnimateOnScroll>
          <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-foreground mb-16 sm:mb-20 text-center">
            Meet{" "}
            <span
              className="bg-clip-text text-transparent"
              style={{ backgroundImage: "linear-gradient(135deg, #2dd4a8, #6b8de3, #a855f7)" }}
            >
              Klyc
            </span>
          </h2>
        </AnimateOnScroll>

        <div className="flex flex-col lg:flex-row items-start gap-12 lg:gap-16">
          {/* Feature list */}
          <div className="flex-1 space-y-6 order-2 lg:order-1">
            {features.map((f, i) => (
              <AnimateOnScroll key={i} delay={60 + i * 40}>
                <div className="flex items-start gap-4">
                  <div
                    className="mt-1 flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ background: "linear-gradient(135deg, rgba(45,212,168,0.12), rgba(168,85,247,0.12))" }}
                  >
                    <f.icon className="w-4 h-4 text-[#6b8de3]" />
                  </div>
                  <div>
                    <p className="text-base sm:text-lg font-semibold text-foreground leading-snug">{f.bold}</p>
                    <p className="text-sm sm:text-base text-muted-foreground mt-1 leading-relaxed">{f.desc}</p>
                  </div>
                </div>
              </AnimateOnScroll>
            ))}
          </div>

          {/* Mascot image */}
          <AnimateOnScroll delay={100}>
            <div className="flex-shrink-0 order-1 lg:order-2 mx-auto lg:mx-0 lg:sticky lg:top-32">
              <img
                src={klycMascot}
                alt="Klyc mascot"
                className="w-64 sm:w-80 md:w-96 lg:w-[420px] drop-shadow-2xl"
              />
            </div>
          </AnimateOnScroll>
        </div>
      </div>
    </section>
  );
};

export default LandingMeetKlyc;
