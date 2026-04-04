import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Loader2 } from "lucide-react";
import { toast } from "sonner";

const ADMIN_ALLOWLIST = ["ethanw@cipherstream.com", "kitchens@klyc.ai"];

export default function KlycAdminLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"login" | "register">("login");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (mode === "register") {
        // Sign up flow
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        toast.success("Account created! Check your email to verify, then log in.");
        setMode("login");
        return;
      }

      // Login flow
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      // Check allowlist first (client-side fast path)
      const isAllowlisted = ADMIN_ALLOWLIST.includes(email.toLowerCase().trim());

      if (!isAllowlisted) {
        // Check admin_users table
        const { data: adminRow, error: adminErr } = await supabase
          .from("admin_users")
          .select("id, role")
          .eq("email", email.toLowerCase().trim())
          .maybeSingle();

        if (adminErr || !adminRow) {
          // Check if table is empty → first admin bootstrap
          const { count } = await supabase
            .from("admin_users")
            .select("id", { count: "exact", head: true });

          if (count === 0) {
            // First admin bootstrap: create admin record
            const { error: insertErr } = await supabase
              .from("admin_users")
              .insert({ email: email.toLowerCase().trim(), role: "admin" });
            if (insertErr) {
              await supabase.auth.signOut();
              toast.error("Failed to bootstrap admin access.");
              return;
            }
            toast.success("You've been registered as the first admin!");
          } else {
            await supabase.auth.signOut();
            toast.error("Access denied. You are not authorized as an admin.");
            return;
          }
        }
      } else {
        // Ensure allowlisted user has an admin_users row
        await supabase
          .from("admin_users")
          .upsert(
            { email: email.toLowerCase().trim(), role: "senior_admin" },
            { onConflict: "email" }
          );
      }

      toast.success("Welcome to Klyc Admin");
      navigate("/klyc_admin/overview");
    } catch (err: any) {
      toast.error(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Shield className="w-6 h-6 text-primary" />
          </div>
          <CardTitle className="text-2xl">Klyc Admin</CardTitle>
          <CardDescription>
            {mode === "login" ? "Internal access only" : "Create your admin account"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@klyc.ai"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Shield className="w-4 h-4 mr-2" />}
              {mode === "login" ? "Sign In" : "Create Account"}
            </Button>
          </form>
          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => setMode(mode === "login" ? "register" : "login")}
              className="text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              {mode === "login"
                ? "No account yet? Register first"
                : "Already have an account? Sign in"}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
