export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type ProfilePlan = 'free' | 'pro' | 'team'
export type PresentationStatus = 'draft' | 'generated' | 'edited' | 'exported'
export type MomentEmotion = 'hook' | 'empathy' | 'build' | 'reveal' | 'proof' | 'close'
export type ExportFormat = 'pptx' | 'pdf' | 'md'

export interface ProfilesRow {
  id: string
  email: string
  display_name: string | null
  plan: ProfilePlan
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  generation_count_today: number
  generation_count_reset_at: string | null
  created_at: string
}

export interface ProfilesInsert {
  id: string
  email: string
  display_name?: string | null
  plan?: ProfilePlan
  stripe_customer_id?: string | null
  stripe_subscription_id?: string | null
  generation_count_today?: number
  generation_count_reset_at?: string | null
  created_at?: string
}

export interface ProfilesUpdate {
  id?: string
  email?: string
  display_name?: string | null
  plan?: ProfilePlan
  stripe_customer_id?: string | null
  stripe_subscription_id?: string | null
  generation_count_today?: number
  generation_count_reset_at?: string | null
  created_at?: string
}

export interface PresentationsRow {
  id: string
  user_id: string
  title: string
  audience: string | null
  target_duration: string | null
  total_duration: string | null
  status: PresentationStatus
  prompt_version: number
  tips: Json
  created_at: string
  updated_at: string
}

export interface PresentationsInsert {
  id?: string
  user_id: string
  title: string
  audience?: string | null
  target_duration?: string | null
  total_duration?: string | null
  status?: PresentationStatus
  prompt_version?: number
  tips?: Json
  created_at?: string
  updated_at?: string
}

export interface PresentationsUpdate {
  id?: string
  user_id?: string
  title?: string
  audience?: string | null
  target_duration?: string | null
  total_duration?: string | null
  status?: PresentationStatus
  prompt_version?: number
  tips?: Json
  created_at?: string
  updated_at?: string
}

export interface MomentsRow {
  id: string
  presentation_id: string
  position: number
  title: string
  emotion: MomentEmotion
  duration_seconds: number
  slide_heading: string | null
  slide_bullets: Json
  script: string
  sources: Json
  created_at: string
  updated_at: string
}

export interface MomentsInsert {
  id?: string
  presentation_id: string
  position: number
  title: string
  emotion: MomentEmotion
  duration_seconds?: number
  slide_heading?: string | null
  slide_bullets?: Json
  script?: string
  sources?: Json
  created_at?: string
  updated_at?: string
}

export interface MomentsUpdate {
  id?: string
  presentation_id?: string
  position?: number
  title?: string
  emotion?: MomentEmotion
  duration_seconds?: number
  slide_heading?: string | null
  slide_bullets?: Json
  script?: string
  sources?: Json
  created_at?: string
  updated_at?: string
}

export interface SourceDocumentsRow {
  id: string
  presentation_id: string
  filename: string
  file_path: string
  file_size: number | null
  extracted_text: string | null
  chunks: Json
  uploaded_at: string
}

export interface SourceDocumentsInsert {
  id?: string
  presentation_id: string
  filename: string
  file_path: string
  file_size?: number | null
  extracted_text?: string | null
  chunks?: Json
  uploaded_at?: string
}

export interface SourceDocumentsUpdate {
  id?: string
  presentation_id?: string
  filename?: string
  file_path?: string
  file_size?: number | null
  extracted_text?: string | null
  chunks?: Json
  uploaded_at?: string
}

export interface AgentConversationsRow {
  id: string
  presentation_id: string
  messages: Json
  created_at: string
  updated_at: string
}

export interface AgentConversationsInsert {
  id?: string
  presentation_id: string
  messages?: Json
  created_at?: string
  updated_at?: string
}

export interface AgentConversationsUpdate {
  id?: string
  presentation_id?: string
  messages?: Json
  created_at?: string
  updated_at?: string
}

export interface ExportsRow {
  id: string
  presentation_id: string
  format: ExportFormat
  file_path: string
  signed_url: string | null
  expires_at: string | null
  created_at: string
}

export interface ExportsInsert {
  id?: string
  presentation_id: string
  format: ExportFormat
  file_path: string
  signed_url?: string | null
  expires_at?: string | null
  created_at?: string
}

export interface ExportsUpdate {
  id?: string
  presentation_id?: string
  format?: ExportFormat
  file_path?: string
  signed_url?: string | null
  expires_at?: string | null
  created_at?: string
}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: ProfilesRow
        Insert: ProfilesInsert
        Update: ProfilesUpdate
      }
      presentations: {
        Row: PresentationsRow
        Insert: PresentationsInsert
        Update: PresentationsUpdate
      }
      moments: {
        Row: MomentsRow
        Insert: MomentsInsert
        Update: MomentsUpdate
      }
      source_documents: {
        Row: SourceDocumentsRow
        Insert: SourceDocumentsInsert
        Update: SourceDocumentsUpdate
      }
      agent_conversations: {
        Row: AgentConversationsRow
        Insert: AgentConversationsInsert
        Update: AgentConversationsUpdate
      }
      exports: {
        Row: ExportsRow
        Insert: ExportsInsert
        Update: ExportsUpdate
      }
    }
  }
}