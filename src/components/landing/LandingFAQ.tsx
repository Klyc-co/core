import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const FAQS = [
  {
    q: "What does Klyc actually do?",
    a: "Klyc is an autonomous marketing platform. It plans your strategy, generates posts and creative assets, schedules them across TikTok, Instagram, X, LinkedIn, Facebook, YouTube, and more, then learns from real performance data to keep improving — all from a single brand workspace.",
  },
  {
    q: "Which social platforms does Klyc publish to?",
    a: "Klyc publishes natively to TikTok, Instagram, X (Twitter), LinkedIn, Facebook, YouTube, Threads, and Pinterest. We're continuously expanding integrations — request the next one from inside the app.",
  },
  {
    q: "Do I need to be a marketer to use Klyc?",
    a: "No. Klyc is designed for founders, operators, and small teams who don't have time to run a full marketing department. Guided Mode walks you through every decision, while Pro Mode gives experienced marketers full control.",
  },
  {
    q: "How does Klyc handle my brand voice?",
    a: "During onboarding, Klyc analyzes your website, social presence, and any reference material you provide to build a Brand Brain — a persistent profile of your voice, audience, competitors, and visual identity. Every generation is grounded in that profile.",
  },
  {
    q: "Is my data secure?",
    a: "Yes. All third-party tokens are encrypted at the application layer before storage, every workspace is isolated by tenant, and access is controlled by row-level security. Enterprise customers can request SSO, SAML, audit logs, and custom data residency.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Yes. All plans are month-to-month with no long-term contract. Cancel from the billing settings in your workspace at any time and you'll keep access until the end of the current period.",
  },
  {
    q: "How do I get access?",
    a: "Klyc is currently in private beta. Join the waitlist and we'll reach out as soon as a slot opens for your industry and region.",
  },
];

const LandingFAQ = () => {
  return (
    <section id="faq" className="bg-[#fafafa] py-24 px-4 sm:px-6 border-t border-[#e2e5ea]/60">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-12">
          <p className="text-xs font-semibold tracking-widest uppercase text-[#a855f7] mb-3">FAQ</p>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-[#191a1f] mb-5">
            Frequently asked questions.
          </h2>
          <p className="text-base sm:text-lg text-[#6b7280]">
            Everything you need to know before joining the waitlist.
          </p>
        </div>

        <Accordion type="single" collapsible className="w-full">
          {FAQS.map((faq, i) => (
            <AccordionItem key={i} value={`item-${i}`} className="border-b border-[#e2e5ea]">
              <AccordionTrigger className="text-left text-base font-semibold text-[#191a1f] hover:no-underline">
                {faq.q}
              </AccordionTrigger>
              <AccordionContent className="text-[#6b7280] leading-relaxed">
                {faq.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
};

export default LandingFAQ;
