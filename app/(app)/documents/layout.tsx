import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Documents - Gnosis',
  description: 'Upload and manage your PDF documents',
}

export default function DocumentsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
