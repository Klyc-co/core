import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogClose } from "@/components/ui/dialog";
import NetworkGraph from "./NetworkGraph";
import klycLogo from "@/assets/klyc-logo.png";

const LandingHero = () => {
  const [videoOpen, setVideoOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <section className="relative min-h-screen flex flex-col justify-center px-4 sm:px-6 bg-white overflow-hidden pt-14">
      <NetworkGraph />

      <div className="relative z-10 max-w-5xl mx-auto text-center py-32 sm:py-0">
        <img src={klycLogo} alt="Klyc" className="h-32 sm:h-40 md:h-56 mx-auto mb-8 sm:mb-12" />
        
        <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.1] mb-5 sm:mb-6">
          <span className="bg-gradient-to-r from-[#2dd4a8] via-[#6b8de3] to-[#a855f7] bg-clip-text text-transparent">Plan. Create. Publish. Optimize.</span>
           <br /><div className="h-3 sm:h-4" />
           <span className="text-[#191a1f]">Marketing Made Social.</span>
        </h1>

        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
          <Button
            size="lg"
            onClick={() => navigate("/auth")}
            className="bg-gradient-to-r from-[#6b5ce7] to-[#a855f7] text-white border-0 px-8 sm:px-10 py-6 text-base sm:text-lg rounded-lg font-medium hover:opacity-90"
          >
            Activate Klyc
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
          <Button
            size="lg"
            variant="ghost"
            onClick={() => setVideoOpen(true)}
            className="text-[#6b7280] hover:text-[#191a1f] hover:bg-[#ebedf0] px-8 py-6 text-base sm:text-lg rounded-lg"
          >
            See How It Works
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* How It Works Video Dialog */}
      <Dialog open={videoOpen} onOpenChange={setVideoOpen}>
        <DialogContent className="max-w-3xl w-[95vw] p-0 bg-[#08080c] border-[#1a1a2e] rounded-2xl overflow-hidden">
          <DialogClose className="absolute right-4 top-4 z-10 rounded-full bg-white/10 p-2 hover:bg-white/20 transition-colors">
            <X className="h-5 w-5 text-white" />
            <span className="sr-only">Close</span>
          </DialogClose>
          <div className="aspect-video flex flex-col items-center justify-center gap-4 p-8">
            <div className="w-16 h-16 rounded-full bg-gradient-to-r from-[#2dd4a8] via-[#6b8de3] to-[#a855f7] flex items-center justify-center">
              <svg className="w-7 h-7 text-white ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
            </div>
            <p className="text-white/70 text-lg font-medium tracking-wide">Video Coming Soon</p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 opacity-40">
        <div className="w-px h-10 bg-gradient-to-b from-transparent to-[#191a1f]" />
      </div>
    </section>
  );
};

export default LandingHero;
