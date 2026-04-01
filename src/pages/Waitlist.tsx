import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, ArrowRight, Loader2, CheckCircle2, Lock } from "lucide-react";
import Logo from "@/components/Logo";

const BETA_PASSWORD = "373737";

const Waitlist = () => {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [showBeta, setShowBeta] = useState(false);
  const [betaPassword, setBetaPassword] = useState("");
  const [betaError, setBetaError] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleWaitlist = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.from("waitlist").insert({ full_name: fullName, email });
      if (error) {
        if (error.code === "23505") {
          toast({ title: "Already on the list!", description: "This email is already registered.", variant: "destructive" });
        } else {
          throw error;
        }
      } else {
        setSubmitted(true);
        toast({ title: "You're on the list!", description: "We'll notify you when Klyc is ready." });
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleBetaAccess = (e: React.FormEvent) => {
    e.preventDefault();
    if (betaPassword === BETA_PASSWORD) {
      navigate("/auth?tab=signup");
    } else {
      setBetaError(true);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="w-full max-w-md text-center animate-fade-in">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 rounded-full bg-gradient-to-r from-[#2dd4a8] to-[#6b5ce7] flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-3">You're on the list!</h1>
          <p className="text-muted-foreground mb-8">We'll send you an email when Klyc is ready for you.</p>
          <Button variant="ghost" onClick={() => navigate("/")} className="text-muted-foreground">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to home
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background p-4">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(185_75%_55%/0.1),transparent_50%)]" />

      <div className="flex-1 flex items-center justify-center relative z-10">
        <div className="w-full max-w-md animate-fade-in">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">Back to home</span>
          </button>

          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <Logo size="lg" />
            </div>
            <h1 className="text-2xl font-semibold text-foreground mb-2">Join the Waitlist</h1>
            <p className="text-muted-foreground">Be the first to know when Klyc launches.</p>
          </div>

          <div className="glass rounded-2xl p-8">
            <form onSubmit={handleWaitlist} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="wl-name" className="text-sm text-foreground">Full Name</Label>
                <Input
                  id="wl-name"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="John Doe"
                  className="bg-secondary border-border"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="wl-email" className="text-sm text-foreground">Email</Label>
                <Input
                  id="wl-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="bg-secondary border-border"
                  required
                />
              </div>

              <Button type="submit" className="w-full" variant="glow" size="lg" disabled={loading}>
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    Join Waitlist
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            </form>

            <div className="mt-6 pt-6 border-t border-border">
              {!showBeta ? (
                <button
                  type="button"
                  onClick={() => setShowBeta(true)}
                  className="w-full flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  <Lock className="w-3.5 h-3.5" />
                  Beta Users — Sign Up
                </button>
              ) : (
                <form onSubmit={handleBetaAccess} className="space-y-3">
                  <p className="text-xs text-center text-muted-foreground">Beta users — type in password</p>
                  <Input
                    type="password"
                    value={betaPassword}
                    onChange={(e) => { setBetaPassword(e.target.value); setBetaError(false); }}
                    placeholder="Enter beta password"
                    className={`bg-secondary border-border ${betaError ? "border-destructive" : ""}`}
                    required
                  />
                  {betaError && <p className="text-xs text-destructive text-center">Incorrect password</p>}
                  <Button type="submit" variant="outline" size="sm" className="w-full">
                    Access Sign Up
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Waitlist;
