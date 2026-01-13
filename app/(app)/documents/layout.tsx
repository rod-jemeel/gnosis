import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Documents - AetherCore',
  description: 'Upload and manage your PDF documents',
}

export default function DocumentsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
