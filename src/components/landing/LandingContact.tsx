import { Mail, MapPin, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const LandingContact = () => {
  const navigate = useNavigate();

  return (
    <section id="contact" className="bg-white py-24 px-4 sm:px-6 border-t border-[#e2e5ea]/60">
      <div className="max-w-6xl mx-auto">
        <div className="grid gap-12 lg:grid-cols-2 items-center">
          <div>
            <p className="text-xs font-semibold tracking-widest uppercase text-[#a855f7] mb-3">Contact</p>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-[#191a1f] mb-5 leading-tight">
              Talk to the team building Klyc.
            </h2>
            <p className="text-base sm:text-lg text-[#6b7280] leading-relaxed mb-8">
              Whether you're a founder, an agency, or a partner, we want to hear from you. Reach us directly — we read every message.
            </p>

            <div className="space-y-5">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-[#faf5ff] flex items-center justify-center flex-shrink-0">
                  <Mail className="w-5 h-5 text-[#a855f7]" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#191a1f]">Email</p>
                  <a
                    href="mailto:hello@klyc.ai"
                    className="text-sm text-[#6b7280] hover:text-[#191a1f] transition-colors"
                  >
                    hello@klyc.ai
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-[#faf5ff] flex items-center justify-center flex-shrink-0">
                  <MessageSquare className="w-5 h-5 text-[#a855f7]" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#191a1f]">Partnerships & press</p>
                  <a
                    href="mailto:partners@klyc.ai"
                    className="text-sm text-[#6b7280] hover:text-[#191a1f] transition-colors"
                  >
                    partners@klyc.ai
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-[#faf5ff] flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-5 h-5 text-[#a855f7]" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#191a1f]">Headquarters</p>
                  <p className="text-sm text-[#6b7280]">
                    Cipher Stream, Inc. — United States
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-[#e2e5ea] bg-gradient-to-br from-[#faf5ff] to-white p-8 sm:p-10">
            <h3 className="text-2xl font-bold text-[#191a1f] mb-3">Ready to see Klyc?</h3>
            <p className="text-[#6b7280] leading-relaxed mb-6">
              Join the private beta to get early access, dedicated onboarding, and founder-tier pricing locked in for life.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                onClick={() => navigate("/waitlist")}
                className="bg-gradient-to-r from-[#6b5ce7] to-[#a855f7] text-white border-0 hover:opacity-90"
              >
                Join the waitlist
              </Button>
              <Button
                variant="outline"
                onClick={() => (window.location.href = "mailto:hello@klyc.ai")}
              >
                Email the team
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default LandingContact;
