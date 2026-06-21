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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      ai_request_log: {
        Row: {
          child_id: string | null
          created_at: string
          flagged: boolean
          id: string
          model: string | null
          tokens_used: number | null
          user_id: string | null
        }
        Insert: {
          child_id?: string | null
          created_at?: string
          flagged?: boolean
          id?: string
          model?: string | null
          tokens_used?: number | null
          user_id?: string | null
        }
        Update: {
          child_id?: string | null
          created_at?: string
          flagged?: boolean
          id?: string
          model?: string | null
          tokens_used?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      assignments: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          due_at: string | null
          id: string
          lesson_id: string | null
          max_score: number
          rubric: string | null
          title: string
          track: Database["public"]["Enums"]["track"] | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_at?: string | null
          id?: string
          lesson_id?: string | null
          max_score?: number
          rubric?: string | null
          title: string
          track?: Database["public"]["Enums"]["track"] | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_at?: string | null
          id?: string
          lesson_id?: string | null
          max_score?: number
          rubric?: string | null
          title?: string
          track?: Database["public"]["Enums"]["track"] | null
        }
        Relationships: []
      }
      audit_log: {
        Row: {
          action: string
          created_at: string
          id: string
          meta: Json | null
          resource: string | null
          resource_id: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          meta?: Json | null
          resource?: string | null
          resource_id?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          meta?: Json | null
          resource?: string | null
          resource_id?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      badge_defs: {
        Row: {
          created_at: string
          description: string | null
          icon_emoji: string
          id: string
          name: string
          slug: string
          track: Database["public"]["Enums"]["track"] | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          icon_emoji?: string
          id?: string
          name: string
          slug: string
          track?: Database["public"]["Enums"]["track"] | null
        }
        Update: {
          created_at?: string
          description?: string | null
          icon_emoji?: string
          id?: string
          name?: string
          slug?: string
          track?: Database["public"]["Enums"]["track"] | null
        }
        Relationships: []
      }
      child_badges: {
        Row: {
          badge_slug: string
          child_id: string
          earned_at: string
          id: string
        }
        Insert: {
          badge_slug: string
          child_id: string
          earned_at?: string
          id?: string
        }
        Update: {
          badge_slug?: string
          child_id?: string
          earned_at?: string
          id?: string
        }
        Relationships: []
      }
      courses: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_published: boolean
          order_index: number
          title: string
          track: Database["public"]["Enums"]["track"]
          week_number: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_published?: boolean
          order_index?: number
          title: string
          track: Database["public"]["Enums"]["track"]
          week_number?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_published?: boolean
          order_index?: number
          title?: string
          track?: Database["public"]["Enums"]["track"]
          week_number?: number
        }
        Relationships: []
      }
      integration_settings: {
        Row: {
          id: string
          is_secret: boolean
          key: string
          label: string | null
          updated_at: string
          updated_by: string | null
          value: string
        }
        Insert: {
          id?: string
          is_secret?: boolean
          key: string
          label?: string | null
          updated_at?: string
          updated_by?: string | null
          value: string
        }
        Update: {
          id?: string
          is_secret?: boolean
          key?: string
          label?: string | null
          updated_at?: string
          updated_by?: string | null
          value?: string
        }
        Relationships: []
      }
      lesson_progress: {
        Row: {
          child_id: string
          completed: boolean
          completed_at: string | null
          created_at: string
          id: string
          lesson_id: string
          time_spent_seconds: number
        }
        Insert: {
          child_id: string
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          id?: string
          lesson_id: string
          time_spent_seconds?: number
        }
        Update: {
          child_id?: string
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          id?: string
          lesson_id?: string
          time_spent_seconds?: number
        }
        Relationships: []
      }
      lessons: {
        Row: {
          content_url: string | null
          course_id: string
          created_at: string
          duration_minutes: number
          game_slug: string | null
          id: string
          is_published: boolean
          order_index: number
          title: string
          type: string
        }
        Insert: {
          content_url?: string | null
          course_id: string
          created_at?: string
          duration_minutes?: number
          game_slug?: string | null
          id?: string
          is_published?: boolean
          order_index?: number
          title: string
          type?: string
        }
        Update: {
          content_url?: string | null
          course_id?: string
          created_at?: string
          duration_minutes?: number
          game_slug?: string | null
          id?: string
          is_published?: boolean
          order_index?: number
          title?: string
          type?: string
        }
        Relationships: []
      }
      live_sessions: {
        Row: {
          created_at: string
          duration_minutes: number
          id: string
          instructor_id: string | null
          is_published: boolean
          max_attendees: number | null
          meeting_id: string | null
          meeting_url: string | null
          notes: string | null
          provider: Database["public"]["Enums"]["meeting_provider"]
          scheduled_at: string
          title: string
          track: Database["public"]["Enums"]["track"] | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          duration_minutes?: number
          id?: string
          instructor_id?: string | null
          is_published?: boolean
          max_attendees?: number | null
          meeting_id?: string | null
          meeting_url?: string | null
          notes?: string | null
          provider?: Database["public"]["Enums"]["meeting_provider"]
          scheduled_at: string
          title: string
          track?: Database["public"]["Enums"]["track"] | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          duration_minutes?: number
          id?: string
          instructor_id?: string | null
          is_published?: boolean
          max_attendees?: number | null
          meeting_id?: string | null
          meeting_url?: string | null
          notes?: string | null
          provider?: Database["public"]["Enums"]["meeting_provider"]
          scheduled_at?: string
          title?: string
          track?: Database["public"]["Enums"]["track"] | null
          updated_at?: string
        }
        Relationships: []
      }
      promo_codes: {
        Row: {
          code: string
          created_at: string
          discount_pct: number
          expires_at: string | null
          id: string
          is_active: boolean
          max_uses: number | null
          uses: number
        }
        Insert: {
          code: string
          created_at?: string
          discount_pct: number
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number | null
          uses?: number
        }
        Update: {
          code?: string
          created_at?: string
          discount_pct?: number
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number | null
          uses?: number
        }
        Relationships: []
      }
      session_attendance: {
        Row: {
          child_id: string
          id: string
          joined_at: string | null
          left_at: string | null
          session_id: string
        }
        Insert: {
          child_id: string
          id?: string
          joined_at?: string | null
          left_at?: string | null
          session_id: string
        }
        Update: {
          child_id?: string
          id?: string
          joined_at?: string | null
          left_at?: string | null
          session_id?: string
        }
        Relationships: []
      }
      submissions: {
        Row: {
          ai_draft_feedback: string | null
          ai_draft_grade: number | null
          assignment_id: string
          child_id: string
          content: string | null
          feedback: string | null
          file_url: string | null
          grade: number | null
          graded_at: string | null
          graded_by: string | null
          id: string
          submitted_at: string
        }
        Insert: {
          ai_draft_feedback?: string | null
          ai_draft_grade?: number | null
          assignment_id: string
          child_id: string
          content?: string | null
          feedback?: string | null
          file_url?: string | null
          grade?: number | null
          graded_at?: string | null
          graded_by?: string | null
          id?: string
          submitted_at?: string
        }
        Update: {
          ai_draft_feedback?: string | null
          ai_draft_grade?: number | null
          assignment_id?: string
          child_id?: string
          content?: string | null
          feedback?: string | null
          file_url?: string | null
          grade?: number | null
          graded_at?: string | null
          graded_by?: string | null
          id?: string
          submitted_at?: string
        }
        Relationships: []
      }
      children: {
        Row: {
          age: number
          avatar_key: string
          created_at: string
          display_name: string
          id: string
          parent_id: string
          track: Database["public"]["Enums"]["track"]
          updated_at: string
        }
        Insert: {
          age: number
          avatar_key?: string
          created_at?: string
          display_name: string
          id?: string
          parent_id: string
          track: Database["public"]["Enums"]["track"]
          updated_at?: string
        }
        Update: {
          age?: number
          avatar_key?: string
          created_at?: string
          display_name?: string
          id?: string
          parent_id?: string
          track?: Database["public"]["Enums"]["track"]
          updated_at?: string
        }
        Relationships: []
      }
      consent_records: {
        Row: {
          accepted_at: string
          document_type: string
          document_version: string
          id: string
          ip_address: string | null
          parent_id: string
        }
        Insert: {
          accepted_at?: string
          document_type: string
          document_version: string
          id?: string
          ip_address?: string | null
          parent_id: string
        }
        Update: {
          accepted_at?: string
          document_type?: string
          document_version?: string
          id?: string
          ip_address?: string | null
          parent_id?: string
        }
        Relationships: []
      }
      enrollments: {
        Row: {
          child_id: string
          created_at: string
          external_subscription_id: string | null
          id: string
          parent_id: string
          payment_provider: string | null
          payment_status: Database["public"]["Enums"]["payment_status"]
          plan_id: string
          updated_at: string
        }
        Insert: {
          child_id: string
          created_at?: string
          external_subscription_id?: string | null
          id?: string
          parent_id: string
          payment_provider?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          plan_id: string
          updated_at?: string
        }
        Update: {
          child_id?: string
          created_at?: string
          external_subscription_id?: string | null
          id?: string
          parent_id?: string
          payment_provider?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          plan_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "enrollments_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollments_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      plans: {
        Row: {
          created_at: string
          currency: string
          description: string | null
          id: string
          is_active: boolean
          kind: Database["public"]["Enums"]["plan_kind"]
          name: string
          price_cents: number
          sibling_discount_pct: number
          slug: string
        }
        Insert: {
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          is_active?: boolean
          kind: Database["public"]["Enums"]["plan_kind"]
          name: string
          price_cents: number
          sibling_discount_pct?: number
          slug: string
        }
        Update: {
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          is_active?: boolean
          kind?: Database["public"]["Enums"]["plan_kind"]
          name?: string
          price_cents?: number
          sibling_discount_pct?: number
          slug?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string | null
          id: string
          locale: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          full_name?: string | null
          id: string
          locale?: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          full_name?: string | null
          id?: string
          locale?: string
          phone?: string | null
          updated_at?: string
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "super_admin" | "instructor" | "support" | "parent"
      meeting_provider: "zoom" | "teams" | "google_meet" | "custom"
      payment_status:
        | "pending"
        | "active"
        | "past_due"
        | "canceled"
        | "refunded"
      plan_kind: "one_time" | "monthly"
      track: "spark_cubs" | "code_rangers" | "cyber_pioneers"
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
      app_role: ["super_admin", "instructor", "support", "parent"],
      payment_status: ["pending", "active", "past_due", "canceled", "refunded"],
      plan_kind: ["one_time", "monthly"],
      track: ["spark_cubs", "code_rangers", "cyber_pioneers"],
    },
  },
} as const
