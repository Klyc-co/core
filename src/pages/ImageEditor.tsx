 import { useState, useEffect } from "react";
 import { useNavigate } from "react-router-dom";
 import { supabase } from "@/integrations/supabase/client";
 import AppHeader from "@/components/AppHeader";
 import StrategyMobileNav from "@/components/StrategyMobileNav";
 import { useIsMobile } from "@/hooks/use-mobile";
 import { Button } from "@/components/ui/button";
 import { Card, CardContent } from "@/components/ui/card";
 import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
 import {
   Menu,
   BarChart3,
   Users,
   TrendingUp,
   Palette,
   FileText,
   Loader2,
 } from "lucide-react";
 import type { User } from "@supabase/supabase-js";
 import ImageEditorCanvas from "@/components/image-editor/ImageEditorCanvas";
 import ImageSourceSelector from "@/components/image-editor/ImageSourceSelector";
 
 const ImageEditor = () => {
   const navigate = useNavigate();
   const isMobile = useIsMobile();
 
   const [user, setUser] = useState<User | null>(null);
   const [loading, setLoading] = useState(true);
   const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
   const [selectedImage, setSelectedImage] = useState<string | null>(null);
   const [brandColors, setBrandColors] = useState<string[]>([]);
   const [brandFonts, setBrandFonts] = useState<string[]>([]);
 
   useEffect(() => {
     const checkUser = async () => {
       const { data: { user } } = await supabase.auth.getUser();
       if (!user) {
         navigate("/auth");
         return;
       }
       setUser(user);
 
       // Load brand colors and fonts from library
       const { data: colorAssets } = await supabase
         .from("brand_assets")
         .select("value")
         .eq("user_id", user.id)
         .eq("asset_type", "color");
 
       const { data: fontAssets } = await supabase
         .from("brand_assets")
         .select("value")
         .eq("user_id", user.id)
         .eq("asset_type", "font");
 
       if (colorAssets) {
         setBrandColors(colorAssets.map((c) => c.value));
       }
       if (fontAssets) {
         setBrandFonts(fontAssets.map((f) => f.value));
       }
 
       setLoading(false);
     };
     checkUser();
   }, [navigate]);
 
   const handleImageSelect = (url: string, name: string) => {
     setSelectedImage(url);
   };
 
   const handleSave = (imageUrl: string) => {
     // Could navigate or show success
   };
 
   // Sidebar navigation for strategy modules
   const SidebarNav = () => (
     <nav className="space-y-1">
       <button
         onClick={() => {
           setMobileMenuOpen(false);
           navigate("/brand-strategy");
         }}
         className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted text-foreground"
       >
         <BarChart3 className="w-4 h-4" />
         <div className="text-left">
           <div className="text-sm font-medium">Run Report</div>
           <div className="text-xs text-muted-foreground">Schedule and run web reports</div>
         </div>
       </button>
       <button
         onClick={() => {
           setMobileMenuOpen(false);
           navigate("/competitor-analysis");
         }}
         className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted text-foreground"
       >
         <Users className="w-4 h-4" />
         <div className="text-left">
           <div className="text-sm font-medium">Competitor Analysis</div>
           <div className="text-xs text-muted-foreground">Analyze competitors</div>
         </div>
       </button>
       <button
         onClick={() => {
           setMobileMenuOpen(false);
           navigate("/trend-monitor");
         }}
         className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted text-foreground"
       >
         <TrendingUp className="w-4 h-4" />
         <div className="text-left">
           <div className="text-sm font-medium">Trend Monitor</div>
           <div className="text-xs text-muted-foreground">Track social media trends</div>
         </div>
       </button>
       <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg bg-primary/10 text-primary border-l-2 border-primary">
         <Palette className="w-4 h-4" />
         <div className="text-left">
           <div className="text-sm font-medium">Image Editor</div>
           <div className="text-xs text-muted-foreground">Create visual content</div>
         </div>
       </button>
     </nav>
   );
 
   if (loading) {
     return (
       <div className="min-h-screen bg-background flex items-center justify-center">
         <Loader2 className="w-8 h-8 animate-spin text-primary" />
       </div>
     );
   }
 
   return (
     <div className="min-h-screen bg-background">
       <AppHeader user={user} />
 
       {/* Mobile Strategy Navigation */}
       {isMobile && <StrategyMobileNav />}
 
       {/* Page Header */}
       <div className="border-b border-border bg-card/50">
         <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
           <div className="flex items-center gap-3">
             {/* Mobile menu button */}
             {isMobile && (
               <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                 <SheetTrigger asChild>
                   <Button variant="outline" size="icon" className="shrink-0">
                     <Menu className="w-4 h-4" />
                   </Button>
                 </SheetTrigger>
                 <SheetContent side="left" className="w-[280px] p-4">
                   <h2 className="text-sm font-semibold text-foreground mb-4">Strategy Modules</h2>
                   <SidebarNav />
                 </SheetContent>
               </Sheet>
             )}
             <div>
               <h1 className="text-xl sm:text-2xl font-bold text-foreground">Image Editor</h1>
               <p className="text-sm text-muted-foreground mt-1 hidden sm:block">
                 Create flyers, add text overlays, and customize images with your brand assets.
               </p>
             </div>
           </div>
           <Button
             variant="outline"
             onClick={() => navigate("/projects")}
             className="gap-2 w-full sm:w-auto"
           >
             <FileText className="w-4 h-4" />
             Content
           </Button>
         </div>
       </div>
 
       <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
         <div className="flex gap-8">
           {/* Left Sidebar - Strategy Modules (Desktop only) */}
           {!isMobile && (
             <div className="w-64 flex-shrink-0">
               <h2 className="text-sm font-semibold text-foreground mb-4">Strategy Modules</h2>
               <SidebarNav />
             </div>
           )}
 
           {/* Main Content */}
           <div className="flex-1 space-y-6">
             {!selectedImage ? (
               <>
                 <div>
                   <h2 className="text-xl font-bold text-foreground mb-2">Start Editing</h2>
                   <p className="text-muted-foreground mb-6">
                     Select an image from your library, upload a new one, or start with a blank canvas.
                   </p>
                 </div>
 
                 <Card>
                   <CardContent className="pt-6">
                     <ImageSourceSelector onImageSelect={handleImageSelect} />
                     
                     <div className="relative my-6">
                       <div className="absolute inset-0 flex items-center">
                         <span className="w-full border-t" />
                       </div>
                       <div className="relative flex justify-center text-xs uppercase">
                         <span className="bg-card px-2 text-muted-foreground">or</span>
                       </div>
                     </div>
 
                     <Button
                       variant="outline"
                       className="w-full"
                       onClick={() => setSelectedImage("")}
                     >
                       <Palette className="w-4 h-4 mr-2" />
                       Start with Blank Canvas
                     </Button>
                   </CardContent>
                 </Card>
               </>
             ) : (
               <>
                 <div className="flex items-center justify-between">
                   <div>
                     <h2 className="text-xl font-bold text-foreground mb-1">Edit Image</h2>
                     <p className="text-sm text-muted-foreground">
                       Add text, shapes, and customize your image. Saved images go to your library.
                     </p>
                   </div>
                   <Button variant="outline" onClick={() => setSelectedImage(null)}>
                     Start Over
                   </Button>
                 </div>
 
                 <div className="min-h-[600px]">
                   <ImageEditorCanvas
                     initialImage={selectedImage || undefined}
                     brandColors={brandColors}
                     brandFonts={brandFonts}
                     onSave={handleSave}
                   />
                 </div>
               </>
             )}
           </div>
         </div>
       </div>
     </div>
   );
 };
 
 export default ImageEditor;