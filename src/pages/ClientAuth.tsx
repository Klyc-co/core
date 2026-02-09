import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Mail, Lock, ArrowRight, ArrowLeft, Loader2, Users } from "lucide-react";
import Logo from "@/components/Logo";

const ClientAuth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (session) {
          // Check if user has client role metadata
          const userRole = session.user.user_metadata?.role;
          if (userRole === "client") {
            navigate("/client/dashboard");
          }
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        const userRole = session.user.user_metadata?.role;
        if (userRole === "client") {
          navigate("/client/dashboard");
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const linkClientToMarketer = async (userId: string, userEmail: string) => {
    // NOTE: Clients cannot UPDATE marketer_clients directly due to database permissions.
    // We call a backend function that performs the link securely.
    try {
      const { error } = await supabase.functions.invoke("link-client-to-marketer", {
        body: { email: userEmail },
      });
      if (error) {
        console.error("Error linking client to marketer:", error);
      }
    } catch (e) {
      console.error("Error linking client to marketer:", e);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        
        // Ensure client role metadata is set (may be missing if they signed up via marketer auth)
        if (data.user && data.user.user_metadata?.role !== "client") {
          await supabase.auth.updateUser({
            data: { role: "client" },
          });
        }
        
        // Link client to marketer on login (in case they signed up before being invited)
        if (data.user) {
          await linkClientToMarketer(data.user.id, email.toLowerCase());
        }
        
        toast({ title: "Welcome back!", description: "You've been logged in." });
        navigate("/client/dashboard");
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/client/dashboard`,
            data: {
              role: "client",
            },
          },
        });
        if (error) throw error;
        
        // Link this new client to any marketer who invited them
        if (data.user) {
          await linkClientToMarketer(data.user.id, email.toLowerCase());
        }
        
        toast({ title: "Account created!", description: "Welcome to Klyc Client Portal." });
        navigate("/client/dashboard");
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(280_75%_55%/0.1),transparent_50%)]" />
      
      <div className="w-full max-w-md relative animate-fade-in">
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
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="px-3 py-1 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-sm font-medium flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" />
              Client Portal
            </div>
          </div>
          <h1 className="text-2xl font-semibold text-foreground mb-2">
            {isLogin ? "Welcome back" : "Create your account"}
          </h1>
          <p className="text-muted-foreground">
            {isLogin
              ? "Sign in to view your campaigns and collaborate"
              : "Join to review and approve marketing content"}
          </p>
        </div>

        <div className="glass rounded-2xl p-8 border border-purple-200/50 dark:border-purple-800/30">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm text-foreground">
                Email
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="pl-10 bg-secondary border-border"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm text-foreground">
                Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="pl-10 bg-secondary border-border"
                  required
                  minLength={6}
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 text-white"
              size="lg"
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  {isLogin ? "Sign in" : "Create account"}
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="text-sm text-muted-foreground hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
            >
              {isLogin
                ? "Don't have an account? Sign up"
                : "Already have an account? Sign in"}
            </button>
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          Are you a marketer? <a href="/auth" className="text-primary hover:underline">Sign in here</a>
        </p>
      </div>
    </div>
  );
};

export default ClientAuth;