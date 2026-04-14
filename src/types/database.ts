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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      activity_log: {
        Row: {
          action: string
          actor_id: string
          created_at: string | null
          entity_id: string | null
          entity_name: string | null
          entity_type: string
          id: string
          metadata: Json | null
          user_id: string
        }
        Insert: {
          action: string
          actor_id: string
          created_at?: string | null
          entity_id?: string | null
          entity_name?: string | null
          entity_type: string
          id?: string
          metadata?: Json | null
          user_id: string
        }
        Update: {
          action?: string
          actor_id?: string
          created_at?: string | null
          entity_id?: string | null
          entity_name?: string | null
          entity_type?: string
          id?: string
          metadata?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      ai_suggestions: {
        Row: {
          action_data: Json | null
          action_type: string | null
          body: string
          confidence: number | null
          created_at: string | null
          id: string
          source: string
          status: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          action_data?: Json | null
          action_type?: string | null
          body: string
          confidence?: number | null
          created_at?: string | null
          id?: string
          source: string
          status?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          action_data?: Json | null
          action_type?: string | null
          body?: string
          confidence?: number | null
          created_at?: string | null
          id?: string
          source?: string
          status?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      calendar_events: {
        Row: {
          end_time: string | null
          external_id: string | null
          id: string
          linked_task_id: string | null
          provider: string
          start_time: string
          synced_at: string | null
          title: string
          user_id: string
        }
        Insert: {
          end_time?: string | null
          external_id?: string | null
          id?: string
          linked_task_id?: string | null
          provider: string
          start_time: string
          synced_at?: string | null
          title: string
          user_id: string
        }
        Update: {
          end_time?: string | null
          external_id?: string | null
          id?: string
          linked_task_id?: string | null
          provider?: string
          start_time?: string
          synced_at?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_events_linked_task_id_fkey"
            columns: ["linked_task_id"]
            isOneToOne: false
            referencedRelation: "planner_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      insights_snapshots: {
        Row: {
          created_at: string | null
          data: Json
          id: string
          period_end: string
          period_start: string
          snapshot_type: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          data?: Json
          id?: string
          period_end: string
          period_start: string
          snapshot_type: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          data?: Json
          id?: string
          period_end?: string
          period_start?: string
          snapshot_type?: string
          user_id?: string
        }
        Relationships: []
      }
      list_collaborators: {
        Row: {
          email: string | null
          id: string
          invited_at: string | null
          invited_by: string | null
          list_id: string
          role: string | null
          status: string | null
          user_id: string
        }
        Insert: {
          email?: string | null
          id?: string
          invited_at?: string | null
          invited_by?: string | null
          list_id: string
          role?: string | null
          status?: string | null
          user_id: string
        }
        Update: {
          email?: string | null
          id?: string
          invited_at?: string | null
          invited_by?: string | null
          list_id?: string
          role?: string | null
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "list_collaborators_list_id_fkey"
            columns: ["list_id"]
            isOneToOne: false
            referencedRelation: "lists"
            referencedColumns: ["id"]
          },
        ]
      }
      list_items: {
        Row: {
          added_by: string | null
          category: string
          completed: boolean | null
          created_at: string | null
          due_date: string | null
          id: string
          list_id: string
          name: string
          notes: string | null
          photo_url: string | null
          price: number | null
          priority: boolean | null
          quantity: number | null
          recurring_interval: string | null
          sort_order: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          added_by?: string | null
          category: string
          completed?: boolean | null
          created_at?: string | null
          due_date?: string | null
          id?: string
          list_id: string
          name: string
          notes?: string | null
          photo_url?: string | null
          price?: number | null
          priority?: boolean | null
          quantity?: number | null
          recurring_interval?: string | null
          sort_order?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          added_by?: string | null
          category?: string
          completed?: boolean | null
          created_at?: string | null
          due_date?: string | null
          id?: string
          list_id?: string
          name?: string
          notes?: string | null
          photo_url?: string | null
          price?: number | null
          priority?: boolean | null
          quantity?: number | null
          recurring_interval?: string | null
          sort_order?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "list_items_list_id_fkey"
            columns: ["list_id"]
            isOneToOne: false
            referencedRelation: "lists"
            referencedColumns: ["id"]
          },
        ]
      }
      lists: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_shared: boolean | null
          name: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_shared?: boolean | null
          name?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_shared?: boolean | null
          name?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string
          created_at: string | null
          data: Json | null
          id: string
          read: boolean | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string | null
          data?: Json | null
          id?: string
          read?: boolean | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string | null
          data?: Json | null
          id?: string
          read?: boolean | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      planner_tasks: {
        Row: {
          category: string | null
          created_at: string | null
          description: string | null
          due_date: string | null
          id: string
          linked_list_id: string | null
          linked_list_item_id: string | null
          priority: string | null
          recurring_interval: string | null
          scheduled_date: string | null
          scheduled_time: string | null
          sort_order: number | null
          status: string | null
          tags: string[] | null
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          linked_list_id?: string | null
          linked_list_item_id?: string | null
          priority?: string | null
          recurring_interval?: string | null
          scheduled_date?: string | null
          scheduled_time?: string | null
          sort_order?: number | null
          status?: string | null
          tags?: string[] | null
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          linked_list_id?: string | null
          linked_list_item_id?: string | null
          priority?: string | null
          recurring_interval?: string | null
          scheduled_date?: string | null
          scheduled_time?: string | null
          sort_order?: number | null
          status?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "planner_tasks_linked_list_id_fkey"
            columns: ["linked_list_id"]
            isOneToOne: false
            referencedRelation: "lists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "planner_tasks_linked_list_item_id_fkey"
            columns: ["linked_list_item_id"]
            isOneToOne: false
            referencedRelation: "list_items"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          clerk_id: string
          created_at: string | null
          display_name: string | null
          email: string
          id: string
          subscription_tier: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          clerk_id: string
          created_at?: string | null
          display_name?: string | null
          email: string
          id?: string
          subscription_tier?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          display_name?: string | null
          email?: string
          id?: string
          subscription_tier?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      user_settings: {
        Row: {
          accessibility_high_contrast: boolean | null
          accessibility_larger_text: boolean | null
          accessibility_voice: boolean | null
          created_at: string | null
          currency: string | null
          data_cloud_sync: boolean | null
          data_offline: boolean | null
          date_format: string | null
          id: string
          integrations_ai_personalization: boolean | null
          integrations_calendar_sync: boolean | null
          language: string | null
          notifications_budget: boolean | null
          notifications_collab: boolean | null
          notifications_reminders: boolean | null
          security_two_factor: boolean | null
          theme: string | null
          updated_at: string | null
          user_id: string
          weekly_budget: number | null
        }
        Insert: {
          accessibility_high_contrast?: boolean | null
          accessibility_larger_text?: boolean | null
          accessibility_voice?: boolean | null
          created_at?: string | null
          currency?: string | null
          data_cloud_sync?: boolean | null
          data_offline?: boolean | null
          date_format?: string | null
          id?: string
          integrations_ai_personalization?: boolean | null
          integrations_calendar_sync?: boolean | null
          language?: string | null
          notifications_budget?: boolean | null
          notifications_collab?: boolean | null
          notifications_reminders?: boolean | null
          security_two_factor?: boolean | null
          theme?: string | null
          updated_at?: string | null
          user_id: string
          weekly_budget?: number | null
        }
        Update: {
          accessibility_high_contrast?: boolean | null
          accessibility_larger_text?: boolean | null
          accessibility_voice?: boolean | null
          created_at?: string | null
          currency?: string | null
          data_cloud_sync?: boolean | null
          data_offline?: boolean | null
          date_format?: string | null
          id?: string
          integrations_ai_personalization?: boolean | null
          integrations_calendar_sync?: boolean | null
          language?: string | null
          notifications_budget?: boolean | null
          notifications_collab?: boolean | null
          notifications_reminders?: boolean | null
          security_two_factor?: boolean | null
          theme?: string | null
          updated_at?: string | null
          user_id?: string
          weekly_budget?: number | null
        }
        Relationships: []
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
