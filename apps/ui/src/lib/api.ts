import {
    AuditEvent,
    ProduceResult,
    LogQueryResult,
    LogQuery,
    ConnectorStatus,
    DLQCount,
} from './types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
    const res = await fetch(`${API_BASE}${path}`, {
        headers: {
            'Content-Type': 'application/json',
        },
        ...options,
    });

    if (!res.ok) {
        const error = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(error.error || `Request failed: ${res.status}`);
    }

    return res.json();
}

/**
 * Send a generic audit event.
 */
export async function sendAuditEvent(
    event: AuditEvent
): Promise<ProduceResult> {
    return request<ProduceResult>('/api/audit', {
        method: 'POST',
        body: JSON.stringify(event),
    });
}

/**
 * Send an audit event with a specific action type endpoint.
 */
export async function sendAuditEventByAction(
    action: string,
    event: AuditEvent
): Promise<ProduceResult> {
    const actionPath = action.toLowerCase() === 'authentication' ? 'auth' : action.toLowerCase();
    return request<ProduceResult>(`/api/audit/${actionPath}`, {
        method: 'POST',
        body: JSON.stringify(event),
    });
}

/**
 * Query audit logs from Elasticsearch.
 */
export async function getLogs(params?: LogQuery): Promise<LogQueryResult> {
    const searchParams = new URLSearchParams();
    if (params?.size) searchParams.set('size', String(params.size));
    if (params?.from) searchParams.set('from', String(params.from));
    if (params?.action) searchParams.set('action', params.action);
    if (params?.user_id) searchParams.set('user_id', params.user_id);

    const query = searchParams.toString();
    return request<LogQueryResult>(`/api/logs${query ? `?${query}` : ''}`);
}

/**
 * Get Kafka Connect connector statuses.
 */
export async function getConnectorStatus(): Promise<ConnectorStatus> {
    return request<ConnectorStatus>('/api/connectors');
}

/**
 * Get DLQ message counts.
 */
export async function getDLQCount(): Promise<DLQCount> {
    return request<DLQCount>('/api/dlq');
}

/**
 * Health check.
 */
export async function getHealth(): Promise<{ status: string; kafka: string }> {
    return request('/health');
}
