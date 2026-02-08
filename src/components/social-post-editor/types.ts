export interface FigmaTemplate {
  id: string;
  name: string;
  category: string;
  previewUrl: string;
  width: number;
  height: number;
  colors: string[];
  fonts: string[];
  layoutData: any;
}

export interface CampaignDraft {
  id: string;
  campaign_idea: string | null;
  post_caption: string | null;
  image_prompt: string | null;
  content_type: string | null;
  target_audience: string | null;
  tags: string[] | null;
  created_at: string;
}

export interface EditorSource {
  type: "upload" | "library" | "google-drive" | "dropbox" | "figma" | "campaign-draft" | "blank";
  data?: any;
}

export interface CanvasElement {
  id: string;
  type: "text" | "image" | "rect" | "circle";
  left: number;
  top: number;
  width?: number;
  height?: number;
  content?: string;
  fontSize?: number;
  fontFamily?: string;
  fill?: string;
  fontWeight?: string;
  fontStyle?: string;
  textAlign?: string;
}

export const TEMPLATE_CATEGORIES = [
  { id: "modern", name: "Modern" },
  { id: "bold", name: "Bold" },
  { id: "minimal", name: "Minimal" },
  { id: "corporate", name: "Corporate" },
  { id: "creative", name: "Creative" },
  { id: "fun", name: "Fun" },
  { id: "luxury", name: "Luxury" },
  { id: "clean", name: "Clean" },
  { id: "edgy", name: "Edgy" },
  { id: "youth", name: "Youth" },
] as const;

// Aspect ratio options for generated images
export type AspectRatio = "landscape" | "portrait" | "square";

export const ASPECT_RATIO_OPTIONS: { value: AspectRatio; label: string; description: string; dimensions: string }[] = [
  { value: "portrait", label: "Vertical", description: "Best for Stories, Reels, TikTok", dimensions: "1080×1920" },
  { value: "square", label: "Square", description: "Best for Feed posts", dimensions: "1080×1080" },
  { value: "landscape", label: "Horizontal", description: "Best for YouTube, LinkedIn", dimensions: "1920×1080" },
];

// Wizard state for the new multi-step flow
export interface SelectedAsset {
  id: string;
  name: string;
  url: string;
  thumbnailUrl?: string;
  type: "image" | "logo" | "font" | "color" | "template";
  source: "upload" | "library" | "google-drive" | "dropbox";
}

export interface WizardState {
  step: 1 | 2 | 3 | 4;
  // Step 1: Template
  selectedTemplate: FigmaTemplate | null;
  templateImageUrl: string | null;
  figmaUrl: string | null;
  aspectRatio: AspectRatio;
  // Step 2: Campaign + Assets
  selectedCampaignDraft: CampaignDraft | null;
  selectedAssets: SelectedAsset[];
  selectedFonts: string[];
  selectedColors: string[];
  // Step 3: Review
  generatedPrompt: string;
  // Step 4: Result
  generatedImageUrl: string | null;
  isGenerating: boolean;
}

export const initialWizardState: WizardState = {
  step: 1,
  selectedTemplate: null,
  templateImageUrl: null,
  figmaUrl: null,
  aspectRatio: "portrait",
  selectedCampaignDraft: null,
  selectedAssets: [],
  selectedFonts: [],
  selectedColors: [],
  generatedPrompt: "",
  generatedImageUrl: null,
  isGenerating: false,
};
