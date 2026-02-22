'use client'

/**
 * useSendAuditEvent – API hook for sending an audit event (mutation)
 */

import { useState, useCallback } from 'react'
import { toast } from 'sonner'
import { useApiService } from '@/providers/api-provider'
import { AuditEvent, ProduceResult } from '@/lib/types'

export interface UseSendAuditEventResult {
  submit: (event: AuditEvent) => Promise<ProduceResult | undefined>
  submitting: boolean
  result: ProduceResult | null
  error: string | null
  reset: () => void
}

export function useSendAuditEvent(): UseSendAuditEventResult {
  const api = useApiService()

  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<ProduceResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const submit = useCallback(
    async (event: AuditEvent): Promise<ProduceResult | undefined> => {
      setSubmitting(true)
      setResult(null)
      setError(null)
      try {
        const res = await api.sendEvent(event)
        setResult(res)
        toast.success('Event sent successfully', {
          description: `log_id: ${res.log_id}  ·  offset: ${res.offset}`,
        })
        return res
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to send event'
        setError(msg)
        toast.error('Failed to send event', { description: msg })
        return undefined
      } finally {
        setSubmitting(false)
      }
    },
    [api],
  )

  const reset = useCallback(() => {
    setResult(null)
    setError(null)
  }, [])

  return { submit, submitting, result, error, reset }
}
