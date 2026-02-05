 import { useState, useRef, useCallback } from "react";
 import { Upload, FolderOpen, ChevronDown, X } from "lucide-react";
 import { Button } from "@/components/ui/button";
 import { Label } from "@/components/ui/label";
 import {
   DropdownMenu,
   DropdownMenuContent,
   DropdownMenuItem,
   DropdownMenuTrigger,
 } from "@/components/ui/dropdown-menu";
 import GoogleDriveIcon from "@/components/icons/GoogleDriveIcon";
 import DropboxIcon from "@/components/icons/DropboxIcon";
 import GoogleDriveFilePicker from "@/components/GoogleDriveFilePicker";
 import DropboxFilePicker from "@/components/DropboxFilePicker";
 import LibraryAssetPicker from "@/components/LibraryAssetPicker";
 
 export interface SelectedAsset {
   id: string;
   name: string;
   url: string;
   source: "upload" | "library" | "google-drive" | "dropbox";
   thumbnailUrl?: string;
  /** Present only for device uploads; used to upload to backend storage on save */
  file?: File;
 }
 
 interface ProductAssetPickerProps {
   selectedAssets: SelectedAsset[];
   onAssetsChange: (assets: SelectedAsset[]) => void;
   maxAssets?: number;
 }
 
 const ProductAssetPicker = ({ 
   selectedAssets, 
   onAssetsChange, 
   maxAssets = 20 
 }: ProductAssetPickerProps) => {
   const fileInputRef = useRef<HTMLInputElement>(null);
   const [isDragging, setIsDragging] = useState(false);
   const [showGoogleDrivePicker, setShowGoogleDrivePicker] = useState(false);
   const [showDropboxPicker, setShowDropboxPicker] = useState(false);
   const [showLibraryPicker, setShowLibraryPicker] = useState(false);
 
   const handleDragOver = useCallback((e: React.DragEvent) => {
     e.preventDefault();
     e.stopPropagation();
     setIsDragging(true);
   }, []);
 
   const handleDragLeave = useCallback((e: React.DragEvent) => {
     e.preventDefault();
     e.stopPropagation();
     setIsDragging(false);
   }, []);
 
   const handleDrop = useCallback((e: React.DragEvent) => {
     e.preventDefault();
     e.stopPropagation();
     setIsDragging(false);
 
     const files = Array.from(e.dataTransfer.files);
     handleFiles(files);
   }, [selectedAssets, maxAssets]);
 
   const handleFiles = (files: File[]) => {
     const remainingSlots = maxAssets - selectedAssets.length;
     const filesToProcess = files.slice(0, remainingSlots);
 
    const newAssets: SelectedAsset[] = filesToProcess.map((file) => ({
       id: `upload-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
       name: file.name,
       url: URL.createObjectURL(file),
       source: "upload" as const,
      file,
     }));
 
     onAssetsChange([...selectedAssets, ...newAssets]);
   };
 
   const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
     if (e.target.files) {
       handleFiles(Array.from(e.target.files));
     }
   };
 
   const handleRemoveAsset = (assetId: string) => {
     onAssetsChange(selectedAssets.filter((a) => a.id !== assetId));
   };
 
   const handleGoogleDriveSelect = (files: Array<{ id: string; name: string; path: string; thumbnailUrl?: string }>) => {
     const remainingSlots = maxAssets - selectedAssets.length;
     const filesToAdd = files.slice(0, remainingSlots);
 
     const newAssets: SelectedAsset[] = filesToAdd.map((file) => ({
       id: `gdrive-${file.id}`,
       name: file.name,
       url: file.path,
       source: "google-drive" as const,
       thumbnailUrl: file.thumbnailUrl,
     }));
 
     onAssetsChange([...selectedAssets, ...newAssets]);
   };
 
   const handleLibrarySelect = (assets: Array<{ id: string; name: string; url: string; thumbnailUrl?: string }>) => {
     const remainingSlots = maxAssets - selectedAssets.length;
     const assetsToAdd = assets.slice(0, remainingSlots);
 
     const newAssets: SelectedAsset[] = assetsToAdd.map((asset) => ({
       id: `library-${asset.id}`,
       name: asset.name,
       url: asset.url,
       source: "library" as const,
       thumbnailUrl: asset.thumbnailUrl,
     }));
 
     onAssetsChange([...selectedAssets, ...newAssets]);
   };
 
   return (
     <div className="space-y-4">
       <div>
         <Label>Upload Assets</Label>
         <p className="text-sm text-muted-foreground mb-3">
           Photos, videos, audio, PDFs/specs, testimonials ({selectedAssets.length}/{maxAssets})
         </p>
       </div>
 
       {/* 3-Card Grid */}
       <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
         {/* Upload Card */}
         <div
           className={`border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer hover:border-primary/50 hover:bg-muted/30 ${
             isDragging ? "border-primary bg-primary/5" : "border-border"
           }`}
           onDragOver={handleDragOver}
           onDragLeave={handleDragLeave}
           onDrop={handleDrop}
           onClick={() => fileInputRef.current?.click()}
         >
           <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
           <p className="font-medium text-foreground">Upload</p>
           <p className="text-sm text-muted-foreground">From device</p>
           <input
             ref={fileInputRef}
             type="file"
             multiple
             className="hidden"
             onChange={handleFileInputChange}
             accept="image/*,video/*,audio/*,.pdf,.doc,.docx"
           />
         </div>
 
         {/* External Sources Dropdown Card */}
         <DropdownMenu>
           <DropdownMenuTrigger asChild>
             <div className="border-2 border-dashed border-border rounded-xl p-6 text-center transition-all cursor-pointer hover:border-primary/50 hover:bg-muted/30">
               <div className="flex justify-center gap-1 mb-2">
                 <GoogleDriveIcon className="w-6 h-6" />
                 <DropboxIcon className="w-6 h-6" />
               </div>
               <div className="flex items-center justify-center gap-1">
                 <p className="font-medium text-foreground">External Sources</p>
                 <ChevronDown className="w-4 h-4 text-muted-foreground" />
               </div>
               <p className="text-sm text-muted-foreground">Connected services</p>
             </div>
           </DropdownMenuTrigger>
           <DropdownMenuContent align="center" className="w-56">
             <DropdownMenuItem onClick={() => setShowGoogleDrivePicker(true)} className="gap-3 py-3">
               <GoogleDriveIcon className="w-5 h-5" />
               <div>
                 <p className="font-medium">Google Drive</p>
                 <p className="text-xs text-muted-foreground">Select files</p>
               </div>
             </DropdownMenuItem>
             <DropdownMenuItem onClick={() => setShowDropboxPicker(true)} className="gap-3 py-3">
               <DropboxIcon className="w-5 h-5" />
               <div>
                 <p className="font-medium">Dropbox</p>
                 <p className="text-xs text-muted-foreground">Select files</p>
               </div>
             </DropdownMenuItem>
           </DropdownMenuContent>
         </DropdownMenu>
 
         {/* Klyc Library Card */}
         <div
           className="border-2 border-dashed border-border rounded-xl p-6 text-center transition-all cursor-pointer hover:border-primary/50 hover:bg-muted/30"
           onClick={() => setShowLibraryPicker(true)}
         >
           <FolderOpen className="w-8 h-8 mx-auto mb-2 text-primary" />
           <p className="font-medium text-foreground">Klyc Library</p>
           <p className="text-sm text-muted-foreground">Your assets</p>
         </div>
       </div>
 
       {/* Selected Assets Preview */}
       {selectedAssets.length > 0 && (
         <div className="space-y-2">
           <Label>Selected Assets</Label>
           <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
             {selectedAssets.map((asset) => (
               <div
                 key={asset.id}
                 className="relative group aspect-square rounded-lg overflow-hidden border bg-muted"
               >
                 {asset.thumbnailUrl || asset.url ? (
                   <img
                     src={asset.thumbnailUrl || asset.url}
                     alt={asset.name}
                     className="w-full h-full object-cover"
                     onError={(e) => {
                       e.currentTarget.style.display = "none";
                     }}
                   />
                 ) : (
                   <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground p-2 text-center">
                     {asset.name}
                   </div>
                 )}
                 <Button
                   variant="destructive"
                   size="icon"
                   className="absolute top-1 right-1 w-6 h-6 opacity-0 group-hover:opacity-100 transition-opacity"
                   onClick={() => handleRemoveAsset(asset.id)}
                 >
                   <X className="w-3 h-3" />
                 </Button>
                 <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-1.5 py-0.5 text-[10px] text-white truncate">
                   {asset.name}
                 </div>
               </div>
             ))}
           </div>
         </div>
       )}
 
       {/* File Pickers */}
       <GoogleDriveFilePicker
         open={showGoogleDrivePicker}
         onOpenChange={setShowGoogleDrivePicker}
         selectionMode="select"
         fileTypeFilter="image"
         onFilesSelected={handleGoogleDriveSelect}
       />
 
       <DropboxFilePicker
         open={showDropboxPicker}
         onOpenChange={setShowDropboxPicker}
         onImportComplete={() => setShowDropboxPicker(false)}
       />
 
       <LibraryAssetPicker
         open={showLibraryPicker}
         onOpenChange={setShowLibraryPicker}
         onAssetsSelected={handleLibrarySelect}
         maxSelection={maxAssets - selectedAssets.length}
       />
     </div>
   );
 };
 
 export default ProductAssetPicker;