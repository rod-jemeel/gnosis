'use client'

/**
 * Chat Input Component
 *
 * Text input for sending questions.
 */

import { useState, useCallback, KeyboardEvent } from 'react'
import { PaperPlaneTilt, Spinner } from '@phosphor-icons/react'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'

interface ChatInputProps {
  onSend: (message: string) => void
  disabled?: boolean
  placeholder?: string
}

export function ChatInput({ onSend, disabled, placeholder }: ChatInputProps) {
  const [value, setValue] = useState('')

  const handleSend = useCallback(() => {
    const trimmed = value.trim()
    if (trimmed && !disabled) {
      onSend(trimmed)
      setValue('')
    }
  }, [value, disabled, onSend])

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
    <div className="relative flex items-end border border-input bg-background rounded-lg shadow-sm focus-within:ring-1 focus-within:ring-ring focus-within:border-ring">
      <Textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder || 'Ask a question about your documents...'}
        disabled={disabled}
        className="min-h-[52px] max-h-[200px] resize-none border-0 focus-visible:ring-0 focus-visible:border-0 pr-12 rounded-lg"
        rows={1}
      />
      <Button
        onClick={handleSend}
        disabled={disabled || !value.trim()}
        size="icon"
        variant={value.trim() ? "default" : "ghost"}
        className="absolute right-2 bottom-2 h-8 w-8 shrink-0"
      >
        {disabled ? (
          <Spinner size={18} className="animate-spin" />
        ) : (
          <PaperPlaneTilt size={18} weight={value.trim() ? "fill" : "regular"} />
        )}
      </Button>
    </div>
  )
}
