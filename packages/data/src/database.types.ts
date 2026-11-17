
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "platform_settings": {
                  Row: {
                    "id": boolean,"messenger_url": string | null,"pay_to_gcash": string,"pay_to_maya": string,"pay_to_name": string,"price_monthly": number,"six_month_bonus": boolean,"tracking_sending": boolean,"tracking_test_mode": boolean,"trial_days": number,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "id"?: boolean,"messenger_url"?: string | null,"pay_to_gcash"?: string,"pay_to_maya"?: string,"pay_to_name"?: string,"price_monthly"?: number,"six_month_bonus"?: boolean,"tracking_sending"?: boolean,"tracking_test_mode"?: boolean,"trial_days"?: number,"updated_at"?: string
                  }
                  Update: {
                    "id"?: boolean,"messenger_url"?: string | null,"pay_to_gcash"?: string,"pay_to_maya"?: string,"pay_to_name"?: string,"price_monthly"?: number,"six_month_bonus"?: boolean,"tracking_sending"?: boolean,"tracking_test_mode"?: boolean,"trial_days"?: number,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"profiles": {
                  Row: {
                    "avatar": Json | null,"created_at": string,"full_name": string | null,"id": string,"phone": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "avatar"?: Json | null,"created_at"?: string,"full_name"?: string | null,"id": string,"phone"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "avatar"?: Json | null,"created_at"?: string,"full_name"?: string | null,"id"?: string,"phone"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"reserved_slugs": {
                  Row: {
                    "slug": string
                  }
                  ComputedFields: never
                  Insert: {
                    "slug": string
                  }
                  Update: {
                    "slug"?: string
                  }
                  Relationships: [
                    
                  ]
                },"signup_leads": {
                  Row: {
                    "campaign": string | null,"channel": string,"contacted_at": string | null,"created_at": string,"email": string,"fbc": string | null,"fbp": string | null,"full_name": string,"id": string,"phone": string,"tenant_id": string | null,"terms_version": string
                  }
                  ComputedFields: never
                  Insert: {
                    "campaign"?: string | null,"channel": string,"contacted_at"?: string | null,"created_at"?: string,"email": string,"fbc"?: string | null,"fbp"?: string | null,"full_name": string,"id"?: string,"phone": string,"tenant_id"?: string | null,"terms_version": string
                  }
                  Update: {
                    "campaign"?: string | null,"channel"?: string,"contacted_at"?: string | null,"created_at"?: string,"email"?: string,"fbc"?: string | null,"fbp"?: string | null,"full_name"?: string,"id"?: string,"phone"?: string,"tenant_id"?: string | null,"terms_version"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "signup_leads_tenant_fk"
      columns: ["tenant_id"]
isOneToOne: false
      referencedRelation: "tenants"
      referencedColumns: ["id"]
    }
                  ]
                },"tenant_members": {
                  Row: {
                    "created_at": string,"notify_email": string | null,"notify_new_order": boolean,"notify_payment_to_check": boolean,"notify_plan_payment": boolean,"notify_storage": boolean,"role": string,"tenant_id": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"notify_email"?: string | null,"notify_new_order"?: boolean,"notify_payment_to_check"?: boolean,"notify_plan_payment"?: boolean,"notify_storage"?: boolean,"role"?: string,"tenant_id": string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"notify_email"?: string | null,"notify_new_order"?: boolean,"notify_payment_to_check"?: boolean,"notify_plan_payment"?: boolean,"notify_storage"?: boolean,"role"?: string,"tenant_id"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "tenant_members_tenant_id_fkey"
      columns: ["tenant_id"]
isOneToOne: false
      referencedRelation: "tenants"
      referencedColumns: ["id"]
    }
                  ]
                },"tenants": {
                  Row: {
                    "asked_at": string | null,"campaign": string | null,"channel": string,"city": string,"close_reason": string | null,"closed_at": string | null,"closes_on": string | null,"created_at": string,"facebook_page": string | null,"id": string,"is_demo": boolean,"kind": string,"live_at": string | null,"name": string,"paid_until": string | null,"price_monthly": number,"reminded_at": string | null,"slug": string,"stage": string,"storage_limit_bytes": number,"trial_ends_at": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "asked_at"?: string | null,"campaign"?: string | null,"channel"?: string,"city"?: string,"close_reason"?: string | null,"closed_at"?: string | null,"closes_on"?: string | null,"created_at"?: string,"facebook_page"?: string | null,"id"?: string,"is_demo"?: boolean,"kind": string,"live_at"?: string | null,"name": string,"paid_until"?: string | null,"price_monthly": number,"reminded_at"?: string | null,"slug": string,"stage"?: string,"storage_limit_bytes"?: number,"trial_ends_at"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "asked_at"?: string | null,"campaign"?: string | null,"channel"?: string,"city"?: string,"close_reason"?: string | null,"closed_at"?: string | null,"closes_on"?: string | null,"created_at"?: string,"facebook_page"?: string | null,"id"?: string,"is_demo"?: boolean,"kind"?: string,"live_at"?: string | null,"name"?: string,"paid_until"?: string | null,"price_monthly"?: number,"reminded_at"?: string | null,"slug"?: string,"stage"?: string,"storage_limit_bytes"?: number,"trial_ends_at"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    
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

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            
          }
        }
} as const
