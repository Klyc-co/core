import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, CheckCircle, ArrowLeft, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import Logo from "@/components/Logo";

const steps = [
  { id: "transcribe", label: "Transcribing audio" },
  { id: "segment", label: "Creating segments" },
  { id: "prompts", label: "Generating visual prompts" },
];

const Processing = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [status, setStatus] = useState("processing");
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!id) return;

    // Check status function
    const checkStatus = async () => {
      const { data } = await supabase
        .from("projects")
        .select("status")
        .eq("id", id)
        .single();

      if (data?.status === "ready_for_edit") {
        navigate(`/projects/${id}/edit`);
        return true;
      }
      if (data?.status === "error") {
        setError(true);
        setStatus("error");
        return true;
      }
      return false;
    };

    // Check initial status
    checkStatus();

    // Poll for status changes (fallback for realtime)
    const pollInterval = setInterval(async () => {
      const done = await checkStatus();
      if (done) clearInterval(pollInterval);
    }, 3000);

    // Subscribe to changes (primary method)
    const channel = supabase
      .channel(`project-${id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "projects",
          filter: `id=eq.${id}`,
        },
        (payload) => {
          const newStatus = payload.new.status;
          setStatus(newStatus);
          if (newStatus === "ready_for_edit") {
            navigate(`/projects/${id}/edit`);
          }
        }
      )
      .subscribe();

    // Animate through steps
    const stepInterval = setInterval(() => {
      setCurrentStep((prev) => (prev < steps.length - 1 ? prev + 1 : prev));
    }, 3000);

    return () => {
      channel.unsubscribe();
      clearInterval(pollInterval);
      clearInterval(stepInterval);
    };
  }, [id, navigate]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,hsl(185_75%_55%/0.1),transparent_60%)]" />

      <div className="text-center relative animate-fade-in">
        <div className="flex justify-center mb-8">
          <Logo size="lg" />
        </div>

        <h1 className="text-2xl font-bold text-foreground mb-3">
          Processing your video
        </h1>
        <p className="text-muted-foreground mb-10">
          This usually takes less than a minute
        </p>

        <div className="glass rounded-2xl p-8 max-w-md mx-auto">
          <div className="space-y-4">
            {steps.map((step, index) => (
              <div
                key={step.id}
                className={`flex items-center gap-4 transition-all duration-300 ${
                  index <= currentStep ? "opacity-100" : "opacity-40"
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${
                    index < currentStep
                      ? "bg-success text-success-foreground"
                      : index === currentStep
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-muted-foreground"
                  }`}
                >
                  {index < currentStep ? (
                    <CheckCircle className="w-4 h-4" />
                  ) : index === currentStep ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <span className="text-sm">{index + 1}</span>
                  )}
                </div>
                <span
                  className={`text-sm ${
                    index <= currentStep ? "text-foreground" : "text-muted-foreground"
                  }`}
                >
                  {step.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        <Button
          variant="ghost"
          className="mt-8"
          onClick={() => navigate("/projects")}
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Projects
        </Button>
      </div>
    </div>
  );
};

export default Processing;
