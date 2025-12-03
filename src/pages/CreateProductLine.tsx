import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AppHeader from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft } from "lucide-react";
import type { User } from "@supabase/supabase-js";

const CreateProductLine = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [productLineName, setProductLineName] = useState("");
  const [shortDescription, setShortDescription] = useState("");
  const [valuePropositions, setValuePropositions] = useState("");
  const [targetAudience, setTargetAudience] = useState("");
  const [types, setTypes] = useState({
    physical: false,
    content: false,
    service: false,
  });

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        navigate("/auth");
      } else {
        setUser(user);
      }
    });
  }, [navigate]);

  const handleTypeChange = (type: keyof typeof types) => {
    setTypes(prev => ({ ...prev, [type]: !prev[type] }));
  };

  const handleSubmit = () => {
    // TODO: Save product line to database
    navigate("/profile/products");
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader user={user} />
      
      <main className="max-w-3xl mx-auto px-6 py-12">
        <div className="flex items-center gap-4 mb-8">
          <Button 
            variant="ghost" 
            onClick={() => navigate("/profile/products")}
            className="text-primary hover:text-primary/80"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <h1 className="text-3xl font-bold text-foreground">Create Product Line</h1>
        </div>

        <Card>
          <CardContent className="p-6 space-y-6">
            <div className="space-y-2">
              <Label>Product Line Name</Label>
              <Input 
                placeholder="Enter product line name" 
                value={productLineName}
                onChange={(e) => setProductLineName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Short Description</Label>
              <Textarea 
                placeholder="Describe your product line briefly..."
                value={shortDescription}
                onChange={(e) => setShortDescription(e.target.value)}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Value Propositions</Label>
              <Textarea 
                placeholder="List the key value propositions of your product line..."
                value={valuePropositions}
                onChange={(e) => setValuePropositions(e.target.value)}
                rows={3}
              />
            </div>

            <div className="space-y-3">
              <Label>What type of product line is this?</Label>
              <div className="space-y-3">
                <div 
                  className="flex items-center gap-3 p-4 border border-border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => handleTypeChange("physical")}
                >
                  <Checkbox 
                    checked={types.physical} 
                    onCheckedChange={() => handleTypeChange("physical")}
                  />
                  <span className="text-foreground">Physical Product</span>
                </div>
                <div 
                  className="flex items-center gap-3 p-4 border border-border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => handleTypeChange("content")}
                >
                  <Checkbox 
                    checked={types.content} 
                    onCheckedChange={() => handleTypeChange("content")}
                  />
                  <span className="text-foreground">Content</span>
                </div>
                <div 
                  className="flex items-center gap-3 p-4 border border-border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => handleTypeChange("service")}
                >
                  <Checkbox 
                    checked={types.service} 
                    onCheckedChange={() => handleTypeChange("service")}
                  />
                  <span className="text-foreground">Service</span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Target Audience (Keywords/Personas)</Label>
              <Input 
                placeholder="e.g., young professionals, eco-conscious, budget-conscious..."
                value={targetAudience}
                onChange={(e) => setTargetAudience(e.target.value)}
              />
            </div>

            <div className="flex gap-4 pt-4">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => navigate("/profile/products")}
              >
                Cancel
              </Button>
              <Button 
                className="flex-1 bg-gradient-to-r from-primary to-pink-500 hover:opacity-90"
                onClick={handleSubmit}
              >
                Create Product Line
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default CreateProductLine;
