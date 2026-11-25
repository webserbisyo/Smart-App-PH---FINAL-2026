
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
            "audit_log": {
                  Row: {
                    "action": string,"actor_user_id": string | null,"at": string,"details": NonNullable<Json>,"id": number,"support_session_id": string | null,"target": string | null,"tenant_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "action": string,"actor_user_id"?: string | null,"at"?: string,"details"?: NonNullable<Json>,"id"?: never,"support_session_id"?: string | null,"target"?: string | null,"tenant_id"?: string | null
                  }
                  Update: {
                    "action"?: string,"actor_user_id"?: string | null,"at"?: string,"details"?: NonNullable<Json>,"id"?: never,"support_session_id"?: string | null,"target"?: string | null,"tenant_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "audit_log_support_session_id_fkey"
      columns: ["support_session_id"]
isOneToOne: false
      referencedRelation: "support_sessions"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "audit_log_tenant_id_fkey"
      columns: ["tenant_id"]
isOneToOne: false
      referencedRelation: "tenants"
      referencedColumns: ["id"]
    }
                  ]
                },"billing_messages": {
                  Row: {
                    "created_at": string,"days": number | null,"from": string,"id": string,"kind": string,"payment_id": string | null,"photo_media_id": string | null,"reason": string | null,"reference": string | null,"seen_at": string | null,"tenant_id": string,"text": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"days"?: number | null,"from": string,"id"?: string,"kind": string,"payment_id"?: string | null,"photo_media_id"?: string | null,"reason"?: string | null,"reference"?: string | null,"seen_at"?: string | null,"tenant_id": string,"text"?: string | null
                  }
                  Update: {
                    "created_at"?: string,"days"?: number | null,"from"?: string,"id"?: string,"kind"?: string,"payment_id"?: string | null,"photo_media_id"?: string | null,"reason"?: string | null,"reference"?: string | null,"seen_at"?: string | null,"tenant_id"?: string,"text"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "billing_messages_tenant_id_fkey"
      columns: ["tenant_id"]
isOneToOne: false
      referencedRelation: "tenants"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "billing_messages_tenant_id_payment_id_fkey"
      columns: ["tenant_id","payment_id"]
isOneToOne: false
      referencedRelation: "plan_payments"
      referencedColumns: ["tenant_id","id"]
    },{
      foreignKeyName: "billing_messages_tenant_id_photo_media_id_fkey"
      columns: ["tenant_id","photo_media_id"]
isOneToOne: false
      referencedRelation: "media_files"
      referencedColumns: ["tenant_id","id"]
    }
                  ]
                },"categories": {
                  Row: {
                    "created_at": string,"icon": NonNullable<Json>,"icon_media_id": string | null,"id": string,"name": string,"sort": number,"tenant_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"icon": NonNullable<Json>,"icon_media_id"?: string | null,"id"?: string,"name": string,"sort"?: number,"tenant_id": string
                  }
                  Update: {
                    "created_at"?: string,"icon"?: NonNullable<Json>,"icon_media_id"?: string | null,"id"?: string,"name"?: string,"sort"?: number,"tenant_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "categories_tenant_id_fkey"
      columns: ["tenant_id"]
isOneToOne: false
      referencedRelation: "tenants"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "categories_tenant_id_icon_media_id_fkey"
      columns: ["tenant_id","icon_media_id"]
isOneToOne: false
      referencedRelation: "media_files"
      referencedColumns: ["tenant_id","id"]
    }
                  ]
                },"closures": {
                  Row: {
                    "created_at": string,"date": string,"id": string,"reason": string | null,"tenant_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"date": string,"id"?: string,"reason"?: string | null,"tenant_id": string
                  }
                  Update: {
                    "created_at"?: string,"date"?: string,"id"?: string,"reason"?: string | null,"tenant_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "closures_tenant_id_fkey"
      columns: ["tenant_id"]
isOneToOne: false
      referencedRelation: "tenants"
      referencedColumns: ["id"]
    }
                  ]
                },"consents": {
                  Row: {
                    "created_at": string,"given": boolean,"id": string,"kind": string,"member_id": string,"tenant_id": string,"version": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"given"?: boolean,"id"?: string,"kind": string,"member_id": string,"tenant_id": string,"version": string
                  }
                  Update: {
                    "created_at"?: string,"given"?: boolean,"id"?: string,"kind"?: string,"member_id"?: string,"tenant_id"?: string,"version"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "consents_tenant_id_fkey"
      columns: ["tenant_id"]
isOneToOne: false
      referencedRelation: "tenants"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "consents_tenant_id_member_id_fkey"
      columns: ["tenant_id","member_id"]
isOneToOne: false
      referencedRelation: "members"
      referencedColumns: ["tenant_id","id"]
    }
                  ]
                },"data_exports": {
                  Row: {
                    "bytes": number | null,"created_at": string,"expires_at": string | null,"file_name": string,"id": string,"order_rows": number,"part_orders": boolean,"part_payments": boolean,"part_proofs": boolean,"path": string | null,"proof_files": number,"range": string,"ready_at": string | null,"requested_by": string | null,"status": string,"tenant_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "bytes"?: number | null,"created_at"?: string,"expires_at"?: string | null,"file_name": string,"id"?: string,"order_rows"?: number,"part_orders"?: boolean,"part_payments"?: boolean,"part_proofs"?: boolean,"path"?: string | null,"proof_files"?: number,"range": string,"ready_at"?: string | null,"requested_by"?: string | null,"status"?: string,"tenant_id": string
                  }
                  Update: {
                    "bytes"?: number | null,"created_at"?: string,"expires_at"?: string | null,"file_name"?: string,"id"?: string,"order_rows"?: number,"part_orders"?: boolean,"part_payments"?: boolean,"part_proofs"?: boolean,"path"?: string | null,"proof_files"?: number,"range"?: string,"ready_at"?: string | null,"requested_by"?: string | null,"status"?: string,"tenant_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "data_exports_tenant_id_fkey"
      columns: ["tenant_id"]
isOneToOne: false
      referencedRelation: "tenants"
      referencedColumns: ["id"]
    }
                  ]
                },"delivery_distance_rows": {
                  Row: {
                    "created_at": string,"eta_text": string,"fee": number,"from_m": number,"id": string,"min_order": number,"tenant_id": string,"to_m": number
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"eta_text": string,"fee": number,"from_m": number,"id"?: string,"min_order"?: number,"tenant_id": string,"to_m": number
                  }
                  Update: {
                    "created_at"?: string,"eta_text"?: string,"fee"?: number,"from_m"?: number,"id"?: string,"min_order"?: number,"tenant_id"?: string,"to_m"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "delivery_distance_rows_tenant_id_fkey"
      columns: ["tenant_id"]
isOneToOne: false
      referencedRelation: "tenants"
      referencedColumns: ["id"]
    }
                  ]
                },"delivery_zones": {
                  Row: {
                    "created_at": string,"eta_text": string,"fee": number,"id": string,"name": string,"sort": number,"tenant_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"eta_text": string,"fee": number,"id"?: string,"name": string,"sort"?: number,"tenant_id": string
                  }
                  Update: {
                    "created_at"?: string,"eta_text"?: string,"fee"?: number,"id"?: string,"name"?: string,"sort"?: number,"tenant_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "delivery_zones_tenant_id_fkey"
      columns: ["tenant_id"]
isOneToOne: false
      referencedRelation: "tenants"
      referencedColumns: ["id"]
    }
                  ]
                },"item_axes": {
                  Row: {
                    "id": string,"item_id": string,"name": string,"position": number,"template_id": string | null,"tenant_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "id"?: string,"item_id": string,"name": string,"position": number,"template_id"?: string | null,"tenant_id": string
                  }
                  Update: {
                    "id"?: string,"item_id"?: string,"name"?: string,"position"?: number,"template_id"?: string | null,"tenant_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "item_axes_tenant_id_fkey"
      columns: ["tenant_id"]
isOneToOne: false
      referencedRelation: "tenants"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "item_axes_tenant_id_item_id_fkey"
      columns: ["tenant_id","item_id"]
isOneToOne: false
      referencedRelation: "items"
      referencedColumns: ["tenant_id","id"]
    },{
      foreignKeyName: "item_axes_tenant_id_template_id_fkey"
      columns: ["tenant_id","template_id"]
isOneToOne: false
      referencedRelation: "variant_templates"
      referencedColumns: ["tenant_id","id"]
    }
                  ]
                },"item_axis_values": {
                  Row: {
                    "axis_id": string,"id": string,"label": string,"media_id": string | null,"price_delta": number,"sort": number,"tenant_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "axis_id": string,"id"?: string,"label": string,"media_id"?: string | null,"price_delta"?: number,"sort"?: number,"tenant_id": string
                  }
                  Update: {
                    "axis_id"?: string,"id"?: string,"label"?: string,"media_id"?: string | null,"price_delta"?: number,"sort"?: number,"tenant_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "item_axis_values_tenant_id_axis_id_fkey"
      columns: ["tenant_id","axis_id"]
isOneToOne: false
      referencedRelation: "item_axes"
      referencedColumns: ["tenant_id","id"]
    },{
      foreignKeyName: "item_axis_values_tenant_id_fkey"
      columns: ["tenant_id"]
isOneToOne: false
      referencedRelation: "tenants"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "item_axis_values_tenant_id_media_id_fkey"
      columns: ["tenant_id","media_id"]
isOneToOne: false
      referencedRelation: "media_files"
      referencedColumns: ["tenant_id","id"]
    }
                  ]
                },"item_daily_counts": {
                  Row: {
                    "business_date": string,"item_id": string,"qty": number,"tenant_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "business_date": string,"item_id": string,"qty"?: number,"tenant_id": string
                  }
                  Update: {
                    "business_date"?: string,"item_id"?: string,"qty"?: number,"tenant_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "item_daily_counts_tenant_id_fkey"
      columns: ["tenant_id"]
isOneToOne: false
      referencedRelation: "tenants"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "item_daily_counts_tenant_id_item_id_fkey"
      columns: ["tenant_id","item_id"]
isOneToOne: false
      referencedRelation: "items"
      referencedColumns: ["tenant_id","id"]
    }
                  ]
                },"item_option_groups": {
                  Row: {
                    "group_id": string,"item_id": string,"sort": number,"tenant_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "group_id": string,"item_id": string,"sort"?: number,"tenant_id": string
                  }
                  Update: {
                    "group_id"?: string,"item_id"?: string,"sort"?: number,"tenant_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "item_option_groups_tenant_id_fkey"
      columns: ["tenant_id"]
isOneToOne: false
      referencedRelation: "tenants"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "item_option_groups_tenant_id_group_id_fkey"
      columns: ["tenant_id","group_id"]
isOneToOne: false
      referencedRelation: "option_groups"
      referencedColumns: ["tenant_id","id"]
    },{
      foreignKeyName: "item_option_groups_tenant_id_item_id_fkey"
      columns: ["tenant_id","item_id"]
isOneToOne: false
      referencedRelation: "items"
      referencedColumns: ["tenant_id","id"]
    }
                  ]
                },"item_pairings": {
                  Row: {
                    "item_id": string,"paired_item_id": string,"sort": number,"tenant_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "item_id": string,"paired_item_id": string,"sort"?: number,"tenant_id": string
                  }
                  Update: {
                    "item_id"?: string,"paired_item_id"?: string,"sort"?: number,"tenant_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "item_pairings_tenant_id_fkey"
      columns: ["tenant_id"]
isOneToOne: false
      referencedRelation: "tenants"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "item_pairings_tenant_id_item_id_fkey"
      columns: ["tenant_id","item_id"]
isOneToOne: false
      referencedRelation: "items"
      referencedColumns: ["tenant_id","id"]
    },{
      foreignKeyName: "item_pairings_tenant_id_paired_item_id_fkey"
      columns: ["tenant_id","paired_item_id"]
isOneToOne: false
      referencedRelation: "items"
      referencedColumns: ["tenant_id","id"]
    }
                  ]
                },"item_photos": {
                  Row: {
                    "is_cover": boolean,"item_id": string,"media_id": string,"sort": number,"tenant_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "is_cover"?: boolean,"item_id": string,"media_id": string,"sort"?: number,"tenant_id": string
                  }
                  Update: {
                    "is_cover"?: boolean,"item_id"?: string,"media_id"?: string,"sort"?: number,"tenant_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "item_photos_tenant_id_fkey"
      columns: ["tenant_id"]
isOneToOne: false
      referencedRelation: "tenants"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "item_photos_tenant_id_item_id_fkey"
      columns: ["tenant_id","item_id"]
isOneToOne: false
      referencedRelation: "items"
      referencedColumns: ["tenant_id","id"]
    },{
      foreignKeyName: "item_photos_tenant_id_media_id_fkey"
      columns: ["tenant_id","media_id"]
isOneToOne: false
      referencedRelation: "media_files"
      referencedColumns: ["tenant_id","id"]
    }
                  ]
                },"item_variant_values": {
                  Row: {
                    "axis_value_id": string,"tenant_id": string,"variant_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "axis_value_id": string,"tenant_id": string,"variant_id": string
                  }
                  Update: {
                    "axis_value_id"?: string,"tenant_id"?: string,"variant_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "item_variant_values_tenant_id_axis_value_id_fkey"
      columns: ["tenant_id","axis_value_id"]
isOneToOne: false
      referencedRelation: "item_axis_values"
      referencedColumns: ["tenant_id","id"]
    },{
      foreignKeyName: "item_variant_values_tenant_id_fkey"
      columns: ["tenant_id"]
isOneToOne: false
      referencedRelation: "tenants"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "item_variant_values_tenant_id_variant_id_fkey"
      columns: ["tenant_id","variant_id"]
isOneToOne: false
      referencedRelation: "item_variants"
      referencedColumns: ["tenant_id","id"]
    }
                  ]
                },"item_variants": {
                  Row: {
                    "availability": string,"combo_key": string,"id": string,"item_id": string,"price_override": number | null,"sold_out_until": string | null,"sort": number,"tenant_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "availability"?: string,"combo_key": string,"id"?: string,"item_id": string,"price_override"?: number | null,"sold_out_until"?: string | null,"sort"?: number,"tenant_id": string
                  }
                  Update: {
                    "availability"?: string,"combo_key"?: string,"id"?: string,"item_id"?: string,"price_override"?: number | null,"sold_out_until"?: string | null,"sort"?: number,"tenant_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "item_variants_tenant_id_fkey"
      columns: ["tenant_id"]
isOneToOne: false
      referencedRelation: "tenants"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "item_variants_tenant_id_item_id_fkey"
      columns: ["tenant_id","item_id"]
isOneToOne: false
      referencedRelation: "items"
      referencedColumns: ["tenant_id","id"]
    }
                  ]
                },"items": {
                  Row: {
                    "base_price": number,"category_id": string,"created_at": string,"daily_limit": number | null,"description": string | null,"featured": boolean,"id": string,"is_new": boolean,"is_sample": boolean,"name": string,"notice_days": number,"sort": number,"status": string,"tenant_id": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "base_price": number,"category_id": string,"created_at"?: string,"daily_limit"?: number | null,"description"?: string | null,"featured"?: boolean,"id"?: string,"is_new"?: boolean,"is_sample"?: boolean,"name": string,"notice_days"?: number,"sort"?: number,"status"?: string,"tenant_id": string,"updated_at"?: string
                  }
                  Update: {
                    "base_price"?: number,"category_id"?: string,"created_at"?: string,"daily_limit"?: number | null,"description"?: string | null,"featured"?: boolean,"id"?: string,"is_new"?: boolean,"is_sample"?: boolean,"name"?: string,"notice_days"?: number,"sort"?: number,"status"?: string,"tenant_id"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "items_tenant_id_category_id_fkey"
      columns: ["tenant_id","category_id"]
isOneToOne: false
      referencedRelation: "categories"
      referencedColumns: ["tenant_id","id"]
    },{
      foreignKeyName: "items_tenant_id_fkey"
      columns: ["tenant_id"]
isOneToOne: false
      referencedRelation: "tenants"
      referencedColumns: ["id"]
    }
                  ]
                },"media_files": {
                  Row: {
                    "bucket": string,"bytes": number,"confirmed_at": string | null,"counts_toward_limit": boolean | null,"created_at": string,"deleted_at": string | null,"height": number | null,"id": string,"kind": string,"mime": string,"path": string,"tenant_id": string,"uploaded_by": string | null,"width": number | null
                  }
                  ComputedFields: never
                  Insert: {
                    "bucket": string,"bytes": number,"confirmed_at"?: string | null,"counts_toward_limit"?: never,"created_at"?: string,"deleted_at"?: string | null,"height"?: number | null,"id"?: string,"kind": string,"mime": string,"path": string,"tenant_id": string,"uploaded_by"?: string | null,"width"?: number | null
                  }
                  Update: {
                    "bucket"?: string,"bytes"?: number,"confirmed_at"?: string | null,"counts_toward_limit"?: never,"created_at"?: string,"deleted_at"?: string | null,"height"?: number | null,"id"?: string,"kind"?: string,"mime"?: string,"path"?: string,"tenant_id"?: string,"uploaded_by"?: string | null,"width"?: number | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "media_files_tenant_id_fkey"
      columns: ["tenant_id"]
isOneToOne: false
      referencedRelation: "tenants"
      referencedColumns: ["id"]
    }
                  ]
                },"member_addresses": {
                  Row: {
                    "address_line": string,"created_at": string,"floor": string | null,"house_no": string | null,"id": string,"label": string,"landmark": string | null,"lat": number | null,"lng": number | null,"member_id": string,"tenant_id": string,"zone_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "address_line": string,"created_at"?: string,"floor"?: string | null,"house_no"?: string | null,"id"?: string,"label": string,"landmark"?: string | null,"lat"?: number | null,"lng"?: number | null,"member_id": string,"tenant_id": string,"zone_id"?: string | null
                  }
                  Update: {
                    "address_line"?: string,"created_at"?: string,"floor"?: string | null,"house_no"?: string | null,"id"?: string,"label"?: string,"landmark"?: string | null,"lat"?: number | null,"lng"?: number | null,"member_id"?: string,"tenant_id"?: string,"zone_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "member_addresses_tenant_id_fkey"
      columns: ["tenant_id"]
isOneToOne: false
      referencedRelation: "tenants"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "member_addresses_tenant_id_member_id_fkey"
      columns: ["tenant_id","member_id"]
isOneToOne: false
      referencedRelation: "members"
      referencedColumns: ["tenant_id","id"]
    },{
      foreignKeyName: "member_addresses_tenant_id_zone_id_fkey"
      columns: ["tenant_id","zone_id"]
isOneToOne: false
      referencedRelation: "delivery_zones"
      referencedColumns: ["tenant_id","id"]
    }
                  ]
                },"members": {
                  Row: {
                    "avatar": Json | null,"avatar_media_id": string | null,"created_at": string,"email": string | null,"erased_at": string | null,"id": string,"joined_at": string,"member_code": string,"member_code_digits": string | null,"member_code_norm": string | null,"name": string,"phone": string | null,"tenant_id": string,"updated_at": string,"user_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "avatar"?: Json | null,"avatar_media_id"?: string | null,"created_at"?: string,"email"?: string | null,"erased_at"?: string | null,"id"?: string,"joined_at"?: string,"member_code": string,"member_code_digits"?: never,"member_code_norm"?: never,"name": string,"phone"?: string | null,"tenant_id": string,"updated_at"?: string,"user_id"?: string | null
                  }
                  Update: {
                    "avatar"?: Json | null,"avatar_media_id"?: string | null,"created_at"?: string,"email"?: string | null,"erased_at"?: string | null,"id"?: string,"joined_at"?: string,"member_code"?: string,"member_code_digits"?: never,"member_code_norm"?: never,"name"?: string,"phone"?: string | null,"tenant_id"?: string,"updated_at"?: string,"user_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "members_tenant_id_avatar_media_id_fkey"
      columns: ["tenant_id","avatar_media_id"]
isOneToOne: false
      referencedRelation: "media_files"
      referencedColumns: ["tenant_id","id"]
    },{
      foreignKeyName: "members_tenant_id_fkey"
      columns: ["tenant_id"]
isOneToOne: false
      referencedRelation: "tenants"
      referencedColumns: ["id"]
    }
                  ]
                },"notification_outbox": {
                  Row: {
                    "attempts": number,"created_at": string,"dedupe_key": string,"id": string,"kind": string,"payload": NonNullable<Json>,"send_after": string,"sent_at": string | null,"status": string,"tenant_id": string,"to_email": string
                  }
                  ComputedFields: never
                  Insert: {
                    "attempts"?: number,"created_at"?: string,"dedupe_key": string,"id"?: string,"kind": string,"payload"?: NonNullable<Json>,"send_after"?: string,"sent_at"?: string | null,"status"?: string,"tenant_id": string,"to_email": string
                  }
                  Update: {
                    "attempts"?: number,"created_at"?: string,"dedupe_key"?: string,"id"?: string,"kind"?: string,"payload"?: NonNullable<Json>,"send_after"?: string,"sent_at"?: string | null,"status"?: string,"tenant_id"?: string,"to_email"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "notification_outbox_tenant_id_fkey"
      columns: ["tenant_id"]
isOneToOne: false
      referencedRelation: "tenants"
      referencedColumns: ["id"]
    }
                  ]
                },"opening_hours": {
                  Row: {
                    "closes": string,"created_at": string,"id": string,"opens": string,"tenant_id": string,"weekday": number
                  }
                  ComputedFields: never
                  Insert: {
                    "closes": string,"created_at"?: string,"id"?: string,"opens": string,"tenant_id": string,"weekday": number
                  }
                  Update: {
                    "closes"?: string,"created_at"?: string,"id"?: string,"opens"?: string,"tenant_id"?: string,"weekday"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "opening_hours_tenant_id_fkey"
      columns: ["tenant_id"]
isOneToOne: false
      referencedRelation: "tenants"
      referencedColumns: ["id"]
    }
                  ]
                },"option_groups": {
                  Row: {
                    "created_at": string,"id": string,"max_pick": number,"min_pick": number,"name": string,"tenant_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"max_pick"?: number,"min_pick"?: number,"name": string,"tenant_id": string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"max_pick"?: number,"min_pick"?: number,"name"?: string,"tenant_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "option_groups_tenant_id_fkey"
      columns: ["tenant_id"]
isOneToOne: false
      referencedRelation: "tenants"
      referencedColumns: ["id"]
    }
                  ]
                },"options": {
                  Row: {
                    "group_id": string,"id": string,"is_default": boolean,"name": string,"price_delta": number,"sold_out": boolean,"sort": number,"tenant_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "group_id": string,"id"?: string,"is_default"?: boolean,"name": string,"price_delta"?: number,"sold_out"?: boolean,"sort"?: number,"tenant_id": string
                  }
                  Update: {
                    "group_id"?: string,"id"?: string,"is_default"?: boolean,"name"?: string,"price_delta"?: number,"sold_out"?: boolean,"sort"?: number,"tenant_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "options_tenant_id_fkey"
      columns: ["tenant_id"]
isOneToOne: false
      referencedRelation: "tenants"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "options_tenant_id_group_id_fkey"
      columns: ["tenant_id","group_id"]
isOneToOne: false
      referencedRelation: "option_groups"
      referencedColumns: ["tenant_id","id"]
    }
                  ]
                },"order_counters": {
                  Row: {
                    "business_date": string,"last_no": number,"tenant_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "business_date": string,"last_no": number,"tenant_id": string
                  }
                  Update: {
                    "business_date"?: string,"last_no"?: number,"tenant_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "order_counters_tenant_id_fkey"
      columns: ["tenant_id"]
isOneToOne: false
      referencedRelation: "tenants"
      referencedColumns: ["id"]
    }
                  ]
                },"order_events": {
                  Row: {
                    "at": string,"by": string,"id": string,"order_id": string,"status": string,"tenant_id": string,"undone_at": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "at"?: string,"by": string,"id"?: string,"order_id": string,"status": string,"tenant_id": string,"undone_at"?: string | null
                  }
                  Update: {
                    "at"?: string,"by"?: string,"id"?: string,"order_id"?: string,"status"?: string,"tenant_id"?: string,"undone_at"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "order_events_tenant_id_fkey"
      columns: ["tenant_id"]
isOneToOne: false
      referencedRelation: "tenants"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "order_events_tenant_id_order_id_fkey"
      columns: ["tenant_id","order_id"]
isOneToOne: false
      referencedRelation: "orders"
      referencedColumns: ["tenant_id","id"]
    }
                  ]
                },"order_line_options": {
                  Row: {
                    "id": string,"line_id": string,"name": string,"option_id": string | null,"price": number,"tenant_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "id"?: string,"line_id": string,"name": string,"option_id"?: string | null,"price": number,"tenant_id": string
                  }
                  Update: {
                    "id"?: string,"line_id"?: string,"name"?: string,"option_id"?: string | null,"price"?: number,"tenant_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "order_line_options_tenant_id_fkey"
      columns: ["tenant_id"]
isOneToOne: false
      referencedRelation: "tenants"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "order_line_options_tenant_id_line_id_fkey"
      columns: ["tenant_id","line_id"]
isOneToOne: false
      referencedRelation: "order_lines"
      referencedColumns: ["tenant_id","id"]
    },{
      foreignKeyName: "order_line_options_tenant_id_option_id_fkey"
      columns: ["tenant_id","option_id"]
isOneToOne: false
      referencedRelation: "options"
      referencedColumns: ["tenant_id","id"]
    }
                  ]
                },"order_lines": {
                  Row: {
                    "id": string,"is_reward": boolean,"item_id": string,"line_total": number,"name": string,"note": string,"order_id": string,"qty": number,"sort": number,"tenant_id": string,"unit_price": number,"variant_id": string | null,"variant_label": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "id"?: string,"is_reward"?: boolean,"item_id": string,"line_total": number,"name": string,"note"?: string,"order_id": string,"qty": number,"sort"?: number,"tenant_id": string,"unit_price": number,"variant_id"?: string | null,"variant_label"?: string | null
                  }
                  Update: {
                    "id"?: string,"is_reward"?: boolean,"item_id"?: string,"line_total"?: number,"name"?: string,"note"?: string,"order_id"?: string,"qty"?: number,"sort"?: number,"tenant_id"?: string,"unit_price"?: number,"variant_id"?: string | null,"variant_label"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "order_lines_tenant_id_fkey"
      columns: ["tenant_id"]
isOneToOne: false
      referencedRelation: "tenants"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "order_lines_tenant_id_item_id_fkey"
      columns: ["tenant_id","item_id"]
isOneToOne: false
      referencedRelation: "items"
      referencedColumns: ["tenant_id","id"]
    },{
      foreignKeyName: "order_lines_tenant_id_order_id_fkey"
      columns: ["tenant_id","order_id"]
isOneToOne: false
      referencedRelation: "orders"
      referencedColumns: ["tenant_id","id"]
    },{
      foreignKeyName: "order_lines_tenant_id_variant_id_fkey"
      columns: ["tenant_id","variant_id"]
isOneToOne: false
      referencedRelation: "item_variants"
      referencedColumns: ["tenant_id","id"]
    }
                  ]
                },"order_messages": {
                  Row: {
                    "created_at": string,"from": string,"id": string,"kind": string,"order_id": string,"seen_at": string | null,"tenant_id": string,"text": string | null,"via": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"from": string,"id"?: string,"kind": string,"order_id": string,"seen_at"?: string | null,"tenant_id": string,"text"?: string | null,"via"?: string
                  }
                  Update: {
                    "created_at"?: string,"from"?: string,"id"?: string,"kind"?: string,"order_id"?: string,"seen_at"?: string | null,"tenant_id"?: string,"text"?: string | null,"via"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "order_messages_tenant_id_fkey"
      columns: ["tenant_id"]
isOneToOne: false
      referencedRelation: "tenants"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "order_messages_tenant_id_order_id_fkey"
      columns: ["tenant_id","order_id"]
isOneToOne: false
      referencedRelation: "orders"
      referencedColumns: ["tenant_id","id"]
    }
                  ]
                },"order_push": {
                  Row: {
                    "order_id": string,"subscription_id": string,"tenant_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "order_id": string,"subscription_id": string,"tenant_id": string
                  }
                  Update: {
                    "order_id"?: string,"subscription_id"?: string,"tenant_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "order_push_tenant_id_fkey"
      columns: ["tenant_id"]
isOneToOne: false
      referencedRelation: "tenants"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "order_push_tenant_id_order_id_fkey"
      columns: ["tenant_id","order_id"]
isOneToOne: false
      referencedRelation: "orders"
      referencedColumns: ["tenant_id","id"]
    },{
      foreignKeyName: "order_push_tenant_id_subscription_id_fkey"
      columns: ["tenant_id","subscription_id"]
isOneToOne: false
      referencedRelation: "push_subscriptions"
      referencedColumns: ["tenant_id","id"]
    }
                  ]
                },"order_ratings": {
                  Row: {
                    "comment": string | null,"created_at": string,"order_id": string,"stars": number,"tenant_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "comment"?: string | null,"created_at"?: string,"order_id": string,"stars": number,"tenant_id": string
                  }
                  Update: {
                    "comment"?: string | null,"created_at"?: string,"order_id"?: string,"stars"?: number,"tenant_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "order_ratings_tenant_id_fkey"
      columns: ["tenant_id"]
isOneToOne: false
      referencedRelation: "tenants"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "order_ratings_tenant_id_order_id_fkey"
      columns: ["tenant_id","order_id"]
isOneToOne: false
      referencedRelation: "orders"
      referencedColumns: ["tenant_id","id"]
    }
                  ]
                },"orders": {
                  Row: {
                    "address_line": string | null,"business_date": string,"cancel_reason": string | null,"client_key": string | null,"created_at": string,"customer_email": string | null,"customer_name": string,"customer_phone": string | null,"delivery_fee": number,"discount": number,"distance_m": number | null,"due_at": string,"edited_at": string | null,"floor": string | null,"house_no": string | null,"id": string,"landmark": string | null,"last_step_at": string,"lat": number | null,"lng": number | null,"member_id": string | null,"note": string | null,"order_no": number,"owner_note": string | null,"paid_amount": number,"pay_by": string | null,"payment_account_id": string | null,"payment_method": string,"payment_status": string,"pickup_code": string,"placed_at": string,"refund_amount": number | null,"refund_reason": string | null,"refunded_at": string | null,"reward_title": string | null,"rider_name": string | null,"rider_phone": string | null,"rider_provider": string | null,"scheduled_at": string | null,"seen_at": string | null,"source": string,"start_by": string,"status": string,"subtotal": number,"tenant_id": string,"token": string,"total": number,"tracking_url": string | null,"type": string,"version": number,"zone_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "address_line"?: string | null,"business_date": string,"cancel_reason"?: string | null,"client_key"?: string | null,"created_at"?: string,"customer_email"?: string | null,"customer_name": string,"customer_phone"?: string | null,"delivery_fee"?: number,"discount"?: number,"distance_m"?: number | null,"due_at": string,"edited_at"?: string | null,"floor"?: string | null,"house_no"?: string | null,"id"?: string,"landmark"?: string | null,"last_step_at"?: string,"lat"?: number | null,"lng"?: number | null,"member_id"?: string | null,"note"?: string | null,"order_no": number,"owner_note"?: string | null,"paid_amount"?: number,"pay_by"?: string | null,"payment_account_id"?: string | null,"payment_method": string,"payment_status"?: string,"pickup_code": string,"placed_at"?: string,"refund_amount"?: number | null,"refund_reason"?: string | null,"refunded_at"?: string | null,"reward_title"?: string | null,"rider_name"?: string | null,"rider_phone"?: string | null,"rider_provider"?: string | null,"scheduled_at"?: string | null,"seen_at"?: string | null,"source"?: string,"start_by": string,"status"?: string,"subtotal": number,"tenant_id": string,"token": string,"total": number,"tracking_url"?: string | null,"type": string,"version"?: number,"zone_id"?: string | null
                  }
                  Update: {
                    "address_line"?: string | null,"business_date"?: string,"cancel_reason"?: string | null,"client_key"?: string | null,"created_at"?: string,"customer_email"?: string | null,"customer_name"?: string,"customer_phone"?: string | null,"delivery_fee"?: number,"discount"?: number,"distance_m"?: number | null,"due_at"?: string,"edited_at"?: string | null,"floor"?: string | null,"house_no"?: string | null,"id"?: string,"landmark"?: string | null,"last_step_at"?: string,"lat"?: number | null,"lng"?: number | null,"member_id"?: string | null,"note"?: string | null,"order_no"?: number,"owner_note"?: string | null,"paid_amount"?: number,"pay_by"?: string | null,"payment_account_id"?: string | null,"payment_method"?: string,"payment_status"?: string,"pickup_code"?: string,"placed_at"?: string,"refund_amount"?: number | null,"refund_reason"?: string | null,"refunded_at"?: string | null,"reward_title"?: string | null,"rider_name"?: string | null,"rider_phone"?: string | null,"rider_provider"?: string | null,"scheduled_at"?: string | null,"seen_at"?: string | null,"source"?: string,"start_by"?: string,"status"?: string,"subtotal"?: number,"tenant_id"?: string,"token"?: string,"total"?: number,"tracking_url"?: string | null,"type"?: string,"version"?: number,"zone_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "orders_tenant_id_fkey"
      columns: ["tenant_id"]
isOneToOne: false
      referencedRelation: "tenants"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "orders_tenant_id_member_id_fkey"
      columns: ["tenant_id","member_id"]
isOneToOne: false
      referencedRelation: "members"
      referencedColumns: ["tenant_id","id"]
    },{
      foreignKeyName: "orders_tenant_id_payment_account_id_fkey"
      columns: ["tenant_id","payment_account_id"]
isOneToOne: false
      referencedRelation: "payment_accounts"
      referencedColumns: ["tenant_id","id"]
    },{
      foreignKeyName: "orders_tenant_id_zone_id_fkey"
      columns: ["tenant_id","zone_id"]
isOneToOne: false
      referencedRelation: "delivery_zones"
      referencedColumns: ["tenant_id","id"]
    }
                  ]
                },"payment_accounts": {
                  Row: {
                    "account_name": string | null,"account_number": string | null,"bank": string | null,"created_at": string,"id": string,"is_sample": boolean,"method": string,"qr_media_id": string | null,"removed_at": string | null,"sort": number,"tenant_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "account_name"?: string | null,"account_number"?: string | null,"bank"?: string | null,"created_at"?: string,"id"?: string,"is_sample"?: boolean,"method": string,"qr_media_id"?: string | null,"removed_at"?: string | null,"sort"?: number,"tenant_id": string
                  }
                  Update: {
                    "account_name"?: string | null,"account_number"?: string | null,"bank"?: string | null,"created_at"?: string,"id"?: string,"is_sample"?: boolean,"method"?: string,"qr_media_id"?: string | null,"removed_at"?: string | null,"sort"?: number,"tenant_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "payment_accounts_tenant_id_fkey"
      columns: ["tenant_id"]
isOneToOne: false
      referencedRelation: "tenants"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "payment_accounts_tenant_id_qr_media_id_fkey"
      columns: ["tenant_id","qr_media_id"]
isOneToOne: false
      referencedRelation: "media_files"
      referencedColumns: ["tenant_id","id"]
    }
                  ]
                },"payment_proofs": {
                  Row: {
                    "created_at": string,"decided_at": string | null,"decided_by": string | null,"id": string,"media_id": string | null,"order_id": string,"reference_no": string | null,"reference_norm": string | null,"reject_reason": string | null,"seen_at": string | null,"status": string,"tenant_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"decided_at"?: string | null,"decided_by"?: string | null,"id"?: string,"media_id"?: string | null,"order_id": string,"reference_no"?: string | null,"reference_norm"?: never,"reject_reason"?: string | null,"seen_at"?: string | null,"status"?: string,"tenant_id": string
                  }
                  Update: {
                    "created_at"?: string,"decided_at"?: string | null,"decided_by"?: string | null,"id"?: string,"media_id"?: string | null,"order_id"?: string,"reference_no"?: string | null,"reference_norm"?: never,"reject_reason"?: string | null,"seen_at"?: string | null,"status"?: string,"tenant_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "payment_proofs_tenant_id_fkey"
      columns: ["tenant_id"]
isOneToOne: false
      referencedRelation: "tenants"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "payment_proofs_tenant_id_media_id_fkey"
      columns: ["tenant_id","media_id"]
isOneToOne: false
      referencedRelation: "media_files"
      referencedColumns: ["tenant_id","id"]
    },{
      foreignKeyName: "payment_proofs_tenant_id_order_id_fkey"
      columns: ["tenant_id","order_id"]
isOneToOne: false
      referencedRelation: "orders"
      referencedColumns: ["tenant_id","id"]
    }
                  ]
                },"plan_payments": {
                  Row: {
                    "amount": number,"covers_until": string,"created_at": string,"decided_at": string | null,"decided_by": string | null,"id": string,"method": string,"months": number,"proof_media_id": string | null,"recorded_by": string | null,"reference": string | null,"reference_norm": string | null,"reject_reason": string | null,"status": string,"tenant_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "amount": number,"covers_until": string,"created_at"?: string,"decided_at"?: string | null,"decided_by"?: string | null,"id"?: string,"method": string,"months": number,"proof_media_id"?: string | null,"recorded_by"?: string | null,"reference"?: string | null,"reference_norm"?: never,"reject_reason"?: string | null,"status"?: string,"tenant_id": string
                  }
                  Update: {
                    "amount"?: number,"covers_until"?: string,"created_at"?: string,"decided_at"?: string | null,"decided_by"?: string | null,"id"?: string,"method"?: string,"months"?: number,"proof_media_id"?: string | null,"recorded_by"?: string | null,"reference"?: string | null,"reference_norm"?: never,"reject_reason"?: string | null,"status"?: string,"tenant_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "plan_payments_tenant_id_fkey"
      columns: ["tenant_id"]
isOneToOne: false
      referencedRelation: "tenants"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "plan_payments_tenant_id_proof_media_id_fkey"
      columns: ["tenant_id","proof_media_id"]
isOneToOne: false
      referencedRelation: "media_files"
      referencedColumns: ["tenant_id","id"]
    }
                  ]
                },"platform_settings": {
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
                },"push_campaigns": {
                  Row: {
                    "audience": string,"body": string,"copied_from_id": string | null,"created_at": string,"created_by": string | null,"id": string,"image_media_id": string | null,"link_item_id": string | null,"link_kind": string,"phones": number,"send_at": string | null,"sent_at": string | null,"status": string,"tenant_id": string,"title": string,"updated_at": string,"wait_reason": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "audience"?: string,"body": string,"copied_from_id"?: string | null,"created_at"?: string,"created_by"?: string | null,"id"?: string,"image_media_id"?: string | null,"link_item_id"?: string | null,"link_kind"?: string,"phones"?: number,"send_at"?: string | null,"sent_at"?: string | null,"status"?: string,"tenant_id": string,"title": string,"updated_at"?: string,"wait_reason"?: string | null
                  }
                  Update: {
                    "audience"?: string,"body"?: string,"copied_from_id"?: string | null,"created_at"?: string,"created_by"?: string | null,"id"?: string,"image_media_id"?: string | null,"link_item_id"?: string | null,"link_kind"?: string,"phones"?: number,"send_at"?: string | null,"sent_at"?: string | null,"status"?: string,"tenant_id"?: string,"title"?: string,"updated_at"?: string,"wait_reason"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "push_campaigns_tenant_id_copied_from_id_fkey"
      columns: ["tenant_id","copied_from_id"]
isOneToOne: false
      referencedRelation: "push_campaigns"
      referencedColumns: ["tenant_id","id"]
    },{
      foreignKeyName: "push_campaigns_tenant_id_fkey"
      columns: ["tenant_id"]
isOneToOne: false
      referencedRelation: "tenants"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "push_campaigns_tenant_id_image_media_id_fkey"
      columns: ["tenant_id","image_media_id"]
isOneToOne: false
      referencedRelation: "media_files"
      referencedColumns: ["tenant_id","id"]
    },{
      foreignKeyName: "push_campaigns_tenant_id_link_item_id_fkey"
      columns: ["tenant_id","link_item_id"]
isOneToOne: false
      referencedRelation: "items"
      referencedColumns: ["tenant_id","id"]
    }
                  ]
                },"push_deliveries": {
                  Row: {
                    "attempts": number,"campaign_id": string,"created_at": string,"id": string,"member_id": string | null,"opened_at": string | null,"platform": string,"sent_at": string | null,"status": string,"stopped_at": string | null,"subscription_id": string | null,"tenant_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "attempts"?: number,"campaign_id": string,"created_at"?: string,"id"?: string,"member_id"?: string | null,"opened_at"?: string | null,"platform"?: string,"sent_at"?: string | null,"status"?: string,"stopped_at"?: string | null,"subscription_id"?: string | null,"tenant_id": string
                  }
                  Update: {
                    "attempts"?: number,"campaign_id"?: string,"created_at"?: string,"id"?: string,"member_id"?: string | null,"opened_at"?: string | null,"platform"?: string,"sent_at"?: string | null,"status"?: string,"stopped_at"?: string | null,"subscription_id"?: string | null,"tenant_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "push_deliveries_tenant_id_campaign_id_fkey"
      columns: ["tenant_id","campaign_id"]
isOneToOne: false
      referencedRelation: "push_campaigns"
      referencedColumns: ["tenant_id","id"]
    },{
      foreignKeyName: "push_deliveries_tenant_id_fkey"
      columns: ["tenant_id"]
isOneToOne: false
      referencedRelation: "tenants"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "push_deliveries_tenant_id_member_id_fkey"
      columns: ["tenant_id","member_id"]
isOneToOne: false
      referencedRelation: "members"
      referencedColumns: ["tenant_id","id"]
    },{
      foreignKeyName: "push_deliveries_tenant_id_subscription_id_fkey"
      columns: ["tenant_id","subscription_id"]
isOneToOne: false
      referencedRelation: "push_subscriptions"
      referencedColumns: ["tenant_id","id"]
    }
                  ]
                },"push_outbox": {
                  Row: {
                    "attempts": number,"created_at": string,"dedupe_key": string,"id": string,"kind": string,"payload": NonNullable<Json>,"send_after": string,"sent_at": string | null,"status": string,"subscription_id": string,"tenant_id": string,"topic": string | null,"ttl_seconds": number,"urgency": string
                  }
                  ComputedFields: never
                  Insert: {
                    "attempts"?: number,"created_at"?: string,"dedupe_key": string,"id"?: string,"kind": string,"payload": NonNullable<Json>,"send_after"?: string,"sent_at"?: string | null,"status"?: string,"subscription_id": string,"tenant_id": string,"topic"?: string | null,"ttl_seconds"?: number,"urgency"?: string
                  }
                  Update: {
                    "attempts"?: number,"created_at"?: string,"dedupe_key"?: string,"id"?: string,"kind"?: string,"payload"?: NonNullable<Json>,"send_after"?: string,"sent_at"?: string | null,"status"?: string,"subscription_id"?: string,"tenant_id"?: string,"topic"?: string | null,"ttl_seconds"?: number,"urgency"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "push_outbox_tenant_id_fkey"
      columns: ["tenant_id"]
isOneToOne: false
      referencedRelation: "tenants"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "push_outbox_tenant_id_subscription_id_fkey"
      columns: ["tenant_id","subscription_id"]
isOneToOne: false
      referencedRelation: "push_subscriptions"
      referencedColumns: ["tenant_id","id"]
    }
                  ]
                },"push_subscriptions": {
                  Row: {
                    "auth": string,"created_at": string,"endpoint": string,"fail_count": number,"id": string,"last_ok_at": string | null,"member_id": string | null,"news": boolean,"news_changed_at": string | null,"p256dh": string,"platform": string,"tenant_id": string,"user_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "auth": string,"created_at"?: string,"endpoint": string,"fail_count"?: number,"id"?: string,"last_ok_at"?: string | null,"member_id"?: string | null,"news"?: boolean,"news_changed_at"?: string | null,"p256dh": string,"platform"?: string,"tenant_id": string,"user_id"?: string | null
                  }
                  Update: {
                    "auth"?: string,"created_at"?: string,"endpoint"?: string,"fail_count"?: number,"id"?: string,"last_ok_at"?: string | null,"member_id"?: string | null,"news"?: boolean,"news_changed_at"?: string | null,"p256dh"?: string,"platform"?: string,"tenant_id"?: string,"user_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "push_subscriptions_tenant_id_fkey"
      columns: ["tenant_id"]
isOneToOne: false
      referencedRelation: "tenants"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "push_subscriptions_tenant_id_member_id_fkey"
      columns: ["tenant_id","member_id"]
isOneToOne: false
      referencedRelation: "members"
      referencedColumns: ["tenant_id","id"]
    }
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
                },"reward_claims": {
                  Row: {
                    "cancel_reason": string | null,"code": string,"created_at": string,"given_at": string | null,"given_by": string | null,"id": string,"member_id": string,"status": string,"tenant_id": string,"title": string
                  }
                  ComputedFields: never
                  Insert: {
                    "cancel_reason"?: string | null,"code": string,"created_at"?: string,"given_at"?: string | null,"given_by"?: string | null,"id"?: string,"member_id": string,"status"?: string,"tenant_id": string,"title": string
                  }
                  Update: {
                    "cancel_reason"?: string | null,"code"?: string,"created_at"?: string,"given_at"?: string | null,"given_by"?: string | null,"id"?: string,"member_id"?: string,"status"?: string,"tenant_id"?: string,"title"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "reward_claims_tenant_id_fkey"
      columns: ["tenant_id"]
isOneToOne: false
      referencedRelation: "tenants"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "reward_claims_tenant_id_member_id_fkey"
      columns: ["tenant_id","member_id"]
isOneToOne: false
      referencedRelation: "members"
      referencedColumns: ["tenant_id","id"]
    }
                  ]
                },"shop_activity": {
                  Row: {
                    "amount": number | null,"at": string,"by": string,"days": number | null,"events": (string)[],"id": string,"kind": string,"minutes": number | null,"note": string | null,"reason": string | null,"tenant_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "amount"?: number | null,"at"?: string,"by": string,"days"?: number | null,"events"?: (string)[],"id"?: string,"kind": string,"minutes"?: number | null,"note"?: string | null,"reason"?: string | null,"tenant_id": string
                  }
                  Update: {
                    "amount"?: number | null,"at"?: string,"by"?: string,"days"?: number | null,"events"?: (string)[],"id"?: string,"kind"?: string,"minutes"?: number | null,"note"?: string | null,"reason"?: string | null,"tenant_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "shop_activity_tenant_id_fkey"
      columns: ["tenant_id"]
isOneToOne: false
      referencedRelation: "tenants"
      referencedColumns: ["id"]
    }
                  ]
                },"shop_settings": {
                  Row: {
                    "address": string | null,"busy_until": string | null,"cod_max_total": number | null,"days_ahead": number,"delivery_on": boolean,"facebook_url": string | null,"free_delivery_from": number | null,"google_review_url": string | null,"messenger_username": string | null,"orders_per_slot": number | null,"paused": boolean,"phone": string | null,"pickup_note": string | null,"pickup_on": boolean,"pin_lat": number | null,"pin_lng": number | null,"prep_minutes": number,"push_reward_ready": boolean,"push_stamp_added": boolean,"show_address": boolean,"slot_minutes": number,"take_orders_while_closed": boolean,"tenant_id": string,"updated_at": string,"walk_in_on": boolean
                  }
                  ComputedFields: never
                  Insert: {
                    "address"?: string | null,"busy_until"?: string | null,"cod_max_total"?: number | null,"days_ahead"?: number,"delivery_on"?: boolean,"facebook_url"?: string | null,"free_delivery_from"?: number | null,"google_review_url"?: string | null,"messenger_username"?: string | null,"orders_per_slot"?: number | null,"paused"?: boolean,"phone"?: string | null,"pickup_note"?: string | null,"pickup_on"?: boolean,"pin_lat"?: number | null,"pin_lng"?: number | null,"prep_minutes"?: number,"push_reward_ready"?: boolean,"push_stamp_added"?: boolean,"show_address"?: boolean,"slot_minutes"?: number,"take_orders_while_closed"?: boolean,"tenant_id": string,"updated_at"?: string,"walk_in_on"?: boolean
                  }
                  Update: {
                    "address"?: string | null,"busy_until"?: string | null,"cod_max_total"?: number | null,"days_ahead"?: number,"delivery_on"?: boolean,"facebook_url"?: string | null,"free_delivery_from"?: number | null,"google_review_url"?: string | null,"messenger_username"?: string | null,"orders_per_slot"?: number | null,"paused"?: boolean,"phone"?: string | null,"pickup_note"?: string | null,"pickup_on"?: boolean,"pin_lat"?: number | null,"pin_lng"?: number | null,"prep_minutes"?: number,"push_reward_ready"?: boolean,"push_stamp_added"?: boolean,"show_address"?: boolean,"slot_minutes"?: number,"take_orders_while_closed"?: boolean,"tenant_id"?: string,"updated_at"?: string,"walk_in_on"?: boolean
                  }
                  Relationships: [
                    {
      foreignKeyName: "shop_settings_tenant_id_fkey"
      columns: ["tenant_id"]
isOneToOne: true
      referencedRelation: "tenants"
      referencedColumns: ["id"]
    }
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
                },"stamp_cards": {
                  Row: {
                    "max_earned": number | null,"min_order_total": number,"one_per_customer": boolean,"period": string | null,"quantity_left": number | null,"quantity_total": number | null,"reward_amount": number | null,"reward_description": string | null,"reward_item_id": string | null,"reward_kind": string,"reward_media_id": string | null,"reward_title": string,"reward_variant_id": string | null,"stamps_needed": number,"status": string,"tenant_id": string,"updated_at": string,"welcome_stamps": number
                  }
                  ComputedFields: never
                  Insert: {
                    "max_earned"?: number | null,"min_order_total"?: number,"one_per_customer"?: boolean,"period"?: string | null,"quantity_left"?: number | null,"quantity_total"?: number | null,"reward_amount"?: number | null,"reward_description"?: string | null,"reward_item_id"?: string | null,"reward_kind": string,"reward_media_id"?: string | null,"reward_title": string,"reward_variant_id"?: string | null,"stamps_needed"?: number,"status"?: string,"tenant_id": string,"updated_at"?: string,"welcome_stamps"?: number
                  }
                  Update: {
                    "max_earned"?: number | null,"min_order_total"?: number,"one_per_customer"?: boolean,"period"?: string | null,"quantity_left"?: number | null,"quantity_total"?: number | null,"reward_amount"?: number | null,"reward_description"?: string | null,"reward_item_id"?: string | null,"reward_kind"?: string,"reward_media_id"?: string | null,"reward_title"?: string,"reward_variant_id"?: string | null,"stamps_needed"?: number,"status"?: string,"tenant_id"?: string,"updated_at"?: string,"welcome_stamps"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "stamp_cards_reward_item_fk"
      columns: ["tenant_id","reward_item_id"]
isOneToOne: false
      referencedRelation: "items"
      referencedColumns: ["tenant_id","id"]
    },{
      foreignKeyName: "stamp_cards_reward_variant_fk"
      columns: ["tenant_id","reward_item_id","reward_variant_id"]
isOneToOne: false
      referencedRelation: "item_variants"
      referencedColumns: ["tenant_id","item_id","id"]
    },{
      foreignKeyName: "stamp_cards_tenant_id_fkey"
      columns: ["tenant_id"]
isOneToOne: true
      referencedRelation: "tenants"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "stamp_cards_tenant_id_reward_media_id_fkey"
      columns: ["tenant_id","reward_media_id"]
isOneToOne: false
      referencedRelation: "media_files"
      referencedColumns: ["tenant_id","id"]
    }
                  ]
                },"stamp_entries": {
                  Row: {
                    "by_user_id": string | null,"claim_id": string | null,"client_key": string | null,"created_at": string,"delta": number,"id": string,"kind": string,"member_id": string,"order_id": string | null,"private_note": string | null,"reason_category": string | null,"tenant_id": string,"undoes_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "by_user_id"?: string | null,"claim_id"?: string | null,"client_key"?: string | null,"created_at"?: string,"delta": number,"id"?: string,"kind": string,"member_id": string,"order_id"?: string | null,"private_note"?: string | null,"reason_category"?: string | null,"tenant_id": string,"undoes_id"?: string | null
                  }
                  Update: {
                    "by_user_id"?: string | null,"claim_id"?: string | null,"client_key"?: string | null,"created_at"?: string,"delta"?: number,"id"?: string,"kind"?: string,"member_id"?: string,"order_id"?: string | null,"private_note"?: string | null,"reason_category"?: string | null,"tenant_id"?: string,"undoes_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "stamp_entries_tenant_id_claim_id_fkey"
      columns: ["tenant_id","claim_id"]
isOneToOne: false
      referencedRelation: "reward_claims"
      referencedColumns: ["tenant_id","id"]
    },{
      foreignKeyName: "stamp_entries_tenant_id_fkey"
      columns: ["tenant_id"]
isOneToOne: false
      referencedRelation: "tenants"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "stamp_entries_tenant_id_member_id_fkey"
      columns: ["tenant_id","member_id"]
isOneToOne: false
      referencedRelation: "members"
      referencedColumns: ["tenant_id","id"]
    },{
      foreignKeyName: "stamp_entries_tenant_id_order_id_fkey"
      columns: ["tenant_id","order_id"]
isOneToOne: false
      referencedRelation: "orders"
      referencedColumns: ["tenant_id","id"]
    },{
      foreignKeyName: "stamp_entries_tenant_id_undoes_id_fkey"
      columns: ["tenant_id","undoes_id"]
isOneToOne: false
      referencedRelation: "stamp_entries"
      referencedColumns: ["tenant_id","id"]
    }
                  ]
                },"storefront_content": {
                  Row: {
                    "draft": NonNullable<Json>,"draft_version": number,"published": NonNullable<Json>,"published_at": string | null,"published_version": number,"saved_at": string | null,"tenant_id": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "draft": NonNullable<Json>,"draft_version"?: number,"published": NonNullable<Json>,"published_at"?: string | null,"published_version"?: number,"saved_at"?: string | null,"tenant_id": string,"updated_at"?: string
                  }
                  Update: {
                    "draft"?: NonNullable<Json>,"draft_version"?: number,"published"?: NonNullable<Json>,"published_at"?: string | null,"published_version"?: number,"saved_at"?: string | null,"tenant_id"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "storefront_content_tenant_id_fkey"
      columns: ["tenant_id"]
isOneToOne: true
      referencedRelation: "tenants"
      referencedColumns: ["id"]
    }
                  ]
                },"storefront_media": {
                  Row: {
                    "media_id": string,"tenant_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "media_id": string,"tenant_id": string
                  }
                  Update: {
                    "media_id"?: string,"tenant_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "storefront_media_tenant_id_fkey"
      columns: ["tenant_id"]
isOneToOne: false
      referencedRelation: "tenants"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "storefront_media_tenant_id_media_id_fkey"
      columns: ["tenant_id","media_id"]
isOneToOne: true
      referencedRelation: "media_files"
      referencedColumns: ["tenant_id","id"]
    }
                  ]
                },"support_sessions": {
                  Row: {
                    "admin_user_id": string,"ended_at": string | null,"ends_at": string,"id": string,"reason": string,"started_at": string,"tenant_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "admin_user_id": string,"ended_at"?: string | null,"ends_at": string,"id"?: string,"reason": string,"started_at"?: string,"tenant_id": string
                  }
                  Update: {
                    "admin_user_id"?: string,"ended_at"?: string | null,"ends_at"?: string,"id"?: string,"reason"?: string,"started_at"?: string,"tenant_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "support_sessions_tenant_id_fkey"
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
                },"track_events": {
                  Row: {
                    "attempts": number,"created_at": string,"event_id": string,"id": string,"lead_id": string | null,"name": string,"page_url": string | null,"problem": string | null,"send_after": string,"sent_at": string | null,"status": string,"tenant_id": string | null,"test": boolean,"user_data": NonNullable<Json>,"value": number | null,"via": string
                  }
                  ComputedFields: never
                  Insert: {
                    "attempts"?: number,"created_at"?: string,"event_id": string,"id"?: string,"lead_id"?: string | null,"name": string,"page_url"?: string | null,"problem"?: string | null,"send_after"?: string,"sent_at"?: string | null,"status"?: string,"tenant_id"?: string | null,"test"?: boolean,"user_data"?: NonNullable<Json>,"value"?: number | null,"via": string
                  }
                  Update: {
                    "attempts"?: number,"created_at"?: string,"event_id"?: string,"id"?: string,"lead_id"?: string | null,"name"?: string,"page_url"?: string | null,"problem"?: string | null,"send_after"?: string,"sent_at"?: string | null,"status"?: string,"tenant_id"?: string | null,"test"?: boolean,"user_data"?: NonNullable<Json>,"value"?: number | null,"via"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "track_events_lead_id_fkey"
      columns: ["lead_id"]
isOneToOne: false
      referencedRelation: "signup_leads"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "track_events_tenant_id_fkey"
      columns: ["tenant_id"]
isOneToOne: false
      referencedRelation: "tenants"
      referencedColumns: ["id"]
    }
                  ]
                },"variant_template_values": {
                  Row: {
                    "id": string,"label": string,"sort": number,"template_id": string,"tenant_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "id"?: string,"label": string,"sort"?: number,"template_id": string,"tenant_id": string
                  }
                  Update: {
                    "id"?: string,"label"?: string,"sort"?: number,"template_id"?: string,"tenant_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "variant_template_values_tenant_id_fkey"
      columns: ["tenant_id"]
isOneToOne: false
      referencedRelation: "tenants"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "variant_template_values_tenant_id_template_id_fkey"
      columns: ["tenant_id","template_id"]
isOneToOne: false
      referencedRelation: "variant_templates"
      referencedColumns: ["tenant_id","id"]
    }
                  ]
                },"variant_templates": {
                  Row: {
                    "created_at": string,"id": string,"is_sample": boolean,"name": string,"tenant_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"is_sample"?: boolean,"name": string,"tenant_id": string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"is_sample"?: boolean,"name"?: string,"tenant_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "variant_templates_tenant_id_fkey"
      columns: ["tenant_id"]
isOneToOne: false
      referencedRelation: "tenants"
      referencedColumns: ["id"]
    }
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
