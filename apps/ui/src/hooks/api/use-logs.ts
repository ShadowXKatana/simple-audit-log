'use client'

/**
 * useLogs – API hook for querying audit logs
 */

import { useEffect, useState, useCallback, useRef } from 'react'
import { useApiService } from '@/providers/api-provider'
import { AuditEvent, LogQuery } from '@/lib/types'

export interface UseLogsResult {
  logs: AuditEvent[]
  total: number
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useLogs(params?: LogQuery): UseLogsResult {
  const api = useApiService()

  const [logs, setLogs] = useState<AuditEvent[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Keep a stable ref so callers can change params without stale closures
  const paramsRef = useRef(params)
  paramsRef.current = params

  const refetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.getLogs(paramsRef.current)
      setLogs(res.logs || [])
      setTotal(res.total)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch logs')
      setLogs([])
    } finally {
      setLoading(false)
    }
  }, [api])

  useEffect(() => {
    refetch()
  }, [refetch, params?.size, params?.from, params?.action, params?.user_id])

  return { logs, total, loading, error, refetch }
}
