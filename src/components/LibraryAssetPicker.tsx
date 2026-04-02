 import { useState, useEffect } from "react";
 import { supabase } from "@/integrations/supabase/client";
 import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
 import { Button } from "@/components/ui/button";
 import { Checkbox } from "@/components/ui/checkbox";
 import { Loader2, Image as ImageIcon, Check } from "lucide-react";
 import { toast } from "sonner";
 
 interface LibraryAsset {
   id: string;
   name: string | null;
   value: string;
   asset_type: string;
   created_at: string;
   metadata: Record<string, unknown> | null;
 }
 
 interface LibraryAssetPickerProps {
   open: boolean;
   onOpenChange: (open: boolean) => void;
   onAssetsSelected: (assets: Array<{ id: string; name: string; url: string; thumbnailUrl?: string }>) => void;
   maxSelection?: number;
   assetTypeFilter?: "image" | "video" | "all";
 }
 
 const LibraryAssetPicker = ({
   open,
   onOpenChange,
   onAssetsSelected,
   maxSelection = 10,
   assetTypeFilter = "image",
 }: LibraryAssetPickerProps) => {
   const [assets, setAssets] = useState<LibraryAsset[]>([]);
   const [loading, setLoading] = useState(false);
   const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
 
   useEffect(() => {
     if (open) {
       loadAssets();
       setSelectedIds(new Set());
     }
   }, [open]);
 
   const loadAssets = async () => {
     setLoading(true);
     try {
       const { data: { user } } = await supabase.auth.getUser();
       if (!user) return;
 
       let query = supabase
         .from("brand_assets")
         .select("*")
         .eq("user_id", user.id)
         .order("created_at", { ascending: false });
 
       if (assetTypeFilter !== "all") {
         query = query.eq("asset_type", assetTypeFilter);
       }
 
       const { data, error } = await query;
 
       if (error) throw error;
       setAssets((data as LibraryAsset[]) || []);
     } catch (err) {
       console.error("Failed to load library assets:", err);
       toast.error("Failed to load library assets");
     } finally {
       setLoading(false);
     }
   };
 
   const toggleSelection = (assetId: string) => {
     const newSelected = new Set(selectedIds);
     if (newSelected.has(assetId)) {
       newSelected.delete(assetId);
     } else if (newSelected.size < maxSelection) {
       newSelected.add(assetId);
     } else {
       toast.error(`Maximum ${maxSelection} assets can be selected`);
     }
     setSelectedIds(newSelected);
   };
 
   const handleConfirm = () => {
     const selected = assets
       .filter((a) => selectedIds.has(a.id))
       .map((a) => ({
         id: a.id,
         name: a.name || "Untitled Asset",
         url: a.value,
         thumbnailUrl: a.value,
       }));
 
     onAssetsSelected(selected);
     onOpenChange(false);
   };
 
   return (
     <Dialog open={open} onOpenChange={onOpenChange}>
       <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col overflow-hidden">
         <DialogHeader>
           <DialogTitle className="flex items-center gap-2">
             <ImageIcon className="w-5 h-5 text-primary" />
             Select from Klyc Library
           </DialogTitle>
           <DialogDescription>
             Choose assets from your library ({selectedIds.size}/{maxSelection} selected)
           </DialogDescription>
         </DialogHeader>
 
         <div className="flex-1 overflow-y-auto border rounded-lg p-4">
           {loading ? (
             <div className="flex items-center justify-center h-full">
               <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
             </div>
           ) : assets.length === 0 ? (
             <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
               <ImageIcon className="w-12 h-12 mb-3 opacity-50" />
               <p>No assets in your library yet</p>
               <p className="text-sm">Upload or import assets first</p>
             </div>
           ) : (
             <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
               {assets.map((asset) => {
                 const isSelected = selectedIds.has(asset.id);
                 return (
                   <div
                     key={asset.id}
                     className={`relative aspect-square rounded-lg overflow-hidden border-2 cursor-pointer transition-all ${
                       isSelected
                         ? "border-primary ring-2 ring-primary/30"
                         : "border-transparent hover:border-muted-foreground/30"
                     }`}
                     onClick={() => toggleSelection(asset.id)}
                   >
                     <img
                       src={asset.value}
                       alt={asset.name || "Asset"}
                       className="w-full h-full object-cover bg-muted"
                       onError={(e) => {
                         e.currentTarget.src = "/placeholder.svg";
                       }}
                     />
                     {isSelected && (
                       <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                         <Check className="w-4 h-4 text-primary-foreground" />
                       </div>
                     )}
                     <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-2 py-1 text-xs text-white truncate">
                       {asset.name || "Untitled"}
                     </div>
                   </div>
                 );
               })}
             </div>
           )}
         </div>
 
         <div className="flex justify-between items-center pt-4 border-t">
           <Button variant="outline" onClick={() => onOpenChange(false)}>
             Cancel
           </Button>
           <Button
             onClick={handleConfirm}
             disabled={selectedIds.size === 0}
             className="gap-2"
           >
             <Check className="w-4 h-4" />
             Select {selectedIds.size > 0 ? `(${selectedIds.size})` : ""}
           </Button>
         </div>
       </DialogContent>
     </Dialog>
   );
 };
 
 export default LibraryAssetPicker;