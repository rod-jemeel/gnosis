'use client'

import { use } from 'react'
import { ChatView } from '@/components/chat'

export default function SessionChatPage({
  params,
}: {
  params: Promise<{ sessionId: string }>
}) {
  const { sessionId } = use(params)
  return <ChatView sessionId={sessionId} />
}
