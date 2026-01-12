'use client'

/**
 * Tag Filter Component
 *
 * Filter bar with tag chips for the Documents page.
 */

import { useState } from 'react'
import { Plus, X, Spinner } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from '@/components/ui/popover'
import { Tag } from '@/lib/types'
import { createTag } from '@/lib/api'
import { cn } from '@/lib/utils'

interface TagFilterProps {
  tags: Tag[]
  selectedTagId: string | null
  onTagSelect: (tagId: string | null) => void
  onTagCreated?: (tag: Tag) => void
  loading?: boolean
}

export function TagFilter({ tags, selectedTagId, onTagSelect, onTagCreated, loading }: TagFilterProps) {
  const [createOpen, setCreateOpen] = useState(false)
  const [newTagName, setNewTagName] = useState('')
  const [creating, setCreating] = useState(false)

  const handleCreateTag = async () => {
    if (!newTagName.trim()) return
    setCreating(true)
    try {
      const tag = await createTag({ name: newTagName.trim() })
      onTagCreated?.(tag)
      setNewTagName('')
      setCreateOpen(false)
      // Auto-select new tag
      onTagSelect(tag.id)
    } catch (error) {
      console.error('Failed to create tag:', error)
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* All documents chip */}
      <button
        onClick={() => onTagSelect(null)}
        className={cn(
          'px-3 py-1 text-xs font-medium transition-all border',
          selectedTagId === null
            ? 'bg-primary text-primary-foreground border-primary'
            : 'bg-secondary text-secondary-foreground border-transparent hover:bg-secondary/80'
        )}
      >
        All
      </button>

      {/* Tag chips */}
      {loading ? (
        <div className="flex items-center gap-1.5 px-3 py-1 text-xs text-muted-foreground">
          <Spinner size={12} className="animate-spin" />
          <span>Loading tags...</span>
        </div>
      ) : (
        tags.map((tag) => (
          <button
            key={tag.id}
            onClick={() => onTagSelect(tag.id === selectedTagId ? null : tag.id)}
            className={cn(
              'px-3 py-1 text-xs font-medium transition-all border flex items-center gap-1.5',
              tag.id === selectedTagId
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-secondary text-secondary-foreground border-transparent hover:bg-secondary/80'
            )}
          >
            {tag.name}
            {tag.documentCount !== undefined && tag.documentCount > 0 && (
              <span className={cn(
                'text-[10px] px-1 rounded-full',
                tag.id === selectedTagId
                  ? 'bg-primary-foreground/20'
                  : 'bg-foreground/10'
              )}>
                {tag.documentCount}
              </span>
            )}
            {tag.id === selectedTagId && (
              <X size={10} weight="bold" className="ml-0.5" />
            )}
          </button>
        ))
      )}

      {/* Create tag button */}
      <Popover open={createOpen} onOpenChange={setCreateOpen}>
        <PopoverTrigger
          render={
            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-muted-foreground">
              <Plus size={12} className="mr-1" />
              New Tag
            </Button>
          }
        />
        <PopoverContent className="w-56 p-3" align="start">
          <div className="space-y-2">
            <p className="text-xs font-medium">Create new tag</p>
            <div className="flex gap-1.5">
              <Input
                placeholder="Tag name..."
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreateTag()}
                className="h-7 text-xs"
                disabled={creating}
              />
              <Button
                size="sm"
                className="h-7 px-2"
                onClick={handleCreateTag}
                disabled={!newTagName.trim() || creating}
              >
                {creating ? <Spinner size={12} className="animate-spin" /> : <Plus size={12} />}
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}
