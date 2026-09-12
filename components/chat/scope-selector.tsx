'use client'

/**
 * Search scope selector (spec §6.3, RET-01).
 *
 * The user explicitly chooses "All current documents" or a nonempty
 * selection before asking. An empty selection never silently means
 * "all": clearing the selection returns to the explicit all-current
 * option. The selection stays visible while answering and is disabled
 * during an active run. Opening a citation later does not touch this
 * state (EVD-02).
 */

import { useMemo, useState } from 'react'
import { ListChecks, MagnifyingGlass, Check } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import type { DocumentSummary, SearchScope } from '@/lib/v2'

interface ScopeSelectorProps {
  scope: SearchScope
  documents: DocumentSummary[]
  onChange: (scope: SearchScope) => void
  disabled?: boolean
}

export function ScopeSelector({ scope, documents, onChange, disabled }: ScopeSelectorProps) {
  const [open, setOpen] = useState(false)
  const [filter, setFilter] = useState('')

  const searchable = useMemo(
    () => documents.filter((d) => d.activeBuild?.state === 'ready'),
    [documents]
  )
  const selectedIds =
    scope.type === 'selected_documents' ? new Set(scope.documentIds) : new Set<string>()

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase()
    return q ? searchable.filter((d) => d.title.toLowerCase().includes(q)) : searchable
  }, [searchable, filter])

  const label =
    scope.type === 'all_current'
      ? `All current documents (${searchable.length})`
      : `${selectedIds.size} selected ${selectedIds.size === 1 ? 'document' : 'documents'}`

  const toggleDocument = (id: string) => {
    const next = new Set(selectedIds)
    if (next.has(id)) {
      next.delete(id)
    } else {
      if (next.size >= 50) return
      next.add(id)
    }
    // Deselecting everything falls back to the explicit all-current
    // option rather than an empty (invalid) scope.
    onChange(
      next.size === 0
        ? { type: 'all_current' }
        : { type: 'selected_documents', documentIds: [...next] }
    )
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            size="sm"
            disabled={disabled}
            className="h-7 max-w-[320px] gap-1.5 text-xs font-normal"
          />
        }
      >
        <ListChecks size={14} className="shrink-0 text-primary" />
        <span className="truncate">{label}</span>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <div className="border-b p-2">
          <div className="relative">
            <MagnifyingGlass
              size={14}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Filter documents…"
              className="h-8 pl-8 text-xs"
            />
          </div>
        </div>

        <div className="max-h-72 overflow-auto p-1">
          <button
            type="button"
            onClick={() => onChange({ type: 'all_current' })}
            className={cn(
              'flex w-full items-center gap-2 px-2 py-1.5 text-left text-xs hover:bg-muted',
              scope.type === 'all_current' && 'bg-primary/10'
            )}
          >
            <span className="flex h-4 w-4 items-center justify-center">
              {scope.type === 'all_current' && <Check size={12} weight="bold" className="text-primary" />}
            </span>
            <span className="font-medium">All current documents</span>
            <span className="ml-auto text-muted-foreground">{searchable.length}</span>
          </button>

          {(filtered.length > 0 || filter) && (
            <div className="mt-1 border-t pt-1">
              <p className="px-2 py-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                Or select specific documents
              </p>
              {filtered.map((doc) => {
                const isSelected = selectedIds.has(doc.id)
                return (
                  <button
                    key={doc.id}
                    type="button"
                    onClick={() => toggleDocument(doc.id)}
                    className="flex w-full items-center gap-2 px-2 py-1.5 text-left text-xs hover:bg-muted"
                  >
                    <span
                      className={cn(
                        'flex h-4 w-4 shrink-0 items-center justify-center border',
                        isSelected ? 'border-primary bg-primary text-primary-foreground' : 'border-input'
                      )}
                    >
                      {isSelected && <Check size={10} weight="bold" />}
                    </span>
                    <span className="truncate">{doc.title}</span>
                    {doc.activeVersion && (
                      <span className="ml-auto shrink-0 text-[10px] text-muted-foreground">
                        rev {doc.activeVersion.revisionNumber}
                      </span>
                    )}
                  </button>
                )
              })}
              {filtered.length === 0 && (
                <p className="px-2 py-2 text-xs text-muted-foreground">No documents match.</p>
              )}
            </div>
          )}
        </div>

        {scope.type === 'selected_documents' && (
          <div className="border-t px-3 py-2 text-[10px] text-muted-foreground">
            The question will search only the {selectedIds.size} selected{' '}
            {selectedIds.size === 1 ? 'document' : 'documents'}.
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}
