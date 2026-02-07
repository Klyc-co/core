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
  type: "upload" | "library" | "google-drive" | "figma" | "campaign-draft" | "blank";
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
