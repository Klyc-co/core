import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import AppHeader from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Plus, Upload, X, Rocket, CalendarIcon, Clock } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { User } from "@supabase/supabase-js";
import linkedinLogo from "@/assets/linkedin-logo.png";
import snapchatLogo from "@/assets/snapchat-logo.png";

interface SocialPlatform {
  id: string;
  name: string;
  icon: string;
  color: string;
}

const socialPlatforms: SocialPlatform[] = [
  { id: "instagram", name: "Instagram", icon: "https://cdn.simpleicons.org/instagram/FFFFFF", color: "bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400" },
  { id: "facebook", name: "Facebook", icon: "https://cdn.simpleicons.org/facebook/FFFFFF", color: "bg-[#1877F2]" },
  { id: "twitter", name: "X (Twitter)", icon: "https://cdn.simpleicons.org/x/FFFFFF", color: "bg-neutral-900" },
  { id: "linkedin", name: "LinkedIn", icon: linkedinLogo, color: "bg-transparent" },
  { id: "tiktok", name: "TikTok", icon: "https://cdn.simpleicons.org/tiktok/FFFFFF", color: "bg-neutral-900" },
  { id: "youtube", name: "YouTube", icon: "https://cdn.simpleicons.org/youtube/FFFFFF", color: "bg-[#FF0000]" },
  { id: "snapchat", name: "Snapchat", icon: snapchatLogo, color: "bg-transparent" },
  { id: "threads", name: "Threads", icon: "https://cdn.simpleicons.org/threads/FFFFFF", color: "bg-neutral-900" },
];

const timeSlots = [
  "00:00", "01:00", "02:00", "03:00", "04:00", "05:00",
  "06:00", "07:00", "08:00", "09:00", "10:00", "11:00",
  "12:00", "13:00", "14:00", "15:00", "16:00", "17:00",
  "18:00", "19:00", "20:00", "21:00", "22:00", "23:00",
];

const NewCampaign = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [campaignName, setCampaignName] = useState("");
  const [selectedProduct, setSelectedProduct] = useState("");
  const [links, setLinks] = useState<string[]>([]);
  const [newLink, setNewLink] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState("");
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [scheduledDate, setScheduledDate] = useState<Date | undefined>(undefined);
  const [scheduledTime, setScheduledTime] = useState("");
  const [isLaunching, setIsLaunching] = useState(false);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }
      setUser(user);
    };
    getUser();
  }, [navigate]);

  const handleAddLink = () => {
    if (newLink.trim() && isValidUrl(newLink.trim())) {
      setLinks([...links, newLink.trim()]);
      setNewLink("");
    } else {
      toast({
        title: "Invalid URL",
        description: "Please enter a valid URL",
        variant: "destructive",
      });
    }
  };

  const isValidUrl = (string: string) => {
    try {
      new URL(string);
      return true;
    } catch (_) {
      return false;
    }
  };

  const handleRemoveLink = (index: number) => {
    setLinks(links.filter((_, i) => i !== index));
  };

  const handleAddTag = () => {
    if (newTag.trim()) {
      setTags([...tags, newTag.trim()]);
      setNewTag("");
    }
  };

  const handleRemoveTag = (index: number) => {
    setTags(tags.filter((_, i) => i !== index));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      setUploadedFiles([...uploadedFiles, ...Array.from(files)]);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files) {
      setUploadedFiles([...uploadedFiles, ...Array.from(files)]);
    }
  };

  const handleRemoveFile = (index: number) => {
    setUploadedFiles(uploadedFiles.filter((_, i) => i !== index));
  };

  const togglePlatform = (platformId: string) => {
    if (selectedPlatforms.includes(platformId)) {
      setSelectedPlatforms(selectedPlatforms.filter(p => p !== platformId));
    } else {
      setSelectedPlatforms([...selectedPlatforms, platformId]);
    }
  };

  const handleLaunchCampaign = async () => {
    if (!campaignName.trim()) {
      toast({
        title: "Campaign name required",
        description: "Please enter a campaign name",
        variant: "destructive",
      });
      return;
    }

    if (selectedPlatforms.length === 0) {
      toast({
        title: "Select platforms",
        description: "Please select at least one platform to post to",
        variant: "destructive",
      });
      return;
    }

    if (!scheduledDate) {
      toast({
        title: "Select date",
        description: "Please select a date for your campaign",
        variant: "destructive",
      });
      return;
    }

    if (!scheduledTime) {
      toast({
        title: "Select time",
        description: "Please select a time for your campaign",
        variant: "destructive",
      });
      return;
    }

    if (!user) return;

    setIsLaunching(true);
    
    const { error } = await supabase.from("scheduled_campaigns").insert({
      user_id: user.id,
      campaign_name: campaignName.trim(),
      product: selectedProduct || null,
      links: links,
      tags: tags,
      platforms: selectedPlatforms,
      scheduled_date: format(scheduledDate, "yyyy-MM-dd"),
      scheduled_time: scheduledTime,
      status: "scheduled",
    });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to schedule campaign. Please try again.",
        variant: "destructive",
      });
      setIsLaunching(false);
      return;
    }
    
    toast({
      title: "Campaign Scheduled! 🚀",
      description: `Your campaign "${campaignName}" has been scheduled for ${format(scheduledDate, "PPP")} at ${scheduledTime}`,
    });
    
    setIsLaunching(false);
    navigate("/campaigns/schedule");
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader user={user} />
      
      <main className="container mx-auto px-4 py-8 max-w-3xl">
        <Button 
          variant="ghost" 
          onClick={() => navigate("/campaigns")}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Campaigns
        </Button>

        <h1 className="text-3xl font-bold mb-8">Create New Campaign</h1>

        <div className="space-y-8">
          {/* Campaign Name */}
          <div className="space-y-2">
            <Label htmlFor="campaignName">Campaign Name</Label>
            <Input
              id="campaignName"
              placeholder="Enter campaign name"
              value={campaignName}
              onChange={(e) => setCampaignName(e.target.value)}
            />
          </div>

          {/* Select Product */}
          <div className="space-y-2">
            <Label>Select Product</Label>
            <Select value={selectedProduct} onValueChange={setSelectedProduct}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a product" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="product1">Product 1</SelectItem>
                <SelectItem value="product2">Product 2</SelectItem>
                <SelectItem value="product3">Product 3</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Add Links */}
          <div className="space-y-2">
            <Label>Add Links</Label>
            <p className="text-sm text-muted-foreground">Paste URLs that will appear in the campaign description</p>
            <div className="flex gap-2">
              <Input
                placeholder="Paste URL here (e.g., https://example.com)"
                value={newLink}
                onChange={(e) => setNewLink(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleAddLink()}
              />
              <Button onClick={handleAddLink} className="shrink-0">
                <Plus className="mr-2 h-4 w-4" />
                Add
              </Button>
            </div>
            {links.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {links.map((link, index) => (
                  <div key={index} className="flex items-center gap-1 bg-secondary px-3 py-1 rounded-full text-sm">
                    <span className="max-w-[200px] truncate">{link}</span>
                    <button onClick={() => handleRemoveLink(index)} className="hover:text-destructive">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Upload Content */}
          <div className="space-y-2">
            <Label>Upload Content</Label>
            <div
              className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => document.getElementById("fileInput")?.click()}
            >
              <Upload className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
              <p className="text-foreground font-medium">Drag and drop files here or click to upload</p>
              <p className="text-sm text-muted-foreground mt-1">Supports images, videos, and documents</p>
              <input
                id="fileInput"
                type="file"
                multiple
                className="hidden"
                onChange={handleFileUpload}
                accept="image/*,video/*,.pdf,.doc,.docx"
              />
            </div>
            {uploadedFiles.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {uploadedFiles.map((file, index) => (
                  <div key={index} className="flex items-center gap-2 bg-secondary px-3 py-2 rounded-lg text-sm">
                    <span className="max-w-[150px] truncate">{file.name}</span>
                    <button onClick={() => handleRemoveFile(index)} className="hover:text-destructive">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Add from Content Library */}
          <div className="space-y-2">
            <Label>Add from content library</Label>
            <p className="text-sm text-muted-foreground">Select images and videos from your library</p>
            <Select>
              <SelectTrigger>
                <SelectValue placeholder="Select from library..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="item1">Library Item 1</SelectItem>
                <SelectItem value="item2">Library Item 2</SelectItem>
                <SelectItem value="item3">Library Item 3</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Tags & Keywords */}
          <div className="space-y-2">
            <Label>Tags & Keywords</Label>
            <div className="flex gap-2">
              <Input
                placeholder="Add relevant keywords or hashtags"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleAddTag()}
              />
              <Button variant="outline" onClick={handleAddTag} className="shrink-0">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {tags.map((tag, index) => (
                  <div key={index} className="flex items-center gap-1 bg-primary/10 text-primary px-3 py-1 rounded-full text-sm">
                    <span>#{tag}</span>
                    <button onClick={() => handleRemoveTag(index)} className="hover:text-destructive">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Platform Selection */}
          <div className="space-y-4">
            <Label>Select Platforms to Post</Label>
            <p className="text-sm text-muted-foreground">Choose one or multiple platforms to launch your campaign</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {socialPlatforms.map((platform) => (
                <Card
                  key={platform.id}
                  className={`p-4 cursor-pointer transition-all duration-200 hover:scale-105 ${
                    selectedPlatforms.includes(platform.id)
                      ? "ring-2 ring-primary border-primary bg-primary/5"
                      : "hover:border-primary/50"
                  }`}
                  onClick={() => togglePlatform(platform.id)}
                >
                  <div className="flex flex-col items-center gap-2">
                    <div className={`w-12 h-12 rounded-xl ${platform.color} flex items-center justify-center ${["linkedin", "snapchat"].includes(platform.id) ? "p-0" : "p-2.5"}`}>
                      <img 
                        src={platform.icon} 
                        alt={platform.name}
                        className={["linkedin", "snapchat"].includes(platform.id) ? "w-11 h-11 rounded-lg object-contain" : "w-full h-full object-contain"}
                      />
                    </div>
                    <span className="text-sm font-medium text-center">{platform.name}</span>
                    {selectedPlatforms.includes(platform.id) && (
                      <div className="w-2 h-2 rounded-full bg-primary" />
                    )}
                  </div>
                </Card>
              ))}
            </div>
            {selectedPlatforms.length > 0 && (
              <p className="text-sm text-muted-foreground">
                {selectedPlatforms.length} platform{selectedPlatforms.length > 1 ? "s" : ""} selected
              </p>
            )}
          </div>

          {/* Schedule Date & Time */}
          <div className="space-y-4">
            <Label>Schedule Campaign</Label>
            <p className="text-sm text-muted-foreground">Choose when to launch your campaign</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Date Picker */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !scheduledDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {scheduledDate ? format(scheduledDate, "PPP") : "Select date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={scheduledDate}
                      onSelect={setScheduledDate}
                      disabled={(date) => date < new Date()}
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Time Picker */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Time</Label>
                <Select value={scheduledTime} onValueChange={setScheduledTime}>
                  <SelectTrigger>
                    <div className="flex items-center">
                      <Clock className="mr-2 h-4 w-4 text-muted-foreground" />
                      <SelectValue placeholder="Select time" />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    {timeSlots.map((time) => (
                      <SelectItem key={time} value={time}>
                        {time}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Launch Button */}
          <div className="pt-4">
            <Button
              size="lg"
              className="w-full"
              onClick={handleLaunchCampaign}
              disabled={isLaunching}
            >
              {isLaunching ? (
                <>Scheduling Campaign...</>
              ) : (
                <>
                  <Rocket className="mr-2 h-5 w-5" />
                  Launch Campaign
                </>
              )}
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default NewCampaign;
