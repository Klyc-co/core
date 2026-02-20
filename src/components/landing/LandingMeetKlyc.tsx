import AnimateOnScroll from "./AnimateOnScroll";
import klycMascot from "@/assets/klyc-mascot-waving.png";
import klycLogoDark from "@/assets/klyc-logo-dark-nobg.png";
import { CalendarCheck, Sparkles, Send, TrendingUp } from "lucide-react";

const gradientStyle = {
  backgroundImage: "linear-gradient(135deg, #2dd4a8, #6b8de3, #a855f7)",
};

const finalBullets = [
  {
    icon: CalendarCheck,
    parts: [
      { text: "\"I turn your goals into a weekly " },
      { text: "Plan", gradient: true },
      { text: " - what to post, where to post, and why it matters.\"" },
    ],
  },
  {
    icon: Sparkles,
    parts: [
      { text: "\"I " },
      { text: "Create", gradient: true },
      { text: " platform-native content that sounds like you - scripts, posts, captions, and creatives.\"" },
    ],
  },
  {
    icon: Send,
    parts: [
      { text: "\"I " },
      { text: "Publish", gradient: true },
      { text: " across every channel on schedule - so you stay consistent without manual work.\"" },
    ],
  },
  {
    icon: TrendingUp,
    parts: [
      { text: "\"I track what's working, learn fast, and " },
      { text: "Optimize", gradient: true },
      { text: " - so every week performs better than the last.\"" },
    ],
  },
];

const LandingMeetKlyc = () => {
  return (
    <section className="py-20 sm:py-28 lg:py-36 px-4 sm:px-6 bg-white">
      <div className="max-w-6xl mx-auto">
        <AnimateOnScroll>
          <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-[#191a1f] mb-3 text-center flex items-center justify-center gap-3 flex-wrap">
            Meet{" "}
            <img src={klycLogoDark} alt="Klyc" className="h-10 sm:h-12 md:h-14 lg:h-16 inline-block" />
          </h2>
          <p className="text-lg sm:text-xl md:text-2xl text-[#6b7280] font-light italic mb-10 sm:mb-12 text-center">
            "I'm Your Always-On Marketing AI Agent. I work 24/7 with you."
          </p>
        </AnimateOnScroll>

        <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
          <AnimateOnScroll delay={100}>
            <div className="flex-shrink-0 mx-auto lg:mx-0">
              <img
                src={klycMascot}
                alt="Klyc mascot"
                className="w-64 sm:w-80 md:w-96 lg:w-[420px] drop-shadow-2xl"
              />
            </div>
          </AnimateOnScroll>

          <div className="flex-1 space-y-10">
            {finalBullets.map((b, i) => (
              <AnimateOnScroll key={i} delay={60 + i * 60}>
                <div className="flex items-start gap-4">
                  <div
                    className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center mt-1"
                    style={{ background: "linear-gradient(135deg, rgba(45,212,168,0.12), rgba(168,85,247,0.12))" }}
                  >
                    <b.icon className="w-5 h-5 text-[#6b8de3]" />
                  </div>
                  <p className="text-lg sm:text-xl md:text-2xl leading-snug text-[#191a1f]">
                    {b.parts.map((part, j) =>
                      part.gradient ? (
                        <span
                          key={j}
                          className="font-extrabold bg-clip-text text-transparent"
                          style={gradientStyle}
                        >
                          {part.text}
                        </span>
                      ) : (
                        <span key={j} className="font-normal">
                          {part.text}
                        </span>
                      )
                    )}
                  </p>
                </div>
              </AnimateOnScroll>
            ))}
          </div>
        </div>

        {/* Tagline under mascot and quotes */}
        <AnimateOnScroll delay={400}>
          <div className="mt-14 sm:mt-16 text-center max-w-3xl mx-auto">
            <p className="text-base sm:text-lg md:text-xl text-[#6b7280] font-medium">
              Klyc is a social-first marketing loop
            </p>
            <p className="text-base sm:text-lg md:text-xl font-medium mt-1">
              <span className="text-[#191a1f] font-semibold">your community signals</span> →{" "}
              <span
                className="font-semibold bg-clip-text text-transparent"
                style={gradientStyle}
              >
                Klyc executes
              </span>{" "}
              →{" "}
              <span className="text-[#191a1f] font-semibold">your reach compounds.</span>
            </p>
          </div>
        </AnimateOnScroll>
      </div>
    </section>
  );
};

export default LandingMeetKlyc;
