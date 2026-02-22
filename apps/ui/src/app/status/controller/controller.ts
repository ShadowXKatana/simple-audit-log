'use client'

/**
 * Status Controller
 *
 * Composes connector + DLQ API hooks, handles polling and refresh.
 */

import { useEffect, useCallback, useMemo, useState } from 'react'
import { useConnectors } from '@/hooks/api/use-connectors'
import { useDLQ } from '@/hooks/api/use-dlq'
import { ConnectorStatus, DLQCount } from '@/lib/types'

export interface StatusControllerState {
  connectors: ConnectorStatus
  connectorEntries: [string, string][]
  dlq: DLQCount
  loading: boolean
  error: string | null
  lastUpdated: Date | null
  refresh: () => void
}

export function useStatusController(
  refreshInterval = 10000,
): StatusControllerState {
  const connApi = useConnectors()
  const dlqApi = useDLQ()

  // Derived error – first one that appears
  const error = useMemo(
    () => connApi.error || dlqApi.error || null,
    [connApi.error, dlqApi.error],
  )

  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const refresh = useCallback(async () => {
    await Promise.allSettled([connApi.refetch(), dlqApi.refetch()])
    setLastUpdated(new Date())
  }, [connApi, dlqApi])

  // Polling
  useEffect(() => {
    const interval = setInterval(refresh, refreshInterval)
    return () => clearInterval(interval)
  }, [refresh, refreshInterval])

  const loading = connApi.loading || dlqApi.loading
  const connectorEntries = Object.entries(connApi.connectors) as [
    string,
    string,
  ][]

  return {
    connectors: connApi.connectors,
    connectorEntries,
    dlq: dlqApi.dlq,
    loading,
    error,
    lastUpdated,
    refresh,
  }
}
