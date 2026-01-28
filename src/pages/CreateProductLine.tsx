import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AppHeader from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { User } from "@supabase/supabase-js";

const CreateProductLine = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [saving, setSaving] = useState(false);
  const [productLineName, setProductLineName] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        navigate("/auth");
      } else {
        setUser(user);
      }
    });
  }, [navigate]);

  const handleSubmit = async () => {
    if (!user) {
      toast.error("You must be logged in");
      return;
    }

    if (!productLineName) {
      toast.error("Please enter a product line name");
      return;
    }

    setSaving(true);

    const { error } = await supabase
      .from("product_lines")
      .insert({
        user_id: user.id,
        name: productLineName,
        description: description || null
      });

    setSaving(false);

    if (error) {
      console.error("Error creating product line:", error);
      toast.error("Failed to create product line");
    } else {
      toast.success("Product line created successfully!");
      navigate("/profile/products");
    }
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
              <Label>Product Line Name *</Label>
              <Input 
                placeholder="Enter product line name" 
                value={productLineName}
                onChange={(e) => setProductLineName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea 
                placeholder="Describe your product line briefly..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
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
                disabled={saving}
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Product Line"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default CreateProductLine;
