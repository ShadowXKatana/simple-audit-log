// TypeScript interfaces matching the Go producer API structs

export interface AuditEvent {
  timestamp?: string
  log_id?: string
  actor: Actor
  event: AuditEventDetail
  target: Target
  changes?: Change
  payload?: Change
  metadata?: Meta
}

export interface Actor {
  user_id: string
  role: string
  ip_address?: string
  user_agent?: string
}

export interface AuditEventDetail {
  action: string
  module?: string
  outcome: string
}

export interface Target {
  resource_type: string
  resource_id: string
}

export interface Change {
  field?: string
  old_value: unknown
  new_value: unknown
}

export interface Meta {
  correlation_id?: string
  service_name?: string
}

export interface ProduceResult {
  log_id: string
  offset: number
}

export interface LogQueryResult {
  total: number
  logs: AuditEvent[]
}

export interface LogQuery {
  size?: number
  from?: number
  action?: string
  user_id?: string
  date_from?: string // ISO 8601 range start (inclusive)
  date_to?: string // ISO 8601 range end (inclusive)
}

export interface ConnectorStatus {
  [name: string]: string
}

export interface DLQCount {
  es_dlq_count: number
  s3_dlq_count: number
}

// Action types available in the audit system
export const ACTION_TYPES = [
  'CREATE',
  'UPDATE',
  'DELETE',
  'ACCESS',
  'AUTHENTICATION',
] as const

export type ActionType = (typeof ACTION_TYPES)[number]

// Role types
export const ROLES = [
  'ADMIN',
  'SUPER_ADMIN',
  'COMPLIANCE_OFFICER',
  'USER',
] as const

export type Role = (typeof ROLES)[number]

// Outcome types
export const OUTCOMES = ['SUCCESS', 'FAILURE'] as const

export type Outcome = (typeof OUTCOMES)[number]
