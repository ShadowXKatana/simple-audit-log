'use client'

/**
 * Logs Controller
 *
 * Manages filter state, pagination, and composes the logs API hook.
 */

import { useState, useCallback, useMemo } from 'react'
import { useLogs } from '@/hooks/api/use-logs'
import { AuditEvent } from '@/lib/types'

export interface LogsControllerState {
  logs: AuditEvent[]
  total: number
  page: number
  pageSize: number
  totalPages: number
  loading: boolean
  error: string | null
  filterAction: string
  filterUserId: string
  setFilterAction: (v: string) => void
  setFilterUserId: (v: string) => void
  setPage: (p: number) => void
  search: () => void
}

export function useLogsController(pageSize = 50): LogsControllerState {
  const [page, setPage] = useState(0)
  const [filterAction, setFilterAction] = useState('')
  const [filterUserId, setFilterUserId] = useState('')

  const params = useMemo(
    () => ({
      size: pageSize,
      from: page * pageSize,
      action: filterAction || undefined,
      user_id: filterUserId || undefined,
    }),
    [page, pageSize, filterAction, filterUserId],
  )

  const { logs, total, loading, error, refetch } = useLogs(params)

  const search = useCallback(() => {
    setPage(0)
    refetch()
  }, [refetch])

  const totalPages = Math.ceil(total / pageSize)

  return {
    logs,
    total,
    page,
    pageSize,
    totalPages,
    loading,
    error,
    filterAction,
    filterUserId,
    setFilterAction,
    setFilterUserId,
    setPage,
    search,
  }
}
