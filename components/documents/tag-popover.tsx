'use client'

/**
 * Tag Management Popover
 *
 * Popover for assigning/removing tags on a document.
 * Also allows creating new tags inline.
 */

import { useState, useEffect } from 'react'
import { Tag as TagIcon, Plus, Check, Spinner } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from '@/components/ui/popover'
import { Tag } from '@/lib/types'
import { listTags, createTag, assignTag, removeTag, getDocumentTags } from '@/lib/api'
import { TagBadge } from './tag-badge'
import { cn } from '@/lib/utils'

interface TagPopoverProps {
  documentId: string
  onTagsChange?: () => void
  trigger?: React.ReactNode
}

export function TagPopover({ documentId, onTagsChange, trigger }: TagPopoverProps) {
  const [open, setOpen] = useState(false)
  const [allTags, setAllTags] = useState<Tag[]>([])
  const [documentTags, setDocumentTags] = useState<Tag[]>([])
  const [loading, setLoading] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newTagName, setNewTagName] = useState('')
  const [pendingAction, setPendingAction] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      loadTags()
    }
  }, [open, documentId])

  const loadTags = async () => {
    setLoading(true)
    try {
      const [allResult, docResult] = await Promise.all([
        listTags(),
        getDocumentTags(documentId),
      ])
      setAllTags(allResult.data)
      setDocumentTags(docResult.data)
    } catch (error) {
      console.error('Failed to load tags:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateTag = async () => {
    if (!newTagName.trim()) return
    setCreating(true)
    try {
      const tag = await createTag({ name: newTagName.trim() })
      setAllTags((prev) => [...prev, tag])
      setNewTagName('')
      // Auto-assign to document
      await assignTag(documentId, tag.id)
      setDocumentTags((prev) => [...prev, tag])
      onTagsChange?.()
    } catch (error) {
      console.error('Failed to create tag:', error)
    } finally {
      setCreating(false)
    }
  }

  const handleToggleTag = async (tag: Tag) => {
    const isAssigned = documentTags.some((t) => t.id === tag.id)
    setPendingAction(tag.id)
    try {
      if (isAssigned) {
        await removeTag(documentId, tag.id)
        setDocumentTags((prev) => prev.filter((t) => t.id !== tag.id))
      } else {
        await assignTag(documentId, tag.id)
        setDocumentTags((prev) => [...prev, tag])
      }
      onTagsChange?.()
    } catch (error) {
      console.error('Failed to toggle tag:', error)
    } finally {
      setPendingAction(null)
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={trigger || (
          <Button variant="ghost" size="sm" className="h-8 px-2">
            <TagIcon size={14} className="mr-1" />
            <span className="text-xs">Tags</span>
          </Button>
        )}
      />
      <PopoverContent className="w-64 p-3" align="start">
        <div className="space-y-3">
          <p className="text-xs font-medium text-muted-foreground">Assign tags</p>

          {/* Tag list */}
          {loading ? (
            <div className="flex items-center justify-center py-4">
              <Spinner size={16} className="animate-spin text-muted-foreground" />
            </div>
          ) : allTags.length === 0 ? (
            <p className="text-xs text-muted-foreground py-2">No tags yet. Create one below.</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {allTags.map((tag) => {
                const isAssigned = documentTags.some((t) => t.id === tag.id)
                const isPending = pendingAction === tag.id
                return (
                  <button
                    key={tag.id}
                    onClick={() => handleToggleTag(tag)}
                    disabled={isPending}
                    className={cn(
                      'relative transition-all',
                      isPending && 'opacity-50'
                    )}
                  >
                    <TagBadge tag={tag} size="sm" />
                    {isAssigned && (
                      <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-primary flex items-center justify-center">
                        <Check size={8} weight="bold" className="text-primary-foreground" />
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          )}

          {/* Create new tag */}
          <div className="pt-2 border-t">
            <div className="flex gap-1.5">
              <Input
                placeholder="New tag..."
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
        </div>
      </PopoverContent>
    </Popover>
  )
}
