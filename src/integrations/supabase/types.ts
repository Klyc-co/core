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
      activity_events: {
        Row: {
          client_id: string | null
          created_at: string
          event_message: string
          event_type: string
          id: string
          metadata: Json | null
          user_id: string
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          event_message: string
          event_type: string
          id?: string
          metadata?: Json | null
          user_id: string
        }
        Update: {
          client_id?: string | null
          created_at?: string
          event_message?: string
          event_type?: string
          id?: string
          metadata?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      admin_audit_log: {
        Row: {
          action: string
          admin_id: string | null
          created_at: string
          details: Json | null
          id: string
          target_id: string | null
          target_type: string | null
        }
        Insert: {
          action: string
          admin_id?: string | null
          created_at?: string
          details?: Json | null
          id?: string
          target_id?: string | null
          target_type?: string | null
        }
        Update: {
          action?: string
          admin_id?: string | null
          created_at?: string
          details?: Json | null
          id?: string
          target_id?: string | null
          target_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_audit_log_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_users: {
        Row: {
          created_at: string
          display_name: string | null
          email: string
          id: string
          last_login: string | null
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          email: string
          id?: string
          last_login?: string | null
        }
        Update: {
          created_at?: string
          display_name?: string | null
          email?: string
          id?: string
          last_login?: string | null
        }
        Relationships: []
      }
      ai_requests: {
        Row: {
          campaign_id: string | null
          client_id: string | null
          created_at: string
          id: string
          intent: string | null
          request_id: string
          token_count_estimate: number | null
          user_id: string
        }
        Insert: {
          campaign_id?: string | null
          client_id?: string | null
          created_at?: string
          id?: string
          intent?: string | null
          request_id: string
          token_count_estimate?: number | null
          user_id: string
        }
        Update: {
          campaign_id?: string | null
          client_id?: string | null
          created_at?: string
          id?: string
          intent?: string | null
          request_id?: string
          token_count_estimate?: number | null
          user_id?: string
        }
        Relationships: []
      }
      airtable_connections: {
        Row: {
          api_token: string
          connection_status: string | null
          created_at: string
          display_name: string | null
          id: string
          last_sync_at: string | null
          sync_frequency: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          api_token: string
          connection_status?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          last_sync_at?: string | null
          sync_frequency?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          api_token?: string
          connection_status?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          last_sync_at?: string | null
          sync_frequency?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      airtable_synced_records: {
        Row: {
          airtable_base_id: string
          airtable_record_id: string
          airtable_table_id: string
          created_at: string
          id: string
          mapped_data: Json
          mapping_id: string
          raw_record: Json | null
          synced_at: string
          table_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          airtable_base_id: string
          airtable_record_id: string
          airtable_table_id: string
          created_at?: string
          id?: string
          mapped_data?: Json
          mapping_id: string
          raw_record?: Json | null
          synced_at?: string
          table_type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          airtable_base_id?: string
          airtable_record_id?: string
          airtable_table_id?: string
          created_at?: string
          id?: string
          mapped_data?: Json
          mapping_id?: string
          raw_record?: Json | null
          synced_at?: string
          table_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "airtable_synced_records_mapping_id_fkey"
            columns: ["mapping_id"]
            isOneToOne: false
            referencedRelation: "airtable_table_mappings"
            referencedColumns: ["id"]
          },
        ]
      }
      airtable_table_mappings: {
        Row: {
          airtable_base_id: string
          airtable_base_name: string | null
          airtable_table_id: string
          airtable_table_name: string | null
          column_mappings: Json
          connection_id: string
          created_at: string
          id: string
          is_synced: boolean | null
          last_sync_at: string | null
          synced_record_count: number | null
          table_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          airtable_base_id: string
          airtable_base_name?: string | null
          airtable_table_id: string
          airtable_table_name?: string | null
          column_mappings?: Json
          connection_id: string
          created_at?: string
          id?: string
          is_synced?: boolean | null
          last_sync_at?: string | null
          synced_record_count?: number | null
          table_type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          airtable_base_id?: string
          airtable_base_name?: string | null
          airtable_table_id?: string
          airtable_table_name?: string | null
          column_mappings?: Json
          connection_id?: string
          created_at?: string
          id?: string
          is_synced?: boolean | null
          last_sync_at?: string | null
          synced_record_count?: number | null
          table_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "airtable_table_mappings_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "airtable_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      approval_history: {
        Row: {
          campaign_id: string | null
          category: string | null
          client_id: string | null
          created_at: string | null
          decided_at: string | null
          decision: string | null
          id: string
          iteration_number: number | null
          review_criteria: Json | null
          reviewer: string | null
          revision_notes: string | null
          revoked_at: string | null
          session_id: string | null
          submitted_at: string | null
          user_id: string
          what_was_originally_asked: string | null
          what_was_proposed: string | null
        }
        Insert: {
          campaign_id?: string | null
          category?: string | null
          client_id?: string | null
          created_at?: string | null
          decided_at?: string | null
          decision?: string | null
          id?: string
          iteration_number?: number | null
          review_criteria?: Json | null
          reviewer?: string | null
          revision_notes?: string | null
          revoked_at?: string | null
          session_id?: string | null
          submitted_at?: string | null
          user_id: string
          what_was_originally_asked?: string | null
          what_was_proposed?: string | null
        }
        Update: {
          campaign_id?: string | null
          category?: string | null
          client_id?: string | null
          created_at?: string | null
          decided_at?: string | null
          decision?: string | null
          id?: string
          iteration_number?: number | null
          review_criteria?: Json | null
          reviewer?: string | null
          revision_notes?: string | null
          revoked_at?: string | null
          session_id?: string | null
          submitted_at?: string | null
          user_id?: string
          what_was_originally_asked?: string | null
          what_was_proposed?: string | null
        }
        Relationships: []
      }
      billing_subscriptions: {
        Row: {
          cancelled_at: string | null
          client_id: string
          id: string
          monthly_price: number
          started_at: string
          status: Database["public"]["Enums"]["billing_status"]
          tier: Database["public"]["Enums"]["billing_tier"]
          trial_end: string | null
          trial_start: string | null
        }
        Insert: {
          cancelled_at?: string | null
          client_id: string
          id?: string
          monthly_price?: number
          started_at?: string
          status?: Database["public"]["Enums"]["billing_status"]
          tier?: Database["public"]["Enums"]["billing_tier"]
          trial_end?: string | null
          trial_start?: string | null
        }
        Update: {
          cancelled_at?: string | null
          client_id?: string
          id?: string
          monthly_price?: number
          started_at?: string
          status?: Database["public"]["Enums"]["billing_status"]
          tier?: Database["public"]["Enums"]["billing_tier"]
          trial_end?: string | null
          trial_start?: string | null
        }
        Relationships: []
      }
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
      campaign_checkpoints: {
        Row: {
          actual_viral_score: number | null
          campaign_id: string | null
          checkpoint_label: string
          checkpoint_time: string
          created_at: string
          id: string
          predicted_viral_score: number | null
          raw_metrics: Json | null
          threshold_status: string | null
          user_id: string
        }
        Insert: {
          actual_viral_score?: number | null
          campaign_id?: string | null
          checkpoint_label: string
          checkpoint_time?: string
          created_at?: string
          id?: string
          predicted_viral_score?: number | null
          raw_metrics?: Json | null
          threshold_status?: string | null
          user_id: string
        }
        Update: {
          actual_viral_score?: number | null
          campaign_id?: string | null
          checkpoint_label?: string
          checkpoint_time?: string
          created_at?: string
          id?: string
          predicted_viral_score?: number | null
          raw_metrics?: Json | null
          threshold_status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_checkpoints_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaign_drafts"
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
          client_id: string | null
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
          client_id?: string | null
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
          client_id?: string | null
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
      campaign_interview_transcripts: {
        Row: {
          campaign_draft_id: string | null
          client_id: string | null
          created_at: string
          id: string
          transcript: string
          user_id: string
        }
        Insert: {
          campaign_draft_id?: string | null
          client_id?: string | null
          created_at?: string
          id?: string
          transcript: string
          user_id: string
        }
        Update: {
          campaign_draft_id?: string | null
          client_id?: string | null
          created_at?: string
          id?: string
          transcript?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_interview_transcripts_campaign_draft_id_fkey"
            columns: ["campaign_draft_id"]
            isOneToOne: false
            referencedRelation: "campaign_drafts"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_memory: {
        Row: {
          actual_metrics: Json | null
          audience: string | null
          audience_data: Json | null
          brief: Json | null
          campaign_id: string | null
          campaign_name: string | null
          checkpoints: Json | null
          client_id: string | null
          conversion_rate: number | null
          created_at: string
          engagement_score: number | null
          id: string
          industry: string | null
          launched_at: string | null
          message_summary: string | null
          messaging_data: Json | null
          platform: string | null
          platforms: string[] | null
          predicted_score: number | null
          subminds_used: string[] | null
          user_id: string
          viral_score: number | null
        }
        Insert: {
          actual_metrics?: Json | null
          audience?: string | null
          audience_data?: Json | null
          brief?: Json | null
          campaign_id?: string | null
          campaign_name?: string | null
          checkpoints?: Json | null
          client_id?: string | null
          conversion_rate?: number | null
          created_at?: string
          engagement_score?: number | null
          id?: string
          industry?: string | null
          launched_at?: string | null
          message_summary?: string | null
          messaging_data?: Json | null
          platform?: string | null
          platforms?: string[] | null
          predicted_score?: number | null
          subminds_used?: string[] | null
          user_id: string
          viral_score?: number | null
        }
        Update: {
          actual_metrics?: Json | null
          audience?: string | null
          audience_data?: Json | null
          brief?: Json | null
          campaign_id?: string | null
          campaign_name?: string | null
          checkpoints?: Json | null
          client_id?: string | null
          conversion_rate?: number | null
          created_at?: string
          engagement_score?: number | null
          id?: string
          industry?: string | null
          launched_at?: string | null
          message_summary?: string | null
          messaging_data?: Json | null
          platform?: string | null
          platforms?: string[] | null
          predicted_score?: number | null
          subminds_used?: string[] | null
          user_id?: string
          viral_score?: number | null
        }
        Relationships: []
      }
      campaign_performance: {
        Row: {
          actual_conversion: number | null
          actual_ctr: number | null
          actual_engagement: number | null
          campaign_id: string | null
          client_id: string
          conversion_accuracy: number | null
          created_at: string
          cta_type: string | null
          ctr_accuracy: number | null
          engagement_accuracy: number | null
          experiment: boolean | null
          id: string
          performance_score: number | null
          platform: string
          post_id: string | null
          post_length: number | null
          post_theme: string | null
          predicted_conversion: number | null
          predicted_ctr: number | null
          predicted_engagement: number | null
          publish_time: string | null
        }
        Insert: {
          actual_conversion?: number | null
          actual_ctr?: number | null
          actual_engagement?: number | null
          campaign_id?: string | null
          client_id: string
          conversion_accuracy?: number | null
          created_at?: string
          cta_type?: string | null
          ctr_accuracy?: number | null
          engagement_accuracy?: number | null
          experiment?: boolean | null
          id?: string
          performance_score?: number | null
          platform: string
          post_id?: string | null
          post_length?: number | null
          post_theme?: string | null
          predicted_conversion?: number | null
          predicted_ctr?: number | null
          predicted_engagement?: number | null
          publish_time?: string | null
        }
        Update: {
          actual_conversion?: number | null
          actual_ctr?: number | null
          actual_engagement?: number | null
          campaign_id?: string | null
          client_id?: string
          conversion_accuracy?: number | null
          created_at?: string
          cta_type?: string | null
          ctr_accuracy?: number | null
          engagement_accuracy?: number | null
          experiment?: boolean | null
          id?: string
          performance_score?: number | null
          platform?: string
          post_id?: string | null
          post_length?: number | null
          post_theme?: string | null
          predicted_conversion?: number | null
          predicted_ctr?: number | null
          predicted_engagement?: number | null
          publish_time?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_performance_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaign_drafts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_performance_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "post_queue"
            referencedColumns: ["id"]
          },
        ]
      }
      clickup_attachments: {
        Row: {
          clickup_task_id: string
          connection_id: string
          created_at: string
          file_name: string
          file_url: string
          id: string
          list_name: string | null
          mime_type: string | null
          size: number | null
          task_title: string | null
          user_id: string
        }
        Insert: {
          clickup_task_id: string
          connection_id: string
          created_at?: string
          file_name: string
          file_url: string
          id?: string
          list_name?: string | null
          mime_type?: string | null
          size?: number | null
          task_title?: string | null
          user_id: string
        }
        Update: {
          clickup_task_id?: string
          connection_id?: string
          created_at?: string
          file_name?: string
          file_url?: string
          id?: string
          list_name?: string | null
          mime_type?: string | null
          size?: number | null
          task_title?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "clickup_attachments_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "clickup_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      clickup_connections: {
        Row: {
          api_token: string
          connection_status: string | null
          created_at: string
          id: string
          last_sync_at: string | null
          sync_frequency: string | null
          team_id: string | null
          team_name: string | null
          updated_at: string
          user_email: string | null
          user_id: string
        }
        Insert: {
          api_token: string
          connection_status?: string | null
          created_at?: string
          id?: string
          last_sync_at?: string | null
          sync_frequency?: string | null
          team_id?: string | null
          team_name?: string | null
          updated_at?: string
          user_email?: string | null
          user_id: string
        }
        Update: {
          api_token?: string
          connection_status?: string | null
          created_at?: string
          id?: string
          last_sync_at?: string | null
          sync_frequency?: string | null
          team_id?: string | null
          team_name?: string | null
          updated_at?: string
          user_email?: string | null
          user_id?: string
        }
        Relationships: []
      }
      clickup_lists: {
        Row: {
          clickup_list_id: string
          connection_id: string
          created_at: string
          folder_name: string | null
          id: string
          is_marketing_suggested: boolean | null
          is_selected_for_sync: boolean | null
          last_sync_at: string | null
          name: string
          space_name: string | null
          task_count: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          clickup_list_id: string
          connection_id: string
          created_at?: string
          folder_name?: string | null
          id?: string
          is_marketing_suggested?: boolean | null
          is_selected_for_sync?: boolean | null
          last_sync_at?: string | null
          name: string
          space_name?: string | null
          task_count?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          clickup_list_id?: string
          connection_id?: string
          created_at?: string
          folder_name?: string | null
          id?: string
          is_marketing_suggested?: boolean | null
          is_selected_for_sync?: boolean | null
          last_sync_at?: string | null
          name?: string
          space_name?: string | null
          task_count?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "clickup_lists_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "clickup_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      clickup_tasks: {
        Row: {
          assignees: Json | null
          clickup_list_id: string
          clickup_task_id: string
          connection_id: string
          created_at: string
          date_created: string | null
          description: string | null
          due_date: string | null
          id: string
          list_name: string | null
          priority: string | null
          raw: Json | null
          start_date: string | null
          status: string | null
          tags: Json | null
          title: string
          updated_at: string
          url: string | null
          user_id: string
        }
        Insert: {
          assignees?: Json | null
          clickup_list_id: string
          clickup_task_id: string
          connection_id: string
          created_at?: string
          date_created?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          list_name?: string | null
          priority?: string | null
          raw?: Json | null
          start_date?: string | null
          status?: string | null
          tags?: Json | null
          title: string
          updated_at?: string
          url?: string | null
          user_id: string
        }
        Update: {
          assignees?: Json | null
          clickup_list_id?: string
          clickup_task_id?: string
          connection_id?: string
          created_at?: string
          date_created?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          list_name?: string | null
          priority?: string | null
          raw?: Json | null
          start_date?: string | null
          status?: string | null
          tags?: Json | null
          title?: string
          updated_at?: string
          url?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "clickup_tasks_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "clickup_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      client_brain: {
        Row: {
          audience_segments: Json | null
          brand_voice: Json | null
          client_id: string
          competitor_list: string[] | null
          created_at: string
          data: Json
          document_type: string
          id: string
          industry: string | null
          market_sophistication: string | null
          moat_profile: Json | null
          strategy_profile_data: Json | null
          updated_at: string
          user_id: string
        }
        Insert: {
          audience_segments?: Json | null
          brand_voice?: Json | null
          client_id: string
          competitor_list?: string[] | null
          created_at?: string
          data?: Json
          document_type: string
          id?: string
          industry?: string | null
          market_sophistication?: string | null
          moat_profile?: Json | null
          strategy_profile_data?: Json | null
          updated_at?: string
          user_id: string
        }
        Update: {
          audience_segments?: Json | null
          brand_voice?: Json | null
          client_id?: string
          competitor_list?: string[] | null
          created_at?: string
          data?: Json
          document_type?: string
          id?: string
          industry?: string | null
          market_sophistication?: string | null
          moat_profile?: Json | null
          strategy_profile_data?: Json | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      client_profiles: {
        Row: {
          audience_data: Json | null
          brand_colors: string[] | null
          business_name: string | null
          created_at: string
          description: string | null
          geography_markets: string | null
          id: string
          industry: string | null
          logo_url: string | null
          main_competitors: string | null
          marketing_goals: string | null
          product_category: string | null
          target_audience: string | null
          updated_at: string
          user_id: string
          value_data: Json | null
          value_proposition: string | null
          website: string | null
        }
        Insert: {
          audience_data?: Json | null
          brand_colors?: string[] | null
          business_name?: string | null
          created_at?: string
          description?: string | null
          geography_markets?: string | null
          id?: string
          industry?: string | null
          logo_url?: string | null
          main_competitors?: string | null
          marketing_goals?: string | null
          product_category?: string | null
          target_audience?: string | null
          updated_at?: string
          user_id: string
          value_data?: Json | null
          value_proposition?: string | null
          website?: string | null
        }
        Update: {
          audience_data?: Json | null
          brand_colors?: string[] | null
          business_name?: string | null
          created_at?: string
          description?: string | null
          geography_markets?: string | null
          id?: string
          industry?: string | null
          logo_url?: string | null
          main_competitors?: string | null
          marketing_goals?: string | null
          product_category?: string | null
          target_audience?: string | null
          updated_at?: string
          user_id?: string
          value_data?: Json | null
          value_proposition?: string | null
          website?: string | null
        }
        Relationships: []
      }
      collaboration_messages: {
        Row: {
          created_at: string
          id: string
          is_internal_note: boolean
          message: string
          sender_id: string | null
          sender_type: Database["public"]["Enums"]["collab_sender"]
          ticket_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_internal_note?: boolean
          message: string
          sender_id?: string | null
          sender_type: Database["public"]["Enums"]["collab_sender"]
          ticket_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_internal_note?: boolean
          message?: string
          sender_id?: string | null
          sender_type?: Database["public"]["Enums"]["collab_sender"]
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "collaboration_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "collaboration_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      collaboration_tickets: {
        Row: {
          assigned_to: string | null
          client_id: string
          created_at: string
          id: string
          priority: Database["public"]["Enums"]["collab_priority"]
          resolution_time_ms: number | null
          resolved_at: string | null
          status: Database["public"]["Enums"]["collab_status"]
          subject: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          client_id: string
          created_at?: string
          id?: string
          priority?: Database["public"]["Enums"]["collab_priority"]
          resolution_time_ms?: number | null
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["collab_status"]
          subject: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          client_id?: string
          created_at?: string
          id?: string
          priority?: Database["public"]["Enums"]["collab_priority"]
          resolution_time_ms?: number | null
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["collab_status"]
          subject?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "collaboration_tickets_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "klyc_employees"
            referencedColumns: ["id"]
          },
        ]
      }
      competitor_alerts: {
        Row: {
          acknowledged_at: string | null
          client_id: string | null
          client_relevance_score: number | null
          competitor_name: string | null
          confidence: number | null
          id: string
          inferred_strategy: string | null
          observed_action: string | null
          recommendation: string | null
          subjects_to_elevate: string[] | null
          surfaced_at: string | null
          urgency: string | null
        }
        Insert: {
          acknowledged_at?: string | null
          client_id?: string | null
          client_relevance_score?: number | null
          competitor_name?: string | null
          confidence?: number | null
          id?: string
          inferred_strategy?: string | null
          observed_action?: string | null
          recommendation?: string | null
          subjects_to_elevate?: string[] | null
          surfaced_at?: string | null
          urgency?: string | null
        }
        Update: {
          acknowledged_at?: string | null
          client_id?: string | null
          client_relevance_score?: number | null
          competitor_name?: string | null
          confidence?: number | null
          id?: string
          inferred_strategy?: string | null
          observed_action?: string | null
          recommendation?: string | null
          subjects_to_elevate?: string[] | null
          surfaced_at?: string | null
          urgency?: string | null
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
      competitor_observations: {
        Row: {
          client_id: string | null
          client_relevance: number | null
          competitor_name: string | null
          confidence: number | null
          created_at: string
          details: Json | null
          engagement_delta: number | null
          id: string
          knp_summary: string | null
          observation_type: string | null
          observed_action: string | null
          observed_at: string | null
          platform: string | null
          recommendation: string | null
          source_urls: string[] | null
          user_id: string
        }
        Insert: {
          client_id?: string | null
          client_relevance?: number | null
          competitor_name?: string | null
          confidence?: number | null
          created_at?: string
          details?: Json | null
          engagement_delta?: number | null
          id?: string
          knp_summary?: string | null
          observation_type?: string | null
          observed_action?: string | null
          observed_at?: string | null
          platform?: string | null
          recommendation?: string | null
          source_urls?: string[] | null
          user_id: string
        }
        Update: {
          client_id?: string | null
          client_relevance?: number | null
          competitor_name?: string | null
          confidence?: number | null
          created_at?: string
          details?: Json | null
          engagement_delta?: number | null
          id?: string
          knp_summary?: string | null
          observation_type?: string | null
          observed_action?: string | null
          observed_at?: string | null
          platform?: string | null
          recommendation?: string | null
          source_urls?: string[] | null
          user_id?: string
        }
        Relationships: []
      }
      creative_log: {
        Row: {
          client_id: string | null
          created_at: string | null
          id: string
          iteration: number | null
          model_type: string | null
          session_id: string | null
          variants: Json | null
          voice_type: string | null
        }
        Insert: {
          client_id?: string | null
          created_at?: string | null
          id?: string
          iteration?: number | null
          model_type?: string | null
          session_id?: string | null
          variants?: Json | null
          voice_type?: string | null
        }
        Update: {
          client_id?: string | null
          created_at?: string | null
          id?: string
          iteration?: number | null
          model_type?: string | null
          session_id?: string | null
          variants?: Json | null
          voice_type?: string | null
        }
        Relationships: []
      }
      crm_companies: {
        Row: {
          connection_id: string
          contact_count: number | null
          created_at: string
          domain: string | null
          external_id: string
          id: string
          industry: string | null
          name: string
          raw_data: Json | null
          size: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          connection_id: string
          contact_count?: number | null
          created_at?: string
          domain?: string | null
          external_id: string
          id?: string
          industry?: string | null
          name: string
          raw_data?: Json | null
          size?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          connection_id?: string
          contact_count?: number | null
          created_at?: string
          domain?: string | null
          external_id?: string
          id?: string
          industry?: string | null
          name?: string
          raw_data?: Json | null
          size?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_companies_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "crm_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_connections: {
        Row: {
          access_token: string | null
          created_at: string
          display_name: string
          id: string
          last_sync_at: string | null
          metadata: Json | null
          provider: string
          refresh_token: string | null
          status: string
          sync_frequency_minutes: number
          token_expires_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token?: string | null
          created_at?: string
          display_name: string
          id?: string
          last_sync_at?: string | null
          metadata?: Json | null
          provider: string
          refresh_token?: string | null
          status?: string
          sync_frequency_minutes?: number
          token_expires_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string | null
          created_at?: string
          display_name?: string
          id?: string
          last_sync_at?: string | null
          metadata?: Json | null
          provider?: string
          refresh_token?: string | null
          status?: string
          sync_frequency_minutes?: number
          token_expires_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      crm_contacts: {
        Row: {
          company_name: string | null
          connection_id: string
          created_at: string
          email: string | null
          external_id: string
          first_name: string | null
          id: string
          last_name: string | null
          lifecycle_stage: string | null
          phone: string | null
          raw_data: Json | null
          source: string
          tags: Json | null
          updated_at: string
          user_id: string
        }
        Insert: {
          company_name?: string | null
          connection_id: string
          created_at?: string
          email?: string | null
          external_id: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          lifecycle_stage?: string | null
          phone?: string | null
          raw_data?: Json | null
          source: string
          tags?: Json | null
          updated_at?: string
          user_id: string
        }
        Update: {
          company_name?: string | null
          connection_id?: string
          created_at?: string
          email?: string | null
          external_id?: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          lifecycle_stage?: string | null
          phone?: string | null
          raw_data?: Json | null
          source?: string
          tags?: Json | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_contacts_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "crm_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_deals: {
        Row: {
          associated_contact_external_id: string | null
          close_date: string | null
          connection_id: string
          created_at: string
          currency: string | null
          external_id: string
          id: string
          name: string
          owner: string | null
          raw_data: Json | null
          stage: string | null
          status: string | null
          updated_at: string
          user_id: string
          value: number | null
        }
        Insert: {
          associated_contact_external_id?: string | null
          close_date?: string | null
          connection_id: string
          created_at?: string
          currency?: string | null
          external_id: string
          id?: string
          name: string
          owner?: string | null
          raw_data?: Json | null
          stage?: string | null
          status?: string | null
          updated_at?: string
          user_id: string
          value?: number | null
        }
        Update: {
          associated_contact_external_id?: string | null
          close_date?: string | null
          connection_id?: string
          created_at?: string
          currency?: string | null
          external_id?: string
          id?: string
          name?: string
          owner?: string | null
          raw_data?: Json | null
          stage?: string | null
          status?: string | null
          updated_at?: string
          user_id?: string
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_deals_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "crm_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_orders: {
        Row: {
          associated_contact_external_id: string | null
          connection_id: string
          created_at: string
          currency: string | null
          customer_email: string | null
          customer_name: string | null
          external_id: string
          id: string
          items: Json | null
          order_date: string | null
          order_number: string
          raw_data: Json | null
          status: string | null
          total_amount: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          associated_contact_external_id?: string | null
          connection_id: string
          created_at?: string
          currency?: string | null
          customer_email?: string | null
          customer_name?: string | null
          external_id: string
          id?: string
          items?: Json | null
          order_date?: string | null
          order_number: string
          raw_data?: Json | null
          status?: string | null
          total_amount?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          associated_contact_external_id?: string | null
          connection_id?: string
          created_at?: string
          currency?: string | null
          customer_email?: string | null
          customer_name?: string | null
          external_id?: string
          id?: string
          items?: Json | null
          order_date?: string | null
          order_number?: string
          raw_data?: Json | null
          status?: string | null
          total_amount?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_orders_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "crm_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_sync_logs: {
        Row: {
          connection_id: string
          created_at: string
          error_message: string | null
          finished_at: string | null
          id: string
          started_at: string
          status: string
          summary: string | null
        }
        Insert: {
          connection_id: string
          created_at?: string
          error_message?: string | null
          finished_at?: string | null
          id?: string
          started_at?: string
          status?: string
          summary?: string | null
        }
        Update: {
          connection_id?: string
          created_at?: string
          error_message?: string | null
          finished_at?: string | null
          id?: string
          started_at?: string
          status?: string
          summary?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_sync_logs_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "crm_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      dropbox_assets: {
        Row: {
          asset_name: string
          asset_type: string | null
          created_at: string
          dropbox_connection_id: string | null
          dropbox_created_at: string | null
          dropbox_file_id: string
          dropbox_modified_at: string | null
          dropbox_path: string
          file_size: number | null
          id: string
          is_folder: boolean | null
          local_storage_path: string | null
          metadata: Json | null
          mime_type: string | null
          parent_folder_path: string | null
          synced_at: string
          tags: string[] | null
          thumbnail_url: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          asset_name: string
          asset_type?: string | null
          created_at?: string
          dropbox_connection_id?: string | null
          dropbox_created_at?: string | null
          dropbox_file_id: string
          dropbox_modified_at?: string | null
          dropbox_path: string
          file_size?: number | null
          id?: string
          is_folder?: boolean | null
          local_storage_path?: string | null
          metadata?: Json | null
          mime_type?: string | null
          parent_folder_path?: string | null
          synced_at?: string
          tags?: string[] | null
          thumbnail_url?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          asset_name?: string
          asset_type?: string | null
          created_at?: string
          dropbox_connection_id?: string | null
          dropbox_created_at?: string | null
          dropbox_file_id?: string
          dropbox_modified_at?: string | null
          dropbox_path?: string
          file_size?: number | null
          id?: string
          is_folder?: boolean | null
          local_storage_path?: string | null
          metadata?: Json | null
          mime_type?: string | null
          parent_folder_path?: string | null
          synced_at?: string
          tags?: string[] | null
          thumbnail_url?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dropbox_assets_dropbox_connection_id_fkey"
            columns: ["dropbox_connection_id"]
            isOneToOne: false
            referencedRelation: "dropbox_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      dropbox_connections: {
        Row: {
          access_token: string
          account_display_name: string | null
          account_email: string | null
          account_id: string | null
          auto_sync_enabled: boolean | null
          auto_sync_folder_path: string | null
          connection_status: string | null
          created_at: string
          id: string
          last_sync_at: string | null
          refresh_token: string | null
          root_folder_path: string | null
          token_expires_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token: string
          account_display_name?: string | null
          account_email?: string | null
          account_id?: string | null
          auto_sync_enabled?: boolean | null
          auto_sync_folder_path?: string | null
          connection_status?: string | null
          created_at?: string
          id?: string
          last_sync_at?: string | null
          refresh_token?: string | null
          root_folder_path?: string | null
          token_expires_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string
          account_display_name?: string | null
          account_email?: string | null
          account_id?: string | null
          auto_sync_enabled?: boolean | null
          auto_sync_folder_path?: string | null
          connection_status?: string | null
          created_at?: string
          id?: string
          last_sync_at?: string | null
          refresh_token?: string | null
          root_folder_path?: string | null
          token_expires_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      google_drive_assets: {
        Row: {
          asset_name: string
          asset_type: string | null
          content_extracted: string | null
          created_at: string
          description: string | null
          drive_connection_id: string | null
          drive_file_id: string | null
          drive_url: string | null
          id: string
          is_priority: boolean | null
          metadata: Json | null
          synced_at: string
          tags: string[] | null
          user_id: string
        }
        Insert: {
          asset_name: string
          asset_type?: string | null
          content_extracted?: string | null
          created_at?: string
          description?: string | null
          drive_connection_id?: string | null
          drive_file_id?: string | null
          drive_url?: string | null
          id?: string
          is_priority?: boolean | null
          metadata?: Json | null
          synced_at?: string
          tags?: string[] | null
          user_id: string
        }
        Update: {
          asset_name?: string
          asset_type?: string | null
          content_extracted?: string | null
          created_at?: string
          description?: string | null
          drive_connection_id?: string | null
          drive_file_id?: string | null
          drive_url?: string | null
          id?: string
          is_priority?: boolean | null
          metadata?: Json | null
          synced_at?: string
          tags?: string[] | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "google_drive_assets_drive_connection_id_fkey"
            columns: ["drive_connection_id"]
            isOneToOne: false
            referencedRelation: "google_drive_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "google_drive_assets_drive_connection_id_fkey"
            columns: ["drive_connection_id"]
            isOneToOne: false
            referencedRelation: "google_drive_connections_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      google_drive_connections: {
        Row: {
          assets_sheet_id: string | null
          assets_sheet_url: string | null
          brand_guidelines_sheet_id: string | null
          brand_guidelines_sheet_url: string | null
          connection_status: string
          created_at: string
          folder_id: string
          folder_url: string | null
          id: string
          last_sync_at: string | null
          metadata: Json | null
          updated_at: string
          user_id: string
          zapier_webhook_url: string | null
        }
        Insert: {
          assets_sheet_id?: string | null
          assets_sheet_url?: string | null
          brand_guidelines_sheet_id?: string | null
          brand_guidelines_sheet_url?: string | null
          connection_status?: string
          created_at?: string
          folder_id: string
          folder_url?: string | null
          id?: string
          last_sync_at?: string | null
          metadata?: Json | null
          updated_at?: string
          user_id: string
          zapier_webhook_url?: string | null
        }
        Update: {
          assets_sheet_id?: string | null
          assets_sheet_url?: string | null
          brand_guidelines_sheet_id?: string | null
          brand_guidelines_sheet_url?: string | null
          connection_status?: string
          created_at?: string
          folder_id?: string
          folder_url?: string | null
          id?: string
          last_sync_at?: string | null
          metadata?: Json | null
          updated_at?: string
          user_id?: string
          zapier_webhook_url?: string | null
        }
        Relationships: []
      }
      image_assets: {
        Row: {
          campaign_id: string | null
          client_id: string | null
          created_at: string | null
          id: string
          original_url: string
          platform_specs: Json | null
          rejection_reason: string | null
          reviewed_at: string | null
          status: string | null
          use_context: string | null
          user_id: string
        }
        Insert: {
          campaign_id?: string | null
          client_id?: string | null
          created_at?: string | null
          id?: string
          original_url: string
          platform_specs?: Json | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          status?: string | null
          use_context?: string | null
          user_id: string
        }
        Update: {
          campaign_id?: string | null
          client_id?: string | null
          created_at?: string | null
          id?: string
          original_url?: string
          platform_specs?: Json | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          status?: string | null
          use_context?: string | null
          user_id?: string
        }
        Relationships: []
      }
      image_queue: {
        Row: {
          client_id: string | null
          created_at: string | null
          id: string
          image_url: string
          queued_at: string | null
          source: string | null
          status: string | null
          user_id: string
        }
        Insert: {
          client_id?: string | null
          created_at?: string | null
          id?: string
          image_url: string
          queued_at?: string | null
          source?: string | null
          status?: string | null
          user_id: string
        }
        Update: {
          client_id?: string | null
          created_at?: string | null
          id?: string
          image_url?: string
          queued_at?: string | null
          source?: string | null
          status?: string | null
          user_id?: string
        }
        Relationships: []
      }
      klyc_channels: {
        Row: {
          account_name: string | null
          config: Json | null
          created_at: string
          credentials_ref: string | null
          id: string
          platform: string
          status: Database["public"]["Enums"]["channel_status"]
          updated_at: string
        }
        Insert: {
          account_name?: string | null
          config?: Json | null
          created_at?: string
          credentials_ref?: string | null
          id?: string
          platform: string
          status?: Database["public"]["Enums"]["channel_status"]
          updated_at?: string
        }
        Update: {
          account_name?: string | null
          config?: Json | null
          created_at?: string
          credentials_ref?: string | null
          id?: string
          platform?: string
          status?: Database["public"]["Enums"]["channel_status"]
          updated_at?: string
        }
        Relationships: []
      }
      klyc_employees: {
        Row: {
          admin_user_id: string | null
          created_at: string
          display_name: string | null
          id: string
          is_active: boolean
          role: string | null
          user_id: string
        }
        Insert: {
          admin_user_id?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          is_active?: boolean
          role?: string | null
          user_id: string
        }
        Update: {
          admin_user_id?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          is_active?: boolean
          role?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "klyc_employees_admin_user_id_fkey"
            columns: ["admin_user_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_graph: {
        Row: {
          actual_score: number | null
          audience_segment: string | null
          client_id: string | null
          confidence: number | null
          delta: number | null
          id: string
          industry: string | null
          messaging_angle: string | null
          platform: string | null
          predicted_score: number | null
          sample_size: number | null
          timing_pattern: string | null
          updated_at: string | null
          voice_type: string | null
        }
        Insert: {
          actual_score?: number | null
          audience_segment?: string | null
          client_id?: string | null
          confidence?: number | null
          delta?: number | null
          id?: string
          industry?: string | null
          messaging_angle?: string | null
          platform?: string | null
          predicted_score?: number | null
          sample_size?: number | null
          timing_pattern?: string | null
          updated_at?: string | null
          voice_type?: string | null
        }
        Update: {
          actual_score?: number | null
          audience_segment?: string | null
          client_id?: string | null
          confidence?: number | null
          delta?: number | null
          id?: string
          industry?: string | null
          messaging_angle?: string | null
          platform?: string | null
          predicted_score?: number | null
          sample_size?: number | null
          timing_pattern?: string | null
          updated_at?: string | null
          voice_type?: string | null
        }
        Relationships: []
      }
      learning_experiments: {
        Row: {
          client_id: string
          created_at: string | null
          experiment_type: string
          hypothesis: string | null
          id: string
          posts_tested: number | null
          results: Json | null
          status: string | null
        }
        Insert: {
          client_id: string
          created_at?: string | null
          experiment_type: string
          hypothesis?: string | null
          id?: string
          posts_tested?: number | null
          results?: Json | null
          status?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string | null
          experiment_type?: string
          hypothesis?: string | null
          id?: string
          posts_tested?: number | null
          results?: Json | null
          status?: string | null
        }
        Relationships: []
      }
      learning_patterns: {
        Row: {
          client_id: string
          confidence_score: number | null
          created_at: string | null
          discovered_at: string | null
          id: string
          pattern_type: string
          pattern_value: string
          supporting_campaigns: number | null
        }
        Insert: {
          client_id: string
          confidence_score?: number | null
          created_at?: string | null
          discovered_at?: string | null
          id?: string
          pattern_type: string
          pattern_value: string
          supporting_campaigns?: number | null
        }
        Update: {
          client_id?: string
          confidence_score?: number | null
          created_at?: string | null
          discovered_at?: string | null
          id?: string
          pattern_type?: string
          pattern_value?: string
          supporting_campaigns?: number | null
        }
        Relationships: []
      }
      loom_connections: {
        Row: {
          api_token: string
          connection_status: string | null
          created_at: string | null
          display_name: string | null
          id: string
          last_sync_at: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          api_token: string
          connection_status?: string | null
          created_at?: string | null
          display_name?: string | null
          id?: string
          last_sync_at?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          api_token?: string
          connection_status?: string | null
          created_at?: string | null
          display_name?: string | null
          id?: string
          last_sync_at?: string | null
          updated_at?: string | null
          user_id?: string
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
      normalizer_errors: {
        Row: {
          created_at: string
          error_type: string
          id: string
          payload_fragment: string | null
          session_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          error_type: string
          id?: string
          payload_fragment?: string | null
          session_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          error_type?: string
          id?: string
          payload_fragment?: string | null
          session_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      oauth_pkce_states: {
        Row: {
          code_verifier: string
          created_at: string
          display_name: string
          expires_at: string
          id: string
          provider: string
          state: string
          user_id: string
        }
        Insert: {
          code_verifier: string
          created_at?: string
          display_name: string
          expires_at?: string
          id?: string
          provider: string
          state: string
          user_id: string
        }
        Update: {
          code_verifier?: string
          created_at?: string
          display_name?: string
          expires_at?: string
          id?: string
          provider?: string
          state?: string
          user_id?: string
        }
        Relationships: []
      }
      onboarding_transcripts: {
        Row: {
          client_id: string | null
          created_at: string
          id: string
          transcript: string
          user_id: string
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          id?: string
          transcript: string
          user_id: string
        }
        Update: {
          client_id?: string | null
          created_at?: string
          id?: string
          transcript?: string
          user_id?: string
        }
        Relationships: []
      }
      orchestrator_sessions: {
        Row: {
          active_submind_dispatches: Json
          client_id: string
          context: Json | null
          conversation_history: Json
          created_at: string
          id: string
          last_active: string | null
          mode: string
          solo_permission_scope: string | null
          started_at: string | null
          status: string | null
          subminds_called: string[] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          active_submind_dispatches?: Json
          client_id: string
          context?: Json | null
          conversation_history?: Json
          created_at?: string
          id?: string
          last_active?: string | null
          mode?: string
          solo_permission_scope?: string | null
          started_at?: string | null
          status?: string | null
          subminds_called?: string[] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          active_submind_dispatches?: Json
          client_id?: string
          context?: Json | null
          conversation_history?: Json
          created_at?: string
          id?: string
          last_active?: string | null
          mode?: string
          solo_permission_scope?: string | null
          started_at?: string | null
          status?: string | null
          subminds_called?: string[] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      personality_settings: {
        Row: {
          adaptation_level: string
          alert_style: string
          approval_rule: string
          checkin_frequency: string
          competitor_tracking: boolean
          confidence_threshold: number
          created_at: string
          default_mode: string
          explanation_detail: number
          id: string
          industry: string[] | null
          proactive_suggestions: boolean
          show_reasoning: number
          tone: string
          updated_at: string
          user_id: string
          verbosity: string
        }
        Insert: {
          adaptation_level?: string
          alert_style?: string
          approval_rule?: string
          checkin_frequency?: string
          competitor_tracking?: boolean
          confidence_threshold?: number
          created_at?: string
          default_mode?: string
          explanation_detail?: number
          id?: string
          industry?: string[] | null
          proactive_suggestions?: boolean
          show_reasoning?: number
          tone?: string
          updated_at?: string
          user_id: string
          verbosity?: string
        }
        Update: {
          adaptation_level?: string
          alert_style?: string
          approval_rule?: string
          checkin_frequency?: string
          competitor_tracking?: boolean
          confidence_threshold?: number
          created_at?: string
          default_mode?: string
          explanation_detail?: number
          id?: string
          industry?: string[] | null
          proactive_suggestions?: boolean
          show_reasoning?: number
          tone?: string
          updated_at?: string
          user_id?: string
          verbosity?: string
        }
        Relationships: []
      }
      platform_metrics_daily: {
        Row: {
          api_cost_actual: number | null
          api_cost_without_compression: number | null
          avg_compression_ratio: number | null
          clients_by_tier: Json | null
          created_at: string
          date: string
          dictionary_hit_rate: number | null
          dictionary_size: number | null
          id: string
          mrr: number | null
          total_campaigns: number | null
          total_clients: number | null
          total_tokens_saved: number | null
          total_tokens_used: number | null
        }
        Insert: {
          api_cost_actual?: number | null
          api_cost_without_compression?: number | null
          avg_compression_ratio?: number | null
          clients_by_tier?: Json | null
          created_at?: string
          date: string
          dictionary_hit_rate?: number | null
          dictionary_size?: number | null
          id?: string
          mrr?: number | null
          total_campaigns?: number | null
          total_clients?: number | null
          total_tokens_saved?: number | null
          total_tokens_used?: number | null
        }
        Update: {
          api_cost_actual?: number | null
          api_cost_without_compression?: number | null
          avg_compression_ratio?: number | null
          clients_by_tier?: Json | null
          created_at?: string
          date?: string
          dictionary_hit_rate?: number | null
          dictionary_size?: number | null
          id?: string
          mrr?: number | null
          total_campaigns?: number | null
          total_clients?: number | null
          total_tokens_saved?: number | null
          total_tokens_used?: number | null
        }
        Relationships: []
      }
      post_analytics: {
        Row: {
          clicks: number | null
          comments: number | null
          created_at: string
          engagement_rate: number | null
          fetched_at: string
          id: string
          impressions: number | null
          likes: number | null
          platform: string
          platform_post_id: string | null
          post_queue_id: string
          raw_metrics: Json | null
          reach: number | null
          saves: number | null
          shares: number | null
          views: number | null
        }
        Insert: {
          clicks?: number | null
          comments?: number | null
          created_at?: string
          engagement_rate?: number | null
          fetched_at?: string
          id?: string
          impressions?: number | null
          likes?: number | null
          platform: string
          platform_post_id?: string | null
          post_queue_id: string
          raw_metrics?: Json | null
          reach?: number | null
          saves?: number | null
          shares?: number | null
          views?: number | null
        }
        Update: {
          clicks?: number | null
          comments?: number | null
          created_at?: string
          engagement_rate?: number | null
          fetched_at?: string
          id?: string
          impressions?: number | null
          likes?: number | null
          platform?: string
          platform_post_id?: string | null
          post_queue_id?: string
          raw_metrics?: Json | null
          reach?: number | null
          saves?: number | null
          shares?: number | null
          views?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "post_analytics_post_queue_id_fkey"
            columns: ["post_queue_id"]
            isOneToOne: false
            referencedRelation: "post_queue"
            referencedColumns: ["id"]
          },
        ]
      }
      post_platform_targets: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          platform: string
          platform_post_id: string | null
          post_queue_id: string
          published_at: string | null
          status: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          platform: string
          platform_post_id?: string | null
          post_queue_id: string
          published_at?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          platform?: string
          platform_post_id?: string | null
          post_queue_id?: string
          published_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_platform_targets_post_queue_id_fkey"
            columns: ["post_queue_id"]
            isOneToOne: false
            referencedRelation: "post_queue"
            referencedColumns: ["id"]
          },
        ]
      }
      post_queue: {
        Row: {
          approval_notes: string | null
          approved_at: string | null
          approved_by: string | null
          campaign_draft_id: string | null
          client_id: string | null
          content_type: string
          created_at: string
          error_message: string | null
          id: string
          image_url: string | null
          media_urls: string[] | null
          post_text: string | null
          published_at: string | null
          retry_count: number | null
          scheduled_at: string | null
          status: string
          updated_at: string
          user_id: string
          video_url: string | null
        }
        Insert: {
          approval_notes?: string | null
          approved_at?: string | null
          approved_by?: string | null
          campaign_draft_id?: string | null
          client_id?: string | null
          content_type?: string
          created_at?: string
          error_message?: string | null
          id?: string
          image_url?: string | null
          media_urls?: string[] | null
          post_text?: string | null
          published_at?: string | null
          retry_count?: number | null
          scheduled_at?: string | null
          status?: string
          updated_at?: string
          user_id: string
          video_url?: string | null
        }
        Update: {
          approval_notes?: string | null
          approved_at?: string | null
          approved_by?: string | null
          campaign_draft_id?: string | null
          client_id?: string | null
          content_type?: string
          created_at?: string
          error_message?: string | null
          id?: string
          image_url?: string | null
          media_urls?: string[] | null
          post_text?: string | null
          published_at?: string | null
          retry_count?: number | null
          scheduled_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "post_queue_campaign_draft_id_fkey"
            columns: ["campaign_draft_id"]
            isOneToOne: false
            referencedRelation: "campaign_drafts"
            referencedColumns: ["id"]
          },
        ]
      }
      product_assets: {
        Row: {
          asset_name: string
          asset_type: string | null
          asset_url: string
          created_at: string
          id: string
          metadata: Json | null
          product_id: string
          source: string | null
          thumbnail_url: string | null
          user_id: string
        }
        Insert: {
          asset_name: string
          asset_type?: string | null
          asset_url: string
          created_at?: string
          id?: string
          metadata?: Json | null
          product_id: string
          source?: string | null
          thumbnail_url?: string | null
          user_id: string
        }
        Update: {
          asset_name?: string
          asset_type?: string | null
          asset_url?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          product_id?: string
          source?: string | null
          thumbnail_url?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_assets_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_lines: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      product_profiles: {
        Row: {
          audience_outcome: string | null
          category: string | null
          certifications: string[] | null
          client_id: string | null
          created_at: string | null
          differentiators: string[] | null
          green_claims: string[] | null
          id: string
          key_features: string[] | null
          moat_data: Json | null
          price_point: string | null
          product_name: string | null
          red_claims: string[] | null
          updated_at: string | null
          user_id: string
          voice_indicators: Json | null
          yellow_claims: string[] | null
        }
        Insert: {
          audience_outcome?: string | null
          category?: string | null
          certifications?: string[] | null
          client_id?: string | null
          created_at?: string | null
          differentiators?: string[] | null
          green_claims?: string[] | null
          id?: string
          key_features?: string[] | null
          moat_data?: Json | null
          price_point?: string | null
          product_name?: string | null
          red_claims?: string[] | null
          updated_at?: string | null
          user_id: string
          voice_indicators?: Json | null
          yellow_claims?: string[] | null
        }
        Update: {
          audience_outcome?: string | null
          category?: string | null
          certifications?: string[] | null
          client_id?: string | null
          created_at?: string | null
          differentiators?: string[] | null
          green_claims?: string[] | null
          id?: string
          key_features?: string[] | null
          moat_data?: Json | null
          price_point?: string | null
          product_name?: string | null
          red_claims?: string[] | null
          updated_at?: string | null
          user_id?: string
          voice_indicators?: Json | null
          yellow_claims?: string[] | null
        }
        Relationships: []
      }
      products: {
        Row: {
          created_at: string
          id: string
          name: string
          product_line_id: string | null
          product_type: string
          short_description: string | null
          target_audience: string | null
          updated_at: string
          user_id: string
          value_propositions: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          product_line_id?: string | null
          product_type: string
          short_description?: string | null
          target_audience?: string | null
          updated_at?: string
          user_id: string
          value_propositions?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          product_line_id?: string | null
          product_type?: string
          short_description?: string | null
          target_audience?: string | null
          updated_at?: string
          user_id?: string
          value_propositions?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_product_line_id_fkey"
            columns: ["product_line_id"]
            isOneToOne: false
            referencedRelation: "product_lines"
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
      research_feed: {
        Row: {
          campaign_id: string | null
          client_id: string | null
          created_at: string
          finding_type: string | null
          id: string
          knp_payload: string | null
          raw_data: Json | null
          user_id: string
        }
        Insert: {
          campaign_id?: string | null
          client_id?: string | null
          created_at?: string
          finding_type?: string | null
          id?: string
          knp_payload?: string | null
          raw_data?: Json | null
          user_id: string
        }
        Update: {
          campaign_id?: string | null
          client_id?: string | null
          created_at?: string
          finding_type?: string | null
          id?: string
          knp_payload?: string | null
          raw_data?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      riverside_connections: {
        Row: {
          api_token: string
          connection_status: string | null
          created_at: string
          display_name: string | null
          id: string
          last_sync_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          api_token: string
          connection_status?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          last_sync_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          api_token?: string
          connection_status?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          last_sync_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      scheduled_campaigns: {
        Row: {
          campaign_name: string
          client_id: string | null
          created_at: string
          id: string
          image_url: string | null
          links: string[] | null
          media_urls: string[] | null
          platforms: string[]
          post_caption: string | null
          product: string | null
          scheduled_date: string
          scheduled_time: string
          status: string
          tags: string[] | null
          updated_at: string
          user_id: string
          video_url: string | null
        }
        Insert: {
          campaign_name: string
          client_id?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          links?: string[] | null
          media_urls?: string[] | null
          platforms?: string[]
          post_caption?: string | null
          product?: string | null
          scheduled_date: string
          scheduled_time: string
          status?: string
          tags?: string[] | null
          updated_at?: string
          user_id: string
          video_url?: string | null
        }
        Update: {
          campaign_name?: string
          client_id?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          links?: string[] | null
          media_urls?: string[] | null
          platforms?: string[]
          post_caption?: string | null
          product?: string | null
          scheduled_date?: string
          scheduled_time?: string
          status?: string
          tags?: string[] | null
          updated_at?: string
          user_id?: string
          video_url?: string | null
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
      solo_mode_logs: {
        Row: {
          client_id: string | null
          created_at: string
          decision_chain: Json | null
          decision_point: string
          id: string
          knp_payload_sent: Json | null
          knp_response_received: Json | null
          outcome: Json | null
          permission_granted_at: string | null
          permission_scope: string | null
          reasoning: string | null
          session_id: string
          submind_called: string | null
          subminds_invoked: string[] | null
          user_id: string
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          decision_chain?: Json | null
          decision_point: string
          id?: string
          knp_payload_sent?: Json | null
          knp_response_received?: Json | null
          outcome?: Json | null
          permission_granted_at?: string | null
          permission_scope?: string | null
          reasoning?: string | null
          session_id: string
          submind_called?: string | null
          subminds_invoked?: string[] | null
          user_id: string
        }
        Update: {
          client_id?: string | null
          created_at?: string
          decision_chain?: Json | null
          decision_point?: string
          id?: string
          knp_payload_sent?: Json | null
          knp_response_received?: Json | null
          outcome?: Json | null
          permission_granted_at?: string | null
          permission_scope?: string | null
          reasoning?: string | null
          session_id?: string
          submind_called?: string | null
          subminds_invoked?: string[] | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "solo_mode_logs_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "orchestrator_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      strategy_insights: {
        Row: {
          client_id: string | null
          confidence: number | null
          created_at: string | null
          id: string
          insight_text: string | null
          insight_type: string | null
          supporting_data: Json | null
        }
        Insert: {
          client_id?: string | null
          confidence?: number | null
          created_at?: string | null
          id?: string
          insight_text?: string | null
          insight_type?: string | null
          supporting_data?: Json | null
        }
        Update: {
          client_id?: string | null
          confidence?: number | null
          created_at?: string | null
          id?: string
          insight_text?: string | null
          insight_type?: string | null
          supporting_data?: Json | null
        }
        Relationships: []
      }
      strategy_updates: {
        Row: {
          applied_at: string | null
          approved: boolean | null
          client_id: string
          confidence_score: number | null
          created_at: string | null
          id: string
          new_strategy: Json | null
          old_strategy: Json | null
        }
        Insert: {
          applied_at?: string | null
          approved?: boolean | null
          client_id: string
          confidence_score?: number | null
          created_at?: string | null
          id?: string
          new_strategy?: Json | null
          old_strategy?: Json | null
        }
        Update: {
          applied_at?: string | null
          approved?: boolean | null
          client_id?: string
          confidence_score?: number | null
          created_at?: string | null
          id?: string
          new_strategy?: Json | null
          old_strategy?: Json | null
        }
        Relationships: []
      }
      submind_health_snapshots: {
        Row: {
          approval_rate: number | null
          avg_latency_ms: number | null
          avg_tokens_in: number | null
          avg_tokens_out: number | null
          created_at: string
          error_count: number | null
          id: string
          invocation_count: number | null
          submind_id: string
          success_count: number | null
          window_end: string | null
          window_start: string | null
        }
        Insert: {
          approval_rate?: number | null
          avg_latency_ms?: number | null
          avg_tokens_in?: number | null
          avg_tokens_out?: number | null
          created_at?: string
          error_count?: number | null
          id?: string
          invocation_count?: number | null
          submind_id: string
          success_count?: number | null
          window_end?: string | null
          window_start?: string | null
        }
        Update: {
          approval_rate?: number | null
          avg_latency_ms?: number | null
          avg_tokens_in?: number | null
          avg_tokens_out?: number | null
          created_at?: string
          error_count?: number | null
          id?: string
          invocation_count?: number | null
          submind_id?: string
          success_count?: number | null
          window_end?: string | null
          window_start?: string | null
        }
        Relationships: []
      }
      trello_connections: {
        Row: {
          api_key: string
          api_token: string
          connection_status: string | null
          created_at: string | null
          display_name: string | null
          id: string
          last_sync_at: string | null
          member_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          api_key: string
          api_token: string
          connection_status?: string | null
          created_at?: string | null
          display_name?: string | null
          id?: string
          last_sync_at?: string | null
          member_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          api_key?: string
          api_token?: string
          connection_status?: string | null
          created_at?: string | null
          display_name?: string | null
          id?: string
          last_sync_at?: string | null
          member_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_settings: {
        Row: {
          created_at: string
          id: string
          updated_at: string
          user_id: string
          zapier_webhook_url: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
          zapier_webhook_url?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
          zapier_webhook_url?: string | null
        }
        Relationships: []
      }
      viral_log: {
        Row: {
          avg_score: number | null
          campaign_card: Json | null
          client_id: string | null
          created_at: string
          id: string
          iteration_round: number
          loop_status: string | null
          top_score: number | null
          variant_scores: Json
          variants_accepted: number | null
        }
        Insert: {
          avg_score?: number | null
          campaign_card?: Json | null
          client_id?: string | null
          created_at?: string
          id?: string
          iteration_round?: number
          loop_status?: string | null
          top_score?: number | null
          variant_scores?: Json
          variants_accepted?: number | null
        }
        Update: {
          avg_score?: number | null
          campaign_card?: Json | null
          client_id?: string | null
          created_at?: string
          id?: string
          iteration_round?: number
          loop_status?: string | null
          top_score?: number | null
          variant_scores?: Json
          variants_accepted?: number | null
        }
        Relationships: []
      }
      waitlist: {
        Row: {
          created_at: string
          email: string
          full_name: string
          id: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name: string
          id?: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string
          id?: string
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
      google_drive_connections_safe: {
        Row: {
          assets_sheet_id: string | null
          assets_sheet_url: string | null
          brand_guidelines_sheet_id: string | null
          brand_guidelines_sheet_url: string | null
          connection_status: string | null
          created_at: string | null
          folder_id: string | null
          folder_url: string | null
          id: string | null
          last_sync_at: string | null
          metadata: Json | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          assets_sheet_id?: string | null
          assets_sheet_url?: string | null
          brand_guidelines_sheet_id?: string | null
          brand_guidelines_sheet_url?: string | null
          connection_status?: string | null
          created_at?: string | null
          folder_id?: string | null
          folder_url?: string | null
          id?: string | null
          last_sync_at?: string | null
          metadata?: Json | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          assets_sheet_id?: string | null
          assets_sheet_url?: string | null
          brand_guidelines_sheet_id?: string | null
          brand_guidelines_sheet_url?: string | null
          connection_status?: string | null
          created_at?: string | null
          folder_id?: string | null
          folder_url?: string | null
          id?: string | null
          last_sync_at?: string | null
          metadata?: Json | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      get_my_role: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      billing_status:
        | "trial"
        | "active"
        | "past_due"
        | "cancelled"
        | "suspended"
      billing_tier: "starter" | "growth" | "pro" | "enterprise"
      channel_status: "connected" | "disconnected" | "error"
      collab_priority: "urgent" | "normal" | "low"
      collab_sender: "client" | "admin"
      collab_status: "new" | "in_progress" | "waiting_on_client" | "resolved"
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
    Enums: {
      app_role: ["admin", "moderator", "user"],
      billing_status: ["trial", "active", "past_due", "cancelled", "suspended"],
      billing_tier: ["starter", "growth", "pro", "enterprise"],
      channel_status: ["connected", "disconnected", "error"],
      collab_priority: ["urgent", "normal", "low"],
      collab_sender: ["client", "admin"],
      collab_status: ["new", "in_progress", "waiting_on_client", "resolved"],
    },
  },
} as const
