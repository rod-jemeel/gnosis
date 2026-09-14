'use client'

/**
 * Strict-mode run status timeline (spec §6.3).
 *
 * Shows real pipeline stages as they happen. Status events stream in
 * real time, but the UI does not imply token-by-token drafting: in
 * strict mode the substantive answer appears only after validation.
 */

import { Check, Spinner } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'
import type { RunEventType } from '@/lib/v2'

const STAGES: { event: RunEventType; label: string }[] = [
  { event: 'run.queued', label: 'Queued' },
  { event: 'run.started', label: 'Analyzing question' },
  { event: 'retrieval.completed', label: 'Retrieving evidence' },
  { event: 'answer.checking', label: 'Validating claims' },
  { event: 'answer.final', label: 'Finalizing answer' },
]

interface RunStatusProps {
  seenEvents: RunEventType[]
  className?: string
}

export function RunStatus({ seenEvents, className }: RunStatusProps) {
  const seen = new Set(seenEvents)
  const currentIndex = STAGES.findIndex((s, i) => {
    const next = STAGES[i + 1]
    return seen.has(s.event) && (!next || !seen.has(next.event))
  })

  return (
    <div className={cn('space-y-2', className)} aria-live="polite">
      <ol className="space-y-1.5">
        {STAGES.map((stage, index) => {
          const done = seen.has(stage.event)
          const active = index === currentIndex && stage.event !== 'answer.final'
          return (
            <li key={stage.event} className="flex items-center gap-2 text-xs">
              <span
                className={cn(
                  'flex h-4 w-4 shrink-0 items-center justify-center',
                  done
                    ? 'bg-primary text-primary-foreground'
                    : 'border border-input text-muted-foreground'
                )}
              >
                {done && stage.event !== 'answer.final' ? (
                  <Check size={10} weight="bold" />
                ) : done ? (
                  <Check size={10} weight="bold" />
                ) : active ? (
                  <Spinner size={10} className="animate-spin" />
                ) : null}
              </span>
              <span className={cn(done || active ? 'text-foreground' : 'text-muted-foreground')}>
                {stage.label}
              </span>
            </li>
          )
        })}
      </ol>
      <p className="text-[10px] text-muted-foreground">
        Strict evidence mode — the answer is shown only after every claim is checked against
        retrieved passages.
      </p>
    </div>
  )
}
