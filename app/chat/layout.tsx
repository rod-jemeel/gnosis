import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Chat - AetherCore',
  description: 'Ask questions about your PDF documents',
}

export default function ChatLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
