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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      api_settings: {
        Row: {
          id: number
          model: string | null
          provider: string
          updated_at: string
        }
        Insert: {
          id?: number
          model?: string | null
          provider?: string
          updated_at?: string
        }
        Update: {
          id?: number
          model?: string | null
          provider?: string
          updated_at?: string
        }
        Relationships: []
      }
      appointment_guidance_reports: {
        Row: {
          created_at: string
          details: string
          fact_id: string
          finding: string
          id: string
          reason: string
          resolved_at: string | null
          source_url: string
        }
        Insert: {
          created_at?: string
          details?: string
          fact_id: string
          finding: string
          id?: string
          reason: string
          resolved_at?: string | null
          source_url: string
        }
        Update: {
          created_at?: string
          details?: string
          fact_id?: string
          finding?: string
          id?: string
          reason?: string
          resolved_at?: string | null
          source_url?: string
        }
        Relationships: []
      }
      audit_log: {
        Row: {
          action: string
          actor_email: string | null
          actor_id: string | null
          created_at: string
          details: Json
          entity: string
          entity_id: string | null
          id: number
        }
        Insert: {
          action: string
          actor_email?: string | null
          actor_id?: string | null
          created_at?: string
          details?: Json
          entity: string
          entity_id?: string | null
          id?: never
        }
        Update: {
          action?: string
          actor_email?: string | null
          actor_id?: string | null
          created_at?: string
          details?: Json
          entity?: string
          entity_id?: string | null
          id?: never
        }
        Relationships: []
      }
      care_options: {
        Row: {
          bio: string | null
          care_check: Json | null
          care_checked_at: string | null
          care_types: string[]
          city: string | null
          contact_changed_at: string | null
          external_id: string
          first_seen: string
          formats: string[]
          geo_estimated: boolean
          homepage_check: Json | null
          homepage_checked_at: string | null
          hours: string | null
          id: string
          insurance: string[]
          kind: string
          last_validated: string
          lat: number | null
          lon: number | null
          name: string
          needs: string[]
          phone: string | null
          provider_website: string | null
          review_reason: string | null
          source_id: string
          state: string | null
          status: string
          updated_at: string
          va_vs_community: string
          veteran_focus: boolean
          website: string
        }
        Insert: {
          bio?: string | null
          care_check?: Json | null
          care_checked_at?: string | null
          care_types?: string[]
          city?: string | null
          contact_changed_at?: string | null
          external_id: string
          first_seen?: string
          formats?: string[]
          geo_estimated?: boolean
          homepage_check?: Json | null
          homepage_checked_at?: string | null
          hours?: string | null
          id?: string
          insurance?: string[]
          kind: string
          last_validated?: string
          lat?: number | null
          lon?: number | null
          name: string
          needs?: string[]
          phone?: string | null
          provider_website?: string | null
          review_reason?: string | null
          source_id: string
          state?: string | null
          status?: string
          updated_at?: string
          va_vs_community?: string
          veteran_focus?: boolean
          website: string
        }
        Update: {
          bio?: string | null
          care_check?: Json | null
          care_checked_at?: string | null
          care_types?: string[]
          city?: string | null
          contact_changed_at?: string | null
          external_id?: string
          first_seen?: string
          formats?: string[]
          geo_estimated?: boolean
          homepage_check?: Json | null
          homepage_checked_at?: string | null
          hours?: string | null
          id?: string
          insurance?: string[]
          kind?: string
          last_validated?: string
          lat?: number | null
          lon?: number | null
          name?: string
          needs?: string[]
          phone?: string | null
          provider_website?: string | null
          review_reason?: string | null
          source_id?: string
          state?: string | null
          status?: string
          updated_at?: string
          va_vs_community?: string
          veteran_focus?: boolean
          website?: string
        }
        Relationships: [
          {
            foreignKeyName: "care_options_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "data_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      care_providers: {
        Row: {
          bio: string | null
          credentials: string | null
          id: string
          insurance: string[]
          is_sample: boolean
          last_checked: string
          name: string
          resource_id: string
          source_url: string
        }
        Insert: {
          bio?: string | null
          credentials?: string | null
          id?: string
          insurance?: string[]
          is_sample?: boolean
          last_checked?: string
          name: string
          resource_id: string
          source_url: string
        }
        Update: {
          bio?: string | null
          credentials?: string | null
          id?: string
          insurance?: string[]
          is_sample?: boolean
          last_checked?: string
          name?: string
          resource_id?: string
          source_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "care_providers_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "care_resources"
            referencedColumns: ["id"]
          },
        ]
      }
      care_resources: {
        Row: {
          care_types: string[]
          city: string | null
          formats: string[]
          id: string
          kind: string
          last_checked: string
          name: string
          needs: string[]
          payment: string[]
          phone: string | null
          source_id: string
          source_url: string
          state: string | null
          verified: boolean
          veteran_focus: boolean
        }
        Insert: {
          care_types?: string[]
          city?: string | null
          formats?: string[]
          id?: string
          kind: string
          last_checked?: string
          name: string
          needs?: string[]
          payment?: string[]
          phone?: string | null
          source_id: string
          source_url: string
          state?: string | null
          verified?: boolean
          veteran_focus?: boolean
        }
        Update: {
          care_types?: string[]
          city?: string | null
          formats?: string[]
          id?: string
          kind?: string
          last_checked?: string
          name?: string
          needs?: string[]
          payment?: string[]
          phone?: string | null
          source_id?: string
          source_url?: string
          state?: string | null
          verified?: boolean
          veteran_focus?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "care_resources_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "data_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      community_check_history: {
        Row: {
          care_option_id: string
          care_reason: string
          care_status: string
          checked_at: string
          city: string | null
          homepage_status: string
          homepage_url: string | null
          id: string
          provider_name: string
          redirected_to: string | null
          source_url: string
          state: string | null
          week_start: string
        }
        Insert: {
          care_option_id: string
          care_reason: string
          care_status: string
          checked_at: string
          city?: string | null
          homepage_status: string
          homepage_url?: string | null
          id?: string
          provider_name: string
          redirected_to?: string | null
          source_url: string
          state?: string | null
          week_start: string
        }
        Update: {
          care_option_id?: string
          care_reason?: string
          care_status?: string
          checked_at?: string
          city?: string | null
          homepage_status?: string
          homepage_url?: string | null
          id?: string
          provider_name?: string
          redirected_to?: string | null
          source_url?: string
          state?: string | null
          week_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_check_history_care_option_id_fkey"
            columns: ["care_option_id"]
            isOneToOne: false
            referencedRelation: "care_options"
            referencedColumns: ["id"]
          },
        ]
      }
      data_sources: {
        Row: {
          category: string
          connector: string | null
          created_at: string
          description: string | null
          enabled: boolean
          id: string
          name: string
          updated_at: string
          url: string
        }
        Insert: {
          category?: string
          connector?: string | null
          created_at?: string
          description?: string | null
          enabled?: boolean
          id?: string
          name: string
          updated_at?: string
          url: string
        }
        Update: {
          category?: string
          connector?: string | null
          created_at?: string
          description?: string | null
          enabled?: boolean
          id?: string
          name?: string
          updated_at?: string
          url?: string
        }
        Relationships: []
      }
      guest_usage: {
        Row: {
          count: number
          key: string
          updated_at: string
          window_start: string
        }
        Insert: {
          count?: number
          key: string
          updated_at?: string
          window_start?: string
        }
        Update: {
          count?: number
          key?: string
          updated_at?: string
          window_start?: string
        }
        Relationships: []
      }
      link_checks: {
        Row: {
          checked_at: string
          http_status: number | null
          ok: boolean
          url: string
        }
        Insert: {
          checked_at?: string
          http_status?: number | null
          ok?: boolean
          url: string
        }
        Update: {
          checked_at?: string
          http_status?: number | null
          ok?: boolean
          url?: string
        }
        Relationships: []
      }
      mfa_proofs: {
        Row: {
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      mfa_recovery_attempts: {
        Row: {
          created_at: string
          id: string
          success: boolean
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          success?: boolean
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          success?: boolean
          user_id?: string
        }
        Relationships: []
      }
      mfa_recovery_codes: {
        Row: {
          code_hash: string
          created_at: string
          id: string
          used_at: string | null
          user_id: string
        }
        Insert: {
          code_hash: string
          created_at?: string
          id?: string
          used_at?: string | null
          user_id: string
        }
        Update: {
          code_hash?: string
          created_at?: string
          id?: string
          used_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      mfa_recovery_events: {
        Row: {
          created_at: string
          id: string
          kind: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          kind: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          user_id?: string
        }
        Relationships: []
      }
      mfa_sessions: {
        Row: {
          cleared_at: string
          session_id: string
          user_id: string
        }
        Insert: {
          cleared_at?: string
          session_id: string
          user_id: string
        }
        Update: {
          cleared_at?: string
          session_id?: string
          user_id?: string
        }
        Relationships: []
      }
      prep_fact_checks: {
        Row: {
          checked_at: string
          fact_id: string
          http_status: number | null
          ok: boolean
          source_url: string
        }
        Insert: {
          checked_at?: string
          fact_id: string
          http_status?: number | null
          ok: boolean
          source_url: string
        }
        Update: {
          checked_at?: string
          fact_id?: string
          http_status?: number | null
          ok?: boolean
          source_url?: string
        }
        Relationships: []
      }
      search_history: {
        Row: {
          created_at: string
          id: string
          messages: Json
          question: string
          reply: string
          results: Json
          user_id: string
          variables: Json
        }
        Insert: {
          created_at?: string
          id?: string
          messages?: Json
          question: string
          reply: string
          results?: Json
          user_id: string
          variables?: Json
        }
        Update: {
          created_at?: string
          id?: string
          messages?: Json
          question?: string
          reply?: string
          results?: Json
          user_id?: string
          variables?: Json
        }
        Relationships: []
      }
      user_preferences: {
        Row: {
          prefs: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          prefs?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          prefs?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_security: {
        Row: {
          email_mfa: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          email_mfa?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          email_mfa?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_analytics:
        | { Args: never; Returns: Json }
        | { Args: { _from: string; _to: string }; Returns: Json }
      claim_first_admin: { Args: never; Returns: boolean }
      get_ai_settings: {
        Args: never
        Returns: {
          model: string
          provider: string
        }[]
      }
      grant_admin: { Args: { _email: string }; Returns: string }
      has_mfa_cleared: { Args: never; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
      list_admins: {
        Args: never
        Returns: {
          email: string
          granted: boolean
          user_id: string
        }[]
      }
      log_password_reset: { Args: { _email: string }; Returns: string }
      log_validation_run: { Args: { _details: Json }; Returns: undefined }
      recovery_activity: { Args: never; Returns: Json }
      revoke_admin: { Args: { _user_id: string }; Returns: undefined }
      use_guest_result: {
        Args: { _keys: string[]; _limits: number[] }
        Returns: number
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["admin", "user"],
    },
  },
} as const
