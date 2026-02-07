import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface FigmaNode {
  id: string;
  name: string;
  type: string;
  children?: FigmaNode[];
  fills?: any[];
  style?: any;
  absoluteBoundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

interface FigmaTemplate {
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

// Placeholder templates until real Figma URLs are provided
const PLACEHOLDER_TEMPLATES: FigmaTemplate[] = [
  {
    id: "modern-1",
    name: "Modern Gradient",
    category: "modern",
    previewUrl: "",
    width: 1080,
    height: 1080,
    colors: ["#667eea", "#764ba2", "#ffffff"],
    fonts: ["Inter", "Poppins"],
    layoutData: {
      background: { type: "gradient", colors: ["#667eea", "#764ba2"] },
      elements: [
        { type: "text", role: "headline", position: { x: 0.1, y: 0.3 }, fontSize: 48, fontWeight: "bold" },
        { type: "text", role: "subheadline", position: { x: 0.1, y: 0.5 }, fontSize: 24 },
        { type: "text", role: "cta", position: { x: 0.1, y: 0.75 }, fontSize: 18, fontWeight: "600" },
      ],
    },
  },
  {
    id: "bold-1",
    name: "Bold Statement",
    category: "bold",
    previewUrl: "",
    width: 1080,
    height: 1080,
    colors: ["#ff6b6b", "#feca57", "#000000", "#ffffff"],
    fonts: ["Montserrat", "Roboto"],
    layoutData: {
      background: { type: "solid", color: "#000000" },
      elements: [
        { type: "rect", position: { x: 0.05, y: 0.1 }, width: 0.9, height: 0.15, color: "#ff6b6b" },
        { type: "text", role: "headline", position: { x: 0.1, y: 0.35 }, fontSize: 64, fontWeight: "bold", color: "#ffffff" },
        { type: "text", role: "body", position: { x: 0.1, y: 0.55 }, fontSize: 24, color: "#feca57" },
      ],
    },
  },
  {
    id: "minimal-1",
    name: "Clean Minimal",
    category: "minimal",
    previewUrl: "",
    width: 1080,
    height: 1080,
    colors: ["#f8f9fa", "#212529", "#6c757d"],
    fonts: ["Helvetica Neue", "Arial"],
    layoutData: {
      background: { type: "solid", color: "#f8f9fa" },
      elements: [
        { type: "text", role: "headline", position: { x: 0.1, y: 0.4 }, fontSize: 36, fontWeight: "300", color: "#212529" },
        { type: "text", role: "subheadline", position: { x: 0.1, y: 0.55 }, fontSize: 18, color: "#6c757d" },
      ],
    },
  },
  {
    id: "corporate-1",
    name: "Corporate Blue",
    category: "corporate",
    previewUrl: "",
    width: 1080,
    height: 1080,
    colors: ["#0066cc", "#003d7a", "#ffffff", "#e6f0ff"],
    fonts: ["Segoe UI", "Arial"],
    layoutData: {
      background: { type: "solid", color: "#0066cc" },
      elements: [
        { type: "rect", position: { x: 0, y: 0.7 }, width: 1, height: 0.3, color: "#003d7a" },
        { type: "text", role: "headline", position: { x: 0.1, y: 0.25 }, fontSize: 42, fontWeight: "600", color: "#ffffff" },
        { type: "text", role: "body", position: { x: 0.1, y: 0.45 }, fontSize: 20, color: "#e6f0ff" },
        { type: "text", role: "cta", position: { x: 0.1, y: 0.8 }, fontSize: 16, color: "#ffffff" },
      ],
    },
  },
  {
    id: "creative-1",
    name: "Creative Pop",
    category: "creative",
    previewUrl: "",
    width: 1080,
    height: 1080,
    colors: ["#f72585", "#7209b7", "#3a0ca3", "#4361ee", "#4cc9f0"],
    fonts: ["Bebas Neue", "Open Sans"],
    layoutData: {
      background: { type: "gradient", colors: ["#f72585", "#7209b7"] },
      elements: [
        { type: "circle", position: { x: 0.7, y: 0.2 }, radius: 80, color: "#4cc9f0", opacity: 0.5 },
        { type: "text", role: "headline", position: { x: 0.1, y: 0.4 }, fontSize: 56, fontWeight: "bold", color: "#ffffff" },
        { type: "text", role: "body", position: { x: 0.1, y: 0.6 }, fontSize: 22, color: "#ffffff" },
      ],
    },
  },
  {
    id: "fun-1",
    name: "Playful Fun",
    category: "fun",
    previewUrl: "",
    width: 1080,
    height: 1080,
    colors: ["#ffd93d", "#ff6b6b", "#6bcb77", "#4d96ff"],
    fonts: ["Comic Neue", "Quicksand"],
    layoutData: {
      background: { type: "solid", color: "#ffd93d" },
      elements: [
        { type: "circle", position: { x: 0.15, y: 0.15 }, radius: 60, color: "#ff6b6b" },
        { type: "circle", position: { x: 0.85, y: 0.85 }, radius: 80, color: "#6bcb77" },
        { type: "text", role: "headline", position: { x: 0.1, y: 0.4 }, fontSize: 48, fontWeight: "bold", color: "#4d96ff" },
      ],
    },
  },
  {
    id: "luxury-1",
    name: "Luxury Gold",
    category: "luxury",
    previewUrl: "",
    width: 1080,
    height: 1080,
    colors: ["#1a1a2e", "#d4af37", "#f5f5dc", "#16213e"],
    fonts: ["Playfair Display", "Lato"],
    layoutData: {
      background: { type: "solid", color: "#1a1a2e" },
      elements: [
        { type: "rect", position: { x: 0.05, y: 0.05 }, width: 0.9, height: 0.9, color: "transparent", stroke: "#d4af37", strokeWidth: 2 },
        { type: "text", role: "headline", position: { x: 0.1, y: 0.4 }, fontSize: 44, fontWeight: "400", color: "#d4af37", fontStyle: "italic" },
        { type: "text", role: "subheadline", position: { x: 0.1, y: 0.55 }, fontSize: 18, color: "#f5f5dc" },
      ],
    },
  },
  {
    id: "clean-1",
    name: "Clean & Simple",
    category: "clean",
    previewUrl: "",
    width: 1080,
    height: 1080,
    colors: ["#ffffff", "#333333", "#999999"],
    fonts: ["SF Pro Display", "Helvetica"],
    layoutData: {
      background: { type: "solid", color: "#ffffff" },
      elements: [
        { type: "text", role: "headline", position: { x: 0.1, y: 0.45 }, fontSize: 40, fontWeight: "500", color: "#333333" },
        { type: "line", position: { x: 0.1, y: 0.55 }, width: 0.2, color: "#333333" },
        { type: "text", role: "body", position: { x: 0.1, y: 0.6 }, fontSize: 16, color: "#999999" },
      ],
    },
  },
  {
    id: "edgy-1",
    name: "Edgy Dark",
    category: "edgy",
    previewUrl: "",
    width: 1080,
    height: 1080,
    colors: ["#0d0d0d", "#ff0055", "#00ff88", "#ffffff"],
    fonts: ["Impact", "Oswald"],
    layoutData: {
      background: { type: "solid", color: "#0d0d0d" },
      elements: [
        { type: "text", role: "headline", position: { x: 0.05, y: 0.35 }, fontSize: 72, fontWeight: "bold", color: "#ff0055", skewX: -5 },
        { type: "text", role: "subheadline", position: { x: 0.05, y: 0.55 }, fontSize: 28, color: "#00ff88" },
      ],
    },
  },
  {
    id: "youth-1",
    name: "Gen Z Vibes",
    category: "youth",
    previewUrl: "",
    width: 1080,
    height: 1080,
    colors: ["#a855f7", "#ec4899", "#06b6d4", "#fbbf24"],
    fonts: ["Plus Jakarta Sans", "Inter"],
    layoutData: {
      background: { type: "gradient", colors: ["#a855f7", "#ec4899"], angle: 135 },
      elements: [
        { type: "text", role: "headline", position: { x: 0.1, y: 0.35 }, fontSize: 52, fontWeight: "800", color: "#ffffff" },
        { type: "text", role: "body", position: { x: 0.1, y: 0.55 }, fontSize: 20, color: "#fbbf24" },
        { type: "rect", position: { x: 0.1, y: 0.7 }, width: 0.35, height: 0.08, color: "#06b6d4", borderRadius: 20 },
        { type: "text", role: "cta", position: { x: 0.15, y: 0.72 }, fontSize: 14, fontWeight: "600", color: "#ffffff" },
      ],
    },
  },
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, fileKey, nodeId, category } = await req.json();
    const FIGMA_TOKEN = Deno.env.get("FIGMA_ACCESS_TOKEN");

    // If no Figma token or requesting placeholders, return placeholder templates
    if (!FIGMA_TOKEN || action === "list-placeholders") {
      let templates = PLACEHOLDER_TEMPLATES;
      if (category) {
        templates = templates.filter((t) => t.category === category);
      }
      return new Response(JSON.stringify({ templates, source: "placeholders" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "fetch-file") {
      // Fetch a Figma file
      const response = await fetch(`https://api.figma.com/v1/files/${fileKey}`, {
        headers: { "X-Figma-Token": FIGMA_TOKEN },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Figma API error:", errorText);
        throw new Error(`Figma API error: ${response.status}`);
      }

      const fileData = await response.json();
      return new Response(JSON.stringify(fileData), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "fetch-images") {
      // Fetch rendered images for nodes
      const nodeIds = Array.isArray(nodeId) ? nodeId.join(",") : nodeId;
      const response = await fetch(
        `https://api.figma.com/v1/images/${fileKey}?ids=${nodeIds}&format=png&scale=2`,
        { headers: { "X-Figma-Token": FIGMA_TOKEN } }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch images: ${response.status}`);
      }

      const imageData = await response.json();
      return new Response(JSON.stringify(imageData), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "parse-template") {
      // Parse a specific Figma frame as a template
      const response = await fetch(`https://api.figma.com/v1/files/${fileKey}/nodes?ids=${nodeId}`, {
        headers: { "X-Figma-Token": FIGMA_TOKEN },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch node: ${response.status}`);
      }

      const nodeData = await response.json();
      const node = nodeData.nodes[nodeId]?.document;

      if (!node) {
        throw new Error("Node not found");
      }

      // Extract colors and fonts from the node tree
      const colors = new Set<string>();
      const fonts = new Set<string>();

      function extractStyles(n: FigmaNode) {
        if (n.fills) {
          for (const fill of n.fills) {
            if (fill.type === "SOLID" && fill.color) {
              const { r, g, b } = fill.color;
              const hex = `#${Math.round(r * 255).toString(16).padStart(2, "0")}${Math.round(g * 255).toString(16).padStart(2, "0")}${Math.round(b * 255).toString(16).padStart(2, "0")}`;
              colors.add(hex);
            }
          }
        }
        if (n.style?.fontFamily) {
          fonts.add(n.style.fontFamily);
        }
        if (n.children) {
          for (const child of n.children) {
            extractStyles(child);
          }
        }
      }

      extractStyles(node);

      const template: FigmaTemplate = {
        id: nodeId,
        name: node.name,
        category: "custom",
        previewUrl: "",
        width: node.absoluteBoundingBox?.width || 1080,
        height: node.absoluteBoundingBox?.height || 1080,
        colors: Array.from(colors),
        fonts: Array.from(fonts),
        layoutData: node,
      };

      return new Response(JSON.stringify({ template }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Default: return placeholder templates
    let templates = PLACEHOLDER_TEMPLATES;
    if (category) {
      templates = templates.filter((t) => t.category === category);
    }

    return new Response(JSON.stringify({ templates, source: "placeholders" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
