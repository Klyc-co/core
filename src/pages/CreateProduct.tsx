import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AppHeader from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
 import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { User } from "@supabase/supabase-js";
 import ProductAssetPicker, { SelectedAsset } from "@/components/ProductAssetPicker";
import { uploadBrandAssetImage } from "@/lib/brandAssetStorage";
import { syncProductImagesToLibrary } from "@/lib/productAssetLibrarySync";

interface ProductLine {
  id: string;
  name: string;
}

const CreateProduct = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [saving, setSaving] = useState(false);
  const [productLines, setProductLines] = useState<ProductLine[]>([]);
  
  const [productType, setProductType] = useState("");
  const [productName, setProductName] = useState("");
  const [shortDescription, setShortDescription] = useState("");
  const [valuePropositions, setValuePropositions] = useState("");
  const [targetAudience, setTargetAudience] = useState("");
  const [productLineId, setProductLineId] = useState("");
   const [selectedAssets, setSelectedAssets] = useState<SelectedAsset[]>([]);

  useEffect(() => {
    const loadData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate("/auth");
        return;
      }
      
      setUser(user);

      // Load existing product lines
      const { data: lines } = await supabase
        .from("product_lines")
        .select("id, name")
        .eq("user_id", user.id)
        .order("name");

      if (lines) {
        setProductLines(lines);
      }
    };

    loadData();
  }, [navigate]);

  const handleSubmit = async () => {
    if (!user) {
      toast.error("You must be logged in");
      return;
    }

    if (!productType || !productName) {
      toast.error("Please fill in required fields (Product Type and Name)");
      return;
    }

    setSaving(true);

    const { data: productData, error } = await supabase
      .from("products")
      .insert({
        user_id: user.id,
        product_type: productType,
        name: productName,
        short_description: shortDescription || null,
        value_propositions: valuePropositions || null,
        target_audience: targetAudience || null,
        product_line_id: productLineId && productLineId !== "none" ? productLineId : null
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating product:", error);
      toast.error("Failed to create product");
      setSaving(false);
      return;
    }

    // Save product assets
    if (selectedAssets.length > 0 && productData) {
      // Ensure device uploads are persisted in backend storage (blob: URLs are not durable)
      const persistedAssets: SelectedAsset[] = [];
      for (const asset of selectedAssets) {
        if (asset.source === "upload" && asset.file) {
          try {
            const { publicUrl } = await uploadBrandAssetImage({
              userId: user.id,
              file: asset.file,
              folder: `products/${productData.id}`,
            });
            persistedAssets.push({
              ...asset,
              url: publicUrl,
              thumbnailUrl: asset.thumbnailUrl || publicUrl,
            });
          } catch (uploadErr) {
            console.error("Failed to upload product asset:", uploadErr);
            // Keep the existing URL so the user can see what failed; DB insert will likely be useless for blob URLs
            persistedAssets.push(asset);
          }
        } else {
          persistedAssets.push(asset);
        }
      }

      const assetsToInsert = persistedAssets.map(asset => ({
        product_id: productData.id,
        user_id: user.id,
        asset_name: asset.name,
        asset_url: asset.url,
        asset_type: 'image',
        source: asset.source,
        thumbnail_url: asset.thumbnailUrl || null,
      }));

      const { error: assetsError } = await supabase
        .from("product_assets")
        .insert(assetsToInsert);

      if (assetsError) {
        console.error("Error saving product assets:", assetsError);
        // Continue anyway - product was created
      }

      // Also save to brand_assets for the Library (deduped)
      try {
        await syncProductImagesToLibrary({
          userId: user.id,
          productId: productData.id,
          productName,
          assets: persistedAssets.map((a) => ({ name: a.name, url: a.url, source: a.source })),
        });
      } catch (e) {
        console.error("Failed to sync product images to Assets:", e);
        toast.error("Product saved, but failed to save image into Assets");
      }
    }

    setSaving(false);
    toast.success("Product created successfully!");
    navigate("/profile/library");
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
          <h1 className="text-3xl font-bold text-foreground">Create Product</h1>
        </div>

        <Card>
          <CardContent className="p-6 space-y-6">
            <div className="space-y-2">
              <Label>What type of product is this? *</Label>
              <Select value={productType} onValueChange={setProductType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select product type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="physical">Physical Product</SelectItem>
                  <SelectItem value="digital">Digital Product</SelectItem>
                  <SelectItem value="service">Service</SelectItem>
                  <SelectItem value="content">Content</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Product Name *</Label>
              <Input 
                placeholder="Enter product name" 
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Short Description</Label>
              <Textarea 
                placeholder="Describe your product briefly..."
                value={shortDescription}
                onChange={(e) => setShortDescription(e.target.value)}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Value Propositions</Label>
              <Textarea 
                placeholder="List the key value propositions of your product..."
                value={valuePropositions}
                onChange={(e) => setValuePropositions(e.target.value)}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Target Audience (Keywords/Personas)</Label>
              <Input 
                placeholder="e.g., young professionals, eco-conscious, budget-conscious..."
                value={targetAudience}
                onChange={(e) => setTargetAudience(e.target.value)}
              />
            </div>

             <Separator />
 
             <ProductAssetPicker
               selectedAssets={selectedAssets}
               onAssetsChange={setSelectedAssets}
               maxAssets={20}
             />

            <Separator />

            <div className="space-y-2">
              <Label>Add to existing product line</Label>
              <Select value={productLineId} onValueChange={setProductLineId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a product line..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {productLines.map((line) => (
                    <SelectItem key={line.id} value={line.id}>
                      {line.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                  "Create Product"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default CreateProduct;
