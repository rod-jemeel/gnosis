import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Diagnostics - Gnosis',
  description: 'Your answer runs, retrieval details, and lifecycle operations',
}

export default function DiagnosticsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
