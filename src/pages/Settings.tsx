import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useTheme } from "next-themes";
import { Sun, Moon, Sliders } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { User } from "@supabase/supabase-js";
import AppHeader from "@/components/AppHeader";
import PersonalitySettings from "@/components/settings/PersonalitySettings";

const Settings = () => {
  const [user, setUser] = useState<User | null>(null);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { theme, setTheme } = useTheme();

  const defaultTab = searchParams.get("tab") || "appearance";

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
        if (!session) navigate("/auth");
      }
    );
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) navigate("/auth");
      else setUser(session.user);
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  const isDark = theme === "dark";

  return (
    <div className="min-h-screen bg-background">
      <AppHeader user={user} />

      <main className="max-w-2xl mx-auto px-6 py-10 space-y-6">
        <h1 className="text-3xl font-bold text-foreground mb-2">Settings</h1>

        <Tabs defaultValue={defaultTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="appearance">Appearance</TabsTrigger>
            <TabsTrigger value="personality">Personality & Behavior</TabsTrigger>
          </TabsList>

          <TabsContent value="appearance" className="mt-4">
            <div className="glass rounded-2xl p-6">
              <h2 className="text-lg font-semibold text-foreground mb-6">Appearance</h2>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {isDark ? <Moon className="w-5 h-5 text-primary" /> : <Sun className="w-5 h-5 text-primary" />}
                  <div>
                    <Label htmlFor="dark-mode" className="text-foreground font-medium">Dark Mode</Label>
                    <p className="text-sm text-muted-foreground">Toggle between light and dark theme</p>
                  </div>
                </div>
                <Switch
                  id="dark-mode"
                  checked={isDark}
                  onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="personality" className="mt-4">
            <PersonalitySettings />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Settings;
