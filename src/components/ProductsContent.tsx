import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Package, Layers, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useClientContext } from "@/contexts/ClientContext";

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

const ProductsContent = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [productLines, setProductLines] = useState<ProductLine[]>([]);
  const { getEffectiveUserId, selectedClientId } = useClientContext();

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

  // Reload data when client changes
  useEffect(() => {
    const effectiveUserId = getEffectiveUserId();
    if (effectiveUserId) {
      setLoading(true);
      loadData(effectiveUserId);
    }
  }, [selectedClientId, getEffectiveUserId]);

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
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-3 sm:gap-4">
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
          <h2 className="text-lg sm:text-xl font-semibold text-foreground mb-3 sm:mb-4 flex items-center gap-2">
            <Package className="w-5 h-5" />
            Your Products
          </h2>
          {products.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="p-6 sm:p-8 text-center text-muted-foreground text-sm sm:text-base">
                No products yet. Click "Create Product" to add your first product.
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3 sm:gap-4">
              {products.map((product) => (
                <Card key={product.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-3 sm:p-4 flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                        <h3 className="font-semibold text-foreground text-sm sm:text-base truncate">{product.name}</h3>
                        <span className="text-xs px-2 py-1 bg-primary/10 text-primary rounded-full flex-shrink-0">
                          {getProductTypeLabel(product.product_type)}
                        </span>
                      </div>
                      {product.short_description && (
                        <p className="text-xs sm:text-sm text-muted-foreground mt-1 line-clamp-1">
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
                      className="text-destructive hover:text-destructive hover:bg-destructive/10 flex-shrink-0"
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
          <h2 className="text-lg sm:text-xl font-semibold text-foreground mb-3 sm:mb-4 flex items-center gap-2">
            <Layers className="w-5 h-5" />
            Your Product Lines
          </h2>
          {productLines.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="p-6 sm:p-8 text-center text-muted-foreground text-sm sm:text-base">
                No product lines yet. Click "Create Product Line" to add your first product line.
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3 sm:gap-4">
              {productLines.map((line) => (
                <Card key={line.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-3 sm:p-4 flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-foreground text-sm sm:text-base truncate">{line.name}</h3>
                      {line.description && (
                        <p className="text-xs sm:text-sm text-muted-foreground mt-1 line-clamp-1">
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
                      className="text-destructive hover:text-destructive hover:bg-destructive/10 flex-shrink-0"
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
    </div>
  );
};

export default ProductsContent;
