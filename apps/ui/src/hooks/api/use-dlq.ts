'use client'

/**
 * useDLQ – API hook for fetching Dead Letter Queue counts
 */

import { useEffect, useState, useCallback } from 'react'
import { useApiService } from '@/providers/api-provider'
import { DLQCount } from '@/lib/types'

export interface UseDLQResult {
  dlq: DLQCount
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useDLQ(): UseDLQResult {
  const api = useApiService()

  const [dlq, setDlq] = useState<DLQCount>({ es_dlq_count: 0, s3_dlq_count: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await api.getDLQCount()
      setDlq(data)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to fetch DLQ counts',
      )
    } finally {
      setLoading(false)
    }
  }, [api])

  useEffect(() => {
    refetch()
  }, [refetch])

  return { dlq, loading, error, refetch }
}
