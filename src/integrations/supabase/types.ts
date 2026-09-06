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
      access_requests: {
        Row: {
          created_at: string
          handled_at: string | null
          handled_by: string | null
          id: string
          label: string
          note: string | null
          org_id: string | null
          path: string
          required_authority: number
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          handled_at?: string | null
          handled_by?: string | null
          id?: string
          label: string
          note?: string | null
          org_id?: string | null
          path: string
          required_authority?: number
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          handled_at?: string | null
          handled_by?: string | null
          id?: string
          label?: string
          note?: string | null
          org_id?: string | null
          path?: string
          required_authority?: number
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "access_requests_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      accounts: {
        Row: {
          created_at: string
          created_by: string | null
          email: string | null
          id: string
          industry: string | null
          lifecycle_stage: Database["public"]["Enums"]["lifecycle_stage"]
          location: string | null
          name: string
          notes: string | null
          org_id: string
          owner_id: string | null
          phone: string | null
          source: string | null
          updated_at: string
          website: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          industry?: string | null
          lifecycle_stage?: Database["public"]["Enums"]["lifecycle_stage"]
          location?: string | null
          name: string
          notes?: string | null
          org_id: string
          owner_id?: string | null
          phone?: string | null
          source?: string | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          industry?: string | null
          lifecycle_stage?: Database["public"]["Enums"]["lifecycle_stage"]
          location?: string | null
          name?: string
          notes?: string | null
          org_id?: string
          owner_id?: string | null
          phone?: string | null
          source?: string | null
          updated_at?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "accounts_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      activities: {
        Row: {
          account_id: string | null
          assigned_to: string | null
          body: string | null
          completed_at: string | null
          contact_id: string | null
          created_at: string
          created_by: string | null
          deal_id: string | null
          due_at: string | null
          id: string
          job_id: string | null
          lead_id: string | null
          opportunity_id: string | null
          org_id: string
          subject: string
          type: Database["public"]["Enums"]["activity_type"]
          updated_at: string
        }
        Insert: {
          account_id?: string | null
          assigned_to?: string | null
          body?: string | null
          completed_at?: string | null
          contact_id?: string | null
          created_at?: string
          created_by?: string | null
          deal_id?: string | null
          due_at?: string | null
          id?: string
          job_id?: string | null
          lead_id?: string | null
          opportunity_id?: string | null
          org_id: string
          subject: string
          type?: Database["public"]["Enums"]["activity_type"]
          updated_at?: string
        }
        Update: {
          account_id?: string | null
          assigned_to?: string | null
          body?: string | null
          completed_at?: string | null
          contact_id?: string | null
          created_at?: string
          created_by?: string | null
          deal_id?: string | null
          due_at?: string | null
          id?: string
          job_id?: string | null
          lead_id?: string | null
          opportunity_id?: string | null
          org_id?: string
          subject?: string
          type?: Database["public"]["Enums"]["activity_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "activities_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      api_keys: {
        Row: {
          created_at: string
          created_by: string
          id: string
          is_active: boolean
          key_hash: string
          key_preview: string
          label: string
          last_used_at: string | null
          org_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          is_active?: boolean
          key_hash: string
          key_preview: string
          label?: string
          last_used_at?: string | null
          org_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          is_active?: boolean
          key_hash?: string
          key_preview?: string
          label?: string
          last_used_at?: string | null
          org_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "api_keys_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      app_settings: {
        Row: {
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          key: string
          updated_at?: string
          value: string
        }
        Update: {
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      audit_log: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          id: string
          job_id: string | null
          org_id: string | null
          stage: Database["public"]["Enums"]["job_stage"] | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          id?: string
          job_id?: string | null
          org_id?: string | null
          stage?: Database["public"]["Enums"]["job_stage"] | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          id?: string
          job_id?: string | null
          org_id?: string | null
          stage?: Database["public"]["Enums"]["job_stage"] | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_log_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      bank_transactions: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          description: string
          id: string
          ledger_account_id: string | null
          matched_entry_id: string | null
          notes: string | null
          org_id: string
          reference: string | null
          status: string
          txn_date: string
          updated_at: string
        }
        Insert: {
          amount?: number
          created_at?: string
          created_by?: string | null
          description: string
          id?: string
          ledger_account_id?: string | null
          matched_entry_id?: string | null
          notes?: string | null
          org_id: string
          reference?: string | null
          status?: string
          txn_date?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          description?: string
          id?: string
          ledger_account_id?: string | null
          matched_entry_id?: string | null
          notes?: string | null
          org_id?: string
          reference?: string | null
          status?: string
          txn_date?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bank_transactions_ledger_account_id_fkey"
            columns: ["ledger_account_id"]
            isOneToOne: false
            referencedRelation: "ledger_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_transactions_matched_entry_id_fkey"
            columns: ["matched_entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_transactions_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_members: {
        Row: {
          account_id: string | null
          campaign_id: string
          contact_id: string | null
          created_at: string
          current_step: number
          id: string
          last_touch_at: string | null
          lead_id: string | null
          next_touch_at: string | null
          notes: string | null
          org_id: string
          status: string
          updated_at: string
        }
        Insert: {
          account_id?: string | null
          campaign_id: string
          contact_id?: string | null
          created_at?: string
          current_step?: number
          id?: string
          last_touch_at?: string | null
          lead_id?: string | null
          next_touch_at?: string | null
          notes?: string | null
          org_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          account_id?: string | null
          campaign_id?: string
          contact_id?: string | null
          created_at?: string
          current_step?: number
          id?: string
          last_touch_at?: string | null
          lead_id?: string | null
          next_touch_at?: string | null
          notes?: string | null
          org_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_members_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_members_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_members_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_members_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_members_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_steps: {
        Row: {
          body: string | null
          campaign_id: string
          channel: string
          created_at: string
          day_offset: number
          id: string
          org_id: string
          position: number
          subject: string
          updated_at: string
        }
        Insert: {
          body?: string | null
          campaign_id: string
          channel?: string
          created_at?: string
          day_offset?: number
          id?: string
          org_id: string
          position?: number
          subject: string
          updated_at?: string
        }
        Update: {
          body?: string | null
          campaign_id?: string
          channel?: string
          created_at?: string
          day_offset?: number
          id?: string
          org_id?: string
          position?: number
          subject?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_steps_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_steps_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          channel: string
          created_at: string
          created_by: string | null
          description: string | null
          end_date: string | null
          goal: string | null
          id: string
          name: string
          org_id: string
          owner_id: string | null
          start_date: string | null
          status: string
          updated_at: string
        }
        Insert: {
          channel?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          goal?: string | null
          id?: string
          name: string
          org_id: string
          owner_id?: string | null
          start_date?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          channel?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          goal?: string | null
          id?: string
          name?: string
          org_id?: string
          owner_id?: string | null
          start_date?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      capture_forms: {
        Row: {
          auto_create_lead: boolean
          created_at: string
          created_by: string | null
          default_owner_id: string | null
          default_source: string | null
          description: string | null
          fields: Json
          id: string
          is_active: boolean
          name: string
          org_id: string
          slug: string
          success_message: string
          updated_at: string
        }
        Insert: {
          auto_create_lead?: boolean
          created_at?: string
          created_by?: string | null
          default_owner_id?: string | null
          default_source?: string | null
          description?: string | null
          fields?: Json
          id?: string
          is_active?: boolean
          name: string
          org_id: string
          slug: string
          success_message?: string
          updated_at?: string
        }
        Update: {
          auto_create_lead?: boolean
          created_at?: string
          created_by?: string | null
          default_owner_id?: string | null
          default_source?: string | null
          description?: string | null
          fields?: Json
          id?: string
          is_active?: boolean
          name?: string
          org_id?: string
          slug?: string
          success_message?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "capture_forms_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      client_feedback: {
        Row: {
          account_id: string | null
          comment: string | null
          contact_id: string | null
          created_at: string
          created_by: string | null
          feedback_type: string
          id: string
          job_id: string | null
          org_id: string
          rating: number | null
          received_at: string
          updated_at: string
        }
        Insert: {
          account_id?: string | null
          comment?: string | null
          contact_id?: string | null
          created_at?: string
          created_by?: string | null
          feedback_type?: string
          id?: string
          job_id?: string | null
          org_id: string
          rating?: number | null
          received_at?: string
          updated_at?: string
        }
        Update: {
          account_id?: string | null
          comment?: string | null
          contact_id?: string | null
          created_at?: string
          created_by?: string | null
          feedback_type?: string
          id?: string
          job_id?: string | null
          org_id?: string
          rating?: number | null
          received_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_feedback_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_feedback_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_feedback_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_feedback_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      client_reminders: {
        Row: {
          account_id: string | null
          assigned_to: string | null
          completed_at: string | null
          created_at: string
          created_by: string | null
          due_date: string
          id: string
          job_id: string | null
          notes: string | null
          org_id: string
          recurrence_months: number | null
          reminder_type: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          account_id?: string | null
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          due_date: string
          id?: string
          job_id?: string | null
          notes?: string | null
          org_id: string
          recurrence_months?: number | null
          reminder_type?: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          account_id?: string | null
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          due_date?: string
          id?: string
          job_id?: string | null
          notes?: string | null
          org_id?: string
          recurrence_months?: number | null
          reminder_type?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_reminders_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_reminders_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_reminders_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          account_id: string | null
          created_at: string
          created_by: string | null
          email: string | null
          full_name: string
          id: string
          is_primary: boolean
          job_title: string | null
          notes: string | null
          org_id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          account_id?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          full_name: string
          id?: string
          is_primary?: boolean
          job_title?: string | null
          notes?: string | null
          org_id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          account_id?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          full_name?: string
          id?: string
          is_primary?: boolean
          job_title?: string | null
          notes?: string | null
          org_id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contacts_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contacts_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      deals: {
        Row: {
          account_id: string | null
          closed_at: string | null
          contact_id: string | null
          created_at: string
          created_by: string | null
          id: string
          job_id: string | null
          lost_reason: string | null
          name: string
          opportunity_id: string | null
          org_id: string
          owner_id: string | null
          status: Database["public"]["Enums"]["deal_status"]
          updated_at: string
          value: number | null
        }
        Insert: {
          account_id?: string | null
          closed_at?: string | null
          contact_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          job_id?: string | null
          lost_reason?: string | null
          name: string
          opportunity_id?: string | null
          org_id: string
          owner_id?: string | null
          status?: Database["public"]["Enums"]["deal_status"]
          updated_at?: string
          value?: number | null
        }
        Update: {
          account_id?: string | null
          closed_at?: string | null
          contact_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          job_id?: string | null
          lost_reason?: string | null
          name?: string
          opportunity_id?: string | null
          org_id?: string
          owner_id?: string | null
          status?: Database["public"]["Enums"]["deal_status"]
          updated_at?: string
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "deals_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      document_sync_status: {
        Row: {
          created_at: string
          created_by: string | null
          destination_url: string | null
          error_message: string | null
          file_name: string
          file_path: string
          file_size: number
          id: string
          job_id: string | null
          last_attempt_at: string | null
          org_id: string
          queued_at: string
          status: string
          synced_at: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          destination_url?: string | null
          error_message?: string | null
          file_name: string
          file_path: string
          file_size?: number
          id?: string
          job_id?: string | null
          last_attempt_at?: string | null
          org_id: string
          queued_at?: string
          status?: string
          synced_at?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          destination_url?: string | null
          error_message?: string | null
          file_name?: string
          file_path?: string
          file_size?: number
          id?: string
          job_id?: string | null
          last_attempt_at?: string | null
          org_id?: string
          queued_at?: string
          status?: string
          synced_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_sync_status_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_sync_status_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      expenses: {
        Row: {
          account_id: string | null
          amount: number
          billable: boolean
          category: string
          created_at: string
          currency: string
          deal_id: string | null
          description: string
          id: string
          job_id: string | null
          method: string | null
          notes: string | null
          org_id: string
          receipt_url: string | null
          recorded_by: string
          reference: string | null
          spent_at: string
          updated_at: string
          vendor: string | null
        }
        Insert: {
          account_id?: string | null
          amount: number
          billable?: boolean
          category?: string
          created_at?: string
          currency?: string
          deal_id?: string | null
          description: string
          id?: string
          job_id?: string | null
          method?: string | null
          notes?: string | null
          org_id: string
          receipt_url?: string | null
          recorded_by?: string
          reference?: string | null
          spent_at?: string
          updated_at?: string
          vendor?: string | null
        }
        Update: {
          account_id?: string | null
          amount?: number
          billable?: boolean
          category?: string
          created_at?: string
          currency?: string
          deal_id?: string | null
          description?: string
          id?: string
          job_id?: string | null
          method?: string | null
          notes?: string | null
          org_id?: string
          receipt_url?: string | null
          recorded_by?: string
          reference?: string | null
          spent_at?: string
          updated_at?: string
          vendor?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expenses_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_documents: {
        Row: {
          account_id: string | null
          amount: number
          client_name: string | null
          created_at: string
          created_by: string | null
          currency: string
          deal_id: string | null
          doc_type: string
          document_url: string | null
          due_date: string | null
          external_id: string | null
          id: string
          is_example: boolean
          issued_at: string
          job_id: string | null
          notes: string | null
          org_id: string
          reference: string
          source: string
          status: string
          synced_at: string | null
          updated_at: string
        }
        Insert: {
          account_id?: string | null
          amount?: number
          client_name?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          deal_id?: string | null
          doc_type: string
          document_url?: string | null
          due_date?: string | null
          external_id?: string | null
          id?: string
          is_example?: boolean
          issued_at?: string
          job_id?: string | null
          notes?: string | null
          org_id: string
          reference: string
          source?: string
          status?: string
          synced_at?: string | null
          updated_at?: string
        }
        Update: {
          account_id?: string | null
          amount?: number
          client_name?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          deal_id?: string | null
          doc_type?: string
          document_url?: string | null
          due_date?: string | null
          external_id?: string | null
          id?: string
          is_example?: boolean
          issued_at?: string
          job_id?: string | null
          notes?: string | null
          org_id?: string
          reference?: string
          source?: string
          status?: string
          synced_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "finance_documents_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_documents_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_documents_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_documents_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      flight_logs: {
        Row: {
          battery_end: number | null
          battery_start: number | null
          created_at: string
          duration_minutes: number | null
          ended_at: string | null
          flight_path: Json | null
          id: string
          job_id: string
          notes: string | null
          pilot_id: string
          started_at: string
          updated_at: string
        }
        Insert: {
          battery_end?: number | null
          battery_start?: number | null
          created_at?: string
          duration_minutes?: number | null
          ended_at?: string | null
          flight_path?: Json | null
          id?: string
          job_id: string
          notes?: string | null
          pilot_id: string
          started_at: string
          updated_at?: string
        }
        Update: {
          battery_end?: number | null
          battery_start?: number | null
          created_at?: string
          duration_minutes?: number | null
          ended_at?: string | null
          flight_path?: Json | null
          id?: string
          job_id?: string
          notes?: string | null
          pilot_id?: string
          started_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "flight_logs_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      form_submissions: {
        Row: {
          account_id: string | null
          company: string | null
          contact_id: string | null
          created_at: string
          data: Json
          email: string | null
          form_id: string
          full_name: string | null
          id: string
          lead_id: string | null
          message: string | null
          org_id: string
          phone: string | null
          status: string
          updated_at: string
        }
        Insert: {
          account_id?: string | null
          company?: string | null
          contact_id?: string | null
          created_at?: string
          data?: Json
          email?: string | null
          form_id: string
          full_name?: string | null
          id?: string
          lead_id?: string | null
          message?: string | null
          org_id: string
          phone?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          account_id?: string | null
          company?: string | null
          contact_id?: string | null
          created_at?: string
          data?: Json
          email?: string | null
          form_id?: string
          full_name?: string | null
          id?: string
          lead_id?: string | null
          message?: string | null
          org_id?: string
          phone?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "form_submissions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_submissions_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_submissions_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "capture_forms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_submissions_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_submissions_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      job_payments: {
        Row: {
          amount: number
          created_at: string
          id: string
          job_id: string
          method: string | null
          notes: string | null
          paid_at: string
          payment_type: string
          proof_url: string | null
          recorded_by: string
          reference: string | null
          updated_at: string
          variation_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          job_id: string
          method?: string | null
          notes?: string | null
          paid_at: string
          payment_type: string
          proof_url?: string | null
          recorded_by: string
          reference?: string | null
          updated_at?: string
          variation_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          job_id?: string
          method?: string | null
          notes?: string | null
          paid_at?: string
          payment_type?: string
          proof_url?: string | null
          recorded_by?: string
          reference?: string | null
          updated_at?: string
          variation_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "job_payments_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_payments_variation_id_fkey"
            columns: ["variation_id"]
            isOneToOne: false
            referencedRelation: "job_variations"
            referencedColumns: ["id"]
          },
        ]
      }
      job_qc_items: {
        Row: {
          checked_at: string | null
          checked_by: string | null
          created_at: string
          id: string
          is_checked: boolean
          item_key: string
          job_id: string
          label: string
          notes: string | null
          org_id: string
          position: number
          updated_at: string
        }
        Insert: {
          checked_at?: string | null
          checked_by?: string | null
          created_at?: string
          id?: string
          is_checked?: boolean
          item_key: string
          job_id: string
          label: string
          notes?: string | null
          org_id: string
          position?: number
          updated_at?: string
        }
        Update: {
          checked_at?: string | null
          checked_by?: string | null
          created_at?: string
          id?: string
          is_checked?: boolean
          item_key?: string
          job_id?: string
          label?: string
          notes?: string | null
          org_id?: string
          position?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_qc_items_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_qc_items_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      job_stages: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          form_data: Json | null
          id: string
          job_id: string
          notes: string | null
          position: number
          primary_owner_id: string | null
          rejection_reason: string | null
          secondary_owner_id: string | null
          sla_deadline_hours: number | null
          sla_started_at: string | null
          sop_stage_id: string | null
          stage: Database["public"]["Enums"]["job_stage"] | null
          stage_name: string | null
          status: Database["public"]["Enums"]["stage_status"]
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          form_data?: Json | null
          id?: string
          job_id: string
          notes?: string | null
          position?: number
          primary_owner_id?: string | null
          rejection_reason?: string | null
          secondary_owner_id?: string | null
          sla_deadline_hours?: number | null
          sla_started_at?: string | null
          sop_stage_id?: string | null
          stage?: Database["public"]["Enums"]["job_stage"] | null
          stage_name?: string | null
          status?: Database["public"]["Enums"]["stage_status"]
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          form_data?: Json | null
          id?: string
          job_id?: string
          notes?: string | null
          position?: number
          primary_owner_id?: string | null
          rejection_reason?: string | null
          secondary_owner_id?: string | null
          sla_deadline_hours?: number | null
          sla_started_at?: string | null
          sop_stage_id?: string | null
          stage?: Database["public"]["Enums"]["job_stage"] | null
          stage_name?: string | null
          status?: Database["public"]["Enums"]["stage_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_stages_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_stages_sop_stage_id_fkey"
            columns: ["sop_stage_id"]
            isOneToOne: false
            referencedRelation: "sop_stages"
            referencedColumns: ["id"]
          },
        ]
      }
      job_variations: {
        Row: {
          amount: number
          approved_by: string | null
          client_decision_at: string | null
          created_at: string
          created_by: string
          description: string
          id: string
          job_id: string
          rejection_reason: string | null
          status: string
          updated_at: string
          variation_number: number
        }
        Insert: {
          amount?: number
          approved_by?: string | null
          client_decision_at?: string | null
          created_at?: string
          created_by: string
          description: string
          id?: string
          job_id: string
          rejection_reason?: string | null
          status?: string
          updated_at?: string
          variation_number: number
        }
        Update: {
          amount?: number
          approved_by?: string | null
          client_decision_at?: string | null
          created_at?: string
          created_by?: string
          description?: string
          id?: string
          job_id?: string
          rejection_reason?: string | null
          status?: string
          updated_at?: string
          variation_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "job_variations_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          account_id: string | null
          client_email: string | null
          client_location: string | null
          client_name: string
          client_phone: string | null
          created_at: string
          created_by: string
          current_sop_stage_id: string | null
          current_stage: Database["public"]["Enums"]["job_stage"]
          deal_id: string | null
          farm_size_ha: number | null
          field_boundary: Json | null
          id: string
          job_category: string
          job_number: string
          org_id: string
          service_type: string | null
          status: Database["public"]["Enums"]["job_status"]
          template_id: string | null
          template_version: number | null
          tracking_token: string | null
          updated_at: string
        }
        Insert: {
          account_id?: string | null
          client_email?: string | null
          client_location?: string | null
          client_name: string
          client_phone?: string | null
          created_at?: string
          created_by: string
          current_sop_stage_id?: string | null
          current_stage?: Database["public"]["Enums"]["job_stage"]
          deal_id?: string | null
          farm_size_ha?: number | null
          field_boundary?: Json | null
          id?: string
          job_category?: string
          job_number: string
          org_id: string
          service_type?: string | null
          status?: Database["public"]["Enums"]["job_status"]
          template_id?: string | null
          template_version?: number | null
          tracking_token?: string | null
          updated_at?: string
        }
        Update: {
          account_id?: string | null
          client_email?: string | null
          client_location?: string | null
          client_name?: string
          client_phone?: string | null
          created_at?: string
          created_by?: string
          current_sop_stage_id?: string | null
          current_stage?: Database["public"]["Enums"]["job_stage"]
          deal_id?: string | null
          farm_size_ha?: number | null
          field_boundary?: Json | null
          id?: string
          job_category?: string
          job_number?: string
          org_id?: string
          service_type?: string | null
          status?: Database["public"]["Enums"]["job_status"]
          template_id?: string | null
          template_version?: number | null
          tracking_token?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "jobs_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_current_sop_stage_id_fkey"
            columns: ["current_sop_stage_id"]
            isOneToOne: false
            referencedRelation: "sop_stages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "sop_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      journal_entries: {
        Row: {
          account_id: string | null
          created_at: string
          created_by: string | null
          entry_date: string
          entry_no: number
          id: string
          job_id: string | null
          memo: string
          org_id: string
          reference: string | null
          source: string
          source_ref: string | null
          updated_at: string
        }
        Insert: {
          account_id?: string | null
          created_at?: string
          created_by?: string | null
          entry_date?: string
          entry_no?: number
          id?: string
          job_id?: string | null
          memo: string
          org_id: string
          reference?: string | null
          source?: string
          source_ref?: string | null
          updated_at?: string
        }
        Update: {
          account_id?: string | null
          created_at?: string
          created_by?: string | null
          entry_date?: string
          entry_no?: number
          id?: string
          job_id?: string | null
          memo?: string
          org_id?: string
          reference?: string | null
          source?: string
          source_ref?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "journal_entries_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entries_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entries_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      journal_lines: {
        Row: {
          created_at: string
          credit: number
          debit: number
          description: string | null
          entry_id: string
          id: string
          ledger_account_id: string
          org_id: string
          position: number
        }
        Insert: {
          created_at?: string
          credit?: number
          debit?: number
          description?: string | null
          entry_id: string
          id?: string
          ledger_account_id: string
          org_id: string
          position?: number
        }
        Update: {
          created_at?: string
          credit?: number
          debit?: number
          description?: string | null
          entry_id?: string
          id?: string
          ledger_account_id?: string
          org_id?: string
          position?: number
        }
        Relationships: [
          {
            foreignKeyName: "journal_lines_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_lines_ledger_account_id_fkey"
            columns: ["ledger_account_id"]
            isOneToOne: false
            referencedRelation: "ledger_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_lines_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          account_id: string | null
          contact_id: string | null
          converted_at: string | null
          created_at: string
          created_by: string | null
          description: string | null
          disqualified_reason: string | null
          estimated_value: number | null
          id: string
          org_id: string
          owner_id: string | null
          source: string | null
          status: Database["public"]["Enums"]["lead_status"]
          title: string
          updated_at: string
        }
        Insert: {
          account_id?: string | null
          contact_id?: string | null
          converted_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          disqualified_reason?: string | null
          estimated_value?: number | null
          id?: string
          org_id: string
          owner_id?: string | null
          source?: string | null
          status?: Database["public"]["Enums"]["lead_status"]
          title: string
          updated_at?: string
        }
        Update: {
          account_id?: string | null
          contact_id?: string | null
          converted_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          disqualified_reason?: string | null
          estimated_value?: number | null
          id?: string
          org_id?: string
          owner_id?: string | null
          source?: string | null
          status?: Database["public"]["Enums"]["lead_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leads_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      ledger_accounts: {
        Row: {
          code: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          org_id: string
          type: Database["public"]["Enums"]["ledger_account_type"]
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          org_id: string
          type: Database["public"]["Enums"]["ledger_account_type"]
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          org_id?: string
          type?: Database["public"]["Enums"]["ledger_account_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ledger_accounts_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          job_id: string | null
          message: string
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          job_id?: string | null
          message: string
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          job_id?: string | null
          message?: string
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      opportunities: {
        Row: {
          account_id: string | null
          contact_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          expected_close_date: string | null
          id: string
          lead_id: string | null
          name: string
          org_id: string
          owner_id: string | null
          probability: number
          stage: Database["public"]["Enums"]["opportunity_stage"]
          updated_at: string
          value: number | null
        }
        Insert: {
          account_id?: string | null
          contact_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          expected_close_date?: string | null
          id?: string
          lead_id?: string | null
          name: string
          org_id: string
          owner_id?: string | null
          probability?: number
          stage?: Database["public"]["Enums"]["opportunity_stage"]
          updated_at?: string
          value?: number | null
        }
        Update: {
          account_id?: string | null
          contact_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          expected_close_date?: string | null
          id?: string
          lead_id?: string | null
          name?: string
          org_id?: string
          owner_id?: string | null
          probability?: number
          stage?: Database["public"]["Enums"]["opportunity_stage"]
          updated_at?: string
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "opportunities_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunities_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunities_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunities_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      org_config: {
        Row: {
          created_at: string
          id: string
          key: string
          org_id: string
          updated_at: string
          value: Json
        }
        Insert: {
          created_at?: string
          id?: string
          key: string
          org_id: string
          updated_at?: string
          value?: Json
        }
        Update: {
          created_at?: string
          id?: string
          key?: string
          org_id?: string
          updated_at?: string
          value?: Json
        }
        Relationships: [
          {
            foreignKeyName: "org_config_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      org_roles: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_admin: boolean
          name: string
          org_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_admin?: boolean
          name: string
          org_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_admin?: boolean
          name?: string
          org_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_roles_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_members: {
        Row: {
          created_at: string
          id: string
          org_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          org_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          org_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          brand_color: string | null
          created_at: string
          created_by: string | null
          description: string | null
          employee_count: string | null
          id: string
          industry: string | null
          job_prefix: string
          location: string | null
          logo_url: string | null
          main_services: string | null
          name: string
          onboarding_completed: boolean
          slug: string
          updated_at: string
        }
        Insert: {
          brand_color?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          employee_count?: string | null
          id?: string
          industry?: string | null
          job_prefix?: string
          location?: string | null
          logo_url?: string | null
          main_services?: string | null
          name: string
          onboarding_completed?: boolean
          slug: string
          updated_at?: string
        }
        Update: {
          brand_color?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          employee_count?: string | null
          id?: string
          industry?: string | null
          job_prefix?: string
          location?: string | null
          logo_url?: string | null
          main_services?: string | null
          name?: string
          onboarding_completed?: boolean
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      post_flight_logs: {
        Row: {
          completed_by: string
          created_at: string
          data_submitted: boolean
          equipment_cleaned: boolean
          id: string
          inspection_notes: string | null
          inspection_passed: boolean
          job_id: string
          updated_at: string
        }
        Insert: {
          completed_by: string
          created_at?: string
          data_submitted?: boolean
          equipment_cleaned?: boolean
          id?: string
          inspection_notes?: string | null
          inspection_passed?: boolean
          job_id: string
          updated_at?: string
        }
        Update: {
          completed_by?: string
          created_at?: string
          data_submitted?: boolean
          equipment_cleaned?: boolean
          id?: string
          inspection_notes?: string | null
          inspection_passed?: boolean
          job_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_flight_logs_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      pre_flight_checks: {
        Row: {
          battery_pct: number | null
          calibration_ok: boolean
          created_at: string
          drone_ok: boolean
          id: string
          job_id: string
          manager_approved_at: string | null
          manager_approved_by: string | null
          notes: string | null
          performed_by: string
          spray_system_ok: boolean
          updated_at: string
          weather_notes: string | null
          weather_ok: boolean
        }
        Insert: {
          battery_pct?: number | null
          calibration_ok?: boolean
          created_at?: string
          drone_ok?: boolean
          id?: string
          job_id: string
          manager_approved_at?: string | null
          manager_approved_by?: string | null
          notes?: string | null
          performed_by: string
          spray_system_ok?: boolean
          updated_at?: string
          weather_notes?: string | null
          weather_ok?: boolean
        }
        Update: {
          battery_pct?: number | null
          calibration_ok?: boolean
          created_at?: string
          drone_ok?: boolean
          id?: string
          job_id?: string
          manager_approved_at?: string | null
          manager_approved_by?: string | null
          notes?: string | null
          performed_by?: string
          spray_system_ok?: boolean
          updated_at?: string
          weather_notes?: string | null
          weather_ok?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "pre_flight_checks_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          invite_email_sent_at: string | null
          invite_email_status: string | null
          invited_at: string | null
          last_sign_in_at: string | null
          org_id: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name: string
          id: string
          invite_email_sent_at?: string | null
          invite_email_status?: string | null
          invited_at?: string | null
          last_sign_in_at?: string | null
          org_id?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          invite_email_sent_at?: string | null
          invite_email_status?: string | null
          invited_at?: string | null
          last_sign_in_at?: string | null
          org_id?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_drawings: {
        Row: {
          approved_by: string | null
          client_approved_at: string | null
          client_approver_name: string | null
          created_at: string
          file_url: string
          id: string
          job_id: string
          notes: string | null
          rejection_reason: string | null
          revision: number
          status: string
          title: string
          updated_at: string
          uploaded_by: string
        }
        Insert: {
          approved_by?: string | null
          client_approved_at?: string | null
          client_approver_name?: string | null
          created_at?: string
          file_url: string
          id?: string
          job_id: string
          notes?: string | null
          rejection_reason?: string | null
          revision?: number
          status?: string
          title: string
          updated_at?: string
          uploaded_by: string
        }
        Update: {
          approved_by?: string | null
          client_approved_at?: string | null
          client_approver_name?: string | null
          created_at?: string
          file_url?: string
          id?: string
          job_id?: string
          notes?: string | null
          rejection_reason?: string | null
          revision?: number
          status?: string
          title?: string
          updated_at?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "shop_drawings_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      sla_defaults: {
        Row: {
          deadline_hours: number
          id: string
          org_id: string
          stage: Database["public"]["Enums"]["job_stage"]
          updated_at: string
        }
        Insert: {
          deadline_hours?: number
          id?: string
          org_id: string
          stage: Database["public"]["Enums"]["job_stage"]
          updated_at?: string
        }
        Update: {
          deadline_hours?: number
          id?: string
          org_id?: string
          stage?: Database["public"]["Enums"]["job_stage"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sla_defaults_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      sop_fields: {
        Row: {
          created_at: string
          field_key: string
          field_type: string
          help_text: string | null
          id: string
          label: string
          options: Json
          org_id: string
          placeholder: string | null
          position: number
          required: boolean
          stage_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          field_key: string
          field_type?: string
          help_text?: string | null
          id?: string
          label: string
          options?: Json
          org_id: string
          placeholder?: string | null
          position?: number
          required?: boolean
          stage_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          field_key?: string
          field_type?: string
          help_text?: string | null
          id?: string
          label?: string
          options?: Json
          org_id?: string
          placeholder?: string | null
          position?: number
          required?: boolean
          stage_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sop_fields_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sop_fields_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "sop_stages"
            referencedColumns: ["id"]
          },
        ]
      }
      sop_stages: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          org_id: string
          position: number
          primary_role_id: string | null
          requires_approval: boolean
          secondary_role_id: string | null
          sla_hours: number
          template_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          org_id: string
          position?: number
          primary_role_id?: string | null
          requires_approval?: boolean
          secondary_role_id?: string | null
          sla_hours?: number
          template_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          org_id?: string
          position?: number
          primary_role_id?: string | null
          requires_approval?: boolean
          secondary_role_id?: string | null
          sla_hours?: number
          template_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sop_stages_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sop_stages_primary_role_id_fkey"
            columns: ["primary_role_id"]
            isOneToOne: false
            referencedRelation: "org_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sop_stages_secondary_role_id_fkey"
            columns: ["secondary_role_id"]
            isOneToOne: false
            referencedRelation: "org_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sop_stages_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "sop_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      sop_templates: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          industry: string | null
          is_active: boolean
          is_locked: boolean
          is_published: boolean
          name: string
          org_id: string
          parent_template_id: string | null
          root_template_id: string | null
          updated_at: string
          version: number
          version_notes: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          industry?: string | null
          is_active?: boolean
          is_locked?: boolean
          is_published?: boolean
          name: string
          org_id: string
          parent_template_id?: string | null
          root_template_id?: string | null
          updated_at?: string
          version?: number
          version_notes?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          industry?: string | null
          is_active?: boolean
          is_locked?: boolean
          is_published?: boolean
          name?: string
          org_id?: string
          parent_template_id?: string | null
          root_template_id?: string | null
          updated_at?: string
          version?: number
          version_notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sop_templates_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      spray_logs: {
        Row: {
          applied_at: string
          area_covered_ha: number
          chemical_used: string
          created_at: string
          id: string
          job_id: string
          notes: string | null
          pilot_id: string
          quantity_l: number
          updated_at: string
        }
        Insert: {
          applied_at?: string
          area_covered_ha: number
          chemical_used: string
          created_at?: string
          id?: string
          job_id: string
          notes?: string | null
          pilot_id: string
          quantity_l: number
          updated_at?: string
        }
        Update: {
          applied_at?: string
          area_covered_ha?: number
          chemical_used?: string
          created_at?: string
          id?: string
          job_id?: string
          notes?: string | null
          pilot_id?: string
          quantity_l?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "spray_logs_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      stage_assignments: {
        Row: {
          created_at: string
          id: string
          org_id: string
          primary_role: Database["public"]["Enums"]["app_role"]
          secondary_role: Database["public"]["Enums"]["app_role"] | null
          stage: Database["public"]["Enums"]["job_stage"]
        }
        Insert: {
          created_at?: string
          id?: string
          org_id: string
          primary_role: Database["public"]["Enums"]["app_role"]
          secondary_role?: Database["public"]["Enums"]["app_role"] | null
          stage: Database["public"]["Enums"]["job_stage"]
        }
        Update: {
          created_at?: string
          id?: string
          org_id?: string
          primary_role?: Database["public"]["Enums"]["app_role"]
          secondary_role?: Database["public"]["Enums"]["app_role"] | null
          stage?: Database["public"]["Enums"]["job_stage"]
        }
        Relationships: [
          {
            foreignKeyName: "stage_assignments_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          account_id: string | null
          assigned_to: string | null
          category: string
          contact_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          job_id: string | null
          org_id: string
          priority: string
          resolution: string | null
          resolved_at: string | null
          status: string
          subject: string
          ticket_number: number
          updated_at: string
        }
        Insert: {
          account_id?: string | null
          assigned_to?: string | null
          category?: string
          contact_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          job_id?: string | null
          org_id: string
          priority?: string
          resolution?: string | null
          resolved_at?: string | null
          status?: string
          subject: string
          ticket_number?: number
          updated_at?: string
        }
        Update: {
          account_id?: string | null
          assigned_to?: string | null
          category?: string
          contact_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          job_id?: string | null
          org_id?: string
          priority?: string
          resolution?: string | null
          resolved_at?: string | null
          status?: string
          subject?: string
          ticket_number?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_tickets_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_tickets_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_tickets_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_tickets_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      user_org_roles: {
        Row: {
          created_at: string
          id: string
          org_id: string
          org_role_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          org_id: string
          org_role_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          org_id?: string
          org_role_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_org_roles_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_org_roles_org_role_id_fkey"
            columns: ["org_role_id"]
            isOneToOne: false
            referencedRelation: "org_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          org_id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          org_id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          org_id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      active_org_id: { Args: never; Returns: string }
      can_access_job: { Args: { _job_id: string }; Returns: boolean }
      close_deal: {
        Args: { _deal_id: string; _reason?: string; _won: boolean }
        Returns: undefined
      }
      convert_lead_to_opportunity: {
        Args: { _lead_id: string; _name?: string; _value?: number }
        Returns: string
      }
      convert_opportunity_to_deal: {
        Args: { _name?: string; _opportunity_id: string; _value?: number }
        Returns: string
      }
      create_job_from_deal: {
        Args: { _deal_id: string; _service_type?: string; _template_id: string }
        Returns: string
      }
      create_job_from_template: {
        Args: {
          _client_email?: string
          _client_location?: string
          _client_name: string
          _client_phone?: string
          _service_type?: string
          _template_id: string
        }
        Returns: string
      }
      create_organization: {
        Args: { _job_prefix?: string; _name: string }
        Returns: string
      }
      create_template_version: {
        Args: { _notes?: string; _template_id: string }
        Returns: string
      }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      email_queue_dispatch: { Args: never; Returns: undefined }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      ensure_my_workspace: { Args: never; Returns: string }
      get_capture_form: { Args: { _slug: string }; Returns: Json }
      get_job_by_tracking_token: { Args: { _token: string }; Returns: Json }
      get_user_roles: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"][]
      }
      has_org_role: {
        Args: {
          _org_id: string
          _role: Database["public"]["Enums"]["app_role"]
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
      is_admin_or_owner: { Args: { _user_id: string }; Returns: boolean }
      is_org_admin: { Args: { _org_id: string }; Returns: boolean }
      is_org_admin_for_job: { Args: { _job_id: string }; Returns: boolean }
      is_org_member: { Args: { _org_id: string }; Returns: boolean }
      is_stage_owner: { Args: { _stage_id: string }; Returns: boolean }
      job_authority: { Args: { _job_id: string }; Returns: number }
      job_file_job_id: { Args: { _name: string }; Returns: string }
      job_org_id: { Args: { _job_id: string }; Returns: string }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      org_authority: { Args: { _org_id: string }; Returns: number }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      request_access: {
        Args: {
          _label: string
          _note?: string
          _path: string
          _required: number
        }
        Returns: string
      }
      seed_chart_of_accounts: { Args: { _org_id: string }; Returns: number }
      setup_workspace: {
        Args: {
          _description?: string
          _employee_count?: string
          _industry?: string
          _job_prefix?: string
          _location?: string
          _main_services?: string
          _name: string
          _roles?: string[]
          _steps?: string[]
          _workflow_name?: string
        }
        Returns: string
      }
      shares_org_with: { Args: { _user_id: string }; Returns: boolean }
      submit_capture_form: {
        Args: { _payload: Json; _slug: string }
        Returns: Json
      }
    }
    Enums: {
      activity_type:
        | "call"
        | "email"
        | "meeting"
        | "note"
        | "task"
        | "follow_up"
      app_role:
        | "super_admin"
        | "lead_handler"
        | "site_assessor"
        | "estimator"
        | "quotation_officer"
        | "workshop_manager"
        | "fabrication_team"
        | "installation_team"
        | "accounts_admin"
        | "owner_director"
        | "drone_pilot"
        | "operations_manager"
        | "client_manager"
      deal_status: "open" | "won" | "lost"
      job_stage:
        | "lead_entry"
        | "lead_qualification"
        | "site_visit_authorization"
        | "site_assessment"
        | "job_scoping"
        | "costing"
        | "quotation_preparation"
        | "quote_submission"
        | "client_approval"
        | "fabrication_order"
        | "fabrication_installation"
        | "project_closure"
        | "pre_flight_check"
        | "flight_execution"
        | "post_flight_log"
        | "invoicing"
      job_status: "active" | "completed" | "on_hold" | "cancelled"
      lead_status:
        | "new"
        | "working"
        | "qualified"
        | "disqualified"
        | "converted"
      ledger_account_type:
        | "asset"
        | "liability"
        | "equity"
        | "income"
        | "expense"
      lifecycle_stage:
        | "prospect"
        | "lead"
        | "opportunity"
        | "deal"
        | "client"
        | "lost"
      opportunity_stage:
        | "discovery"
        | "scoping"
        | "proposal"
        | "negotiation"
        | "won"
        | "lost"
      stage_status:
        | "locked"
        | "active"
        | "pending_approval"
        | "approved"
        | "rejected"
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
      activity_type: ["call", "email", "meeting", "note", "task", "follow_up"],
      app_role: [
        "super_admin",
        "lead_handler",
        "site_assessor",
        "estimator",
        "quotation_officer",
        "workshop_manager",
        "fabrication_team",
        "installation_team",
        "accounts_admin",
        "owner_director",
        "drone_pilot",
        "operations_manager",
        "client_manager",
      ],
      deal_status: ["open", "won", "lost"],
      job_stage: [
        "lead_entry",
        "lead_qualification",
        "site_visit_authorization",
        "site_assessment",
        "job_scoping",
        "costing",
        "quotation_preparation",
        "quote_submission",
        "client_approval",
        "fabrication_order",
        "fabrication_installation",
        "project_closure",
        "pre_flight_check",
        "flight_execution",
        "post_flight_log",
        "invoicing",
      ],
      job_status: ["active", "completed", "on_hold", "cancelled"],
      lead_status: ["new", "working", "qualified", "disqualified", "converted"],
      ledger_account_type: [
        "asset",
        "liability",
        "equity",
        "income",
        "expense",
      ],
      lifecycle_stage: [
        "prospect",
        "lead",
        "opportunity",
        "deal",
        "client",
        "lost",
      ],
      opportunity_stage: [
        "discovery",
        "scoping",
        "proposal",
        "negotiation",
        "won",
        "lost",
      ],
      stage_status: [
        "locked",
        "active",
        "pending_approval",
        "approved",
        "rejected",
      ],
    },
  },
} as const
