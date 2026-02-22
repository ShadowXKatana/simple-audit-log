'use client'

import { useSendEventController } from './controller/controller'
import { ACTION_TYPES, ROLES, OUTCOMES, Role, Outcome } from '@/lib/types'
import { presets } from '@/lib/presets'
import { Send, Sparkles, RotateCcw } from 'lucide-react'
import { useTranslations } from 'next-intl'

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
  } = useSendEventController()

  const t = useTranslations('send')

  return (
    <div className="space-y-8 animate-fade-in max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold gradient-text">{t('title')}</h1>
        <p className="text-muted-foreground mt-1">{t('subtitle')}</p>
      </div>

      {/* Preset Buttons */}
      <div className="glass-card p-5">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <h2 className="text-sm font-semibold text-foreground">
            {t('presets.title')}
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
            {t('form.actionType')}
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
              {t('form.actor.title')}
            </h3>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">
                {t('form.actor.userId')}
              </label>
              <input
                type="text"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                placeholder={t('form.actor.userIdPlaceholder')}
                required
                className="w-full px-3 py-2 rounded-lg bg-background border border-border text-foreground text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
              />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">
                {t('form.actor.role')}
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
                {t('form.actor.module')}
              </label>
              <input
                type="text"
                value={module}
                onChange={(e) => setModule(e.target.value)}
                placeholder={t('form.actor.modulePlaceholder')}
                className="w-full px-3 py-2 rounded-lg bg-background border border-border text-foreground text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
              />
            </div>
          </div>

          <div className="glass-card p-5 space-y-4">
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {t('form.target.title')}
            </h3>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">
                {t('form.target.resourceType')}
              </label>
              <input
                type="text"
                value={resourceType}
                onChange={(e) => setResourceType(e.target.value)}
                placeholder={t('form.target.resourceTypePlaceholder')}
                required
                className="w-full px-3 py-2 rounded-lg bg-background border border-border text-foreground text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
              />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">
                {t('form.target.resourceId')}
              </label>
              <input
                type="text"
                value={resourceId}
                onChange={(e) => setResourceId(e.target.value)}
                placeholder={t('form.target.resourceIdPlaceholder')}
                required
                className="w-full px-3 py-2 rounded-lg bg-background border border-border text-foreground text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
              />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">
                {t('form.target.outcome')}
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
              {showChanges ? t('form.changes') : t('form.payload')}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs text-muted-foreground mb-1">
                  {t('form.field')}
                </label>
                <input
                  type="text"
                  value={changesField}
                  onChange={(e) => setChangesField(e.target.value)}
                  placeholder={t('form.fieldPlaceholder')}
                  className="w-full px-3 py-2 rounded-lg bg-background border border-border text-foreground text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">
                  {t('form.oldValue')}
                </label>
                <input
                  type="text"
                  value={changesOldValue}
                  onChange={(e) => setChangesOldValue(e.target.value)}
                  placeholder={t('form.valuePlaceholder')}
                  className="w-full px-3 py-2 rounded-lg bg-background border border-border text-foreground text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">
                  {t('form.newValue')}
                </label>
                <input
                  type="text"
                  value={changesNewValue}
                  onChange={(e) => setChangesNewValue(e.target.value)}
                  placeholder={t('form.valuePlaceholder')}
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
            {submitting ? t('form.submitting') : t('form.submit')}
          </button>
          <button
            type="button"
            onClick={resetForm}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-border text-muted-foreground text-sm hover:text-foreground hover:border-primary/30 transition-all"
          >
            <RotateCcw className="w-4 h-4" />
            {t('form.reset')}
          </button>
        </div>
      </form>
    </div>
  )
}
