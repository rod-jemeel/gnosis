'use client'

/**
 * Chat Message Component
 *
 * Displays a single chat message with citation links and markdown rendering.
 */

import { User, Robot, BookOpen, ArrowSquareOut } from '@phosphor-icons/react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { ChatMessage as ChatMessageType, Citation } from '@/lib/types'
import { cn } from '@/lib/utils'
import ReactMarkdown from 'react-markdown'
import type { Components } from 'react-markdown'

interface ChatMessageProps {
  message: ChatMessageType
  onCitationClick?: (citation: Citation) => void
}

/**
 * Create citation badge component
 */
function CitationBadge({
  citation,
  citationIndex,
  onCitationClick,
}: {
  citation: Citation
  citationIndex: number
  onCitationClick?: (citation: Citation) => void
}) {
  return (
    <button
      onClick={() => onCitationClick?.(citation)}
      className="inline-flex items-center mx-0.5 group/cite"
      title={`${citation.documentName}, Page ${citation.pageNumber}`}
    >
      <Badge
        variant="secondary"
        className={cn(
          'cursor-pointer transition-all duration-200',
          'bg-primary/10 text-primary border border-primary/20',
          'hover:bg-primary hover:text-primary-foreground hover:scale-105',
          'text-[10px] font-semibold px-1.5 py-0'
        )}
      >
        {citationIndex}
      </Badge>
    </button>
  )
}

/**
 * Parse text and replace [C1], [C2] with citation badges
 */
function parseTextWithCitations(
  text: string,
  citations: Citation[] | undefined,
  onCitationClick?: (citation: Citation) => void
): React.ReactNode[] {
  if (!citations || citations.length === 0) {
    return [text]
  }

  const parts: React.ReactNode[] = []
  const citationPattern = /\[C(\d+)\]/g
  let lastIndex = 0
  let match

  while ((match = citationPattern.exec(text)) !== null) {
    // Add text before citation
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index))
    }

    // Find the citation
    const citationIndex = parseInt(match[1], 10)
    const citation = citations.find((c) => c.index === citationIndex)

    if (citation) {
      parts.push(
        <CitationBadge
          key={`citation-${match.index}`}
          citation={citation}
          citationIndex={citationIndex}
          onCitationClick={onCitationClick}
        />
      )
    } else {
      parts.push(match[0])
    }

    lastIndex = match.index + match[0].length
  }

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex))
  }

  return parts
}

/**
 * Render markdown content with citation badges
 */
function renderContentWithCitations(
  content: string,
  citations: Citation[] | undefined,
  onCitationClick?: (citation: Citation) => void
): React.ReactNode {
  // Custom markdown components that preserve citation parsing
  const components: Components = {
    // Override paragraph to handle citations
    p: ({ children }) => {
      const processed = processChildren(children, citations, onCitationClick)
      return <p className="mb-3 last:mb-0">{processed}</p>
    },
    // Override strong (bold) to handle citations
    strong: ({ children }) => {
      const processed = processChildren(children, citations, onCitationClick)
      return <strong className="font-semibold">{processed}</strong>
    },
    // Override em (italic)
    em: ({ children }) => {
      const processed = processChildren(children, citations, onCitationClick)
      return <em>{processed}</em>
    },
    // Lists
    ul: ({ children }) => (
      <ul className="list-disc list-inside mb-3 space-y-1">{children}</ul>
    ),
    ol: ({ children }) => (
      <ol className="list-decimal list-inside mb-3 space-y-1">{children}</ol>
    ),
    li: ({ children }) => {
      const processed = processChildren(children, citations, onCitationClick)
      return <li className="leading-relaxed">{processed}</li>
    },
    // Code blocks
    code: ({ className, children }) => {
      const isInline = !className
      if (isInline) {
        return (
          <code className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono">
            {children}
          </code>
        )
      }
      return (
        <code className={cn('block bg-muted p-3 rounded-lg text-sm font-mono overflow-x-auto', className)}>
          {children}
        </code>
      )
    },
    // Headings
    h1: ({ children }) => <h1 className="text-xl font-bold mb-2">{children}</h1>,
    h2: ({ children }) => <h2 className="text-lg font-bold mb-2">{children}</h2>,
    h3: ({ children }) => <h3 className="text-base font-semibold mb-2">{children}</h3>,
  }

  return (
    <ReactMarkdown components={components}>
      {content}
    </ReactMarkdown>
  )
}

/**
 * Process React children to extract text and add citation badges
 */
function processChildren(
  children: React.ReactNode,
  citations: Citation[] | undefined,
  onCitationClick?: (citation: Citation) => void
): React.ReactNode {
  if (!children) return children

  // Handle array of children
  if (Array.isArray(children)) {
    return children.map((child, index) => {
      if (typeof child === 'string') {
        return (
          <span key={index}>
            {parseTextWithCitations(child, citations, onCitationClick)}
          </span>
        )
      }
      return child
    })
  }

  // Handle single string child
  if (typeof children === 'string') {
    return parseTextWithCitations(children, citations, onCitationClick)
  }

  return children
}

export function ChatMessage({ message, onCitationClick }: ChatMessageProps) {
  const isUser = message.role === 'user'

  return (
    <div
      className={cn(
        'flex gap-3 group',
        isUser ? 'flex-row-reverse' : 'flex-row'
      )}
    >
      {/* Avatar */}
      <Avatar className={cn(
        'shrink-0 w-9 h-9 ring-2 ring-offset-2 ring-offset-background',
        isUser
          ? 'bg-primary text-primary-foreground ring-primary/20'
          : 'bg-gradient-to-br from-violet-500 to-purple-600 text-white ring-purple-500/20'
      )}>
        <AvatarFallback className={cn(
          'text-sm font-medium',
          isUser ? 'bg-primary text-primary-foreground' : 'bg-transparent'
        )}>
          {isUser ? <User size={18} weight="bold" /> : <Robot size={18} weight="bold" />}
        </AvatarFallback>
      </Avatar>

      {/* Message Content */}
      <div className={cn('flex flex-col gap-1 max-w-[80%]', isUser && 'items-end')}>
        {/* Sender label */}
        <span className="text-xs font-medium text-muted-foreground px-1">
          {isUser ? 'You' : 'AetherCore'}
        </span>

        {/* Message bubble */}
        <div
          className={cn(
            'rounded-2xl px-4 py-3 shadow-sm',
            isUser
              ? 'bg-primary text-primary-foreground rounded-br-md'
              : 'bg-muted/50 border border-border/50 rounded-bl-md'
          )}
        >
          <div className={cn(
            'text-sm leading-relaxed whitespace-pre-wrap',
            !isUser && 'text-foreground'
          )}>
            {isUser
              ? message.content
              : renderContentWithCitations(
                  message.content,
                  message.citations,
                  onCitationClick
                )}
          </div>
        </div>

        {/* Citation list for assistant messages */}
        {!isUser && message.citations && message.citations.length > 0 && (
          <div className="mt-2 p-3 rounded-xl bg-muted/30 border border-border/50 max-w-full">
            <div className="flex items-center gap-2 mb-2">
              <BookOpen size={14} className="text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground">
                Sources ({message.citations.length})
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {message.citations.map((citation) => (
                <button
                  key={citation.index}
                  onClick={() => onCitationClick?.(citation)}
                  className={cn(
                    'group/source flex items-center gap-2 px-3 py-1.5 rounded-lg',
                    'bg-background border border-border/50',
                    'hover:border-primary/30 hover:bg-primary/5',
                    'transition-all duration-200'
                  )}
                  title={citation.text}
                >
                  <Badge
                    variant="secondary"
                    className="bg-primary/10 text-primary text-[10px] px-1.5 py-0 font-bold"
                  >
                    {citation.index}
                  </Badge>
                  <span className="text-xs text-muted-foreground group-hover/source:text-foreground transition-colors truncate max-w-[150px]">
                    {citation.documentName}
                  </span>
                  <span className="text-xs font-medium text-primary">
                    p.{citation.pageNumber}
                  </span>
                  <ArrowSquareOut
                    size={12}
                    className="text-muted-foreground group-hover/source:text-primary transition-colors"
                  />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
