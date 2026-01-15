import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { LogOut, FileText, MessageSquare, CheckCircle, Clock, Users } from "lucide-react";
import type { User } from "@supabase/supabase-js";
import Logo from "@/components/Logo";

const ClientDashboard = () => {
  const [user, setUser] = useState<User | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
        if (!session) {
          navigate("/client/auth");
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/client/auth");
      } else {
        setUser(session.user);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b border-border/50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Logo size="sm" />
            <div className="px-3 py-1 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-sm font-medium flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" />
              Client Portal
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground hidden sm:inline">
              {user?.email}
            </span>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" />
              Sign out
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-10">
        {/* Welcome Section */}
        <div className="mb-10">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Welcome to your Client Portal
          </h1>
          <p className="text-muted-foreground">
            Review campaigns, provide feedback, and track your marketing progress.
          </p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-10">
          <div className="glass rounded-xl p-6 border border-border/50">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <span className="text-2xl font-bold text-foreground">0</span>
            </div>
            <p className="text-sm text-muted-foreground">Active Campaigns</p>
          </div>

          <div className="glass rounded-xl p-6 border border-border/50">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <span className="text-2xl font-bold text-foreground">0</span>
            </div>
            <p className="text-sm text-muted-foreground">Pending Review</p>
          </div>

          <div className="glass rounded-xl p-6 border border-border/50">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <span className="text-2xl font-bold text-foreground">0</span>
            </div>
            <p className="text-sm text-muted-foreground">Approved</p>
          </div>

          <div className="glass rounded-xl p-6 border border-border/50">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <span className="text-2xl font-bold text-foreground">0</span>
            </div>
            <p className="text-sm text-muted-foreground">Messages</p>
          </div>
        </div>

        {/* Empty State */}
        <div className="glass rounded-2xl p-12 border border-border/50 text-center">
          <div className="w-16 h-16 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center mx-auto mb-6">
            <FileText className="w-8 h-8 text-purple-600 dark:text-purple-400" />
          </div>
          <h2 className="text-xl font-semibold text-foreground mb-2">
            No campaigns yet
          </h2>
          <p className="text-muted-foreground max-w-md mx-auto mb-6">
            When your marketing team shares campaigns with you, they'll appear here for you to review and approve.
          </p>
          <p className="text-sm text-muted-foreground">
            Need help? Contact your marketing team or reach out to support.
          </p>
        </div>
      </main>
    </div>
  );
};

export default ClientDashboard;