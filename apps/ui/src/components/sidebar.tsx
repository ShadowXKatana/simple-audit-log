'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { LayoutDashboard, Send, FileText, Activity, Shield } from 'lucide-react'
import { useTranslations } from 'next-intl'

export function Sidebar() {
  const pathname = usePathname()
  const t = useTranslations('sidebar')

  const navItems = [
    { href: '/', label: t('nav.dashboard'), icon: LayoutDashboard },
    { href: '/send', label: t('nav.sendEvent'), icon: Send },
    { href: '/logs', label: t('nav.logViewer'), icon: FileText },
    { href: '/status', label: t('nav.systemStatus'), icon: Activity },
  ]

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r border-border bg-card/50 backdrop-blur-xl">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-6 border-b border-border">
        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/25">
          <Shield className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-sm font-bold text-foreground">{t('appName')}</h1>
          <p className="text-[10px] text-muted-foreground font-medium tracking-wider uppercase">
            {t('appEnv')}
          </p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href
          const Icon = item.icon

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
                isActive
                  ? 'bg-primary/10 text-primary shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50',
              )}
            >
              <Icon
                className={cn(
                  'w-4 h-4 transition-colors',
                  isActive ? 'text-primary' : 'text-muted-foreground',
                )}
              />
              {item.label}
              {isActive && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary animate-pulse-glow" />
              )}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-border">
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>{t('footer.pipelineActive')}</span>
        </div>
      </div>
    </aside>
  )
}
