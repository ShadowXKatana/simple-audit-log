'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { getLogs, getConnectorStatus, getDLQCount } from '@/lib/api';
import { AuditEvent, ConnectorStatus, DLQCount } from '@/lib/types';
import {
    Activity,
    Send,
    AlertTriangle,
    CheckCircle2,
    XCircle,
    Clock,
    Zap,
    ArrowRight,
} from 'lucide-react';

export default function DashboardPage() {
    const [recentLogs, setRecentLogs] = useState<AuditEvent[]>([]);
    const [connectors, setConnectors] = useState<ConnectorStatus>({});
    const [dlq, setDlq] = useState<DLQCount>({ es_dlq_count: 0, s3_dlq_count: 0 });
    const [totalLogs, setTotalLogs] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        try {
            const [logsRes, connRes, dlqRes] = await Promise.allSettled([
                getLogs({ size: 10 }),
                getConnectorStatus(),
                getDLQCount(),
            ]);

            if (logsRes.status === 'fulfilled') {
                setRecentLogs(logsRes.value.logs || []);
                setTotalLogs(logsRes.value.total);
            }
            if (connRes.status === 'fulfilled') setConnectors(connRes.value);
            if (dlqRes.status === 'fulfilled') setDlq(dlqRes.value);

            setError(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch data');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 5000);
        return () => clearInterval(interval);
    }, [fetchData]);

    const connectorEntries = Object.entries(connectors);
    const totalDLQ = dlq.es_dlq_count + dlq.s3_dlq_count;

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold gradient-text">Dashboard</h1>
                <p className="text-muted-foreground mt-1">
                    Real-time overview of your audit logging pipeline
                </p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Total Logs */}
                <div className="glass-card p-5 group hover:border-indigo-500/30 transition-all duration-300">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                Total Logs
                            </p>
                            <p className="text-3xl font-bold text-foreground mt-1">
                                {loading ? '—' : totalLogs.toLocaleString()}
                            </p>
                        </div>
                        <div className="p-3 rounded-xl bg-indigo-500/10 group-hover:bg-indigo-500/20 transition-colors">
                            <Activity className="w-5 h-5 text-indigo-400" />
                        </div>
                    </div>
                </div>

                {/* Connectors */}
                <div className="glass-card p-5 group hover:border-emerald-500/30 transition-all duration-300">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                Connectors
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                                {connectorEntries.length > 0 ? (
                                    connectorEntries.map(([name, status]) => (
                                        <span
                                            key={name}
                                            className={
                                                status === 'RUNNING'
                                                    ? 'status-running'
                                                    : status === 'PAUSED'
                                                        ? 'status-paused'
                                                        : 'status-failed'
                                            }
                                        >
                                            {status === 'RUNNING' ? (
                                                <CheckCircle2 className="w-3 h-3" />
                                            ) : (
                                                <XCircle className="w-3 h-3" />
                                            )}
                                            {status}
                                        </span>
                                    ))
                                ) : (
                                    <span className="text-2xl font-bold text-muted-foreground">
                                        {loading ? '—' : '0'}
                                    </span>
                                )}
                            </div>
                        </div>
                        <div className="p-3 rounded-xl bg-emerald-500/10 group-hover:bg-emerald-500/20 transition-colors">
                            <Zap className="w-5 h-5 text-emerald-400" />
                        </div>
                    </div>
                </div>

                {/* DLQ Count */}
                <div className="glass-card p-5 group hover:border-amber-500/30 transition-all duration-300">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                DLQ Messages
                            </p>
                            <p className={`text-3xl font-bold mt-1 ${totalDLQ > 0 ? 'text-amber-400' : 'text-foreground'}`}>
                                {loading ? '—' : totalDLQ}
                            </p>
                        </div>
                        <div className="p-3 rounded-xl bg-amber-500/10 group-hover:bg-amber-500/20 transition-colors">
                            <AlertTriangle className="w-5 h-5 text-amber-400" />
                        </div>
                    </div>
                </div>

                {/* Quick Send */}
                <Link
                    href="/send"
                    className="glass-card p-5 group hover:border-purple-500/30 transition-all duration-300 cursor-pointer"
                >
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                Quick Action
                            </p>
                            <p className="text-lg font-semibold text-foreground mt-1 flex items-center gap-2">
                                Send Event
                                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                            </p>
                        </div>
                        <div className="p-3 rounded-xl bg-purple-500/10 group-hover:bg-purple-500/20 transition-colors">
                            <Send className="w-5 h-5 text-purple-400" />
                        </div>
                    </div>
                </Link>
            </div>

            {/* Error Banner */}
            {error && (
                <div className="glass-card p-4 border-amber-500/30 bg-amber-500/5">
                    <div className="flex items-center gap-3">
                        <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0" />
                        <div>
                            <p className="text-sm font-medium text-amber-400">Connection Issue</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{error}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Recent Logs */}
            <div className="glass-card overflow-hidden">
                <div className="px-6 py-4 border-b border-border flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        <h2 className="text-sm font-semibold text-foreground">Recent Activity</h2>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 font-medium">
                            LIVE
                        </span>
                    </div>
                    <Link
                        href="/logs"
                        className="text-xs text-muted-foreground hover:text-primary transition-colors"
                    >
                        View all →
                    </Link>
                </div>

                {loading ? (
                    <div className="p-8 text-center text-muted-foreground text-sm">
                        Loading...
                    </div>
                ) : recentLogs.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground text-sm">
                        No audit logs yet. Send your first event from the{' '}
                        <Link href="/send" className="text-primary hover:underline">
                            Send Event
                        </Link>{' '}
                        page.
                    </div>
                ) : (
                    <div className="divide-y divide-border">
                        {recentLogs.map((log, i) => (
                            <div
                                key={log.log_id || i}
                                className="px-6 py-3 flex items-center gap-4 hover:bg-secondary/30 transition-colors"
                            >
                                <div className="flex-shrink-0">
                                    <ActionBadge action={log.event.action} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-medium text-foreground">
                                            {log.actor.user_id}
                                        </span>
                                        <span className="text-xs text-muted-foreground">
                                            {log.event.action}
                                        </span>
                                        <span className="text-xs text-muted-foreground">→</span>
                                        <span className="text-xs text-muted-foreground truncate">
                                            {log.target.resource_type}/{log.target.resource_id}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex-shrink-0">
                                    <span
                                        className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${log.event.outcome === 'SUCCESS'
                                                ? 'bg-emerald-500/10 text-emerald-400'
                                                : 'bg-red-500/10 text-red-400'
                                            }`}
                                    >
                                        {log.event.outcome}
                                    </span>
                                </div>
                                <div className="flex-shrink-0 text-[11px] text-muted-foreground">
                                    {log.timestamp ? new Date(log.timestamp).toLocaleTimeString() : '—'}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

function ActionBadge({ action }: { action: string }) {
    const colors: Record<string, string> = {
        CREATE: 'bg-emerald-500/15 text-emerald-400',
        UPDATE: 'bg-blue-500/15 text-blue-400',
        DELETE: 'bg-red-500/15 text-red-400',
        ACCESS: 'bg-violet-500/15 text-violet-400',
        AUTHENTICATION: 'bg-amber-500/15 text-amber-400',
    };

    return (
        <span
            className={`text-[10px] font-bold px-2 py-1 rounded-md tracking-wider ${colors[action] || 'bg-gray-500/15 text-gray-400'
                }`}
        >
            {action}
        </span>
    );
}
