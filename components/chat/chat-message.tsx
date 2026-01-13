'use client'

/**
 * Chat Message Component
 *
 * Enhanced AI response rendering inspired by Thesys's generative UI approach.
 * Features rich typography, interactive citations, and structured content display.
 */

import { useState } from 'react'
import {
  User,
  Cube,
  BookOpen,
  ArrowSquareOut,
  CaretDown,
  CaretUp,
  Copy,
  Check,
  Quotes,
  ListBullets,
  TextAa,
} from '@phosphor-icons/react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ChatMessage as ChatMessageType, Citation } from '@/lib/types'
import { cn } from '@/lib/utils'
import ReactMarkdown from 'react-markdown'
import type { Components } from 'react-markdown'

interface ChatMessageProps {
  message: ChatMessageType
  onCitationClick?: (citation: Citation) => void
}

/**
 * Enhanced citation badge with tooltip preview
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
      className="inline-flex items-center mx-0.5 group/cite align-baseline"
      title={`${citation.documentName}, Page ${citation.pageNumber}`}
    >
      <span
        className={cn(
          'inline-flex items-center justify-center',
          'w-5 h-5 text-[10px] font-bold rounded-full',
          'bg-primary/15 text-primary border border-primary/25',
          'hover:bg-primary hover:text-primary-foreground hover:border-primary',
          'hover:scale-110 hover:shadow-md hover:shadow-primary/20',
          'transition-all duration-200 cursor-pointer',
          'translate-y-[-1px]'
        )}
      >
        {citationIndex}
      </span>
    </button>
  )
}

/**
 * Collapsible source card with preview text
 */
function SourceCard({
  citation,
  onCitationClick,
  isExpanded,
}: {
  citation: Citation
  onCitationClick?: (citation: Citation) => void
  isExpanded: boolean
}) {
  const previewText = citation.text?.slice(0, 150) + (citation.text && citation.text.length > 150 ? '...' : '')

  return (
    <button
      onClick={() => onCitationClick?.(citation)}
      className={cn(
        'group/source flex flex-col gap-2 p-3 rounded-lg text-left w-full',
        'bg-background/80 border border-border/60',
        'hover:border-primary/40 hover:bg-primary/5 hover:shadow-sm',
        'transition-all duration-200'
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className={cn(
              'flex items-center justify-center shrink-0',
              'w-6 h-6 text-xs font-bold rounded-full',
              'bg-primary/15 text-primary'
            )}
          >
            {citation.index}
          </span>
          <span className="text-sm font-medium text-foreground truncate">
            {citation.documentName}
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded">
            p.{citation.pageNumber}
          </span>
          <ArrowSquareOut
            size={14}
            className="text-muted-foreground group-hover/source:text-primary transition-colors"
          />
        </div>
      </div>
      {isExpanded && previewText && (
        <p className="text-xs text-muted-foreground leading-relaxed pl-8 border-l-2 border-primary/20">
          {previewText}
        </p>
      )}
    </button>
  )
}

/**
 * Sources section with expand/collapse
 */
function SourcesSection({
  citations,
  onCitationClick,
}: {
  citations: Citation[]
  onCitationClick?: (citation: Citation) => void
}) {
  const [isExpanded, setIsExpanded] = useState(false)
  const displayedCitations = isExpanded ? citations : citations.slice(0, 3)
  const hasMore = citations.length > 3

  return (
    <div className="mt-4 rounded-xl bg-muted/20 border border-border/40 overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <BookOpen size={16} weight="duotone" className="text-primary" />
          <span className="text-sm font-semibold text-foreground">
            Sources
          </span>
          <Badge variant="secondary" className="bg-primary/10 text-primary text-[10px] font-bold px-1.5">
            {citations.length}
          </Badge>
        </div>
        <div className="flex items-center gap-1 text-muted-foreground">
          <span className="text-xs">{isExpanded ? 'Collapse' : 'Expand'}</span>
          {isExpanded ? <CaretUp size={14} /> : <CaretDown size={14} />}
        </div>
      </button>

      {/* Source cards */}
      <div className="px-3 pb-3 space-y-2">
        {displayedCitations.map((citation) => (
          <SourceCard
            key={citation.index}
            citation={citation}
            onCitationClick={onCitationClick}
            isExpanded={isExpanded}
          />
        ))}
        {!isExpanded && hasMore && (
          <button
            onClick={() => setIsExpanded(true)}
            className="w-full py-2 text-xs text-primary hover:text-primary/80 font-medium transition-colors"
          >
            + {citations.length - 3} more sources
          </button>
        )}
      </div>
    </div>
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
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index))
    }

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

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex))
  }

  return parts
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

  if (typeof children === 'string') {
    return parseTextWithCitations(children, citations, onCitationClick)
  }

  return children
}

/**
 * Code block with copy button
 */
function CodeBlock({ children, className }: { children: React.ReactNode; className?: string }) {
  const [copied, setCopied] = useState(false)
  const codeString = String(children).replace(/\n$/, '')
  const language = className?.replace('language-', '') || 'text'

  const handleCopy = () => {
    navigator.clipboard.writeText(codeString)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="relative group my-3 rounded-lg overflow-hidden border border-border/50">
      <div className="flex items-center justify-between px-3 py-1.5 bg-muted/50 border-b border-border/50">
        <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
          {language}
        </span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
        >
          {copied ? (
            <>
              <Check size={12} className="text-emerald-500" />
              <span className="text-emerald-500">Copied</span>
            </>
          ) : (
            <>
              <Copy size={12} />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <pre className="p-3 overflow-x-auto bg-muted/30">
        <code className="text-sm font-mono text-foreground">{codeString}</code>
      </pre>
    </div>
  )
}

/**
 * Render markdown content with enhanced styling and citations
 */
function renderContentWithCitations(
  content: string,
  citations: Citation[] | undefined,
  onCitationClick?: (citation: Citation) => void
): React.ReactNode {
  const components: Components = {
    // Paragraphs with proper spacing
    p: ({ children }) => {
      const processed = processChildren(children, citations, onCitationClick)
      return (
        <p className="mb-4 last:mb-0 leading-7 text-[15px]">
          {processed}
        </p>
      )
    },

    // Bold text
    strong: ({ children }) => {
      const processed = processChildren(children, citations, onCitationClick)
      return <strong className="font-semibold text-foreground">{processed}</strong>
    },

    // Italic text
    em: ({ children }) => {
      const processed = processChildren(children, citations, onCitationClick)
      return <em className="italic">{processed}</em>
    },

    // Unordered lists with custom bullets
    ul: ({ children }) => (
      <ul className="my-4 space-y-2 pl-1">
        {children}
      </ul>
    ),

    // Ordered lists
    ol: ({ children }) => (
      <ol className="my-4 space-y-2 pl-1 list-none counter-reset-item">
        {children}
      </ol>
    ),

    // List items with enhanced styling
    li: ({ children, ...props }) => {
      const processed = processChildren(children, citations, onCitationClick)
      const isOrdered = (props as any).ordered

      return (
        <li className="flex gap-3 text-[15px] leading-7">
          <span className={cn(
            'shrink-0 mt-2',
            isOrdered
              ? 'w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-semibold flex items-center justify-center'
              : 'w-1.5 h-1.5 rounded-full bg-primary/60 mt-[11px]'
          )}>
            {isOrdered && (props as any).index !== undefined ? (props as any).index + 1 : null}
          </span>
          <span className="flex-1">{processed}</span>
        </li>
      )
    },

    // Code - inline and blocks
    code: ({ className, children }) => {
      const isInline = !className

      if (isInline) {
        return (
          <code className="px-1.5 py-0.5 rounded bg-muted text-sm font-mono text-primary">
            {children}
          </code>
        )
      }

      return <CodeBlock className={className}>{children}</CodeBlock>
    },

    // Pre wrapper for code blocks
    pre: ({ children }) => <>{children}</>,

    // Blockquotes with citation styling
    blockquote: ({ children }) => (
      <blockquote className="my-4 pl-4 border-l-2 border-primary/40 bg-primary/5 py-3 pr-4 rounded-r-lg">
        <div className="flex items-start gap-2">
          <Quotes size={16} weight="fill" className="text-primary/60 shrink-0 mt-1" />
          <div className="text-[15px] italic text-muted-foreground leading-7">
            {children}
          </div>
        </div>
      </blockquote>
    ),

    // Headings with clear hierarchy
    h1: ({ children }) => (
      <h1 className="text-xl font-bold mt-6 mb-3 text-foreground flex items-center gap-2">
        <TextAa size={20} className="text-primary" />
        {children}
      </h1>
    ),
    h2: ({ children }) => (
      <h2 className="text-lg font-bold mt-5 mb-2 text-foreground">
        {children}
      </h2>
    ),
    h3: ({ children }) => (
      <h3 className="text-base font-semibold mt-4 mb-2 text-foreground">
        {children}
      </h3>
    ),

    // Links
    a: ({ href, children }) => (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-primary hover:text-primary/80 underline underline-offset-2 transition-colors"
      >
        {children}
      </a>
    ),

    // Horizontal rules
    hr: () => <hr className="my-6 border-border/50" />,

    // Tables
    table: ({ children }) => (
      <div className="my-4 overflow-x-auto rounded-lg border border-border/50">
        <table className="w-full text-sm">{children}</table>
      </div>
    ),
    thead: ({ children }) => (
      <thead className="bg-muted/50 border-b border-border/50">{children}</thead>
    ),
    th: ({ children }) => (
      <th className="px-4 py-2 text-left font-semibold text-foreground">{children}</th>
    ),
    td: ({ children }) => (
      <td className="px-4 py-2 border-t border-border/30">{children}</td>
    ),
  }

  return (
    <ReactMarkdown components={components}>
      {content}
    </ReactMarkdown>
  )
}

export function ChatMessage({ message, onCitationClick }: ChatMessageProps) {
  const isUser = message.role === 'user'

  return (
    <div
      className={cn(
        'flex gap-4 group',
        isUser ? 'flex-row-reverse' : 'flex-row'
      )}
    >
      {/* Avatar */}
      <Avatar
        className={cn(
          'shrink-0 w-10 h-10 ring-2 ring-offset-2 ring-offset-background shadow-sm',
          isUser
            ? 'bg-primary text-primary-foreground ring-primary/20'
            : 'bg-gradient-to-br from-violet-500 to-purple-600 text-white ring-purple-500/20'
        )}
      >
        <AvatarFallback
          className={cn(
            'text-sm font-medium',
            isUser ? 'bg-primary text-primary-foreground' : 'bg-transparent'
          )}
        >
          {isUser ? (
            <User size={20} weight="bold" />
          ) : (
            <Cube size={20} weight="fill" className="text-white" />
          )}
        </AvatarFallback>
      </Avatar>

      {/* Message Content */}
      <div className={cn('flex flex-col gap-1.5 max-w-[85%] min-w-0', isUser && 'items-end')}>
        {/* Sender label */}
        <span className="text-xs font-medium text-muted-foreground px-1">
          {isUser ? 'You' : 'Gnosis'}
        </span>

        {/* Message bubble */}
        <div
          className={cn(
            'rounded-2xl shadow-sm',
            isUser
              ? 'bg-primary text-primary-foreground rounded-br-md px-4 py-3'
              : 'bg-card border border-border/60 rounded-bl-md px-5 py-4'
          )}
        >
          <div
            className={cn(
              'leading-relaxed',
              isUser ? 'text-sm whitespace-pre-wrap' : 'text-foreground'
            )}
          >
            {isUser
              ? message.content
              : renderContentWithCitations(
                  message.content,
                  message.citations,
                  onCitationClick
                )}
          </div>
        </div>

        {/* Enhanced sources section */}
        {!isUser && message.citations && message.citations.length > 0 && (
          <SourcesSection
            citations={message.citations}
            onCitationClick={onCitationClick}
          />
        )}
      </div>
    </div>
  )
}
