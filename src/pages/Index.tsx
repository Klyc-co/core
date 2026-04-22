import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import LandingHeader from "@/components/landing/LandingHeader";
import LandingHero from "@/components/landing/LandingHero";
import LandingMeetKlyc from "@/components/landing/LandingMeetKlyc";
import LandingCostSection from "@/components/landing/LandingCostSection";
import LandingInfrastructure from "@/components/landing/LandingInfrastructure";
import LandingDistributed from "@/components/landing/LandingDistributed";
import LandingSpeed from "@/components/landing/LandingSpeed";
import LandingVirality from "@/components/landing/LandingVirality";
import LandingTeam from "@/components/landing/LandingTeam";
import LandingBuiltFor from "@/components/landing/LandingBuiltFor";
import LandingCategory from "@/components/landing/LandingCategory";
import LandingPowerClose from "@/components/landing/LandingPowerClose";
import LandingPricing from "@/components/landing/LandingPricing";
import LandingFAQ from "@/components/landing/LandingFAQ";
import LandingContact from "@/components/landing/LandingContact";
import LandingFooter from "@/components/landing/LandingFooter";

const Index = () => {
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/home");
      }
    });
  }, [navigate]);

  return (
    <div className="min-h-screen">
      <LandingHeader />
      <LandingHero />

      {/* Features = what Klyc does */}
      <div id="features">
        <LandingMeetKlyc />
        <LandingCostSection />
        <LandingInfrastructure />
        <LandingVirality />
      </div>

      {/* About = team + story */}
      <div id="about">
        <LandingTeam />
      </div>

      {/* How it works = speed + distributed */}
      <div id="how-it-works">
        <LandingSpeed />
        <LandingDistributed />
        <LandingBuiltFor />
        <LandingCategory />
      </div>

      <LandingPricing />
      <LandingFAQ />
      <LandingContact />
      <LandingPowerClose />
      <LandingFooter />
    </div>
  );
};

export default Index;
