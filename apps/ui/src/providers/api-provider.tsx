'use client'

/**
 * API Provider – Axios Context
 *
 * Creates a single Axios instance, wraps it in `createAuditService`, and
 * exposes the service via React Context.  Pages & hooks consume the service
 * through `useApiService()` without ever knowing about Axios directly.
 */

import { createContext, useContext, useMemo, type ReactNode } from 'react'
import axios from 'axios'
import { createAuditService, type AuditService } from '@/services/audit.service'

const ApiContext = createContext<AuditService | null>(null)

export function ApiProvider({ children }: { children: ReactNode }) {
  const service = useMemo(() => {
    const client = axios.create({
      // Relative URL – the Next.js middleware proxies /api/* to the backend
      baseURL: '',
      headers: { 'Content-Type': 'application/json' },
    })

    // Global response-error interceptor so callers get clean Error objects
    client.interceptors.response.use(
      (res) => res,
      (err) => {
        const message =
          err.response?.data?.error ||
          err.response?.statusText ||
          err.message ||
          'Unexpected error'
        return Promise.reject(new Error(message))
      },
    )

    return createAuditService(client)
  }, [])

  return <ApiContext.Provider value={service}>{children}</ApiContext.Provider>
}

/**
 * Hook to access the audit service from the provider.
 *
 * Must be called inside `<ApiProvider>`.
 */
export function useApiService(): AuditService {
  const ctx = useContext(ApiContext)
  if (!ctx) {
    throw new Error('useApiService must be used within <ApiProvider>')
  }
  return ctx
}
