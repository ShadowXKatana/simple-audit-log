/**
 * Audit Service – Model Layer
 *
 * Pure data-access functions that accept an Axios instance and return typed
 * responses.  No React state or hooks here – this is the "Model" in MVC.
 */

import { AxiosInstance } from 'axios'
import {
  AuditEvent,
  ProduceResult,
  LogQueryResult,
  LogQuery,
  ConnectorStatus,
  DLQCount,
} from '@/lib/types'

export function createAuditService(client: AxiosInstance) {
  return {
    /** Send a generic audit event. */
    sendEvent: async (event: AuditEvent): Promise<ProduceResult> => {
      const { data } = await client.post<ProduceResult>('/api/audit', event)
      return data
    },

    /** Send an audit event to an action-specific endpoint. */
    sendEventByAction: async (
      action: string,
      event: AuditEvent,
    ): Promise<ProduceResult> => {
      const actionPath =
        action.toLowerCase() === 'authentication'
          ? 'auth'
          : action.toLowerCase()
      const { data } = await client.post<ProduceResult>(
        `/api/audit/${actionPath}`,
        event,
      )
      return data
    },

    /** Query audit logs from Elasticsearch. */
    getLogs: async (params?: LogQuery): Promise<LogQueryResult> => {
      const { data } = await client.get<LogQueryResult>('/api/logs', {
        params: {
          ...(params?.size != null && { size: params.size }),
          ...(params?.from != null && { from: params.from }),
          ...(params?.action && { action: params.action }),
          ...(params?.user_id && { user_id: params.user_id }),
          ...(params?.date_from && { date_from: params.date_from }),
          ...(params?.date_to && { date_to: params.date_to }),
        },
      })
      return data
    },

    /** Get Kafka Connect connector statuses. */
    getConnectorStatus: async (): Promise<ConnectorStatus> => {
      const { data } = await client.get<ConnectorStatus>('/api/connectors')
      return data
    },

    /** Get DLQ message counts. */
    getDLQCount: async (): Promise<DLQCount> => {
      const { data } = await client.get<DLQCount>('/api/dlq')
      return data
    },

    /** Health check. */
    getHealth: async (): Promise<{ status: string; kafka: string }> => {
      const { data } = await client.get<{ status: string; kafka: string }>(
        '/health',
      )
      return data
    },
  }
}

/** Convenience type representing the service object. */
export type AuditService = ReturnType<typeof createAuditService>
