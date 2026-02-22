'use client'

/**
 * Dashboard Controller
 *
 * Composes API hooks, handles polling, and computes derived state.
 */

import { useEffect, useCallback, useMemo } from 'react'
import { useLogs } from '@/hooks/api/use-logs'
import { useConnectors } from '@/hooks/api/use-connectors'
import { useDLQ } from '@/hooks/api/use-dlq'
import { AuditEvent, ConnectorStatus, DLQCount } from '@/lib/types'

export interface DashboardState {
  recentLogs: AuditEvent[]
  totalLogs: number
  connectors: ConnectorStatus
  dlq: DLQCount
  totalDLQ: number
  loading: boolean
  error: string | null
}

export function useDashboardController(refreshInterval = 5000): DashboardState {
  const logsApi = useLogs({ size: 10 })
  const connApi = useConnectors()
  const dlqApi = useDLQ()

  // Derived error – first one that appears
  const error = useMemo(
    () => logsApi.error || connApi.error || dlqApi.error || null,
    [logsApi.error, connApi.error, dlqApi.error],
  )

  // Polling
  const refetchAll = useCallback(async () => {
    await Promise.allSettled([
      logsApi.refetch(),
      connApi.refetch(),
      dlqApi.refetch(),
    ])
  }, [logsApi, connApi, dlqApi])

  useEffect(() => {
    const interval = setInterval(refetchAll, refreshInterval)
    return () => clearInterval(interval)
  }, [refetchAll, refreshInterval])

  const loading = logsApi.loading || connApi.loading || dlqApi.loading
  const totalDLQ = dlqApi.dlq.es_dlq_count + dlqApi.dlq.s3_dlq_count

  return {
    recentLogs: logsApi.logs,
    totalLogs: logsApi.total,
    connectors: connApi.connectors,
    dlq: dlqApi.dlq,
    totalDLQ,
    loading,
    error,
  }
}
