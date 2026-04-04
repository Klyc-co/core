import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, ArrowLeft, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import klycLogo from "@/assets/klyc-logo.png";

const ADMIN_ALLOWLIST = [
  "ethanw@cipherstream.com",
  "kitchens@klyc.ai",
  "kristopher.kitchens@gmail.com",
];

const AdminLogin = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      if (!ADMIN_ALLOWLIST.includes(email.toLowerCase().trim())) {
        await supabase.auth.signOut();
        throw new Error("Access denied. Admin privileges required.");
      }

      navigate("/admin/dashboard");
    } catch (err) {
      toast({
        title: "Login Failed",
        description: err instanceof Error ? err.message : "Invalid credentials",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <img src={klycLogo} alt="Klyc" className="h-10 mx-auto mb-4" />
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-100 text-red-700 text-xs font-medium mb-4">
            <Shield className="w-3.5 h-3.5" />
            Admin Access
          </div>
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="text-center text-xl">Admin Login</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@klyc.ai" required />
              </div>
              <div>
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Shield className="w-4 h-4 mr-2" />}
                Sign In as Admin
              </Button>
            </form>
          </CardContent>
        </Card>
        <div className="text-center mt-4">
          <Button variant="ghost" size="sm" onClick={() => navigate("/")} className="text-gray-500">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Home
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
