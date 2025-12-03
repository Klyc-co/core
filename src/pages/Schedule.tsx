import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AppHeader from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { ArrowLeft, CalendarDays } from "lucide-react";
import type { User } from "@supabase/supabase-js";

const Schedule = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [date, setDate] = useState<Date | undefined>(new Date());

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        navigate("/auth");
      } else {
        setUser(user);
      }
    });
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background">
      <AppHeader user={user} />
      
      <main className="max-w-6xl mx-auto px-6 py-12">
        <div className="flex items-center gap-4 mb-2">
          <Button 
            variant="ghost" 
            onClick={() => navigate("/campaigns")}
            className="text-primary hover:text-primary/80"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Campaigns
          </Button>
        </div>
        
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Scheduled Campaigns</h1>
          <p className="text-muted-foreground">View and manage all your scheduled campaigns</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Scheduled Campaigns List */}
          <div className="lg:col-span-2">
            <Card>
              <CardContent className="p-6">
                <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
                  <CalendarDays className="w-5 h-5" />
                  All Scheduled Campaigns
                </h2>
                <Card className="border-dashed">
                  <CardContent className="p-8 text-center text-muted-foreground">
                    No scheduled campaigns yet. Create a campaign and schedule it to see it here.
                  </CardContent>
                </Card>
              </CardContent>
            </Card>
          </div>

          {/* Calendar */}
          <div className="lg:col-span-1">
            <Card>
              <CardContent className="p-6">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  className="rounded-md pointer-events-auto"
                />
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Schedule;
