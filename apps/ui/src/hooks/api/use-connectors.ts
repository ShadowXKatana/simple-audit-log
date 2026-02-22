'use client'

/**
 * useConnectors – API hook for fetching Kafka Connect connector statuses
 */

import { useEffect, useState, useCallback } from 'react'
import { useApiService } from '@/providers/api-provider'
import { ConnectorStatus } from '@/lib/types'

export interface UseConnectorsResult {
  connectors: ConnectorStatus
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useConnectors(): UseConnectorsResult {
  const api = useApiService()

  const [connectors, setConnectors] = useState<ConnectorStatus>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await api.getConnectorStatus()
      setConnectors(data)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to fetch connectors',
      )
    } finally {
      setLoading(false)
    }
  }, [api])

  useEffect(() => {
    refetch()
  }, [refetch])

  return { connectors, loading, error, refetch }
}
