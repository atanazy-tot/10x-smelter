export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  graphql_public: {
    Tables: Record<never, never>
    Views: Record<never, never>
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: Record<never, never>
    CompositeTypes: Record<never, never>
  }
  public: {
    Tables: {
      anonymous_usage: {
        Row: {
          date_utc: string
          ip_hash: string
          smelts_used: number
        }
        Insert: {
          date_utc: string
          ip_hash: string
          smelts_used?: number
        }
        Update: {
          date_utc?: string
          ip_hash?: string
          smelts_used?: number
        }
        Relationships: []
      }
      default_prompts: {
        Row: {
          body: string
          created_at: string
          description: string | null
          name: Database["public"]["Enums"]["default_prompt_name"]
          title: string
          updated_at: string
        }
        Insert: {
          body: string
          created_at?: string
          description?: string | null
          name: Database["public"]["Enums"]["default_prompt_name"]
          title: string
          updated_at?: string
        }
        Update: {
          body?: string
          created_at?: string
          description?: string | null
          name?: Database["public"]["Enums"]["default_prompt_name"]
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      prompt_sections: {
        Row: {
          created_at: string
          id: string
          position: number
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          position?: number
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          position?: number
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      prompts: {
        Row: {
          body: string
          created_at: string
          id: string
          position: number
          section_id: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          position?: number
          section_id?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          position?: number
          section_id?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "prompts_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "prompt_sections"
            referencedColumns: ["id"]
          },
        ]
      }
      smelt_files: {
        Row: {
          completed_at: string | null
          created_at: string
          duration_seconds: number | null
          error_code:
            | Database["public"]["Enums"]["smelt_file_error_code"]
            | null
          filename: string | null
          id: string
          input_type: Database["public"]["Enums"]["input_type"]
          position: number
          size_bytes: number | null
          smelt_id: string
          status: Database["public"]["Enums"]["smelt_file_status"]
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          duration_seconds?: number | null
          error_code?:
            | Database["public"]["Enums"]["smelt_file_error_code"]
            | null
          filename?: string | null
          id?: string
          input_type: Database["public"]["Enums"]["input_type"]
          position?: number
          size_bytes?: number | null
          smelt_id: string
          status?: Database["public"]["Enums"]["smelt_file_status"]
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          duration_seconds?: number | null
          error_code?:
            | Database["public"]["Enums"]["smelt_file_error_code"]
            | null
          filename?: string | null
          id?: string
          input_type?: Database["public"]["Enums"]["input_type"]
          position?: number
          size_bytes?: number | null
          smelt_id?: string
          status?: Database["public"]["Enums"]["smelt_file_status"]
        }
        Relationships: [
          {
            foreignKeyName: "smelt_files_smelt_id_fkey"
            columns: ["smelt_id"]
            isOneToOne: false
            referencedRelation: "smelts"
            referencedColumns: ["id"]
          },
        ]
      }
      smelts: {
        Row: {
          completed_at: string | null
          created_at: string
          default_prompt_names: Database["public"]["Enums"]["default_prompt_name"][]
          error_code: Database["public"]["Enums"]["smelt_error_code"] | null
          error_message: string | null
          id: string
          mode: Database["public"]["Enums"]["smelt_mode"]
          status: Database["public"]["Enums"]["smelt_status"]
          user_id: string | null
          user_prompt_id: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          default_prompt_names?: Database["public"]["Enums"]["default_prompt_name"][]
          error_code?: Database["public"]["Enums"]["smelt_error_code"] | null
          error_message?: string | null
          id?: string
          mode?: Database["public"]["Enums"]["smelt_mode"]
          status?: Database["public"]["Enums"]["smelt_status"]
          user_id?: string | null
          user_prompt_id?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          default_prompt_names?: Database["public"]["Enums"]["default_prompt_name"][]
          error_code?: Database["public"]["Enums"]["smelt_error_code"] | null
          error_message?: string | null
          id?: string
          mode?: Database["public"]["Enums"]["smelt_mode"]
          status?: Database["public"]["Enums"]["smelt_status"]
          user_id?: string | null
          user_prompt_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "smelts_user_prompt_id_fkey"
            columns: ["user_prompt_id"]
            isOneToOne: false
            referencedRelation: "prompts"
            referencedColumns: ["id"]
          },
        ]
      }
      user_api_keys: {
        Row: {
          created_at: string
          encrypted_key: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          encrypted_key: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          encrypted_key?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          api_key_status: Database["public"]["Enums"]["api_key_status"]
          api_key_validated_at: string | null
          created_at: string
          credits_remaining: number
          credits_reset_at: string
          updated_at: string
          user_id: string
          weekly_credits_max: number
        }
        Insert: {
          api_key_status?: Database["public"]["Enums"]["api_key_status"]
          api_key_validated_at?: string | null
          created_at?: string
          credits_remaining?: number
          credits_reset_at?: string
          updated_at?: string
          user_id: string
          weekly_credits_max?: number
        }
        Update: {
          api_key_status?: Database["public"]["Enums"]["api_key_status"]
          api_key_validated_at?: string | null
          created_at?: string
          credits_remaining?: number
          credits_reset_at?: string
          updated_at?: string
          user_id?: string
          weekly_credits_max?: number
        }
        Relationships: []
      }
    }
    Views: Record<never, never>
    Functions: {
      create_anonymous_smelt: {
        Args: {
          p_default_prompt_names: Database["public"]["Enums"]["default_prompt_name"][]
          p_files: Json
          p_mode: Database["public"]["Enums"]["smelt_mode"]
        }
        Returns: Json
      }
      deduct_smelt_credit: { Args: { p_user_id: string }; Returns: undefined }
      get_anonymous_usage: { Args: { ip_hash_param: string }; Returns: number }
      get_profile_with_reset: {
        Args: { p_user_id: string }
        Returns: {
          api_key_status: Database["public"]["Enums"]["api_key_status"]
          api_key_validated_at: string | null
          created_at: string
          credits_remaining: number
          credits_reset_at: string
          updated_at: string
          user_id: string
          weekly_credits_max: number
        }
        SetofOptions: {
          from: "*"
          to: "user_profiles"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      get_smelt_id_from_path: { Args: { path: string }; Returns: string }
      increment_anonymous_usage: {
        Args: { p_ip_hash: string }
        Returns: undefined
      }
      reorder_prompts: {
        Args: { p_section_id: string; p_updates: Json; p_user_id: string }
        Returns: number
      }
      reorder_sections: {
        Args: { p_updates: Json; p_user_id: string }
        Returns: number
      }
    }
    Enums: {
      api_key_status: "none" | "pending" | "valid" | "invalid"
      default_prompt_name:
        | "summarize"
        | "action_items"
        | "detailed_notes"
        | "qa_format"
        | "table_of_contents"
      input_type: "audio" | "text"
      smelt_error_code:
        | "file_too_large"
        | "invalid_format"
        | "duration_exceeded"
        | "corrupted_file"
        | "transcription_failed"
        | "synthesis_failed"
        | "api_rate_limited"
        | "api_quota_exhausted"
        | "api_key_invalid"
        | "connection_lost"
        | "internal_error"
      smelt_file_error_code:
        | "file_too_large"
        | "invalid_format"
        | "duration_exceeded"
        | "corrupted_file"
        | "transcription_failed"
        | "decoding_failed"
      smelt_file_status: "pending" | "processing" | "completed" | "failed"
      smelt_mode: "separate" | "combine"
      smelt_status:
        | "pending"
        | "validating"
        | "decoding"
        | "transcribing"
        | "synthesizing"
        | "completed"
        | "failed"
    }
    CompositeTypes: Record<never, never>
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      api_key_status: ["none", "pending", "valid", "invalid"],
      default_prompt_name: [
        "summarize",
        "action_items",
        "detailed_notes",
        "qa_format",
        "table_of_contents",
      ],
      input_type: ["audio", "text"],
      smelt_error_code: [
        "file_too_large",
        "invalid_format",
        "duration_exceeded",
        "corrupted_file",
        "transcription_failed",
        "synthesis_failed",
        "api_rate_limited",
        "api_quota_exhausted",
        "api_key_invalid",
        "connection_lost",
        "internal_error",
      ],
      smelt_file_error_code: [
        "file_too_large",
        "invalid_format",
        "duration_exceeded",
        "corrupted_file",
        "transcription_failed",
        "decoding_failed",
      ],
      smelt_file_status: ["pending", "processing", "completed", "failed"],
      smelt_mode: ["separate", "combine"],
      smelt_status: [
        "pending",
        "validating",
        "decoding",
        "transcribing",
        "synthesizing",
        "completed",
        "failed",
      ],
    },
  },
} as const

