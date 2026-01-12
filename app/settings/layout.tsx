import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Settings - AetherCore',
  description: 'Configure your API keys and preferences',
}

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
