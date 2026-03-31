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
      search_access_events: {
        Row: {
          created_at: string
          id: string
          metadata: Json
          outcome: string
          reason: string | null
          request_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          metadata?: Json
          outcome: string
          reason?: string | null
          request_type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          metadata?: Json
          outcome?: string
          reason?: string | null
          request_type?: string
          user_id?: string
        }
        Relationships: []
      }
      saved_products: {
        Row: {
          badge: string | null
          id: string
          image: string | null
          price: string | null
          saved_at: string
          source: string | null
          title: string
          url: string
          user_id: string
        }
        Insert: {
          badge?: string | null
          id?: string
          image?: string | null
          price?: string | null
          saved_at?: string
          source?: string | null
          title: string
          url: string
          user_id: string
        }
        Update: {
          badge?: string | null
          id?: string
          image?: string | null
          price?: string | null
          saved_at?: string
          source?: string | null
          title?: string
          url?: string
          user_id?: string
        }
        Relationships: []
      }
      instagram_extractions: {
        Row: {
          caption: string | null
          extracted_at: string
          id: string
          images: string[]
          is_video: boolean | null
          original_url: string
          shortcode: string
        }
        Insert: {
          caption?: string | null
          extracted_at?: string
          id?: string
          images?: string[]
          is_video?: boolean | null
          original_url: string
          shortcode: string
        }
        Update: {
          caption?: string | null
          extracted_at?: string
          id?: string
          images?: string[]
          is_video?: boolean | null
          original_url?: string
          shortcode?: string
        }
        Relationships: []
      }
      user_search_access: {
        Row: {
          created_at: string
          free_search_limit: number
          free_searches_used: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          free_search_limit?: number
          free_searches_used?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          free_search_limit?: number
          free_searches_used?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_subscription_entitlements: {
        Row: {
          created_at: string
          expires_at: string | null
          is_active: boolean
          metadata: Json
          original_transaction_id: string | null
          product_id: string | null
          purchase_source: string
          renewal_period: string | null
          status: string
          updated_at: string
          user_id: string
          verified_at: string
          will_renew: boolean | null
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          is_active?: boolean
          metadata?: Json
          original_transaction_id?: string | null
          product_id?: string | null
          purchase_source?: string
          renewal_period?: string | null
          status?: string
          updated_at?: string
          user_id: string
          verified_at?: string
          will_renew?: boolean | null
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          is_active?: boolean
          metadata?: Json
          original_transaction_id?: string | null
          product_id?: string | null
          purchase_source?: string
          renewal_period?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          verified_at?: string
          will_renew?: boolean | null
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
