'use client'

/**
 * Tag badge — deterministic color from the tag name.
 */

import { X } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'

interface TagBadgeProps {
  name: string
  onClick?: () => void
  onRemove?: () => void
  selected?: boolean
  size?: 'sm' | 'default'
}

const defaultColors = [
  { bg: 'bg-violet-100 dark:bg-violet-950', text: 'text-violet-700 dark:text-violet-300', border: 'border-violet-200 dark:border-violet-800' },
  { bg: 'bg-blue-100 dark:bg-blue-950', text: 'text-blue-700 dark:text-blue-300', border: 'border-blue-200 dark:border-blue-800' },
  { bg: 'bg-emerald-100 dark:bg-emerald-950', text: 'text-emerald-700 dark:text-emerald-300', border: 'border-emerald-200 dark:border-emerald-800' },
  { bg: 'bg-amber-100 dark:bg-amber-950', text: 'text-amber-700 dark:text-amber-300', border: 'border-amber-200 dark:border-amber-800' },
  { bg: 'bg-rose-100 dark:bg-rose-950', text: 'text-rose-700 dark:text-rose-300', border: 'border-rose-200 dark:border-rose-800' },
  { bg: 'bg-cyan-100 dark:bg-cyan-950', text: 'text-cyan-700 dark:text-cyan-300', border: 'border-cyan-200 dark:border-cyan-800' },
]

function getTagColor(name: string) {
  const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
  return defaultColors[hash % defaultColors.length]
}

export function TagBadge({ name, onClick, onRemove, selected, size = 'default' }: TagBadgeProps) {
  const colorClasses = getTagColor(name)

  return (
    <span
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1 border font-medium transition-all',
        size === 'sm' ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-xs',
        onClick && 'cursor-pointer hover:opacity-80',
        selected && 'ring-2 ring-primary ring-offset-1',
        colorClasses.bg,
        colorClasses.text,
        colorClasses.border
      )}
    >
      {name}
      {onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onRemove()
          }}
          className="-mr-0.5 ml-0.5 rounded-full p-0.5 hover:bg-black/10 dark:hover:bg-white/10"
          aria-label={`Remove tag ${name}`}
        >
          <X size={10} weight="bold" />
        </button>
      )}
    </span>
  )
}
