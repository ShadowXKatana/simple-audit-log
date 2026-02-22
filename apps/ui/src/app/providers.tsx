'use client'

/**
 * Client-side providers wrapper.
 *
 * Any context providers that need 'use client' go here so the root layout
 * can remain a Server Component (needed for <Metadata>).
 */

import { ReactNode } from 'react'
import { ApiProvider } from '@/providers/api-provider'
import { Toaster } from 'sonner'

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ApiProvider>
      {children}
      <Toaster position="top-right" richColors closeButton />
    </ApiProvider>
  )
}
