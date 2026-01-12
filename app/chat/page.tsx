'use client'

/**
 * Chat Page
 *
 * RAG Q&A interface with PDF viewer and citation navigation.
 */

import { useState, useCallback, useRef, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { ChatMessage, ChatInput } from '@/components/chat'
import { PdfViewer, PdfViewerRef } from '@/components/pdf'
import { DocumentList } from '@/components/documents'
import { sendQuestion } from '@/lib/api'
import { ChatMessage as ChatMessageType, Citation, Document } from '@/lib/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { X, SidebarSimple } from '@phosphor-icons/react'

function ChatPageContent() {
  const searchParams = useSearchParams()
  const initialDocumentId = searchParams.get('documentId')

  const [messages, setMessages] = useState<ChatMessageType[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(
    initialDocumentId
  )
  const [showSidebar, setShowSidebar] = useState(true)

  const pdfViewerRef = useRef<PdfViewerRef>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSendMessage = useCallback(
    async (question: string) => {
      // Add user message
      const userMessage: ChatMessageType = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: question,
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, userMessage])
      setIsLoading(true)

      try {
        const response = await sendQuestion({
          question,
          documentIds: selectedDocumentId ? [selectedDocumentId] : undefined,
        })

        // Add assistant message
        const assistantMessage: ChatMessageType = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: response.answer,
          citations: response.citations,
          timestamp: new Date(),
        }
        setMessages((prev) => [...prev, assistantMessage])

        // If there are citations and a viewer, navigate to the first citation
        if (response.citations.length > 0 && pdfViewerRef.current) {
          const firstCitation = response.citations[0]
          if (!selectedDocumentId || selectedDocumentId === firstCitation.documentId) {
            setSelectedDocumentId(firstCitation.documentId)
          }
        }
      } catch (error) {
        // Add error message
        const errorMessage: ChatMessageType = {
          id: `error-${Date.now()}`,
          role: 'assistant',
          content:
            error instanceof Error
              ? `Error: ${error.message}`
              : 'Sorry, something went wrong. Please try again.',
          timestamp: new Date(),
        }
        setMessages((prev) => [...prev, errorMessage])
      } finally {
        setIsLoading(false)
      }
    },
    [selectedDocumentId]
  )

  const handleCitationClick = useCallback((citation: Citation) => {
    // Update selected document if different
    setSelectedDocumentId(citation.documentId)

    // Navigate to page after a short delay to allow document to load
    setTimeout(() => {
      pdfViewerRef.current?.goToPage(citation.pageNumber)
    }, 100)
  }, [])

  const handleSelectDocument = useCallback((documentId: string) => {
    setSelectedDocumentId(documentId)
  }, [])

  return (
    <div className="flex h-[calc(100vh-3.5rem)]">
      {/* Sidebar - Document Selection */}
      {showSidebar && (
        <aside className="w-80 border-r bg-muted/30 flex flex-col">
          <div className="p-4 border-b flex items-center justify-between">
            <h2 className="font-semibold">Documents</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSidebar(false)}
            >
              <X size={16} />
            </Button>
          </div>
          <div className="flex-1 overflow-auto p-4">
            <DocumentList
              onChatDocument={handleSelectDocument}
            />
          </div>
        </aside>
      )}

      {/* Main Content */}
      <div className="flex-1 flex">
        {/* Chat Panel */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          <div className="p-4 border-b flex items-center gap-2">
            {!showSidebar && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowSidebar(true)}
              >
                <SidebarSimple size={20} />
              </Button>
            )}
            <h1 className="font-semibold">Chat</h1>
            {selectedDocumentId && (
              <span className="text-sm text-muted-foreground">
                - Focused on selected document
              </span>
            )}
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-auto p-4 space-y-4">
            {messages.length === 0 ? (
              <div className="text-center text-muted-foreground py-12">
                <p className="text-lg mb-2">Ask a question about your documents</p>
                <p className="text-sm">
                  {selectedDocumentId
                    ? 'Questions will be answered using the selected document.'
                    : 'Questions will search across all your documents.'}
                </p>
              </div>
            ) : (
              messages.map((message) => (
                <ChatMessage
                  key={message.id}
                  message={message}
                  onCitationClick={handleCitationClick}
                />
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 border-t">
            <ChatInput onSend={handleSendMessage} disabled={isLoading} />
          </div>
        </div>

        {/* PDF Viewer Panel */}
        {selectedDocumentId && (
          <div className="w-1/2 border-l flex flex-col">
            <div className="p-4 border-b flex items-center justify-between">
              <h2 className="font-semibold text-sm">PDF Viewer</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedDocumentId(null)}
              >
                <X size={16} />
              </Button>
            </div>
            <div className="flex-1">
              <PdfViewer
                ref={pdfViewerRef}
                documentId={selectedDocumentId}
                className="h-full"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function ChatPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-screen">Loading...</div>}>
      <ChatPageContent />
    </Suspense>
  )
}
