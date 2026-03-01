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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          id: string
          ip_address: string | null
          resource_id: string | null
          resource_type: string
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          resource_id?: string | null
          resource_type: string
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          resource_id?: string | null
          resource_type?: string
          user_id?: string | null
        }
        Relationships: []
      }
      conhecimento_chunks: {
        Row: {
          content: string
          created_at: string | null
          embedding: string | null
          file_name: string
          file_path: string
          id: number
        }
        Insert: {
          content: string
          created_at?: string | null
          embedding?: string | null
          file_name: string
          file_path: string
          id?: number
        }
        Update: {
          content?: string
          created_at?: string | null
          embedding?: string | null
          file_name?: string
          file_path?: string
          id?: number
        }
        Relationships: []
      }
      data_sources: {
        Row: {
          base_url: string | null
          config: Json | null
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          last_sync_at: string | null
          name: string
          source_type: string
          updated_at: string
        }
        Insert: {
          base_url?: string | null
          config?: Json | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          last_sync_at?: string | null
          name: string
          source_type?: string
          updated_at?: string
        }
        Update: {
          base_url?: string | null
          config?: Json | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          last_sync_at?: string | null
          name?: string
          source_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      procurement_documents: {
        Row: {
          agency: string | null
          created_at: string
          created_by: string | null
          deadline_at: string | null
          description: string | null
          estimated_value: number | null
          external_id: string | null
          extracted_data: Json | null
          file_url: string | null
          id: string
          modality: string | null
          published_at: string | null
          raw_content: string | null
          risk_score: number | null
          source_id: string | null
          status: Database["public"]["Enums"]["processing_status"]
          title: string
          updated_at: string
        }
        Insert: {
          agency?: string | null
          created_at?: string
          created_by?: string | null
          deadline_at?: string | null
          description?: string | null
          estimated_value?: number | null
          external_id?: string | null
          extracted_data?: Json | null
          file_url?: string | null
          id?: string
          modality?: string | null
          published_at?: string | null
          raw_content?: string | null
          risk_score?: number | null
          source_id?: string | null
          status?: Database["public"]["Enums"]["processing_status"]
          title: string
          updated_at?: string
        }
        Update: {
          agency?: string | null
          created_at?: string
          created_by?: string | null
          deadline_at?: string | null
          description?: string | null
          estimated_value?: number | null
          external_id?: string | null
          extracted_data?: Json | null
          file_url?: string | null
          id?: string
          modality?: string | null
          published_at?: string | null
          raw_content?: string | null
          risk_score?: number | null
          source_id?: string | null
          status?: Database["public"]["Enums"]["processing_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "procurement_documents_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "data_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      risk_alerts: {
        Row: {
          alert_type: string
          created_at: string
          criteria: string | null
          description: string | null
          document_id: string
          evidence: string | null
          id: string
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          rule_id: string | null
          severity: number
          status: Database["public"]["Enums"]["alert_status"]
          title: string
          updated_at: string
        }
        Insert: {
          alert_type: string
          created_at?: string
          criteria?: string | null
          description?: string | null
          document_id: string
          evidence?: string | null
          id?: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          rule_id?: string | null
          severity?: number
          status?: Database["public"]["Enums"]["alert_status"]
          title: string
          updated_at?: string
        }
        Update: {
          alert_type?: string
          created_at?: string
          criteria?: string | null
          description?: string | null
          document_id?: string
          evidence?: string | null
          id?: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          rule_id?: string | null
          severity?: number
          status?: Database["public"]["Enums"]["alert_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "risk_alerts_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "procurement_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "risk_alerts_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "risk_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      risk_rules: {
        Row: {
          category: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean
          name: string
          parameters: Json | null
          rule_type: string
          severity: number
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          parameters?: Json | null
          rule_type?: string
          severity?: number
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          parameters?: Json | null
          rule_type?: string
          severity?: number
          updated_at?: string
        }
        Relationships: []
      }
      setting_versions: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          setting_key: string
          value: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          setting_key: string
          value: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          setting_key?: string
          value?: string
        }
        Relationships: []
      }
      system_settings: {
        Row: {
          key: string
          updated_at: string | null
          updated_by: string | null
          value: string
        }
        Insert: {
          key: string
          updated_at?: string | null
          updated_by?: string | null
          value: string
        }
        Update: {
          key?: string
          updated_at?: string | null
          updated_by?: string | null
          value?: string
        }
        Relationships: []
      }
      text_analysis_cache: {
        Row: {
          analysis_type: string
          created_at: string
          document_id: string
          id: string
          model_used: string | null
          result: Json
          tokens_used: number | null
        }
        Insert: {
          analysis_type: string
          created_at?: string
          document_id: string
          id?: string
          model_used?: string | null
          result?: Json
          tokens_used?: number | null
        }
        Update: {
          analysis_type?: string
          created_at?: string
          document_id?: string
          id?: string
          model_used?: string | null
          result?: Json
          tokens_used?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "text_analysis_cache_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "procurement_documents"
            referencedColumns: ["id"]
          },
        ]
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
      has_any_role: {
        Args: {
          _roles: Database["public"]["Enums"]["app_role"][]
          _user_id: string
        }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      match_conhecimento_chunks: {
        Args: { filter?: Json; match_count?: number; query_embedding: string }
        Returns: {
          content: string
          id: number
          metadata: Json
          similarity: number
        }[]
      }
      match_knowledge: {
        Args: { match_count?: number; query_embedding: string }
        Returns: {
          content: string
          file_name: string
          id: number
          similarity: number
        }[]
      }
    }
    Enums: {
      alert_status: "pending" | "under_review" | "confirmed" | "dismissed"
      app_role: "admin" | "gestor" | "auditor"
      processing_status: "pending" | "processing" | "processed" | "error"
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
      alert_status: ["pending", "under_review", "confirmed", "dismissed"],
      app_role: ["admin", "gestor", "auditor"],
      processing_status: ["pending", "processing", "processed", "error"],
    },
  },
} as const
