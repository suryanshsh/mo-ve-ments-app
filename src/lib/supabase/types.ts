export type ProfilePlan = 'free' | 'pro' | 'team'
export type PresentationStatus = 'draft' | 'generated' | 'edited' | 'exported'
export type MomentEmotion = 'hook' | 'empathy' | 'build' | 'reveal' | 'proof' | 'close'
export type ExportFormat = 'pptx' | 'pdf' | 'md'
export type JsonObjectArray = Record<string, unknown>[]

export type ProfilesRow = {
  id: string
  email: string
  display_name: string | null
  plan: ProfilePlan
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  ls_customer_id: string | null
  ls_subscription_id: string | null
  ls_subscription_status: string | null
  ls_subscription_updated_at: string | null
  generation_count_today: number
  generation_count_reset_at: string | null
  created_at: string
}

export type ProfilesInsert = {
  id: string
  email: string
  display_name?: string | null
  plan?: ProfilePlan
  stripe_customer_id?: string | null
  stripe_subscription_id?: string | null
  ls_customer_id?: string | null
  ls_subscription_id?: string | null
  ls_subscription_status?: string | null
  ls_subscription_updated_at?: string | null
  generation_count_today?: number
  generation_count_reset_at?: string | null
  created_at?: string
}

export type ProfilesUpdate = {
  id?: string
  email?: string
  display_name?: string | null
  plan?: ProfilePlan
  stripe_customer_id?: string | null
  stripe_subscription_id?: string | null
  ls_customer_id?: string | null
  ls_subscription_id?: string | null
  ls_subscription_status?: string | null
  ls_subscription_updated_at?: string | null
  generation_count_today?: number
  generation_count_reset_at?: string | null
  created_at?: string
}

export type PresentationsRow = {
  id: string
  user_id: string
  title: string
  audience: string | null
  target_duration: string | null
  total_duration: string | null
  status: PresentationStatus
  prompt_version: number
  tips: string[]
  created_at: string
  updated_at: string
}

export type PresentationsInsert = {
  id?: string
  user_id: string
  title: string
  audience?: string | null
  target_duration?: string | null
  total_duration?: string | null
  status?: PresentationStatus
  prompt_version?: number
  tips?: string[]
  created_at?: string
  updated_at?: string
}

export type PresentationsUpdate = {
  id?: string
  user_id?: string
  title?: string
  audience?: string | null
  target_duration?: string | null
  total_duration?: string | null
  status?: PresentationStatus
  prompt_version?: number
  tips?: string[]
  created_at?: string
  updated_at?: string
}

export type MomentsRow = {
  id: string
  presentation_id: string
  position: number
  title: string
  emotion: MomentEmotion
  duration_seconds: number
  slide_heading: string | null
  slide_bullets: string[]
  script: string
  sources: JsonObjectArray
  created_at: string
  updated_at: string
}

export type MomentsInsert = {
  id?: string
  presentation_id: string
  position: number
  title: string
  emotion: MomentEmotion
  duration_seconds?: number
  slide_heading?: string | null
  slide_bullets?: string[]
  script?: string
  sources?: JsonObjectArray
  created_at?: string
  updated_at?: string
}

export type MomentsUpdate = {
  id?: string
  presentation_id?: string
  position?: number
  title?: string
  emotion?: MomentEmotion
  duration_seconds?: number
  slide_heading?: string | null
  slide_bullets?: string[]
  script?: string
  sources?: JsonObjectArray
  created_at?: string
  updated_at?: string
}

export type SourceDocumentsRow = {
  id: string
  presentation_id: string
  filename: string
  file_path: string
  file_size: number | null
  extracted_text: string | null
  chunks: JsonObjectArray
  uploaded_at: string
}

export type SourceDocumentsInsert = {
  id?: string
  presentation_id: string
  filename: string
  file_path: string
  file_size?: number | null
  extracted_text?: string | null
  chunks?: JsonObjectArray
  uploaded_at?: string
}

export type SourceDocumentsUpdate = {
  id?: string
  presentation_id?: string
  filename?: string
  file_path?: string
  file_size?: number | null
  extracted_text?: string | null
  chunks?: JsonObjectArray
  uploaded_at?: string
}

export type AgentConversationsRow = {
  id: string
  presentation_id: string
  messages: JsonObjectArray
  created_at: string
  updated_at: string
}

export type AgentConversationsInsert = {
  id?: string
  presentation_id: string
  messages?: JsonObjectArray
  created_at?: string
  updated_at?: string
}

export type AgentConversationsUpdate = {
  id?: string
  presentation_id?: string
  messages?: JsonObjectArray
  created_at?: string
  updated_at?: string
}

export type ExportsRow = {
  id: string
  presentation_id: string
  format: ExportFormat
  file_path: string
  signed_url: string | null
  expires_at: string | null
  created_at: string
}

export type ExportsInsert = {
  id?: string
  presentation_id: string
  format: ExportFormat
  file_path: string
  signed_url?: string | null
  expires_at?: string | null
  created_at?: string
}

export type ExportsUpdate = {
  id?: string
  presentation_id?: string
  format?: ExportFormat
  file_path?: string
  signed_url?: string | null
  expires_at?: string | null
  created_at?: string
}

export type LemonSqueezyWebhookEventsRow = {
  event_id: string
  event_name: string | null
  subscription_id: string | null
  payload_created_at: string | null
  processed_at: string
}

export type LemonSqueezyWebhookEventsInsert = {
  event_id: string
  event_name?: string | null
  subscription_id?: string | null
  payload_created_at?: string | null
  processed_at?: string
}

export type LemonSqueezyWebhookEventsUpdate = {
  event_id?: string
  event_name?: string | null
  subscription_id?: string | null
  payload_created_at?: string | null
  processed_at?: string
}

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: ProfilesRow
        Insert: ProfilesInsert
        Update: ProfilesUpdate
        Relationships: []
      }
      presentations: {
        Row: PresentationsRow
        Insert: PresentationsInsert
        Update: PresentationsUpdate
        Relationships: []
      }
      moments: {
        Row: MomentsRow
        Insert: MomentsInsert
        Update: MomentsUpdate
        Relationships: []
      }
      source_documents: {
        Row: SourceDocumentsRow
        Insert: SourceDocumentsInsert
        Update: SourceDocumentsUpdate
        Relationships: []
      }
      agent_conversations: {
        Row: AgentConversationsRow
        Insert: AgentConversationsInsert
        Update: AgentConversationsUpdate
        Relationships: []
      }
      exports: {
        Row: ExportsRow
        Insert: ExportsInsert
        Update: ExportsUpdate
        Relationships: []
      }
      lemon_squeezy_webhook_events: {
        Row: LemonSqueezyWebhookEventsRow
        Insert: LemonSqueezyWebhookEventsInsert
        Update: LemonSqueezyWebhookEventsUpdate
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: {
      batch_update_moment_positions: {
        Args: { p_user_id: string; p_updates: JsonObjectArray }
        Returns: MomentsRow[]
      }
      ensure_own_profile: {
        Args: Record<string, never>
        Returns: ProfilesRow
      }
    }
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}