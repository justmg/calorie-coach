export interface User {
  id: string // Clerk user ID
  clerk_user_id: string // Redundant but explicit
  phone: string
  pin: string
  call_window_start: string
  call_window_end: string
  timezone: string
  max_retries: number
  created_at: string
  updated_at: string
}

export type CallStatus = 'scheduled' | 'in_progress' | 'completed' | 'failed'

export interface CallLog {
  id: string
  user_id: string
  scheduled_at: string
  started_at?: string
  ended_at?: string
  status: CallStatus
  retries: number
  transcript_id?: string
  error_message?: string
  created_at: string
  updated_at: string
}

export interface CalorieItem {
  name: string
  calories: number
  quantity: number
}

export interface CalorieEntry {
  id: string
  user_id: string
  date: string
  items: CalorieItem[]
  total_calories: number
  transcript_text?: string
  call_log_id?: string
  created_at: string
  updated_at: string
}

export interface Error {
  id: string
  workflow: string
  error_type?: string
  message: string
  context?: any
  created_at: string
}