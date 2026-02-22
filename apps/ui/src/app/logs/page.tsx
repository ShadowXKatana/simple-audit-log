'use client'

import { useState } from 'react'
import { useLogsController } from './controller/controller'
import { ACTION_TYPES } from '@/lib/types'
import {
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  FileText,
  Filter,
} from 'lucide-react'
import { useTranslations } from 'next-intl'

export default function LogsPage() {
  const {
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
  } = useLogsController()

  const t = useTranslations('logs')
  const [expandedRow, setExpandedRow] = useState<string | null>(null)

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold gradient-text">{t('title')}</h1>
        <p className="text-muted-foreground mt-1">
          {t('subtitle')}
        </p>
      </div>

      {/* Filters */}
      <div className="glass-card p-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            {t('filters.label')}
          </span>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs text-muted-foreground mb-1">
              {t('filters.action')}
            </label>
            <select
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value)}
              className="px-3 py-2 rounded-lg bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              <option value="">{t('filters.allActions')}</option>
              {ACTION_TYPES.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">
              {t('filters.userId')}
            </label>
            <input
              type="text"
              value={filterUserId}
              onChange={(e) => setFilterUserId(e.target.value)}
              placeholder={t('filters.userIdPlaceholder')}
              className="px-3 py-2 rounded-lg bg-background border border-border text-foreground text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">
              {t('filters.dateFrom')}
            </label>
            <input
              type="date"
              value={filterDateFrom}
              onChange={(e) => setFilterDateFrom(e.target.value)}
              className="px-3 py-2 rounded-lg bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">
              {t('filters.dateTo')}
            </label>
            <input
              type="date"
              value={filterDateTo}
              onChange={(e) => setFilterDateTo(e.target.value)}
              className="px-3 py-2 rounded-lg bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
          <button
            onClick={search}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-all"
          >
            <Search className="w-3.5 h-3.5" />
            {t('filters.searchButton')}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="glass-card p-4 border-red-500/30 bg-red-500/5 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="px-4 py-3 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  {t('table.timestamp')}
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  {t('table.logId')}
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  {t('table.userId')}
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  {t('table.action')}
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  {t('table.resource')}
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  {t('table.outcome')}
                </th>
                <th className="px-4 py-3 w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-8 text-center text-muted-foreground text-sm"
                  >
                    {t('table.loading')}
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-8 text-center text-muted-foreground text-sm"
                  >
                    <FileText className="w-8 h-8 mx-auto mb-2 text-muted-foreground/50" />
                    {t('table.empty')}
                  </td>
                </tr>
              ) : (
                logs.map((log, i) => (
                  <>
                    <tr
                      key={log.log_id || i}
                      onClick={() =>
                        setExpandedRow(
                          expandedRow === (log.log_id || String(i))
                            ? null
                            : log.log_id || String(i),
                        )
                      }
                      className="hover:bg-secondary/30 cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-3 text-xs text-muted-foreground font-mono">
                        {log.timestamp
                          ? new Date(log.timestamp).toLocaleString()
                          : '—'}
                      </td>
                      <td className="px-4 py-3 text-xs text-foreground font-mono">
                        {log.log_id ? log.log_id.slice(0, 8) + '...' : '—'}
                      </td>
                      <td className="px-4 py-3 text-xs text-foreground font-medium">
                        {log.actor.user_id}
                      </td>
                      <td className="px-4 py-3">
                        <ActionBadge action={log.event.action} />
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {log.target.resource_type}/{log.target.resource_id}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                            log.event.outcome === 'SUCCESS'
                              ? 'bg-emerald-500/10 text-emerald-400'
                              : 'bg-red-500/10 text-red-400'
                          }`}
                        >
                          {log.event.outcome}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {expandedRow === (log.log_id || String(i)) ? (
                          <ChevronUp className="w-4 h-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-muted-foreground" />
                        )}
                      </td>
                    </tr>
                    {expandedRow === (log.log_id || String(i)) && (
                      <tr key={`${log.log_id || i}-detail`}>
                        <td colSpan={7} className="px-4 py-4 bg-background/50">
                          <pre className="text-xs text-muted-foreground font-mono overflow-x-auto whitespace-pre-wrap max-h-64 overflow-y-auto p-3 rounded-lg bg-background border border-border">
                            {JSON.stringify(log, null, 2)}
                          </pre>
                        </td>
                      </tr>
                    )}
                  </>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {total > 0 && (
          <div className="px-4 py-3 border-t border-border flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              {t('pagination.showing', {
                from: page * pageSize + 1,
                to: Math.min((page + 1) * pageSize, total),
                total,
              })}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(Math.max(0, page - 1))}
                disabled={page === 0}
                className="p-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs text-muted-foreground px-2">
                {t('pagination.page', { current: page + 1, total: totalPages })}
              </span>
              <button
                onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                disabled={page >= totalPages - 1}
                className="p-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function ActionBadge({ action }: { action: string }) {
  const colors: Record<string, string> = {
    CREATE: 'bg-emerald-500/15 text-emerald-400',
    UPDATE: 'bg-blue-500/15 text-blue-400',
    DELETE: 'bg-red-500/15 text-red-400',
    ACCESS: 'bg-violet-500/15 text-violet-400',
    AUTHENTICATION: 'bg-amber-500/15 text-amber-400',
  }

  return (
    <span
      className={`text-[10px] font-bold px-2 py-1 rounded-md tracking-wider ${
        colors[action] || 'bg-gray-500/15 text-gray-400'
      }`}
    >
      {action}
    </span>
  )
}
  const {
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
  } = useLogsController()

  const [expandedRow, setExpandedRow] = useState<string | null>(null)

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold gradient-text">Log Viewer</h1>
        <p className="text-muted-foreground mt-1">
          Search and browse audit logs from Elasticsearch
        </p>
      </div>

      {/* Filters */}
      <div className="glass-card p-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Filters
          </span>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs text-muted-foreground mb-1">
              Action
            </label>
            <select
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value)}
              className="px-3 py-2 rounded-lg bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              <option value="">All Actions</option>
              {ACTION_TYPES.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">
              User ID
            </label>
            <input
              type="text"
              value={filterUserId}
              onChange={(e) => setFilterUserId(e.target.value)}
              placeholder="e.g. EMP-001"
              className="px-3 py-2 rounded-lg bg-background border border-border text-foreground text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
          <button
            onClick={search}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-all"
          >
            <Search className="w-3.5 h-3.5" />
            Search
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="glass-card p-4 border-red-500/30 bg-red-500/5 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="px-4 py-3 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Timestamp
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Log ID
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  User ID
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Action
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Resource
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Outcome
                </th>
                <th className="px-4 py-3 w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-8 text-center text-muted-foreground text-sm"
                  >
                    Loading logs...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-8 text-center text-muted-foreground text-sm"
                  >
                    <FileText className="w-8 h-8 mx-auto mb-2 text-muted-foreground/50" />
                    No logs found
                  </td>
                </tr>
              ) : (
                logs.map((log, i) => (
                  <>
                    <tr
                      key={log.log_id || i}
                      onClick={() =>
                        setExpandedRow(
                          expandedRow === (log.log_id || String(i))
                            ? null
                            : log.log_id || String(i),
                        )
                      }
                      className="hover:bg-secondary/30 cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-3 text-xs text-muted-foreground font-mono">
                        {log.timestamp
                          ? new Date(log.timestamp).toLocaleString()
                          : '—'}
                      </td>
                      <td className="px-4 py-3 text-xs text-foreground font-mono">
                        {log.log_id ? log.log_id.slice(0, 8) + '...' : '—'}
                      </td>
                      <td className="px-4 py-3 text-xs text-foreground font-medium">
                        {log.actor.user_id}
                      </td>
                      <td className="px-4 py-3">
                        <ActionBadge action={log.event.action} />
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {log.target.resource_type}/{log.target.resource_id}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                            log.event.outcome === 'SUCCESS'
                              ? 'bg-emerald-500/10 text-emerald-400'
                              : 'bg-red-500/10 text-red-400'
                          }`}
                        >
                          {log.event.outcome}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {expandedRow === (log.log_id || String(i)) ? (
                          <ChevronUp className="w-4 h-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-muted-foreground" />
                        )}
                      </td>
                    </tr>
                    {expandedRow === (log.log_id || String(i)) && (
                      <tr key={`${log.log_id || i}-detail`}>
                        <td colSpan={7} className="px-4 py-4 bg-background/50">
                          <pre className="text-xs text-muted-foreground font-mono overflow-x-auto whitespace-pre-wrap max-h-64 overflow-y-auto p-3 rounded-lg bg-background border border-border">
                            {JSON.stringify(log, null, 2)}
                          </pre>
                        </td>
                      </tr>
                    )}
                  </>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {total > 0 && (
          <div className="px-4 py-3 border-t border-border flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              Showing {page * pageSize + 1}–
              {Math.min((page + 1) * pageSize, total)} of {total}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(Math.max(0, page - 1))}
                disabled={page === 0}
                className="p-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs text-muted-foreground px-2">
                Page {page + 1} of {totalPages}
              </span>
              <button
                onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                disabled={page >= totalPages - 1}
                className="p-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function ActionBadge({ action }: { action: string }) {
  const colors: Record<string, string> = {
    CREATE: 'bg-emerald-500/15 text-emerald-400',
    UPDATE: 'bg-blue-500/15 text-blue-400',
    DELETE: 'bg-red-500/15 text-red-400',
    ACCESS: 'bg-violet-500/15 text-violet-400',
    AUTHENTICATION: 'bg-amber-500/15 text-amber-400',
  }

  return (
    <span
      className={`text-[10px] font-bold px-2 py-1 rounded-md tracking-wider ${
        colors[action] || 'bg-gray-500/15 text-gray-400'
      }`}
    >
      {action}
    </span>
  )
}
