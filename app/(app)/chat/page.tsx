'use client'

import { Suspense } from 'react'
import { ChatView } from '@/components/chat'

export default function NewChatPage() {
  return (
    <Suspense>
      <ChatView />
    </Suspense>
  )
}
