import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AppHeader from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Plus, Package, Layers, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { User } from "@supabase/supabase-js";

interface Product {
  id: string;
  name: string;
  product_type: string;
  short_description: string | null;
  created_at: string;
  product_line_id: string | null;
}

interface ProductLine {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
}

const Products = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [productLines, setProductLines] = useState<ProductLine[]>([]);

  const loadData = async (userId: string) => {
    const [productsResult, linesResult] = await Promise.all([
      supabase
        .from("products")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false }),
      supabase
        .from("product_lines")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
    ]);

    if (productsResult.data) {
      setProducts(productsResult.data);
    }
    if (linesResult.data) {
      setProductLines(linesResult.data);
    }
    setLoading(false);
  };

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        navigate("/auth");
      } else {
        setUser(user);
        loadData(user.id);
      }
    });
  }, [navigate]);

  const handleDeleteProduct = async (productId: string) => {
    const { error } = await supabase
      .from("products")
      .delete()
      .eq("id", productId);

    if (error) {
      toast.error("Failed to delete product");
    } else {
      toast.success("Product deleted");
      setProducts(products.filter(p => p.id !== productId));
    }
  };

  const handleDeleteProductLine = async (lineId: string) => {
    const { error } = await supabase
      .from("product_lines")
      .delete()
      .eq("id", lineId);

    if (error) {
      toast.error("Failed to delete product line");
    } else {
      toast.success("Product line deleted");
      setProductLines(productLines.filter(l => l.id !== lineId));
    }
  };

  const getProductTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      physical: "Physical Product",
      digital: "Digital Product",
      service: "Service",
      content: "Content"
    };
    return labels[type] || type;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader user={user} />
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

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
            {products.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="p-8 text-center text-muted-foreground">
                  No products yet. Click "Create Product" to add your first product.
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {products.map((product) => (
                  <Card key={product.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <h3 className="font-semibold text-foreground">{product.name}</h3>
                          <span className="text-xs px-2 py-1 bg-primary/10 text-primary rounded-full">
                            {getProductTypeLabel(product.product_type)}
                          </span>
                        </div>
                        {product.short_description && (
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                            {product.short_description}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground mt-2">
                          Created {new Date(product.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => handleDeleteProduct(product.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          <div>
            <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
              <Layers className="w-5 h-5" />
              Your Product Lines
            </h2>
            {productLines.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="p-8 text-center text-muted-foreground">
                  No product lines yet. Click "Create Product Line" to add your first product line.
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {productLines.map((line) => (
                  <Card key={line.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-foreground">{line.name}</h3>
                        {line.description && (
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                            {line.description}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground mt-2">
                          Created {new Date(line.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => handleDeleteProductLine(line.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Products;
