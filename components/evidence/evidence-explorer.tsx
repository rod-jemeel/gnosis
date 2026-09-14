'use client'

/**
 * Evidence Explorer (spec §6.4, EVD-01/02).
 *
 * Shows the exact stored passage behind a citation: document name,
 * immutable revision, physical PDF page, optional printed page label,
 * and adjacent source context. Evidence identity is stable (E1, E2…)
 * and shared with the chat answer; display numbers are labels only.
 * Location precision is stated honestly — page-level unless an
 * extraction adapter supplied validated coordinates. Viewing evidence
 * never changes the search scope.
 */

import { useMemo } from 'react'
import {
  ArrowLeft,
  FileText,
  Quotes,
  CaretDown,
  CaretUp,
} from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type {
  EvidenceRecord,
  RetrievalDetailsView,
} from '@/lib/v2'

interface EvidenceExplorerProps {
  evidence: EvidenceRecord
  /** Show a back control when opened over a document view. */
  onBack?: () => void
  onShowInDocument?: (evidence: EvidenceRecord) => void
  /** Bounded retrieval diagnostics for the owning run. */
  retrievalDetails?: RetrievalDetailsView | null
  className?: string
}

export function EvidenceExplorer({
  evidence,
  onBack,
  onShowInDocument,
  retrievalDetails,
  className,
}: EvidenceExplorerProps) {
  const adjacent = useMemo(() => {
    if (!evidence.adjacentContext) return null
    if (!evidence.adjacentContext.before && !evidence.adjacentContext.after) return null
    return evidence.adjacentContext
  }, [evidence.adjacentContext])

  return (
    <div className={cn('flex h-full flex-col overflow-auto', className)}>
      <div className="flex items-center gap-2 border-b px-4 py-3">
        {onBack && (
          <Button variant="ghost" size="icon-xs" onClick={onBack} title="Back to evidence">
            <ArrowLeft size={14} />
          </Button>
        )}
        <Quotes size={16} weight="duotone" className="text-primary" />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">Evidence {evidence.evidenceId}</p>
          <p className="text-[10px] text-muted-foreground">
            Stable identity — the same passage, everywhere it appears.
          </p>
        </div>
      </div>

      <div className="flex-1 space-y-4 p-4">
        {/* Source identity */}
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant="secondary" className="gap-1">
            <FileText size={11} />
            {evidence.documentName}
          </Badge>
          <Badge variant="outline">rev {evidence.revisionNumber}</Badge>
          <Badge variant="outline">page {evidence.physicalPage}</Badge>
          {evidence.pageLabel && (
            <Badge variant="outline" title="Printed page label from the source document">
              printed “{evidence.pageLabel}”
            </Badge>
          )}
        </div>

        {/* Exact passage */}
        <figure className="border-l-2 border-primary bg-muted/40 p-3">
          <blockquote className="text-sm leading-relaxed">{evidence.quote}</blockquote>
          <figcaption className="mt-2 text-[10px] text-muted-foreground">
            Exact stored passage from the indexed build — never a generated paraphrase.
          </figcaption>
        </figure>

        {/* Location precision */}
        <p className="text-[10px] leading-relaxed text-muted-foreground">
          {evidence.locationPrecision === 'page'
            ? 'Location precision: page-level. This extraction did not supply validated bounding-box coordinates, so none are shown.'
            : 'Location precision: span-level with validated offsets.'}
        </p>

        {/* Adjacent context */}
        {adjacent && (
          <details className="group border">
            <summary className="flex cursor-pointer items-center gap-1 px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground">
              Adjacent source context
              <CaretDown size={12} className="group-open:hidden" />
              <CaretUp size={12} className="hidden group-open:inline" />
            </summary>
            <div className="space-y-2 border-t px-3 py-2 text-xs leading-relaxed text-muted-foreground">
              {adjacent.before && <p>…{adjacent.before}</p>}
              {adjacent.after && <p>{adjacent.after}…</p>}
            </div>
          </details>
        )}

        {onShowInDocument && (
          <Button variant="outline" size="sm" onClick={() => onShowInDocument(evidence)}>
            <FileText size={14} className="mr-1.5" />
            Show in document (page {evidence.physicalPage})
          </Button>
        )}

        {/* Retrieval details — sanitized, run-scoped */}
        {retrievalDetails && <RetrievalDetails details={retrievalDetails} />}
      </div>
    </div>
  )
}

function RetrievalDetails({ details }: { details: RetrievalDetailsView }) {
  return (
    <details className="group border">
      <summary className="flex cursor-pointer items-center gap-1 px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground">
        Retrieval details ({details.candidates.length} candidates)
        <CaretDown size={12} className="group-open:hidden" />
        <CaretUp size={12} className="hidden group-open:inline" />
      </summary>
      <div className="space-y-3 border-t px-3 py-3">
        <p className="text-[11px] text-muted-foreground">
          Normalized query: “{details.normalizedQuery}”
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[11px]">
            <thead className="text-muted-foreground">
              <tr className="border-b">
                <th className="py-1 pr-2 font-medium">Document</th>
                <th className="py-1 pr-2 font-medium">Dense</th>
                <th className="py-1 pr-2 font-medium">Lexical</th>
                <th className="py-1 pr-2 font-medium">Fusion</th>
                <th className="py-1 pr-2 font-medium">Rerank</th>
                <th className="py-1 font-medium">Selected</th>
              </tr>
            </thead>
            <tbody className="font-mono">
              {details.candidates.slice(0, 12).map((candidate) => (
                <tr key={candidate.chunkId} className="border-b border-border/50">
                  <td className="max-w-[140px] truncate py-1 pr-2 font-sans">
                    {candidate.documentName}
                  </td>
                  <td className="py-1 pr-2">{candidate.denseRank ?? '—'}</td>
                  <td className="py-1 pr-2">{candidate.lexicalRank ?? '—'}</td>
                  <td className="py-1 pr-2">{candidate.fusionScore.toFixed(5)}</td>
                  <td className="py-1 pr-2">{candidate.rerankRank ?? '—'}</td>
                  <td className="py-1">{candidate.selected ? 'yes' : ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-[10px] text-muted-foreground">
          Config: dense top {details.config.denseTopK} · lexical top {details.config.lexicalTopK} ·
          RRF constant {details.config.rrfConstant} · reranker{' '}
          {details.config.reranker ?? 'disabled'} · timings{' '}
          {details.timings.lexicalMs + details.timings.denseMs + details.timings.fusionMs}ms +
          rerank {details.timings.rerankMs}ms
        </p>
      </div>
    </details>
  )
}
