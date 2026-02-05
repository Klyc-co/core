 import { useState, useEffect } from "react";
 import { Button } from "@/components/ui/button";
 import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
 import { Upload, FolderOpen, Loader2, ImageIcon } from "lucide-react";
 import GoogleDriveIcon from "@/components/icons/GoogleDriveIcon";
 import GoogleDriveFilePicker from "@/components/GoogleDriveFilePicker";
 import { supabase } from "@/integrations/supabase/client";
 import { toast } from "sonner";
 
 interface LibraryAsset {
   id: string;
   name: string;
   url: string;
   type: string;
 }
 
 interface ImageSourceSelectorProps {
   onImageSelect: (url: string, name: string) => void;
 }
 
 export default function ImageSourceSelector({ onImageSelect }: ImageSourceSelectorProps) {
   const [showGoogleDrivePicker, setShowGoogleDrivePicker] = useState(false);
   const [showLibraryPicker, setShowLibraryPicker] = useState(false);
   const [libraryAssets, setLibraryAssets] = useState<LibraryAsset[]>([]);
   const [isLoadingLibrary, setIsLoadingLibrary] = useState(false);
 
   const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
     const file = e.target.files?.[0];
     if (!file) return;
 
     if (!file.type.startsWith("image/")) {
       toast.error("Please select an image file");
       return;
     }
 
     // Get user and upload to storage
     const { data: { user } } = await supabase.auth.getUser();
     if (!user) {
       toast.error("Please sign in first");
       return;
     }
 
     // Read file as data URL for immediate use
     const reader = new FileReader();
     reader.onload = async (event) => {
       const dataUrl = event.target?.result as string;
       onImageSelect(dataUrl, file.name);
 
       // Also save to library in background
       try {
         const { uploadBrandAssetImage } = await import("@/lib/brandAssetStorage");
         const { publicUrl } = await uploadBrandAssetImage({
           userId: user.id,
           file,
           folder: "editor-uploads",
         });
 
         await supabase.from("brand_assets").insert({
           user_id: user.id,
           asset_type: "image",
           name: file.name,
           value: publicUrl,
           metadata: { source: "image-editor-upload" },
         });
 
         toast.success("Image saved to library");
       } catch (error) {
         console.error("Failed to save to library:", error);
       }
     };
     reader.readAsDataURL(file);
     e.target.value = "";
   };
 
   const handleGoogleDriveSelect = (files: Array<{ id: string; name: string; path: string; thumbnailUrl?: string }>) => {
     if (files.length > 0 && files[0].thumbnailUrl) {
       onImageSelect(files[0].thumbnailUrl, files[0].name);
     }
     setShowGoogleDrivePicker(false);
   };
 
   const loadLibraryAssets = async () => {
     setIsLoadingLibrary(true);
     try {
       const { data: brandAssets, error: brandError } = await supabase
         .from("brand_assets")
         .select("id, name, value, asset_type")
         .eq("asset_type", "image");
 
       if (brandError) throw brandError;
 
       const { data: dropboxAssets, error: dropboxError } = await supabase
         .from("dropbox_assets")
         .select("id, asset_name, thumbnail_url, asset_type")
         .eq("asset_type", "image");
 
       if (dropboxError) throw dropboxError;
 
       const { data: driveAssets, error: driveError } = await supabase
         .from("google_drive_assets")
         .select("id, asset_name, drive_url, asset_type")
         .eq("asset_type", "image");
 
       if (driveError) throw driveError;
 
       const assets: LibraryAsset[] = [
         ...(brandAssets || []).map((a) => ({
           id: a.id,
           name: a.name || "Unnamed",
           url: a.value,
           type: "brand",
         })),
         ...(dropboxAssets || [])
           .filter((a) => a.thumbnail_url)
           .map((a) => ({
             id: a.id,
             name: a.asset_name,
             url: a.thumbnail_url!,
             type: "dropbox",
           })),
         ...(driveAssets || [])
           .filter((a) => a.drive_url)
           .map((a) => ({
             id: a.id,
             name: a.asset_name,
             url: a.drive_url!,
             type: "drive",
           })),
       ];
 
       setLibraryAssets(assets);
     } catch (error) {
       console.error("Error loading library:", error);
       toast.error("Failed to load library");
     } finally {
       setIsLoadingLibrary(false);
     }
   };
 
   const handleOpenLibrary = () => {
     setShowLibraryPicker(true);
     loadLibraryAssets();
   };
 
   const handleLibrarySelect = (asset: LibraryAsset) => {
     onImageSelect(asset.url, asset.name);
     setShowLibraryPicker(false);
   };
 
   return (
     <>
       <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
         {/* Upload from device */}
         <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary/50 hover:bg-muted/50 transition-all">
           <Upload className="w-8 h-8 text-muted-foreground mb-2" />
           <span className="text-sm font-medium text-foreground">Upload Image</span>
           <span className="text-xs text-muted-foreground">From your device</span>
           <input
             type="file"
             accept="image/*"
             onChange={handleFileUpload}
             className="hidden"
           />
         </label>
 
         {/* Google Drive */}
         <button
           onClick={() => setShowGoogleDrivePicker(true)}
           className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary/50 hover:bg-muted/50 transition-all"
         >
           <GoogleDriveIcon className="w-8 h-8 mb-2" />
           <span className="text-sm font-medium text-foreground">Google Drive</span>
           <span className="text-xs text-muted-foreground">Select from Drive</span>
         </button>
 
         {/* Klyc Library */}
         <button
           onClick={handleOpenLibrary}
           className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary/50 hover:bg-muted/50 transition-all"
         >
           <FolderOpen className="w-8 h-8 text-primary mb-2" />
           <span className="text-sm font-medium text-foreground">Klyc Library</span>
           <span className="text-xs text-muted-foreground">Your saved assets</span>
         </button>
       </div>
 
       {/* Google Drive Picker */}
       <GoogleDriveFilePicker
         open={showGoogleDrivePicker}
         onOpenChange={setShowGoogleDrivePicker}
         fileTypeFilter="image"
         selectionMode="select"
         onFilesSelected={handleGoogleDriveSelect}
       />
 
       {/* Library Picker Dialog */}
       <Dialog open={showLibraryPicker} onOpenChange={setShowLibraryPicker}>
         <DialogContent className="max-w-2xl h-[70vh] !grid-rows-[auto_1fr] p-0">
           <div className="p-6 pb-0">
             <DialogHeader>
               <DialogTitle className="flex items-center gap-2">
                 <FolderOpen className="w-5 h-5 text-primary" />
                 Select from Klyc Library
               </DialogTitle>
               <DialogDescription>
                 Choose an image to edit
               </DialogDescription>
             </DialogHeader>
           </div>
 
           <div className="overflow-y-auto border-t mx-6 mt-4 pt-4">
             {isLoadingLibrary ? (
               <div className="flex items-center justify-center py-12">
                 <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
               </div>
             ) : libraryAssets.length === 0 ? (
               <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                 <ImageIcon className="w-12 h-12 mb-3 opacity-50" />
                 <p className="text-sm font-medium">No images in library</p>
                 <p className="text-xs">Import images from your integrations first</p>
               </div>
             ) : (
               <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 pb-6">
                 {libraryAssets.map((asset) => (
                   <button
                     key={asset.id}
                     onClick={() => handleLibrarySelect(asset)}
                     className="group relative aspect-square rounded-lg overflow-hidden border border-border hover:border-primary transition-all"
                   >
                     <img
                       src={asset.url}
                       alt={asset.name}
                       className="w-full h-full object-cover"
                     />
                     <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                       <span className="text-white text-xs font-medium px-2 text-center line-clamp-2">
                         {asset.name}
                       </span>
                     </div>
                   </button>
                 ))}
               </div>
             )}
           </div>
         </DialogContent>
       </Dialog>
     </>
   );
 }