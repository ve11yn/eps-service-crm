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
      ai_run_statuses: {
        Row: {
          code: string
          created_at: string
          description: string | null
          is_active: boolean
          label: string
          sort_order: number
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          is_active?: boolean
          label: string
          sort_order?: number
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          is_active?: boolean
          label?: string
          sort_order?: number
        }
        Relationships: []
      }
      ai_runs: {
        Row: {
          completed_at: string | null
          created_at: string
          error_message: string | null
          id: string
          input_payload: Json
          lead_id: string | null
          model_name: string | null
          output_payload: Json
          project_id: string | null
          run_type: string
          status_code: string
          thread_id: string | null
          triggered_by_profile_id: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          input_payload?: Json
          lead_id?: string | null
          model_name?: string | null
          output_payload?: Json
          project_id?: string | null
          run_type: string
          status_code?: string
          thread_id?: string | null
          triggered_by_profile_id?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          input_payload?: Json
          lead_id?: string | null
          model_name?: string | null
          output_payload?: Json
          project_id?: string | null
          run_type?: string
          status_code?: string
          thread_id?: string | null
          triggered_by_profile_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_runs_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_runs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_runs_status_code_fkey"
            columns: ["status_code"]
            isOneToOne: false
            referencedRelation: "ai_run_statuses"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "ai_runs_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_threads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_runs_triggered_by_profile_id_fkey"
            columns: ["triggered_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      appointment_statuses: {
        Row: {
          code: string
          created_at: string
          description: string | null
          is_active: boolean
          label: string
          sort_order: number
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          is_active?: boolean
          label: string
          sort_order?: number
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          is_active?: boolean
          label?: string
          sort_order?: number
        }
        Relationships: []
      }
      appointment_types: {
        Row: {
          code: string
          created_at: string
          description: string | null
          is_active: boolean
          label: string
          sort_order: number
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          is_active?: boolean
          label: string
          sort_order?: number
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          is_active?: boolean
          label?: string
          sort_order?: number
        }
        Relationships: []
      }
      appointments: {
        Row: {
          appointment_type_code: string
          assigned_profile_id: string | null
          completed_at: string | null
          created_at: string
          created_by_profile_id: string | null
          id: string
          lead_id: string | null
          notes: string | null
          project_id: string | null
          scheduled_end_at: string | null
          scheduled_start_at: string
          status_code: string
          updated_at: string
        }
        Insert: {
          appointment_type_code: string
          assigned_profile_id?: string | null
          completed_at?: string | null
          created_at?: string
          created_by_profile_id?: string | null
          id?: string
          lead_id?: string | null
          notes?: string | null
          project_id?: string | null
          scheduled_end_at?: string | null
          scheduled_start_at: string
          status_code?: string
          updated_at?: string
        }
        Update: {
          appointment_type_code?: string
          assigned_profile_id?: string | null
          completed_at?: string | null
          created_at?: string
          created_by_profile_id?: string | null
          id?: string
          lead_id?: string | null
          notes?: string | null
          project_id?: string | null
          scheduled_end_at?: string | null
          scheduled_start_at?: string
          status_code?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_appointment_type_code_fkey"
            columns: ["appointment_type_code"]
            isOneToOne: false
            referencedRelation: "appointment_types"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "appointments_assigned_profile_id_fkey"
            columns: ["assigned_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_created_by_profile_id_fkey"
            columns: ["created_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_status_code_fkey"
            columns: ["status_code"]
            isOneToOne: false
            referencedRelation: "appointment_statuses"
            referencedColumns: ["code"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          metadata: Json | null
          new_value: Json | null
          old_value: Json | null
          performed_by_profile_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          metadata?: Json | null
          new_value?: Json | null
          old_value?: Json | null
          performed_by_profile_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          metadata?: Json | null
          new_value?: Json | null
          old_value?: Json | null
          performed_by_profile_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_performed_by_profile_id_fkey"
            columns: ["performed_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_roles: {
        Row: {
          code: string
          created_at: string
          description: string | null
          is_active: boolean
          label: string
          sort_order: number
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          is_active?: boolean
          label: string
          sort_order?: number
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          is_active?: boolean
          label?: string
          sort_order?: number
        }
        Relationships: []
      }
      contacts: {
        Row: {
          created_at: string
          email: string | null
          full_name: string
          id: string
          notes: string | null
          primary_phone: string | null
          updated_at: string
          whatsapp_number: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          notes?: string | null
          primary_phone?: string | null
          updated_at?: string
          whatsapp_number?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          notes?: string | null
          primary_phone?: string | null
          updated_at?: string
          whatsapp_number?: string | null
        }
        Relationships: []
      }
      document_types: {
        Row: {
          code: string
          created_at: string
          description: string | null
          is_active: boolean
          label: string
          sort_order: number
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          is_active?: boolean
          label: string
          sort_order?: number
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          is_active?: boolean
          label?: string
          sort_order?: number
        }
        Relationships: []
      }
      documents: {
        Row: {
          created_at: string
          document_type_code: string
          external_url: string | null
          file_name: string
          file_size_bytes: number | null
          id: string
          invoice_id: string | null
          is_customer_visible: boolean
          lead_id: string | null
          mime_type: string | null
          payment_id: string | null
          project_id: string | null
          project_item_id: string | null
          purchase_id: string | null
          quote_id: string | null
          storage_bucket: string | null
          storage_path: string | null
          uploaded_by_profile_id: string | null
        }
        Insert: {
          created_at?: string
          document_type_code: string
          external_url?: string | null
          file_name: string
          file_size_bytes?: number | null
          id?: string
          invoice_id?: string | null
          is_customer_visible?: boolean
          lead_id?: string | null
          mime_type?: string | null
          payment_id?: string | null
          project_id?: string | null
          project_item_id?: string | null
          purchase_id?: string | null
          quote_id?: string | null
          storage_bucket?: string | null
          storage_path?: string | null
          uploaded_by_profile_id?: string | null
        }
        Update: {
          created_at?: string
          document_type_code?: string
          external_url?: string | null
          file_name?: string
          file_size_bytes?: number | null
          id?: string
          invoice_id?: string | null
          is_customer_visible?: boolean
          lead_id?: string | null
          mime_type?: string | null
          payment_id?: string | null
          project_id?: string | null
          project_item_id?: string | null
          purchase_id?: string | null
          quote_id?: string | null
          storage_bucket?: string | null
          storage_path?: string | null
          uploaded_by_profile_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_document_type_code_fkey"
            columns: ["document_type_code"]
            isOneToOne: false
            referencedRelation: "document_types"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "documents_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_project_item_id_fkey"
            columns: ["project_item_id"]
            isOneToOne: false
            referencedRelation: "project_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "purchases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_uploaded_by_profile_id_fkey"
            columns: ["uploaded_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_statuses: {
        Row: {
          code: string
          created_at: string
          description: string | null
          is_active: boolean
          label: string
          sort_order: number
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          is_active?: boolean
          label: string
          sort_order?: number
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          is_active?: boolean
          label?: string
          sort_order?: number
        }
        Relationships: []
      }
      invoices: {
        Row: {
          balance_due_amount: number
          cancelled_at: string | null
          created_at: string
          created_by_profile_id: string | null
          currency_code: string
          due_at: string | null
          id: string
          invoice_number: string
          issued_at: string | null
          notes: string | null
          paid_at: string | null
          project_id: string
          quickbooks_sync_id: string | null
          quote_id: string | null
          status_code: string
          subtotal_amount: number
          tax_amount: number
          total_amount: number
          updated_at: string
        }
        Insert: {
          balance_due_amount?: number
          cancelled_at?: string | null
          created_at?: string
          created_by_profile_id?: string | null
          currency_code?: string
          due_at?: string | null
          id?: string
          invoice_number: string
          issued_at?: string | null
          notes?: string | null
          paid_at?: string | null
          project_id: string
          quickbooks_sync_id?: string | null
          quote_id?: string | null
          status_code?: string
          subtotal_amount?: number
          tax_amount?: number
          total_amount?: number
          updated_at?: string
        }
        Update: {
          balance_due_amount?: number
          cancelled_at?: string | null
          created_at?: string
          created_by_profile_id?: string | null
          currency_code?: string
          due_at?: string | null
          id?: string
          invoice_number?: string
          issued_at?: string | null
          notes?: string | null
          paid_at?: string | null
          project_id?: string
          quickbooks_sync_id?: string | null
          quote_id?: string | null
          status_code?: string
          subtotal_amount?: number
          tax_amount?: number
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_created_by_profile_id_fkey"
            columns: ["created_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_status_code_fkey"
            columns: ["status_code"]
            isOneToOne: false
            referencedRelation: "invoice_statuses"
            referencedColumns: ["code"]
          },
        ]
      }
      labels: {
        Row: {
          code: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          label: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          label: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          label?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      lead_contacts: {
        Row: {
          contact_id: string
          created_at: string
          is_primary: boolean
          lead_id: string
          notes: string | null
          role_code: string
        }
        Insert: {
          contact_id: string
          created_at?: string
          is_primary?: boolean
          lead_id: string
          notes?: string | null
          role_code: string
        }
        Update: {
          contact_id?: string
          created_at?: string
          is_primary?: boolean
          lead_id?: string
          notes?: string | null
          role_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_contacts_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_contacts_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_contacts_role_code_fkey"
            columns: ["role_code"]
            isOneToOne: false
            referencedRelation: "contact_roles"
            referencedColumns: ["code"]
          },
        ]
      }
      lead_labels: {
        Row: {
          created_at: string
          label_id: string
          lead_id: string
        }
        Insert: {
          created_at?: string
          label_id: string
          lead_id: string
        }
        Update: {
          created_at?: string
          label_id?: string
          lead_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_labels_label_id_fkey"
            columns: ["label_id"]
            isOneToOne: false
            referencedRelation: "labels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_labels_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_statuses: {
        Row: {
          code: string
          created_at: string
          description: string | null
          is_active: boolean
          label: string
          sort_order: number
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          is_active?: boolean
          label: string
          sort_order?: number
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          is_active?: boolean
          label?: string
          sort_order?: number
        }
        Relationships: []
      }
      leads: {
        Row: {
          ai_summary: string | null
          assigned_to_profile_id: string | null
          created_at: string
          customer_request: string | null
          id: string
          last_activity_at: string | null
          lead_code: string
          lost_reason: string | null
          primary_contact_id: string | null
          primary_property_id: string | null
          qualification_notes: string | null
          received_at: string
          site_visit_required: boolean
          source_channel_code: string
          status_code: string
          summary: string | null
          title: string | null
          updated_at: string
          whatsapp_thread_id: string | null
        }
        Insert: {
          ai_summary?: string | null
          assigned_to_profile_id?: string | null
          created_at?: string
          customer_request?: string | null
          id?: string
          last_activity_at?: string | null
          lead_code: string
          lost_reason?: string | null
          primary_contact_id?: string | null
          primary_property_id?: string | null
          qualification_notes?: string | null
          received_at?: string
          site_visit_required?: boolean
          source_channel_code?: string
          status_code?: string
          summary?: string | null
          title?: string | null
          updated_at?: string
          whatsapp_thread_id?: string | null
        }
        Update: {
          ai_summary?: string | null
          assigned_to_profile_id?: string | null
          created_at?: string
          customer_request?: string | null
          id?: string
          last_activity_at?: string | null
          lead_code?: string
          lost_reason?: string | null
          primary_contact_id?: string | null
          primary_property_id?: string | null
          qualification_notes?: string | null
          received_at?: string
          site_visit_required?: boolean
          source_channel_code?: string
          status_code?: string
          summary?: string | null
          title?: string | null
          updated_at?: string
          whatsapp_thread_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_assigned_to_profile_id_fkey"
            columns: ["assigned_to_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_primary_contact_id_fkey"
            columns: ["primary_contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_primary_property_id_fkey"
            columns: ["primary_property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_source_channel_code_fkey"
            columns: ["source_channel_code"]
            isOneToOne: false
            referencedRelation: "source_channels"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "leads_status_code_fkey"
            columns: ["status_code"]
            isOneToOne: false
            referencedRelation: "lead_statuses"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "leads_whatsapp_thread_id_fkey"
            columns: ["whatsapp_thread_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      media_assets: {
        Row: {
          caption: string | null
          captured_at: string | null
          created_at: string
          evidence_type: string | null
          id: string
          lead_id: string | null
          media_type: string | null
          message_id: string | null
          mime_type: string | null
          project_id: string | null
          project_item_id: string | null
          public_url: string | null
          storage_bucket: string
          storage_path: string
          uploaded_by_profile_id: string | null
        }
        Insert: {
          caption?: string | null
          captured_at?: string | null
          created_at?: string
          evidence_type?: string | null
          id?: string
          lead_id?: string | null
          media_type?: string | null
          message_id?: string | null
          mime_type?: string | null
          project_id?: string | null
          project_item_id?: string | null
          public_url?: string | null
          storage_bucket?: string
          storage_path: string
          uploaded_by_profile_id?: string | null
        }
        Update: {
          caption?: string | null
          captured_at?: string | null
          created_at?: string
          evidence_type?: string | null
          id?: string
          lead_id?: string | null
          media_type?: string | null
          message_id?: string | null
          mime_type?: string | null
          project_id?: string | null
          project_item_id?: string | null
          public_url?: string | null
          storage_bucket?: string
          storage_path?: string
          uploaded_by_profile_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "media_assets_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_assets_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_assets_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_assets_project_item_id_fkey"
            columns: ["project_item_id"]
            isOneToOne: false
            referencedRelation: "project_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_assets_uploaded_by_profile_id_fkey"
            columns: ["uploaded_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      message_directions: {
        Row: {
          code: string
          created_at: string
          description: string | null
          is_active: boolean
          label: string
          sort_order: number
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          is_active?: boolean
          label: string
          sort_order?: number
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          is_active?: boolean
          label?: string
          sort_order?: number
        }
        Relationships: []
      }
      message_types: {
        Row: {
          code: string
          created_at: string
          description: string | null
          is_active: boolean
          label: string
          sort_order: number
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          is_active?: boolean
          label: string
          sort_order?: number
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          is_active?: boolean
          label?: string
          sort_order?: number
        }
        Relationships: []
      }
      messages: {
        Row: {
          content: string | null
          created_at: string
          direction_code: string
          external_message_id: string | null
          id: string
          media_caption: string | null
          message_type_code: string
          provider_payload: Json
          sender_name: string | null
          sender_phone: string | null
          sent_at: string
          thread_id: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          direction_code: string
          external_message_id?: string | null
          id?: string
          media_caption?: string | null
          message_type_code: string
          provider_payload?: Json
          sender_name?: string | null
          sender_phone?: string | null
          sent_at?: string
          thread_id: string
        }
        Update: {
          content?: string | null
          created_at?: string
          direction_code?: string
          external_message_id?: string | null
          id?: string
          media_caption?: string | null
          message_type_code?: string
          provider_payload?: Json
          sender_name?: string | null
          sender_phone?: string | null
          sent_at?: string
          thread_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_direction_code_fkey"
            columns: ["direction_code"]
            isOneToOne: false
            referencedRelation: "message_directions"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "messages_message_type_code_fkey"
            columns: ["message_type_code"]
            isOneToOne: false
            referencedRelation: "message_types"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_statuses: {
        Row: {
          code: string
          created_at: string
          description: string | null
          is_active: boolean
          label: string
          sort_order: number
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          is_active?: boolean
          label: string
          sort_order?: number
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          is_active?: boolean
          label?: string
          sort_order?: number
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          currency_code: string
          id: string
          invoice_id: string | null
          notes: string | null
          payment_method: string | null
          project_id: string
          proof_reference: string | null
          reference_number: string | null
          refunded_at: string | null
          reported_at: string | null
          status_code: string
          updated_at: string
          verified_at: string | null
          verified_by_profile_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          currency_code?: string
          id?: string
          invoice_id?: string | null
          notes?: string | null
          payment_method?: string | null
          project_id: string
          proof_reference?: string | null
          reference_number?: string | null
          refunded_at?: string | null
          reported_at?: string | null
          status_code?: string
          updated_at?: string
          verified_at?: string | null
          verified_by_profile_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          currency_code?: string
          id?: string
          invoice_id?: string | null
          notes?: string | null
          payment_method?: string | null
          project_id?: string
          proof_reference?: string | null
          reference_number?: string | null
          refunded_at?: string | null
          reported_at?: string | null
          status_code?: string
          updated_at?: string
          verified_at?: string | null
          verified_by_profile_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_status_code_fkey"
            columns: ["status_code"]
            isOneToOne: false
            referencedRelation: "payment_statuses"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "payments_verified_by_profile_id_fkey"
            columns: ["verified_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pricing_catalogs: {
        Row: {
          code: string
          created_at: string
          currency_code: string
          effective_from: string | null
          effective_to: string | null
          id: string
          is_active: boolean
          name: string
          pricing_year_label: string | null
          service_domain: string
          source_file_name: string | null
          source_sheet_name: string | null
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          currency_code?: string
          effective_from?: string | null
          effective_to?: string | null
          id?: string
          is_active?: boolean
          name: string
          pricing_year_label?: string | null
          service_domain: string
          source_file_name?: string | null
          source_sheet_name?: string | null
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          currency_code?: string
          effective_from?: string | null
          effective_to?: string | null
          id?: string
          is_active?: boolean
          name?: string
          pricing_year_label?: string | null
          service_domain?: string
          source_file_name?: string | null
          source_sheet_name?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      pricing_items: {
        Row: {
          base_unfurnished_price: number | null
          catalog_id: string
          category: string | null
          created_at: string
          description: string | null
          furnished_surcharge: number | null
          id: string
          is_active: boolean
          legacy_price: number | null
          legacy_total_price: number | null
          recommended_price: number
          service_title: string
          sort_order: number
          source_row_number: number | null
          unit_label: string | null
          updated_at: string
        }
        Insert: {
          base_unfurnished_price?: number | null
          catalog_id: string
          category?: string | null
          created_at?: string
          description?: string | null
          furnished_surcharge?: number | null
          id?: string
          is_active?: boolean
          legacy_price?: number | null
          legacy_total_price?: number | null
          recommended_price: number
          service_title: string
          sort_order?: number
          source_row_number?: number | null
          unit_label?: string | null
          updated_at?: string
        }
        Update: {
          base_unfurnished_price?: number | null
          catalog_id?: string
          category?: string | null
          created_at?: string
          description?: string | null
          furnished_surcharge?: number | null
          id?: string
          is_active?: boolean
          legacy_price?: number | null
          legacy_total_price?: number | null
          recommended_price?: number
          service_title?: string
          sort_order?: number
          source_row_number?: number | null
          unit_label?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pricing_items_catalog_id_fkey"
            columns: ["catalog_id"]
            isOneToOne: false
            referencedRelation: "pricing_catalogs"
            referencedColumns: ["id"]
          },
        ]
      }
      priority_levels: {
        Row: {
          code: string
          created_at: string
          description: string | null
          is_active: boolean
          label: string
          sort_order: number
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          is_active?: boolean
          label: string
          sort_order?: number
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          is_active?: boolean
          label?: string
          sort_order?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string
          id: string
          is_active: boolean
          phone: string | null
          role_code: string
          updated_at: string
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name: string
          id: string
          is_active?: boolean
          phone?: string | null
          role_code: string
          updated_at?: string
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string
          id?: string
          is_active?: boolean
          phone?: string | null
          role_code?: string
          updated_at?: string
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_role_code_fkey"
            columns: ["role_code"]
            isOneToOne: false
            referencedRelation: "user_roles"
            referencedColumns: ["code"]
          },
        ]
      }
      project_contacts: {
        Row: {
          contact_id: string
          created_at: string
          is_primary: boolean
          notes: string | null
          project_id: string
          role_code: string
        }
        Insert: {
          contact_id: string
          created_at?: string
          is_primary?: boolean
          notes?: string | null
          project_id: string
          role_code: string
        }
        Update: {
          contact_id?: string
          created_at?: string
          is_primary?: boolean
          notes?: string | null
          project_id?: string
          role_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_contacts_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_contacts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_contacts_role_code_fkey"
            columns: ["role_code"]
            isOneToOne: false
            referencedRelation: "contact_roles"
            referencedColumns: ["code"]
          },
        ]
      }
      project_items: {
        Row: {
          action_summary: string | null
          actual_cost: number
          area_name: string | null
          assigned_profile_id: string | null
          before_after_required: boolean
          completed_at: string | null
          created_at: string
          customer_note: string | null
          deferred_reason: string | null
          description: string | null
          id: string
          internal_note: string | null
          is_add_on: boolean
          is_checklist_item: boolean
          is_deferred: boolean
          is_pi: boolean
          item_group: string | null
          item_type: string | null
          priority_code: string
          project_id: string
          quoted_amount: number
          scheduled_due_at: string | null
          scheduled_start_at: string | null
          sort_order: number
          started_at: string | null
          status_code: string
          title: string
          updated_at: string
        }
        Insert: {
          action_summary?: string | null
          actual_cost?: number
          area_name?: string | null
          assigned_profile_id?: string | null
          before_after_required?: boolean
          completed_at?: string | null
          created_at?: string
          customer_note?: string | null
          deferred_reason?: string | null
          description?: string | null
          id?: string
          internal_note?: string | null
          is_add_on?: boolean
          is_checklist_item?: boolean
          is_deferred?: boolean
          is_pi?: boolean
          item_group?: string | null
          item_type?: string | null
          priority_code?: string
          project_id: string
          quoted_amount?: number
          scheduled_due_at?: string | null
          scheduled_start_at?: string | null
          sort_order?: number
          started_at?: string | null
          status_code?: string
          title: string
          updated_at?: string
        }
        Update: {
          action_summary?: string | null
          actual_cost?: number
          area_name?: string | null
          assigned_profile_id?: string | null
          before_after_required?: boolean
          completed_at?: string | null
          created_at?: string
          customer_note?: string | null
          deferred_reason?: string | null
          description?: string | null
          id?: string
          internal_note?: string | null
          is_add_on?: boolean
          is_checklist_item?: boolean
          is_deferred?: boolean
          is_pi?: boolean
          item_group?: string | null
          item_type?: string | null
          priority_code?: string
          project_id?: string
          quoted_amount?: number
          scheduled_due_at?: string | null
          scheduled_start_at?: string | null
          sort_order?: number
          started_at?: string | null
          status_code?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_items_assigned_profile_id_fkey"
            columns: ["assigned_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_items_priority_code_fkey"
            columns: ["priority_code"]
            isOneToOne: false
            referencedRelation: "priority_levels"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "project_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_items_status_code_fkey"
            columns: ["status_code"]
            isOneToOne: false
            referencedRelation: "work_item_statuses"
            referencedColumns: ["code"]
          },
        ]
      }
      project_labels: {
        Row: {
          created_at: string
          label_id: string
          project_id: string
        }
        Insert: {
          created_at?: string
          label_id: string
          project_id: string
        }
        Update: {
          created_at?: string
          label_id?: string
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_labels_label_id_fkey"
            columns: ["label_id"]
            isOneToOne: false
            referencedRelation: "labels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_labels_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_statuses: {
        Row: {
          code: string
          created_at: string
          description: string | null
          is_active: boolean
          label: string
          sort_order: number
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          is_active?: boolean
          label: string
          sort_order?: number
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          is_active?: boolean
          label?: string
          sort_order?: number
        }
        Relationships: []
      }
      projects: {
        Row: {
          completed_at: string | null
          coordinator_profile_id: string | null
          created_at: string
          enquiry_at: string | null
          handover_at: string | null
          id: string
          payment_due_at: string | null
          payment_follow_up_at: string | null
          payment_follow_up_note: string | null
          primary_contact_id: string | null
          primary_property_id: string | null
          project_code: string
          quickbooks_customer_id: string | null
          remarks: string | null
          scheduled_end_at: string | null
          scheduled_start_at: string | null
          scope_summary: string | null
          source_channel_code: string
          source_lead_id: string | null
          status_code: string
          title: string
          updated_at: string
          warranty_expires_at: string | null
          whatsapp_thread_id: string | null
        }
        Insert: {
          completed_at?: string | null
          coordinator_profile_id?: string | null
          created_at?: string
          enquiry_at?: string | null
          handover_at?: string | null
          id?: string
          payment_due_at?: string | null
          payment_follow_up_at?: string | null
          payment_follow_up_note?: string | null
          primary_contact_id?: string | null
          primary_property_id?: string | null
          project_code: string
          quickbooks_customer_id?: string | null
          remarks?: string | null
          scheduled_end_at?: string | null
          scheduled_start_at?: string | null
          scope_summary?: string | null
          source_channel_code?: string
          source_lead_id?: string | null
          status_code?: string
          title: string
          updated_at?: string
          warranty_expires_at?: string | null
          whatsapp_thread_id?: string | null
        }
        Update: {
          completed_at?: string | null
          coordinator_profile_id?: string | null
          created_at?: string
          enquiry_at?: string | null
          handover_at?: string | null
          id?: string
          payment_due_at?: string | null
          payment_follow_up_at?: string | null
          payment_follow_up_note?: string | null
          primary_contact_id?: string | null
          primary_property_id?: string | null
          project_code?: string
          quickbooks_customer_id?: string | null
          remarks?: string | null
          scheduled_end_at?: string | null
          scheduled_start_at?: string | null
          scope_summary?: string | null
          source_channel_code?: string
          source_lead_id?: string | null
          status_code?: string
          title?: string
          updated_at?: string
          warranty_expires_at?: string | null
          whatsapp_thread_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "projects_coordinator_profile_id_fkey"
            columns: ["coordinator_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_primary_contact_id_fkey"
            columns: ["primary_contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_primary_property_id_fkey"
            columns: ["primary_property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_source_channel_code_fkey"
            columns: ["source_channel_code"]
            isOneToOne: false
            referencedRelation: "source_channels"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "projects_source_lead_id_fkey"
            columns: ["source_lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_status_code_fkey"
            columns: ["status_code"]
            isOneToOne: false
            referencedRelation: "project_statuses"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "projects_whatsapp_thread_id_fkey"
            columns: ["whatsapp_thread_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      properties: {
        Row: {
          access_notes: string | null
          address_line_1: string
          address_line_2: string | null
          country_code: string
          created_at: string
          id: string
          landmark_notes: string | null
          postal_code: string | null
          property_name: string | null
          unit_no: string | null
          updated_at: string
        }
        Insert: {
          access_notes?: string | null
          address_line_1: string
          address_line_2?: string | null
          country_code?: string
          created_at?: string
          id?: string
          landmark_notes?: string | null
          postal_code?: string | null
          property_name?: string | null
          unit_no?: string | null
          updated_at?: string
        }
        Update: {
          access_notes?: string | null
          address_line_1?: string
          address_line_2?: string | null
          country_code?: string
          created_at?: string
          id?: string
          landmark_notes?: string | null
          postal_code?: string | null
          property_name?: string | null
          unit_no?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      purchase_statuses: {
        Row: {
          code: string
          created_at: string
          description: string | null
          is_active: boolean
          label: string
          sort_order: number
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          is_active?: boolean
          label: string
          sort_order?: number
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          is_active?: boolean
          label?: string
          sort_order?: number
        }
        Relationships: []
      }
      purchases: {
        Row: {
          created_at: string
          customer_billable: boolean
          description: string | null
          id: string
          item_name: string
          notes: string | null
          project_id: string
          project_item_id: string | null
          purchase_date: string | null
          purchased_by_profile_id: string | null
          quantity: number
          receipt_number: string | null
          status_code: string
          supplier_name: string | null
          total_cost: number
          unit_cost: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_billable?: boolean
          description?: string | null
          id?: string
          item_name: string
          notes?: string | null
          project_id: string
          project_item_id?: string | null
          purchase_date?: string | null
          purchased_by_profile_id?: string | null
          quantity?: number
          receipt_number?: string | null
          status_code?: string
          supplier_name?: string | null
          total_cost?: number
          unit_cost?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_billable?: boolean
          description?: string | null
          id?: string
          item_name?: string
          notes?: string | null
          project_id?: string
          project_item_id?: string | null
          purchase_date?: string | null
          purchased_by_profile_id?: string | null
          quantity?: number
          receipt_number?: string | null
          status_code?: string
          supplier_name?: string | null
          total_cost?: number
          unit_cost?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchases_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchases_project_item_id_fkey"
            columns: ["project_item_id"]
            isOneToOne: false
            referencedRelation: "project_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchases_purchased_by_profile_id_fkey"
            columns: ["purchased_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchases_status_code_fkey"
            columns: ["status_code"]
            isOneToOne: false
            referencedRelation: "purchase_statuses"
            referencedColumns: ["code"]
          },
        ]
      }
      quote_items: {
        Row: {
          created_at: string
          description: string | null
          id: string
          line_no: number
          notes: string | null
          quantity: number
          quote_id: string
          source_project_item_id: string | null
          title: string
          total_price: number
          unit_label: string | null
          unit_price: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          line_no?: number
          notes?: string | null
          quantity?: number
          quote_id: string
          source_project_item_id?: string | null
          title: string
          total_price?: number
          unit_label?: string | null
          unit_price?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          line_no?: number
          notes?: string | null
          quantity?: number
          quote_id?: string
          source_project_item_id?: string | null
          title?: string
          total_price?: number
          unit_label?: string | null
          unit_price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "quote_items_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_items_source_project_item_id_fkey"
            columns: ["source_project_item_id"]
            isOneToOne: false
            referencedRelation: "project_items"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_statuses: {
        Row: {
          code: string
          created_at: string
          description: string | null
          is_active: boolean
          label: string
          sort_order: number
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          is_active?: boolean
          label: string
          sort_order?: number
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          is_active?: boolean
          label?: string
          sort_order?: number
        }
        Relationships: []
      }
      quotes: {
        Row: {
          approved_at: string | null
          created_at: string
          created_by_profile_id: string | null
          currency_code: string
          discount_amount: number
          expired_at: string | null
          id: string
          lead_id: string | null
          notes: string | null
          project_id: string | null
          quote_number: string
          rejected_at: string | null
          sent_at: string | null
          status_code: string
          subtotal_amount: number
          total_amount: number
          updated_at: string
          version_number: number
        }
        Insert: {
          approved_at?: string | null
          created_at?: string
          created_by_profile_id?: string | null
          currency_code?: string
          discount_amount?: number
          expired_at?: string | null
          id?: string
          lead_id?: string | null
          notes?: string | null
          project_id?: string | null
          quote_number: string
          rejected_at?: string | null
          sent_at?: string | null
          status_code?: string
          subtotal_amount?: number
          total_amount?: number
          updated_at?: string
          version_number?: number
        }
        Update: {
          approved_at?: string | null
          created_at?: string
          created_by_profile_id?: string | null
          currency_code?: string
          discount_amount?: number
          expired_at?: string | null
          id?: string
          lead_id?: string | null
          notes?: string | null
          project_id?: string | null
          quote_number?: string
          rejected_at?: string | null
          sent_at?: string | null
          status_code?: string
          subtotal_amount?: number
          total_amount?: number
          updated_at?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "quotes_created_by_profile_id_fkey"
            columns: ["created_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_status_code_fkey"
            columns: ["status_code"]
            isOneToOne: false
            referencedRelation: "quote_statuses"
            referencedColumns: ["code"]
          },
        ]
      }
      review_drafts: {
        Row: {
          approved_at: string | null
          approved_project_id: string | null
          contact_id: string | null
          created_at: string
          extraction_payload: Json
          id: string
          lead_id: string | null
          pricing_suggestions_payload: Json
          property_id: string | null
          raw_conversation: Json
          rejected_at: string | null
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by_profile_id: string | null
          source_channel_code: string
          status: string
          thread_id: string
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_project_id?: string | null
          contact_id?: string | null
          created_at?: string
          extraction_payload?: Json
          id?: string
          lead_id?: string | null
          pricing_suggestions_payload?: Json
          property_id?: string | null
          raw_conversation?: Json
          rejected_at?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by_profile_id?: string | null
          source_channel_code?: string
          status?: string
          thread_id: string
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_project_id?: string | null
          contact_id?: string | null
          created_at?: string
          extraction_payload?: Json
          id?: string
          lead_id?: string | null
          pricing_suggestions_payload?: Json
          property_id?: string | null
          raw_conversation?: Json
          rejected_at?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by_profile_id?: string | null
          source_channel_code?: string
          status?: string
          thread_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_drafts_approved_project_id_fkey"
            columns: ["approved_project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_drafts_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_drafts_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_drafts_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_drafts_reviewed_by_profile_id_fkey"
            columns: ["reviewed_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_drafts_source_channel_code_fkey"
            columns: ["source_channel_code"]
            isOneToOne: false
            referencedRelation: "source_channels"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "review_drafts_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      source_channels: {
        Row: {
          code: string
          created_at: string
          description: string | null
          is_active: boolean
          label: string
          sort_order: number
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          is_active?: boolean
          label: string
          sort_order?: number
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          is_active?: boolean
          label?: string
          sort_order?: number
        }
        Relationships: []
      }
      system_error_logs: {
        Row: {
          created_at: string
          details: Json | null
          error_name: string | null
          id: string
          message: string
          resolved_at: string | null
          scope: string
          severity: string
          stack: string | null
        }
        Insert: {
          created_at?: string
          details?: Json | null
          error_name?: string | null
          id?: string
          message: string
          resolved_at?: string | null
          scope: string
          severity?: string
          stack?: string | null
        }
        Update: {
          created_at?: string
          details?: Json | null
          error_name?: string | null
          id?: string
          message?: string
          resolved_at?: string | null
          scope?: string
          severity?: string
          stack?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          code: string
          created_at: string
          description: string | null
          is_active: boolean
          label: string
          sort_order: number
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          is_active?: boolean
          label: string
          sort_order?: number
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          is_active?: boolean
          label?: string
          sort_order?: number
        }
        Relationships: []
      }
      whatsapp_threads: {
        Row: {
          ai_last_summarized_at: string | null
          contact_id: string
          created_at: string
          external_thread_id: string | null
          id: string
          is_archived: boolean
          last_message_at: string | null
          latest_ai_summary: string | null
          source_channel_code: string
          thread_subject: string | null
          updated_at: string
        }
        Insert: {
          ai_last_summarized_at?: string | null
          contact_id: string
          created_at?: string
          external_thread_id?: string | null
          id?: string
          is_archived?: boolean
          last_message_at?: string | null
          latest_ai_summary?: string | null
          source_channel_code?: string
          thread_subject?: string | null
          updated_at?: string
        }
        Update: {
          ai_last_summarized_at?: string | null
          contact_id?: string
          created_at?: string
          external_thread_id?: string | null
          id?: string
          is_archived?: boolean
          last_message_at?: string | null
          latest_ai_summary?: string | null
          source_channel_code?: string
          thread_subject?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_threads_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_threads_source_channel_code_fkey"
            columns: ["source_channel_code"]
            isOneToOne: false
            referencedRelation: "source_channels"
            referencedColumns: ["code"]
          },
        ]
      }
      work_item_statuses: {
        Row: {
          code: string
          created_at: string
          description: string | null
          is_active: boolean
          label: string
          sort_order: number
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          is_active?: boolean
          label: string
          sort_order?: number
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          is_active?: boolean
          label?: string
          sort_order?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      current_user_role: { Args: never; Returns: string }
      is_owner_or_admin: { Args: never; Returns: boolean }
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
