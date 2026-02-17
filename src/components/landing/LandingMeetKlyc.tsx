import AnimateOnScroll from "./AnimateOnScroll";
import klycMascot from "@/assets/klyc-mascot.png";
import { Layers, LayoutDashboard, Globe, Send, Rocket } from "lucide-react";

const bullets = [
  { icon: Layers, text: "Replace Marketing Chaos With One Execution Engine" },
  { icon: LayoutDashboard, text: "Run Strategy, Creation, and Distribution From One System" },
  { icon: Globe, text: "Generate Platform-Native Content at Scale" },
  { icon: Send, text: "Publish Across Every Channel Automatically" },
  { icon: Rocket, text: "Amplify What Works Before It Disappears" },
];

const LandingMeetKlyc = () => {
  return (
    <section className="py-20 sm:py-28 lg:py-36 px-4 sm:px-6 bg-white">
      <div className="max-w-6xl mx-auto">
        <AnimateOnScroll>
          <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-foreground mb-3 text-center">
            Meet{" "}
            <span
              className="bg-clip-text text-transparent"
              style={{ backgroundImage: "linear-gradient(135deg, #2dd4a8, #6b8de3, #a855f7)" }}
            >
              Klyc
            </span>
          </h2>
          <p className="text-lg sm:text-xl md:text-2xl text-muted-foreground font-light mb-10 sm:mb-12 text-center">
            Your Always-On Marketing Agent. I work 24/7 with you.
          </p>
        </AnimateOnScroll>
        <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
          {/* Mascot image */}
          <AnimateOnScroll delay={100}>
            <div className="flex-shrink-0 mx-auto lg:mx-0">
              <img
                src={klycMascot}
                alt="Klyc mascot"
                className="w-64 sm:w-80 md:w-96 lg:w-[420px] drop-shadow-2xl"
              />
            </div>
          </AnimateOnScroll>

          {/* Bullet points */}
          <div className="flex-1 space-y-10">
            {bullets.map((b, i) => (
              <AnimateOnScroll key={i} delay={60 + i * 60}>
                <div className="flex items-center gap-4">
                  <div
                    className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center"
                    style={{ background: "linear-gradient(135deg, rgba(45,212,168,0.12), rgba(168,85,247,0.12))" }}
                  >
                    <b.icon className="w-5 h-5 text-[#6b8de3]" />
                  </div>
                  <p className="text-lg sm:text-xl md:text-2xl font-semibold text-foreground leading-snug">
                    {b.text}
                  </p>
                </div>
              </AnimateOnScroll>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default LandingMeetKlyc;
