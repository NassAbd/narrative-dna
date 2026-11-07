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
      jury_control: {
        Row: {
          active_job: string | null
          id: boolean
          lease_until: string | null
          openai_reserved: number
          oriane_reserved: number
          used: number
        }
        Insert: {
          active_job?: string | null
          id?: boolean
          lease_until?: string | null
          openai_reserved?: number
          oriane_reserved?: number
          used?: number
        }
        Update: {
          active_job?: string | null
          id?: boolean
          lease_until?: string | null
          openai_reserved?: number
          oriane_reserved?: number
          used?: number
        }
        Relationships: []
      }
      jury_job_access: {
        Row: {
          cached: boolean
          idempotency_key: string
          job_id: string
          session_id: string
        }
        Insert: {
          cached?: boolean
          idempotency_key: string
          job_id: string
          session_id: string
        }
        Update: {
          cached?: boolean
          idempotency_key?: string
          job_id?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "jury_job_access_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jury_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jury_job_access_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "jury_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      jury_jobs: {
        Row: {
          cache_key: string
          cancel_requested: boolean
          completed_stages: Json
          deadline: string
          error_code: string | null
          id: string
          idempotency_key: string
          query: Json
          result: Json | null
          run_token: string | null
          session_id: string
          stage: string
          status: string
        }
        Insert: {
          cache_key: string
          cancel_requested?: boolean
          completed_stages?: Json
          deadline: string
          error_code?: string | null
          id?: string
          idempotency_key: string
          query: Json
          result?: Json | null
          run_token?: string | null
          session_id: string
          stage?: string
          status?: string
        }
        Update: {
          cache_key?: string
          cancel_requested?: boolean
          completed_stages?: Json
          deadline?: string
          error_code?: string | null
          id?: string
          idempotency_key?: string
          query?: Json
          result?: Json | null
          run_token?: string | null
          session_id?: string
          stage?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "jury_jobs_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "jury_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      jury_login_windows: {
        Row: {
          attempts: number
          bucket: string
          expires_at: string
        }
        Insert: {
          attempts?: number
          bucket: string
          expires_at: string
        }
        Update: {
          attempts?: number
          bucket?: string
          expires_at?: string
        }
        Relationships: []
      }
      jury_sessions: {
        Row: {
          credential_version: string
          csrf_hash: string
          expires_at: string
          id: string
          revoked: boolean
          token_hash: string
        }
        Insert: {
          credential_version: string
          csrf_hash: string
          expires_at: string
          id?: string
          revoked?: boolean
          token_hash: string
        }
        Update: {
          credential_version?: string
          csrf_hash?: string
          expires_at?: string
          id?: string
          revoked?: boolean
          token_hash?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      jury_backend: { Args: { p_action: string; p_args?: Json }; Returns: Json }
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
    Enums: {},
  },
} as const
