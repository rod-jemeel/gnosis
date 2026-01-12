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
import { sendQuestion, listDocuments } from '@/lib/api'
import { ChatMessage as ChatMessageType, Citation, Document } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  X,
  FilePdf,
  MagnifyingGlass,
  Sparkle,
  CaretDown,
} from '@phosphor-icons/react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/lib/auth'

function ChatPageContent() {
  const searchParams = useSearchParams()
  const initialDocumentId = searchParams.get('documentId')
  const { workspaceId, loading: authLoading } = useAuth()

  const [messages, setMessages] = useState<ChatMessageType[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(
    initialDocumentId
  )
  const [documents, setDocuments] = useState<Document[]>([])
  const [documentsLoading, setDocumentsLoading] = useState(true)

  const pdfViewerRef = useRef<PdfViewerRef>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Load documents
  useEffect(() => {
    if (!authLoading && workspaceId) {
      setDocumentsLoading(true)
      listDocuments()
        .then((res) => setDocuments(res.documents.filter(d => d.status === 'ready')))
        .catch(console.error)
        .finally(() => setDocumentsLoading(false))
    }
  }, [authLoading, workspaceId])

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSendMessage = useCallback(
    async (question: string) => {
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

        const assistantMessage: ChatMessageType = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: response.answer,
          citations: response.citations,
          timestamp: new Date(),
        }
        setMessages((prev) => [...prev, assistantMessage])

        if (response.citations.length > 0 && pdfViewerRef.current) {
          const firstCitation = response.citations[0]
          if (!selectedDocumentId || selectedDocumentId === firstCitation.documentId) {
            setSelectedDocumentId(firstCitation.documentId)
          }
        }
      } catch (error) {
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
    setSelectedDocumentId(citation.documentId)
    setTimeout(() => {
      pdfViewerRef.current?.goToPage(citation.pageNumber)
    }, 100)
  }, [])

  const selectedDocument = documents.find(d => d.id === selectedDocumentId)

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Chat Panel */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Document Selector Header */}
        <div className="h-12 px-4 border-b flex items-center gap-3 shrink-0 bg-background">
          <div className="flex items-center gap-2 w-[280px] h-8 px-2.5 border border-input rounded-none text-xs bg-transparent">
            {selectedDocumentId ? (
              <FilePdf size={14} weight="fill" className="text-primary shrink-0" />
            ) : (
              <MagnifyingGlass size={14} className="shrink-0" />
            )}
            <Select
              value={selectedDocumentId || 'all'}
              onValueChange={(value) => setSelectedDocumentId(value === 'all' ? null : value)}
            >
              <SelectTrigger className="h-full border-0 px-0 w-full focus-visible:ring-0">
                <span className="truncate">
                  {selectedDocumentId
                    ? selectedDocument?.name || 'Loading...'
                    : 'All Documents'}
                </span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  <MagnifyingGlass size={14} />
                  <span>All Documents</span>
                </SelectItem>
                {documentsLoading ? (
                  <div className="p-2">
                    <Skeleton className="h-6 w-full" />
                  </div>
                ) : (
                  documents.map((doc) => (
                    <SelectItem key={doc.id} value={doc.id}>
                      <FilePdf size={14} weight="duotone" />
                      <span className="truncate max-w-[200px]">{doc.name}</span>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {selectedDocumentId && (
            <div className="flex items-center gap-1.5 px-2 py-1 bg-primary/10 text-primary text-xs font-medium">
              <FilePdf size={12} weight="fill" />
              <span>Focused</span>
            </div>
          )}
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1">
          <div className="max-w-3xl mx-auto px-4 md:px-6 py-4 md:py-6 space-y-6">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-14 h-14 bg-primary/10 flex items-center justify-center mb-6">
                  <Sparkle size={28} className="text-primary" weight="duotone" />
                </div>
                <h2 className="text-lg font-semibold mb-2">
                  Ask anything about your documents
                </h2>
                <p className="text-sm text-muted-foreground max-w-md">
                  {selectedDocumentId
                    ? 'Questions will be answered using the selected document with precise page citations.'
                    : 'Questions will search across all your documents. Select a specific document to focus.'}
                </p>
                <div className="flex flex-wrap gap-2 mt-6 justify-center">
                  {[
                    'Summarize this document',
                    'What are the key points?',
                    'What is this document about?',
                  ].map((suggestion) => (
                    <button
                      key={suggestion}
                      onClick={() => handleSendMessage(suggestion)}
                      disabled={isLoading}
                      className="px-3 py-1.5 bg-muted text-xs text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {messages.map((message) => (
                  <ChatMessage
                    key={message.id}
                    message={message}
                    onCitationClick={handleCitationClick}
                  />
                ))}
                {/* Loading skeleton while AI is thinking */}
                {isLoading && (
                  <div className="flex gap-3">
                    <div className="shrink-0 w-9 h-9 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                      <Sparkle size={18} className="text-white" weight="bold" />
                    </div>
                    <div className="flex flex-col gap-1 max-w-[80%]">
                      <span className="text-xs font-medium text-muted-foreground px-1">
                        AetherCore
                      </span>
                      <div className="rounded-2xl px-4 py-3 bg-muted/50 border border-border/50 rounded-bl-md">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <div className="flex gap-1">
                              <span className="w-2 h-2 bg-primary/60 rounded-full animate-bounce [animation-delay:-0.3s]" />
                              <span className="w-2 h-2 bg-primary/60 rounded-full animate-bounce [animation-delay:-0.15s]" />
                              <span className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" />
                            </div>
                            <span className="text-sm text-muted-foreground">Thinking...</span>
                          </div>
                          <Skeleton className="h-4 w-[250px]" />
                          <Skeleton className="h-4 w-[200px]" />
                          <Skeleton className="h-4 w-[180px]" />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Input */}
        <div className="bg-background pb-4">
          <div className="max-w-3xl mx-auto px-4">
            <ChatInput onSend={handleSendMessage} disabled={isLoading} />
          </div>
        </div>
      </div>

      {/* PDF Viewer Panel */}
      {selectedDocumentId && (
        <div className="w-[45%] border-l flex flex-col bg-muted/5">
          <div className="h-12 px-4 border-b flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <FilePdf size={16} className="text-primary shrink-0" weight="fill" />
              <span className="text-xs font-medium truncate">
                {selectedDocument?.name || 'PDF Viewer'}
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedDocumentId(null)}
              className="h-7 w-7 p-0"
            >
              <X size={14} />
            </Button>
          </div>
          <div className="flex-1 overflow-hidden">
            <PdfViewer
              ref={pdfViewerRef}
              documentId={selectedDocumentId}
              className="h-full"
            />
          </div>
        </div>
      )}
    </div>
  )
}

export default function ChatPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen">
          <div className="flex-1 flex flex-col">
            <div className="h-12 px-4 border-b flex items-center">
              <Skeleton className="h-8 w-[280px]" />
            </div>
            <div className="flex-1 flex items-center justify-center">
              <Skeleton className="w-14 h-14" />
            </div>
          </div>
        </div>
      }
    >
      <ChatPageContent />
    </Suspense>
  )
}
