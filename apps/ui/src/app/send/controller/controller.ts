'use client'

/**
 * Send Event Controller
 *
 * Manages form state, preset application, and delegates submission
 * to the API hook.
 */

import { useState, useCallback } from 'react'
import { useSendAuditEvent } from '@/hooks/api/use-send-audit-event'
import {
  AuditEvent,
  ProduceResult,
  ActionType,
  Role,
  Outcome,
} from '@/lib/types'
import { Preset } from '@/lib/presets'

export interface SendEventControllerState {
  /* form fields */
  action: ActionType
  userId: string
  role: Role
  module: string
  resourceType: string
  resourceId: string
  outcome: Outcome
  changesField: string
  changesOldValue: string
  changesNewValue: string

  /* setters */
  setAction: (v: ActionType) => void
  setUserId: (v: string) => void
  setRole: (v: Role) => void
  setModule: (v: string) => void
  setResourceType: (v: string) => void
  setResourceId: (v: string) => void
  setOutcome: (v: Outcome) => void
  setChangesField: (v: string) => void
  setChangesOldValue: (v: string) => void
  setChangesNewValue: (v: string) => void

  /* actions */
  applyPreset: (preset: Preset) => void
  resetForm: () => void
  handleSubmit: (e: React.FormEvent) => Promise<void>

  /* derived */
  showChanges: boolean
  showPayload: boolean

  /* async state */
  submitting: boolean
  result: ProduceResult | null
  error: string | null
}

export function useSendEventController(): SendEventControllerState {
  const {
    submit,
    submitting,
    result,
    error,
    reset: resetApi,
  } = useSendAuditEvent()

  const [action, setAction] = useState<ActionType>('CREATE')
  const [userId, setUserId] = useState('')
  const [role, setRole] = useState<Role>('ADMIN')
  const [module, setModule] = useState('')
  const [resourceType, setResourceType] = useState('')
  const [resourceId, setResourceId] = useState('')
  const [outcome, setOutcome] = useState<Outcome>('SUCCESS')
  const [changesField, setChangesField] = useState('')
  const [changesOldValue, setChangesOldValue] = useState('')
  const [changesNewValue, setChangesNewValue] = useState('')

  const applyPreset = useCallback(
    (preset: Preset) => {
      const e = preset.event
      setAction(e.event.action as ActionType)
      setUserId(e.actor.user_id)
      setRole(e.actor.role as Role)
      setModule(e.event.module || '')
      setResourceType(e.target.resource_type)
      setResourceId(e.target.resource_id)
      setOutcome(e.event.outcome as Outcome)

      if (e.changes) {
        setChangesField(e.changes.field || '')
        setChangesOldValue(JSON.stringify(e.changes.old_value))
        setChangesNewValue(JSON.stringify(e.changes.new_value))
      } else if (e.payload) {
        setChangesField(e.payload.field || '')
        setChangesOldValue(JSON.stringify(e.payload.old_value))
        setChangesNewValue(JSON.stringify(e.payload.new_value))
      } else {
        setChangesField('')
        setChangesOldValue('')
        setChangesNewValue('')
      }

      resetApi()
    },
    [resetApi],
  )

  const resetForm = useCallback(() => {
    setAction('CREATE')
    setUserId('')
    setRole('ADMIN')
    setModule('')
    setResourceType('')
    setResourceId('')
    setOutcome('SUCCESS')
    setChangesField('')
    setChangesOldValue('')
    setChangesNewValue('')
    resetApi()
  }, [resetApi])

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()

      const event: AuditEvent = {
        actor: { user_id: userId, role },
        event: {
          action,
          module: module || undefined,
          outcome,
        },
        target: {
          resource_type: resourceType,
          resource_id: resourceId,
        },
      }

      // Attach changes / payload when provided
      if (changesField || changesOldValue || changesNewValue) {
        let oldVal: unknown = changesOldValue
        let newVal: unknown = changesNewValue

        try {
          oldVal = JSON.parse(changesOldValue)
        } catch {
          /* keep string */
        }
        try {
          newVal = JSON.parse(changesNewValue)
        } catch {
          /* keep string */
        }

        const changeObj = {
          field: changesField || undefined,
          old_value: oldVal,
          new_value: newVal,
        }

        if (action === 'UPDATE') {
          event.changes = changeObj
        } else {
          event.payload = changeObj
        }
      }

      await submit(event)
    },
    [
      submit,
      action,
      userId,
      role,
      module,
      outcome,
      resourceType,
      resourceId,
      changesField,
      changesOldValue,
      changesNewValue,
    ],
  )

  const showChanges = action === 'UPDATE'
  const showPayload = action === 'CREATE' || action === 'DELETE'

  return {
    action,
    userId,
    role,
    module,
    resourceType,
    resourceId,
    outcome,
    changesField,
    changesOldValue,
    changesNewValue,
    setAction,
    setUserId,
    setRole,
    setModule,
    setResourceType,
    setResourceId,
    setOutcome,
    setChangesField,
    setChangesOldValue,
    setChangesNewValue,
    applyPreset,
    resetForm,
    handleSubmit,
    showChanges,
    showPayload,
    submitting,
    result,
    error,
  }
}
