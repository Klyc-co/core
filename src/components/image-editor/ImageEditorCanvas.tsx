 import { useRef, useEffect, useState, useCallback } from "react";
 import { Canvas, FabricImage, IText, Rect, Circle } from "fabric";
 import { Button } from "@/components/ui/button";
 import { Input } from "@/components/ui/input";
 import { Label } from "@/components/ui/label";
 import { Slider } from "@/components/ui/slider";
 import {
   Type,
   Square,
   Circle as CircleIcon,
   Download,
   Trash2,
   RotateCcw,
   ZoomIn,
   ZoomOut,
   Palette,
   Bold,
   Italic,
   AlignLeft,
   AlignCenter,
   AlignRight,
   Layers,
   ChevronUp,
   ChevronDown,
   Image as ImageIcon,
   Loader2,
 } from "lucide-react";
 import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
 import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
 import { toast } from "sonner";
 import { supabase } from "@/integrations/supabase/client";
 import { uploadBrandAssetImage } from "@/lib/brandAssetStorage";
 
 interface ImageEditorCanvasProps {
   initialImage?: string | null;
   brandFonts?: string[];
   brandColors?: string[];
   onSave?: (imageUrl: string) => void;
 }
 
 const defaultFonts = [
   "Arial",
   "Helvetica",
   "Times New Roman",
   "Georgia",
   "Verdana",
   "Courier New",
   "Impact",
   "Comic Sans MS",
 ];
 
 const defaultColors = [
   "#000000",
   "#FFFFFF",
   "#FF0000",
   "#00FF00",
   "#0000FF",
   "#FFFF00",
   "#FF00FF",
   "#00FFFF",
   "#FFA500",
   "#800080",
 ];
 
 export default function ImageEditorCanvas({
   initialImage,
   brandFonts = [],
   brandColors = [],
   onSave,
 }: ImageEditorCanvasProps) {
   const canvasRef = useRef<HTMLCanvasElement>(null);
   const fabricRef = useRef<Canvas | null>(null);
   const containerRef = useRef<HTMLDivElement>(null);
   
   const [selectedObject, setSelectedObject] = useState<any>(null);
   const [textValue, setTextValue] = useState("");
   const [fontSize, setFontSize] = useState(32);
   const [fontFamily, setFontFamily] = useState("Arial");
   const [textColor, setTextColor] = useState("#000000");
   const [fillColor, setFillColor] = useState("#3B82F6");
   const [isBold, setIsBold] = useState(false);
   const [isItalic, setIsItalic] = useState(false);
   const [textAlign, setTextAlign] = useState<"left" | "center" | "right">("left");
   const [zoom, setZoom] = useState(1);
   const [isSaving, setIsSaving] = useState(false);
 
   const allFonts = [...new Set([...defaultFonts, ...brandFonts])];
   const allColors = [...new Set([...defaultColors, ...brandColors])];
 
   // Initialize canvas
   useEffect(() => {
     if (!canvasRef.current || fabricRef.current) return;
 
     const canvas = new Canvas(canvasRef.current, {
       width: 800,
       height: 600,
       backgroundColor: "#f3f4f6",
       selection: true,
     });
 
     fabricRef.current = canvas;
 
     // Selection events
     canvas.on("selection:created", (e) => {
       setSelectedObject(e.selected?.[0] || null);
       updateTextControls(e.selected?.[0]);
     });
 
     canvas.on("selection:updated", (e) => {
       setSelectedObject(e.selected?.[0] || null);
       updateTextControls(e.selected?.[0]);
     });
 
     canvas.on("selection:cleared", () => {
       setSelectedObject(null);
     });
 
     // Load initial image if provided
     if (initialImage) {
       loadBackgroundImage(initialImage);
     }
 
     return () => {
       canvas.dispose();
       fabricRef.current = null;
     };
   }, []);
 
   // Load initial image when it changes
   useEffect(() => {
     if (initialImage && fabricRef.current) {
       loadBackgroundImage(initialImage);
     }
   }, [initialImage]);
 
   const loadBackgroundImage = async (url: string) => {
     if (!fabricRef.current) return;
     
     try {
       const img = await FabricImage.fromURL(url, { crossOrigin: "anonymous" });
       const canvas = fabricRef.current;
       
       // Scale image to fit canvas
       const scaleX = canvas.width! / img.width!;
       const scaleY = canvas.height! / img.height!;
       const scale = Math.min(scaleX, scaleY, 1);
       
       img.scale(scale);
       img.set({
         left: (canvas.width! - img.width! * scale) / 2,
         top: (canvas.height! - img.height! * scale) / 2,
         selectable: true,
         evented: true,
       });
       
       canvas.add(img);
       canvas.sendObjectToBack(img);
       canvas.renderAll();
     } catch (error) {
       console.error("Failed to load image:", error);
       toast.error("Failed to load image");
     }
   };
 
   const updateTextControls = (obj: any) => {
     if (obj && obj.type === "i-text") {
       setTextValue(obj.text || "");
       setFontSize(obj.fontSize || 32);
       setFontFamily(obj.fontFamily || "Arial");
       setTextColor(obj.fill || "#000000");
       setIsBold(obj.fontWeight === "bold");
       setIsItalic(obj.fontStyle === "italic");
       setTextAlign(obj.textAlign || "left");
     }
   };
 
   const addText = () => {
     if (!fabricRef.current) return;
 
     const text = new IText("Your text here", {
       left: 100,
       top: 100,
       fontSize: fontSize,
       fontFamily: fontFamily,
       fill: textColor,
       fontWeight: isBold ? "bold" : "normal",
       fontStyle: isItalic ? "italic" : "normal",
       textAlign: textAlign,
     });
 
     fabricRef.current.add(text);
     fabricRef.current.setActiveObject(text);
     fabricRef.current.renderAll();
   };
 
   const addRectangle = () => {
     if (!fabricRef.current) return;
 
     const rect = new Rect({
       left: 100,
       top: 100,
       width: 150,
       height: 100,
       fill: fillColor,
       stroke: "#000000",
       strokeWidth: 2,
     });
 
     fabricRef.current.add(rect);
     fabricRef.current.setActiveObject(rect);
     fabricRef.current.renderAll();
   };
 
   const addCircle = () => {
     if (!fabricRef.current) return;
 
     const circle = new Circle({
       left: 100,
       top: 100,
       radius: 50,
       fill: fillColor,
       stroke: "#000000",
       strokeWidth: 2,
     });
 
     fabricRef.current.add(circle);
     fabricRef.current.setActiveObject(circle);
     fabricRef.current.renderAll();
   };
 
   const deleteSelected = () => {
     if (!fabricRef.current || !selectedObject) return;
     fabricRef.current.remove(selectedObject);
     fabricRef.current.renderAll();
     setSelectedObject(null);
   };
 
   const clearCanvas = () => {
     if (!fabricRef.current) return;
     fabricRef.current.clear();
     fabricRef.current.backgroundColor = "#f3f4f6";
     fabricRef.current.renderAll();
   };
 
   const bringForward = () => {
     if (!fabricRef.current || !selectedObject) return;
     fabricRef.current.bringObjectForward(selectedObject);
     fabricRef.current.renderAll();
   };
 
   const sendBackward = () => {
     if (!fabricRef.current || !selectedObject) return;
     fabricRef.current.sendObjectBackwards(selectedObject);
     fabricRef.current.renderAll();
   };
 
   const handleZoomIn = () => {
     if (!fabricRef.current) return;
     const newZoom = Math.min(zoom * 1.2, 3);
     setZoom(newZoom);
     fabricRef.current.setZoom(newZoom);
     fabricRef.current.renderAll();
   };
 
   const handleZoomOut = () => {
     if (!fabricRef.current) return;
     const newZoom = Math.max(zoom / 1.2, 0.5);
     setZoom(newZoom);
     fabricRef.current.setZoom(newZoom);
     fabricRef.current.renderAll();
   };
 
   // Update selected text properties
   useEffect(() => {
     if (!selectedObject || selectedObject.type !== "i-text") return;
     
     selectedObject.set({
       fontSize: fontSize,
       fontFamily: fontFamily,
       fill: textColor,
       fontWeight: isBold ? "bold" : "normal",
       fontStyle: isItalic ? "italic" : "normal",
       textAlign: textAlign,
     });
     
     fabricRef.current?.renderAll();
   }, [fontSize, fontFamily, textColor, isBold, isItalic, textAlign, selectedObject]);
 
   const handleExport = async () => {
     if (!fabricRef.current) return;
     
     setIsSaving(true);
     
     try {
       // Get current user
       const { data: { user } } = await supabase.auth.getUser();
       if (!user) {
         toast.error("Please sign in to save images");
         return;
       }
 
       // Export as data URL
       const dataUrl = fabricRef.current.toDataURL({
         format: "png",
         quality: 1,
         multiplier: 2,
       });
 
       // Convert data URL to blob
       const response = await fetch(dataUrl);
       const blob = await response.blob();
       const file = new File([blob], `edited-image-${Date.now()}.png`, { type: "image/png" });
 
       // Upload to storage
       const { publicUrl } = await uploadBrandAssetImage({
         userId: user.id,
         file,
         folder: "edited-images",
       });
 
       // Save to brand_assets
       const { error } = await supabase.from("brand_assets").insert({
         user_id: user.id,
         asset_type: "image",
         name: `Edited Image - ${new Date().toLocaleDateString()}`,
         value: publicUrl,
         metadata: {
           source: "image-editor",
           created_at: new Date().toISOString(),
         },
       });
 
       if (error) throw error;
 
       toast.success("Image saved to library!");
       onSave?.(publicUrl);
 
       // Also trigger download
       const link = document.createElement("a");
       link.download = `edited-image-${Date.now()}.png`;
       link.href = dataUrl;
       link.click();
     } catch (error) {
       console.error("Failed to save image:", error);
       toast.error("Failed to save image");
     } finally {
       setIsSaving(false);
     }
   };
 
   const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
     const file = e.target.files?.[0];
     if (!file) return;
 
     const reader = new FileReader();
     reader.onload = (event) => {
       const dataUrl = event.target?.result as string;
       loadBackgroundImage(dataUrl);
     };
     reader.readAsDataURL(file);
     e.target.value = "";
   };
 
   return (
     <div className="flex flex-col lg:flex-row gap-4 h-full">
       {/* Toolbar */}
       <div className="lg:w-64 space-y-4 order-2 lg:order-1">
         {/* Add Elements */}
         <div className="bg-card rounded-lg border p-4 space-y-3">
           <h3 className="font-medium text-sm text-foreground">Add Elements</h3>
           <div className="grid grid-cols-3 gap-2">
             <Button variant="outline" size="sm" onClick={addText} className="flex flex-col h-auto py-2">
               <Type className="w-4 h-4 mb-1" />
               <span className="text-xs">Text</span>
             </Button>
             <Button variant="outline" size="sm" onClick={addRectangle} className="flex flex-col h-auto py-2">
               <Square className="w-4 h-4 mb-1" />
               <span className="text-xs">Rect</span>
             </Button>
             <Button variant="outline" size="sm" onClick={addCircle} className="flex flex-col h-auto py-2">
               <CircleIcon className="w-4 h-4 mb-1" />
               <span className="text-xs">Circle</span>
             </Button>
           </div>
           
           <label className="block">
             <Button variant="outline" size="sm" className="w-full" asChild>
               <span className="cursor-pointer">
                 <ImageIcon className="w-4 h-4 mr-2" />
                 Add Image
               </span>
             </Button>
             <input
               type="file"
               accept="image/*"
               onChange={handleImageUpload}
               className="hidden"
             />
           </label>
         </div>
 
         {/* Text Controls */}
         {selectedObject?.type === "i-text" && (
           <div className="bg-card rounded-lg border p-4 space-y-3">
             <h3 className="font-medium text-sm text-foreground">Text Properties</h3>
             
             <div>
               <Label className="text-xs">Font</Label>
               <Select value={fontFamily} onValueChange={setFontFamily}>
                 <SelectTrigger className="h-8 text-xs">
                   <SelectValue />
                 </SelectTrigger>
                 <SelectContent>
                   {allFonts.map((font) => (
                     <SelectItem key={font} value={font} style={{ fontFamily: font }}>
                       {font}
                     </SelectItem>
                   ))}
                 </SelectContent>
               </Select>
             </div>
 
             <div>
               <Label className="text-xs">Size: {fontSize}px</Label>
               <Slider
                 value={[fontSize]}
                 onValueChange={([v]) => setFontSize(v)}
                 min={8}
                 max={120}
                 step={1}
                 className="mt-1"
               />
             </div>
 
             <div className="flex gap-1">
               <Button
                 variant={isBold ? "default" : "outline"}
                 size="sm"
                 onClick={() => setIsBold(!isBold)}
               >
                 <Bold className="w-4 h-4" />
               </Button>
               <Button
                 variant={isItalic ? "default" : "outline"}
                 size="sm"
                 onClick={() => setIsItalic(!isItalic)}
               >
                 <Italic className="w-4 h-4" />
               </Button>
               <Button
                 variant={textAlign === "left" ? "default" : "outline"}
                 size="sm"
                 onClick={() => setTextAlign("left")}
               >
                 <AlignLeft className="w-4 h-4" />
               </Button>
               <Button
                 variant={textAlign === "center" ? "default" : "outline"}
                 size="sm"
                 onClick={() => setTextAlign("center")}
               >
                 <AlignCenter className="w-4 h-4" />
               </Button>
               <Button
                 variant={textAlign === "right" ? "default" : "outline"}
                 size="sm"
                 onClick={() => setTextAlign("right")}
               >
                 <AlignRight className="w-4 h-4" />
               </Button>
             </div>
 
             <div>
               <Label className="text-xs">Color</Label>
               <div className="flex flex-wrap gap-1 mt-1">
                 {allColors.map((color) => (
                   <button
                     key={color}
                     className={`w-6 h-6 rounded border-2 ${textColor === color ? "border-primary" : "border-transparent"}`}
                     style={{ backgroundColor: color }}
                     onClick={() => setTextColor(color)}
                   />
                 ))}
                 <Popover>
                   <PopoverTrigger asChild>
                     <button className="w-6 h-6 rounded border-2 border-dashed border-muted-foreground flex items-center justify-center">
                       <Palette className="w-3 h-3" />
                     </button>
                   </PopoverTrigger>
                   <PopoverContent className="w-auto p-2">
                     <input
                       type="color"
                       value={textColor}
                       onChange={(e) => setTextColor(e.target.value)}
                       className="w-32 h-8"
                     />
                   </PopoverContent>
                 </Popover>
               </div>
             </div>
           </div>
         )}
 
         {/* Shape Controls */}
         {selectedObject && (selectedObject.type === "rect" || selectedObject.type === "circle") && (
           <div className="bg-card rounded-lg border p-4 space-y-3">
             <h3 className="font-medium text-sm text-foreground">Shape Properties</h3>
             <div>
               <Label className="text-xs">Fill Color</Label>
               <div className="flex flex-wrap gap-1 mt-1">
                 {allColors.map((color) => (
                   <button
                     key={color}
                     className={`w-6 h-6 rounded border-2 ${fillColor === color ? "border-primary" : "border-transparent"}`}
                     style={{ backgroundColor: color }}
                     onClick={() => {
                       setFillColor(color);
                       if (selectedObject) {
                         selectedObject.set("fill", color);
                         fabricRef.current?.renderAll();
                       }
                     }}
                   />
                 ))}
               </div>
             </div>
           </div>
         )}
 
         {/* Layer Controls */}
         {selectedObject && (
           <div className="bg-card rounded-lg border p-4 space-y-3">
             <h3 className="font-medium text-sm text-foreground flex items-center gap-2">
               <Layers className="w-4 h-4" />
               Layers
             </h3>
             <div className="flex gap-2">
               <Button variant="outline" size="sm" onClick={bringForward} className="flex-1">
                 <ChevronUp className="w-4 h-4 mr-1" />
                 Up
               </Button>
               <Button variant="outline" size="sm" onClick={sendBackward} className="flex-1">
                 <ChevronDown className="w-4 h-4 mr-1" />
                 Down
               </Button>
             </div>
             <Button variant="destructive" size="sm" onClick={deleteSelected} className="w-full">
               <Trash2 className="w-4 h-4 mr-2" />
               Delete Selected
             </Button>
           </div>
         )}
 
         {/* Canvas Controls */}
         <div className="bg-card rounded-lg border p-4 space-y-3">
           <h3 className="font-medium text-sm text-foreground">Canvas</h3>
           <div className="flex gap-2">
             <Button variant="outline" size="sm" onClick={handleZoomIn} className="flex-1">
               <ZoomIn className="w-4 h-4" />
             </Button>
             <Button variant="outline" size="sm" onClick={handleZoomOut} className="flex-1">
               <ZoomOut className="w-4 h-4" />
             </Button>
             <Button variant="outline" size="sm" onClick={clearCanvas}>
               <RotateCcw className="w-4 h-4" />
             </Button>
           </div>
           <p className="text-xs text-muted-foreground text-center">Zoom: {Math.round(zoom * 100)}%</p>
         </div>
 
         {/* Export */}
         <Button onClick={handleExport} disabled={isSaving} className="w-full">
           {isSaving ? (
             <Loader2 className="w-4 h-4 mr-2 animate-spin" />
           ) : (
             <Download className="w-4 h-4 mr-2" />
           )}
           Save & Download
         </Button>
       </div>
 
       {/* Canvas Container */}
       <div
         ref={containerRef}
         className="flex-1 bg-muted/30 rounded-lg border overflow-auto flex items-center justify-center p-4 order-1 lg:order-2"
         style={{ minHeight: "400px" }}
       >
         <canvas ref={canvasRef} className="shadow-lg rounded" />
       </div>
     </div>
   );
 }