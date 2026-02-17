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
import LandingBuiltFor from "@/components/landing/LandingBuiltFor";
import LandingCategory from "@/components/landing/LandingCategory";
import LandingPowerClose from "@/components/landing/LandingPowerClose";

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
      <LandingMeetKlyc />
      <LandingCostSection />
      <LandingInfrastructure />
      <LandingDistributed />
      <LandingSpeed />
      <LandingVirality />
      <LandingBuiltFor />
      <LandingCategory />
      <LandingPowerClose />
    </div>
  );
};

export default Index;
