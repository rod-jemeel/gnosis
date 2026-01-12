'use client'

/**
 * Chat Message Component
 *
 * Displays a single chat message with citation links.
 */

import { User, Robot } from '@phosphor-icons/react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ChatMessage as ChatMessageType, Citation } from '@/lib/types'
import { cn } from '@/lib/utils'

interface ChatMessageProps {
  message: ChatMessageType
  onCitationClick?: (citation: Citation) => void
}

/**
 * Parse message content and replace [C1], [C2] with clickable badges
 */
function renderContentWithCitations(
  content: string,
  citations: Citation[] | undefined,
  onCitationClick?: (citation: Citation) => void
): React.ReactNode[] {
  if (!citations || citations.length === 0) {
    return [content]
  }

  const parts: React.ReactNode[] = []
  const citationPattern = /\[C(\d+)\]/g
  let lastIndex = 0
  let match

  while ((match = citationPattern.exec(content)) !== null) {
    // Add text before citation
    if (match.index > lastIndex) {
      parts.push(content.slice(lastIndex, match.index))
    }

    // Find the citation
    const citationIndex = parseInt(match[1], 10)
    const citation = citations.find((c) => c.index === citationIndex)

    if (citation) {
      parts.push(
        <button
          key={`citation-${match.index}`}
          onClick={() => onCitationClick?.(citation)}
          className="inline-flex items-center"
          title={`${citation.documentName}, Page ${citation.pageNumber}`}
        >
          <Badge
            variant="secondary"
            className="mx-0.5 cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors text-xs"
          >
            {citationIndex}
          </Badge>
        </button>
      )
    } else {
      parts.push(match[0])
    }

    lastIndex = match.index + match[0].length
  }

  // Add remaining text
  if (lastIndex < content.length) {
    parts.push(content.slice(lastIndex))
  }

  return parts
}

export function ChatMessage({ message, onCitationClick }: ChatMessageProps) {
  const isUser = message.role === 'user'

  return (
    <div
      className={cn(
        'flex gap-3',
        isUser ? 'flex-row-reverse' : 'flex-row'
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          'shrink-0 w-8 h-8 rounded-full flex items-center justify-center',
          isUser ? 'bg-primary text-primary-foreground' : 'bg-muted'
        )}
      >
        {isUser ? <User size={18} /> : <Robot size={18} />}
      </div>

      {/* Message */}
      <Card
        className={cn(
          'max-w-[80%]',
          isUser ? 'bg-primary text-primary-foreground' : 'bg-muted'
        )}
      >
        <CardContent className="p-3">
          <div className="text-sm whitespace-pre-wrap">
            {isUser
              ? message.content
              : renderContentWithCitations(
                  message.content,
                  message.citations,
                  onCitationClick
                )}
          </div>

          {/* Citation list for assistant messages */}
          {!isUser && message.citations && message.citations.length > 0 && (
            <div className="mt-3 pt-3 border-t border-border/50">
              <p className="text-xs text-muted-foreground mb-2">Sources:</p>
              <div className="flex flex-wrap gap-1">
                {message.citations.map((citation) => (
                  <button
                    key={citation.index}
                    onClick={() => onCitationClick?.(citation)}
                    className="text-xs bg-background/50 hover:bg-background px-2 py-1 rounded transition-colors"
                    title={citation.text}
                  >
                    [{citation.index}] {citation.documentName}, p.{citation.pageNumber}
                  </button>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
