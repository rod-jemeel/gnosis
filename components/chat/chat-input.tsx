'use client'

/**
 * Chat input with question submission and run cancellation.
 */

import { useState, useCallback, KeyboardEvent } from 'react'
import { PaperPlaneTilt, Spinner, Stop } from '@phosphor-icons/react'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'

interface ChatInputProps {
  onSend: (message: string) => void
  onCancel?: () => void
  running?: boolean
  disabled?: boolean
  placeholder?: string
}

export function ChatInput({ onSend, onCancel, running, disabled, placeholder }: ChatInputProps) {
  const [value, setValue] = useState('')

  const handleSend = useCallback(() => {
    const trimmed = value.trim()
    if (trimmed && !disabled && !running) {
      onSend(trimmed)
      setValue('')
    }
  }, [value, disabled, running, onSend])

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        handleSend()
      }
    },
    [handleSend]
  )

  return (
    <div className="relative flex items-end border border-input bg-background shadow-sm focus-within:border-ring focus-within:ring-1 focus-within:ring-ring">
      <Textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder || 'Ask a question about the documents in scope…'}
        disabled={disabled || running}
        className="max-h-[200px] min-h-[52px] resize-none border-0 pr-12 focus-visible:border-0 focus-visible:ring-0"
        rows={1}
        aria-label="Question"
      />
      {running ? (
        <Button
          onClick={onCancel}
          size="icon"
          variant="outline"
          className="absolute bottom-2 right-2 h-8 w-8 shrink-0"
          title="Cancel this run"
        >
          <Stop size={14} weight="fill" />
        </Button>
      ) : (
        <Button
          onClick={handleSend}
          disabled={disabled || !value.trim()}
          size="icon"
          variant={value.trim() ? 'default' : 'ghost'}
          className="absolute bottom-2 right-2 h-8 w-8 shrink-0"
        >
          {disabled ? (
            <Spinner size={18} className="animate-spin" />
          ) : (
            <PaperPlaneTilt size={18} weight={value.trim() ? 'fill' : 'regular'} />
          )}
        </Button>
      )}
    </div>
  )
}
