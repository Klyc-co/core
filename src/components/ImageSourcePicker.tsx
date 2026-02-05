 import { useState } from "react";
 import { Button } from "@/components/ui/button";
 import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Upload, FolderOpen, X, Loader2, ImageIcon, Plus } from "lucide-react";
 import GoogleDriveIcon from "@/components/icons/GoogleDriveIcon";
 import GoogleDriveFilePicker from "@/components/GoogleDriveFilePicker";
 import { supabase } from "@/integrations/supabase/client";
 import { useToast } from "@/hooks/use-toast";
 
interface SelectedImage {
  url: string;
  name: string;
}

 interface ImageSourcePickerProps {
  onImagesChange: (images: SelectedImage[]) => void;
  images: SelectedImage[];
  maxImages?: number;
   label?: string;
   description?: string;
 }
 
 interface LibraryAsset {
   id: string;
   name: string;
   url: string;
   type: string;
 }
 
 const ImageSourcePicker = ({
  onImagesChange,
  images,
  maxImages = 10,
  label = "Reference Images",
  description = "Add up to 10 images from your device, Google Drive, or Klyc library"
 }: ImageSourcePickerProps) => {
   const { toast } = useToast();
   const [showGoogleDrivePicker, setShowGoogleDrivePicker] = useState(false);
   const [showLibraryPicker, setShowLibraryPicker] = useState(false);
   const [libraryAssets, setLibraryAssets] = useState<LibraryAsset[]>([]);
   const [isLoadingLibrary, setIsLoadingLibrary] = useState(false);
 
  const canAddMore = images.length < maxImages;

  const addImage = (url: string, name: string) => {
    if (images.length >= maxImages) {
      toast({
        title: "Maximum images reached",
        description: `You can only add up to ${maxImages} images`,
        variant: "destructive",
      });
      return;
    }
    onImagesChange([...images, { url, name }]);
  };

  const removeImage = (index: number) => {
    const newImages = images.filter((_, i) => i !== index);
    onImagesChange(newImages);
  };

   const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
 
    const remainingSlots = maxImages - images.length;
    const filesToProcess = files.slice(0, remainingSlots);
 
    filesToProcess.forEach(file => {
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Invalid file type",
          description: `${file.name} is not an image file`,
          variant: "destructive",
        });
        return;
      }
 
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: `${file.name} is larger than 5MB`,
          variant: "destructive",
        });
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        addImage(base64, file.name);
      };
      reader.readAsDataURL(file);
    });

    // Reset the input so the same file can be selected again
    e.target.value = '';
   };
 
   const handleGoogleDriveSelect = async (files: Array<{ id: string; name: string; path: string; thumbnailUrl?: string }>) => {
     if (files.length === 0) return;
     
    let addedCount = 0;
    files.forEach(file => {
      if (file.thumbnailUrl && images.length + addedCount < maxImages) {
        addImage(file.thumbnailUrl, file.name);
        addedCount++;
      }
    });
    
    if (addedCount > 0) {
      toast({
        title: "Images selected",
        description: `Added ${addedCount} image${addedCount > 1 ? 's' : ''} from Google Drive`,
      });
    }
     setShowGoogleDrivePicker(false);
   };
 
   const loadLibraryAssets = async () => {
     setIsLoadingLibrary(true);
     try {
       // Fetch from brand_assets table (images only)
       const { data: brandAssets, error: brandError } = await supabase
         .from("brand_assets")
         .select("id, name, value, asset_type")
         .eq("asset_type", "image");
 
       if (brandError) throw brandError;
 
       // Fetch from dropbox_assets table (images only)
       const { data: dropboxAssets, error: dropboxError } = await supabase
         .from("dropbox_assets")
         .select("id, asset_name, thumbnail_url, asset_type")
         .eq("asset_type", "image");
 
       if (dropboxError) throw dropboxError;
 
       // Fetch from google_drive_assets table (images only)
       const { data: driveAssets, error: driveError } = await supabase
         .from("google_drive_assets")
         .select("id, asset_name, drive_url, asset_type")
         .eq("asset_type", "image");
 
       if (driveError) throw driveError;
 
       const assets: LibraryAsset[] = [
         ...(brandAssets || []).map(a => ({
           id: a.id,
           name: a.name || "Unnamed",
           url: a.value,
           type: "brand"
         })),
         ...(dropboxAssets || []).filter(a => a.thumbnail_url).map(a => ({
           id: a.id,
           name: a.asset_name,
           url: a.thumbnail_url!,
           type: "dropbox"
         })),
         ...(driveAssets || []).filter(a => a.drive_url).map(a => ({
           id: a.id,
           name: a.asset_name,
           url: a.drive_url!,
           type: "drive"
         })),
       ];
 
       setLibraryAssets(assets);
     } catch (error) {
       console.error("Error loading library assets:", error);
       toast({
         title: "Failed to load library",
         description: "Could not load your saved images",
         variant: "destructive",
       });
     } finally {
       setIsLoadingLibrary(false);
     }
   };
 
   const handleOpenLibrary = () => {
     setShowLibraryPicker(true);
     loadLibraryAssets();
   };
 
   const handleLibrarySelect = (asset: LibraryAsset) => {
    addImage(asset.url, asset.name);
     setShowLibraryPicker(false);
     toast({
       title: "Image selected",
       description: `Selected "${asset.name}" from your library`,
     });
   };
 
   return (
     <div className="space-y-3">
       <div>
         <p className="text-sm font-medium text-foreground mb-1">{label}</p>
        <p className="text-xs text-muted-foreground mb-3">
          {description} ({images.length}/{maxImages})
        </p>
       </div>
 
      {/* Selected Images Grid */}
      {images.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {images.map((image, index) => (
            <div key={index} className="relative group">
              <img 
                src={image.url} 
                alt={image.name} 
                className="w-20 h-20 object-cover rounded-lg border border-border"
              />
              <button
                onClick={() => removeImage(index)}
                className="absolute -top-2 -right-2 p-1 bg-destructive text-destructive-foreground rounded-full hover:opacity-80 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
         </div>
       )}
 
      {/* Add More Images Options */}
      {canAddMore && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Upload from device */}
          <label className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary/50 hover:bg-muted/50 transition-all">
            <Upload className="w-6 h-6 text-muted-foreground mb-2" />
            <span className="text-sm font-medium text-foreground">Upload</span>
            <span className="text-xs text-muted-foreground">From device</span>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>

          {/* Google Drive */}
          <button
            onClick={() => setShowGoogleDrivePicker(true)}
            className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary/50 hover:bg-muted/50 transition-all"
          >
            <GoogleDriveIcon className="w-6 h-6 mb-2" />
            <span className="text-sm font-medium text-foreground">Google Drive</span>
            <span className="text-xs text-muted-foreground">Select files</span>
          </button>

          {/* Klyc Library */}
          <button
            onClick={handleOpenLibrary}
            className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary/50 hover:bg-muted/50 transition-all"
          >
            <FolderOpen className="w-6 h-6 text-primary mb-2" />
            <span className="text-sm font-medium text-foreground">Klyc Library</span>
            <span className="text-xs text-muted-foreground">Your assets</span>
          </button>
        </div>
      )}

       {/* Google Drive Picker Dialog */}
       <GoogleDriveFilePicker
         open={showGoogleDrivePicker}
         onOpenChange={setShowGoogleDrivePicker}
         fileTypeFilter="image"
        selectionMode="select"
        onFilesSelected={handleGoogleDriveSelect}
       />
 
       {/* Klyc Library Picker Dialog */}
       <Dialog open={showLibraryPicker} onOpenChange={setShowLibraryPicker}>
         <DialogContent className="max-w-2xl h-[70vh] !grid-rows-[auto_1fr] p-0">
           <div className="p-6 pb-0">
             <DialogHeader>
               <DialogTitle className="flex items-center gap-2">
                 <FolderOpen className="w-5 h-5 text-primary" />
                 Select from Klyc Library
               </DialogTitle>
               <DialogDescription>
                 Choose an image from your saved assets
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
     </div>
   );
 };
 
 export default ImageSourcePicker;