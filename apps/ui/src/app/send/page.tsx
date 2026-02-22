'use client'

import { useSendEventController } from './controller/controller'
import { ACTION_TYPES, ROLES, OUTCOMES, Role, Outcome } from '@/lib/types'
import { presets } from '@/lib/presets'
import { Send, CheckCircle2, XCircle, Sparkles, RotateCcw } from 'lucide-react'

export default function SendEventPage() {
  const {
    action,
    userId,
    role,
    module,
    resourceType,
    resourceId,
    outcome,
    changesField,
    changesOldValue,
    changesNewValue,
    setAction,
    setUserId,
    setRole,
    setModule,
    setResourceType,
    setResourceId,
    setOutcome,
    setChangesField,
    setChangesOldValue,
    setChangesNewValue,
    applyPreset,
    resetForm,
    handleSubmit,
    showChanges,
    showPayload,
    submitting,
    result,
    error,
  } = useSendEventController()

  return (
    <div className="space-y-8 animate-fade-in max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold gradient-text">Send Audit Event</h1>
        <p className="text-muted-foreground mt-1">
          Create and send audit events to the pipeline
        </p>
      </div>

      {/* Preset Buttons */}
      <div className="glass-card p-5">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <h2 className="text-sm font-semibold text-foreground">
            Quick Presets
          </h2>
        </div>
        <div className="flex flex-wrap gap-2">
          {presets.map((preset) => (
            <button
              key={preset.name}
              type="button"
              onClick={() => applyPreset(preset)}
              className="px-3 py-1.5 text-xs font-medium rounded-lg bg-secondary hover:bg-secondary/80 text-foreground border border-border hover:border-primary/30 transition-all duration-200"
              title={preset.description}
            >
              {preset.name}
            </button>
          ))}
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Action Type */}
        <div className="glass-card p-5">
          <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
            Action Type
          </label>
          <div className="flex flex-wrap gap-2">
            {ACTION_TYPES.map((a) => (
              <button
                key={a}
                type="button"
                onClick={() => setAction(a)}
                className={`px-4 py-2 text-sm font-medium rounded-lg border transition-all duration-200 ${
                  action === a
                    ? 'bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/25'
                    : 'bg-secondary text-foreground border-border hover:border-primary/30'
                }`}
              >
                {a}
              </button>
            ))}
          </div>
        </div>

        {/* Actor & Event */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="glass-card p-5 space-y-4">
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Actor
            </h3>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">
                User ID *
              </label>
              <input
                type="text"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                placeholder="e.g. EMP-001"
                required
                className="w-full px-3 py-2 rounded-lg bg-background border border-border text-foreground text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
              />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">
                Role *
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as Role)}
                className="w-full px-3 py-2 rounded-lg bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">
                Module
              </label>
              <input
                type="text"
                value={module}
                onChange={(e) => setModule(e.target.value)}
                placeholder="e.g. credit-management"
                className="w-full px-3 py-2 rounded-lg bg-background border border-border text-foreground text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
              />
            </div>
          </div>

          <div className="glass-card p-5 space-y-4">
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Target
            </h3>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">
                Resource Type *
              </label>
              <input
                type="text"
                value={resourceType}
                onChange={(e) => setResourceType(e.target.value)}
                placeholder="e.g. credit_limit"
                required
                className="w-full px-3 py-2 rounded-lg bg-background border border-border text-foreground text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
              />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">
                Resource ID *
              </label>
              <input
                type="text"
                value={resourceId}
                onChange={(e) => setResourceId(e.target.value)}
                placeholder="e.g. CL-2026-0001"
                required
                className="w-full px-3 py-2 rounded-lg bg-background border border-border text-foreground text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
              />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">
                Outcome *
              </label>
              <select
                value={outcome}
                onChange={(e) => setOutcome(e.target.value as Outcome)}
                className="w-full px-3 py-2 rounded-lg bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
              >
                {OUTCOMES.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Changes / Payload */}
        {(showChanges || showPayload) && (
          <div className="glass-card p-5 space-y-4">
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {showChanges ? 'Changes' : 'Payload'}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs text-muted-foreground mb-1">
                  Field
                </label>
                <input
                  type="text"
                  value={changesField}
                  onChange={(e) => setChangesField(e.target.value)}
                  placeholder="e.g. credit_limit"
                  className="w-full px-3 py-2 rounded-lg bg-background border border-border text-foreground text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">
                  Old Value
                </label>
                <input
                  type="text"
                  value={changesOldValue}
                  onChange={(e) => setChangesOldValue(e.target.value)}
                  placeholder="JSON or string"
                  className="w-full px-3 py-2 rounded-lg bg-background border border-border text-foreground text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">
                  New Value
                </label>
                <input
                  type="text"
                  value={changesNewValue}
                  onChange={(e) => setChangesNewValue(e.target.value)}
                  placeholder="JSON or string"
                  className="w-full px-3 py-2 rounded-lg bg-background border border-border text-foreground text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                />
              </div>
            </div>
          </div>
        )}

        {/* Submit */}
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={submitting}
            className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-primary/25 hover:shadow-primary/40"
          >
            <Send className="w-4 h-4" />
            {submitting ? 'Sending...' : 'Send Event'}
          </button>
          <button
            type="button"
            onClick={resetForm}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-border text-muted-foreground text-sm hover:text-foreground hover:border-primary/30 transition-all"
          >
            <RotateCcw className="w-4 h-4" />
            Reset
          </button>
        </div>
      </form>

      {/* Result / Error */}
      {result && (
        <div className="glass-card p-5 border-emerald-500/30 bg-emerald-500/5 animate-fade-in">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-emerald-400">
                Event Sent Successfully
              </p>
              <div className="mt-2 space-y-1">
                <p className="text-xs text-muted-foreground">
                  <span className="text-foreground font-mono">
                    {result.log_id}
                  </span>
                </p>
                <p className="text-xs text-muted-foreground">
                  Kafka offset:{' '}
                  <span className="text-foreground font-mono">
                    {result.offset}
                  </span>
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="glass-card p-5 border-red-500/30 bg-red-500/5 animate-fade-in">
          <div className="flex items-start gap-3">
            <XCircle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-red-400">
                Failed to Send Event
              </p>
              <p className="text-xs text-muted-foreground mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
