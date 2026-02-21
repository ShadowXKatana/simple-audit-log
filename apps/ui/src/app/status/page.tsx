'use client';

import { useEffect, useState, useCallback } from 'react';
import { getConnectorStatus, getDLQCount } from '@/lib/api';
import { ConnectorStatus, DLQCount } from '@/lib/types';
import { CheckCircle2, XCircle, PauseCircle, AlertTriangle, ExternalLink, RefreshCw, Server, Database, HardDrive } from 'lucide-react';

export default function StatusPage() {
    const [connectors, setConnectors] = useState<ConnectorStatus>({});
    const [dlq, setDlq] = useState<DLQCount>({ es_dlq_count: 0, s3_dlq_count: 0 });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

    const fetchData = useCallback(async () => {
        try {
            const [connRes, dlqRes] = await Promise.allSettled([getConnectorStatus(), getDLQCount()]);
            if (connRes.status === 'fulfilled') setConnectors(connRes.value);
            if (dlqRes.status === 'fulfilled') setDlq(dlqRes.value);
            setLastUpdated(new Date());
            setError(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch status');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 10000);
        return () => clearInterval(interval);
    }, [fetchData]);

    const connectorEntries = Object.entries(connectors);

    return (
        <div className="space-y-8 animate-fade-in">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold gradient-text">System Status</h1>
                    <p className="text-muted-foreground mt-1">Monitor Kafka Connect connectors and pipeline health</p>
                </div>
                <div className="flex items-center gap-3">
                    {lastUpdated && <span className="text-[11px] text-muted-foreground">Updated {lastUpdated.toLocaleTimeString()}</span>}
                    <button onClick={fetchData} className="p-2 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:border-primary/30 transition-all">
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {error && (
                <div className="glass-card p-4 border-amber-500/30 bg-amber-500/5">
                    <div className="flex items-center gap-3">
                        <AlertTriangle className="w-5 h-5 text-amber-400" />
                        <p className="text-sm text-amber-400">{error}</p>
                    </div>
                </div>
            )}

            <div>
                <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-4">Kafka Connect Connectors</h2>
                {connectorEntries.length === 0 ? (
                    <div className="glass-card p-8 text-center text-muted-foreground text-sm">
                        <Server className="w-8 h-8 mx-auto mb-2 text-muted-foreground/50" />
                        No connectors found. Run <code className="text-xs bg-secondary px-1.5 py-0.5 rounded">scripts/init.sh</code> to deploy.
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {connectorEntries.map(([name, status]) => (
                            <div key={name} className="glass-card p-6 hover:border-primary/20 transition-all duration-300">
                                <div className="flex items-start gap-4">
                                    <div className="p-3 rounded-xl bg-secondary/50">
                                        {name.includes('es') ? <Database className="w-6 h-6 text-indigo-400" /> : <HardDrive className="w-6 h-6 text-purple-400" />}
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="text-sm font-semibold text-foreground">{name}</h3>
                                        <p className="text-xs text-muted-foreground mt-0.5">{name.includes('es') ? 'Elasticsearch Sink' : 'S3/MinIO Sink'}</p>
                                        <div className="mt-3 flex items-center gap-2">
                                            {status === 'RUNNING' ? <CheckCircle2 className="w-5 h-5 text-emerald-400" /> : status === 'PAUSED' ? <PauseCircle className="w-5 h-5 text-amber-400" /> : <XCircle className="w-5 h-5 text-red-400" />}
                                            <span className={status === 'RUNNING' ? 'status-running' : status === 'PAUSED' ? 'status-paused' : 'status-failed'}>{status}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div>
                <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-4">Dead Letter Queues</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[{ title: 'ES DLQ', desc: 'audit-log-dlq', count: dlq.es_dlq_count }, { title: 'S3 DLQ', desc: 'audit-log-s3-dlq', count: dlq.s3_dlq_count }].map(d => (
                        <div key={d.title} className="glass-card p-5">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-sm font-semibold text-foreground">{d.title}</h3>
                                    <p className="text-xs text-muted-foreground font-mono mt-0.5">{d.desc}</p>
                                </div>
                                <div className="text-right">
                                    <p className={`text-2xl font-bold ${d.count > 0 ? 'text-amber-400' : 'text-foreground'}`}>{loading ? '—' : d.count}</p>
                                    <p className="text-[10px] text-muted-foreground">messages</p>
                                </div>
                            </div>
                            {d.count > 0 && <div className="mt-3 flex items-center gap-2 text-amber-400"><AlertTriangle className="w-3.5 h-3.5" /><span className="text-xs">Messages need attention</span></div>}
                        </div>
                    ))}
                </div>
            </div>

            <div>
                <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-4">External Tools</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[
                        { title: 'Grafana', desc: 'Dashboards & Monitoring', url: 'http://localhost:3000', color: 'text-orange-400' },
                        { title: 'MinIO Console', desc: 'Object Storage', url: 'http://localhost:9001', color: 'text-red-400' },
                        { title: 'Kafka Connect', desc: 'REST API', url: 'http://localhost:8083', color: 'text-blue-400' },
                    ].map(link => (
                        <a key={link.title} href={link.url} target="_blank" rel="noopener noreferrer" className="glass-card p-5 group hover:border-primary/20 transition-all duration-300 block">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className={`text-sm font-semibold ${link.color}`}>{link.title}</h3>
                                    <p className="text-xs text-muted-foreground mt-0.5">{link.desc}</p>
                                    <p className="text-[10px] text-muted-foreground/60 font-mono mt-1">{link.url}</p>
                                </div>
                                <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                            </div>
                        </a>
                    ))}
                </div>
            </div>
        </div>
    );
}
