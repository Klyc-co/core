import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AppHeader from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Plus, Package, Layers } from "lucide-react";
import type { User } from "@supabase/supabase-js";

const Products = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);

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
      
      <main className="max-w-5xl mx-auto px-6 py-12">
        <div className="flex items-center gap-4 mb-8">
          <Button 
            variant="ghost" 
            onClick={() => navigate("/profile")}
            className="text-primary hover:text-primary/80"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <h1 className="text-3xl font-bold text-foreground">Products</h1>
        </div>

        <div className="flex gap-4 mb-8">
          <Button 
            onClick={() => navigate("/profile/products/create")}
            className="gap-2 bg-gradient-to-r from-primary to-pink-500 hover:opacity-90"
          >
            <Plus className="w-4 h-4" />
            Create Product
          </Button>
          <Button 
            onClick={() => navigate("/profile/products/create-line")}
            variant="outline"
            className="gap-2"
          >
            <Plus className="w-4 h-4" />
            Create Product Line
          </Button>
        </div>

        {/* Products List */}
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
              <Package className="w-5 h-5" />
              Your Products
            </h2>
            <Card className="border-dashed">
              <CardContent className="p-8 text-center text-muted-foreground">
                No products yet. Click "Create Product" to add your first product.
              </CardContent>
            </Card>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
              <Layers className="w-5 h-5" />
              Your Product Lines
            </h2>
            <Card className="border-dashed">
              <CardContent className="p-8 text-center text-muted-foreground">
                No product lines yet. Click "Create Product Line" to add your first product line.
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Products;
