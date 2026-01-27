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
      brand_assets: {
        Row: {
          asset_type: string
          brand_import_id: string | null
          created_at: string
          id: string
          metadata: Json | null
          name: string | null
          user_id: string
          value: string
        }
        Insert: {
          asset_type: string
          brand_import_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          name?: string | null
          user_id: string
          value: string
        }
        Update: {
          asset_type?: string
          brand_import_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          name?: string | null
          user_id?: string
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "brand_assets_brand_import_id_fkey"
            columns: ["brand_import_id"]
            isOneToOne: false
            referencedRelation: "brand_imports"
            referencedColumns: ["id"]
          },
        ]
      }
      brand_imports: {
        Row: {
          created_at: string
          id: string
          metadata: Json | null
          status: string
          updated_at: string
          user_id: string
          website_url: string
        }
        Insert: {
          created_at?: string
          id?: string
          metadata?: Json | null
          status?: string
          updated_at?: string
          user_id: string
          website_url: string
        }
        Update: {
          created_at?: string
          id?: string
          metadata?: Json | null
          status?: string
          updated_at?: string
          user_id?: string
          website_url?: string
        }
        Relationships: []
      }
      campaign_approvals: {
        Row: {
          campaign_draft_id: string | null
          client_id: string
          created_at: string
          id: string
          marketer_id: string
          notes: string | null
          scheduled_campaign_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          campaign_draft_id?: string | null
          client_id: string
          created_at?: string
          id?: string
          marketer_id: string
          notes?: string | null
          scheduled_campaign_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          campaign_draft_id?: string | null
          client_id?: string
          created_at?: string
          id?: string
          marketer_id?: string
          notes?: string | null
          scheduled_campaign_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_approvals_campaign_draft_id_fkey"
            columns: ["campaign_draft_id"]
            isOneToOne: false
            referencedRelation: "campaign_drafts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_approvals_scheduled_campaign_id_fkey"
            columns: ["scheduled_campaign_id"]
            isOneToOne: false
            referencedRelation: "scheduled_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
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
      client_profiles: {
        Row: {
          brand_colors: string[] | null
          business_name: string | null
          created_at: string
          description: string | null
          id: string
          industry: string | null
          logo_url: string | null
          target_audience: string | null
          updated_at: string
          user_id: string
          value_proposition: string | null
          website: string | null
        }
        Insert: {
          brand_colors?: string[] | null
          business_name?: string | null
          created_at?: string
          description?: string | null
          id?: string
          industry?: string | null
          logo_url?: string | null
          target_audience?: string | null
          updated_at?: string
          user_id: string
          value_proposition?: string | null
          website?: string | null
        }
        Update: {
          brand_colors?: string[] | null
          business_name?: string | null
          created_at?: string
          description?: string | null
          id?: string
          industry?: string | null
          logo_url?: string | null
          target_audience?: string | null
          updated_at?: string
          user_id?: string
          value_proposition?: string | null
          website?: string | null
        }
        Relationships: []
      }
      competitor_analyses: {
        Row: {
          analyzed_at: string
          company_description: string | null
          competitor_name: string
          competitor_url: string | null
          created_at: string
          id: string
          key_products: string | null
          marketing_channels: string | null
          opportunities: string | null
          pricing_strategy: string | null
          raw_data: Json | null
          strengths: string | null
          target_audience: string | null
          threats: string | null
          user_id: string
          value_proposition: string | null
          weaknesses: string | null
        }
        Insert: {
          analyzed_at?: string
          company_description?: string | null
          competitor_name: string
          competitor_url?: string | null
          created_at?: string
          id?: string
          key_products?: string | null
          marketing_channels?: string | null
          opportunities?: string | null
          pricing_strategy?: string | null
          raw_data?: Json | null
          strengths?: string | null
          target_audience?: string | null
          threats?: string | null
          user_id: string
          value_proposition?: string | null
          weaknesses?: string | null
        }
        Update: {
          analyzed_at?: string
          company_description?: string | null
          competitor_name?: string
          competitor_url?: string | null
          created_at?: string
          id?: string
          key_products?: string | null
          marketing_channels?: string | null
          opportunities?: string | null
          pricing_strategy?: string | null
          raw_data?: Json | null
          strengths?: string | null
          target_audience?: string | null
          threats?: string | null
          user_id?: string
          value_proposition?: string | null
          weaknesses?: string | null
        }
        Relationships: []
      }
      marketer_clients: {
        Row: {
          client_email: string | null
          client_id: string
          client_name: string
          created_at: string
          id: string
          marketer_id: string
          status: string
          updated_at: string
        }
        Insert: {
          client_email?: string | null
          client_id: string
          client_name: string
          created_at?: string
          id?: string
          marketer_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          client_email?: string | null
          client_id?: string
          client_name?: string
          created_at?: string
          id?: string
          marketer_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          content: string
          created_at: string
          id: string
          is_read: boolean
          marketer_client_id: string | null
          receiver_id: string
          sender_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_read?: boolean
          marketer_client_id?: string | null
          receiver_id: string
          sender_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_read?: boolean
          marketer_client_id?: string | null
          receiver_id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_marketer_client_id_fkey"
            columns: ["marketer_client_id"]
            isOneToOne: false
            referencedRelation: "marketer_clients"
            referencedColumns: ["id"]
          },
        ]
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
      report_results: {
        Row: {
          created_at: string
          generated_at: string
          id: string
          mentions: number | null
          negative_percent: number | null
          neutral_percent: number | null
          positive_percent: number | null
          raw_results: Json | null
          scheduled_report_id: string | null
          search_term: string
          sentiment: string | null
          sources: number | null
          summary: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          generated_at?: string
          id?: string
          mentions?: number | null
          negative_percent?: number | null
          neutral_percent?: number | null
          positive_percent?: number | null
          raw_results?: Json | null
          scheduled_report_id?: string | null
          search_term: string
          sentiment?: string | null
          sources?: number | null
          summary?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          generated_at?: string
          id?: string
          mentions?: number | null
          negative_percent?: number | null
          neutral_percent?: number | null
          positive_percent?: number | null
          raw_results?: Json | null
          scheduled_report_id?: string | null
          search_term?: string
          sentiment?: string | null
          sources?: number | null
          summary?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "report_results_scheduled_report_id_fkey"
            columns: ["scheduled_report_id"]
            isOneToOne: false
            referencedRelation: "scheduled_reports"
            referencedColumns: ["id"]
          },
        ]
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
      scheduled_reports: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          last_run_at: string | null
          next_run_at: string | null
          schedule_frequency: string
          schedule_time: string
          search_term: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          last_run_at?: string | null
          next_run_at?: string | null
          schedule_frequency?: string
          schedule_time: string
          search_term: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          last_run_at?: string | null
          next_run_at?: string | null
          schedule_frequency?: string
          schedule_time?: string
          search_term?: string
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
      social_connections: {
        Row: {
          access_token: string
          created_at: string
          id: string
          platform: string
          platform_user_id: string | null
          platform_username: string | null
          refresh_token: string | null
          scopes: string[] | null
          token_expires_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token: string
          created_at?: string
          id?: string
          platform: string
          platform_user_id?: string | null
          platform_username?: string | null
          refresh_token?: string | null
          scopes?: string[] | null
          token_expires_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string
          created_at?: string
          id?: string
          platform?: string
          platform_user_id?: string | null
          platform_username?: string | null
          refresh_token?: string | null
          scopes?: string[] | null
          token_expires_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      social_trends: {
        Row: {
          created_at: string
          id: string
          platform: string
          scraped_at: string
          trend_category: string | null
          trend_name: string
          trend_rank: number | null
          trend_url: string | null
          trend_volume: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          platform: string
          scraped_at?: string
          trend_category?: string | null
          trend_name: string
          trend_rank?: number | null
          trend_url?: string | null
          trend_volume?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          platform?: string
          scraped_at?: string
          trend_category?: string | null
          trend_name?: string
          trend_rank?: number | null
          trend_url?: string | null
          trend_volume?: string | null
          user_id?: string
        }
        Relationships: []
      }
      zapier_automation_results: {
        Row: {
          campaign_draft_id: string | null
          created_at: string
          id: string
          payload_sent: Json | null
          result_data: Json | null
          status: string
          trigger_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          campaign_draft_id?: string | null
          created_at?: string
          id?: string
          payload_sent?: Json | null
          result_data?: Json | null
          status?: string
          trigger_type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          campaign_draft_id?: string | null
          created_at?: string
          id?: string
          payload_sent?: Json | null
          result_data?: Json | null
          status?: string
          trigger_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "zapier_automation_results_campaign_draft_id_fkey"
            columns: ["campaign_draft_id"]
            isOneToOne: false
            referencedRelation: "campaign_drafts"
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
