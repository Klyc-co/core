export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      campaign_drafts: {
        Row: {
          article_outline: string | null
          campaign_goals: string | null
          campaign_idea: string | null
          campaign_objective: string | null
          content_type: string | null
          created_at: string
          id: string
          image_prompt: string | null
          post_caption: string | null
          prompt: string | null
          scene_prompts: string | null
          tags: string[] | null
          target_audience: string | null
          target_audience_description: string | null
          updated_at: string
          user_id: string
          video_script: string | null
        }
        Insert: {
          article_outline?: string | null
          campaign_goals?: string | null
          campaign_idea?: string | null
          campaign_objective?: string | null
          content_type?: string | null
          created_at?: string
          id?: string
          image_prompt?: string | null
          post_caption?: string | null
          prompt?: string | null
          scene_prompts?: string | null
          tags?: string[] | null
          target_audience?: string | null
          target_audience_description?: string | null
          updated_at?: string
          user_id: string
          video_script?: string | null
        }
        Update: {
          article_outline?: string | null
          campaign_goals?: string | null
          campaign_idea?: string | null
          campaign_objective?: string | null
          content_type?: string | null
          created_at?: string
          id?: string
          image_prompt?: string | null
          post_caption?: string | null
          prompt?: string | null
          scene_prompts?: string | null
          tags?: string[] | null
          target_audience?: string | null
          target_audience_description?: string | null
          updated_at?: string
          user_id?: string
          video_script?: string | null
        }
        Relationships: []
      }
      projects: {
        Row: {
          created_at: string
          duration_seconds: number | null
          final_video_url: string | null
          id: string
          original_video_url: string | null
          owner_id: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          duration_seconds?: number | null
          final_video_url?: string | null
          id?: string
          original_video_url?: string | null
          owner_id: string
          status?: string
          title?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          duration_seconds?: number | null
          final_video_url?: string | null
          id?: string
          original_video_url?: string | null
          owner_id?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      scheduled_campaigns: {
        Row: {
          campaign_name: string
          created_at: string
          id: string
          links: string[] | null
          platforms: string[]
          product: string | null
          scheduled_date: string
          scheduled_time: string
          status: string
          tags: string[] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          campaign_name: string
          created_at?: string
          id?: string
          links?: string[] | null
          platforms?: string[]
          product?: string | null
          scheduled_date: string
          scheduled_time: string
          status?: string
          tags?: string[] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          campaign_name?: string
          created_at?: string
          id?: string
          links?: string[] | null
          platforms?: string[]
          product?: string | null
          scheduled_date?: string
          scheduled_time?: string
          status?: string
          tags?: string[] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      segments: {
        Row: {
          broll_status: string
          broll_video_url: string | null
          created_at: string
          end_seconds: number
          id: string
          index: number
          project_id: string
          start_seconds: number
          transcript_snippet: string | null
          use_broll: boolean
          visual_prompt: string | null
          words_json: Json | null
        }
        Insert: {
          broll_status?: string
          broll_video_url?: string | null
          created_at?: string
          end_seconds: number
          id?: string
          index: number
          project_id: string
          start_seconds: number
          transcript_snippet?: string | null
          use_broll?: boolean
          visual_prompt?: string | null
          words_json?: Json | null
        }
        Update: {
          broll_status?: string
          broll_video_url?: string | null
          created_at?: string
          end_seconds?: number
          id?: string
          index?: number
          project_id?: string
          start_seconds?: number
          transcript_snippet?: string | null
          use_broll?: boolean
          visual_prompt?: string | null
          words_json?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "segments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
