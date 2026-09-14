/**
 * Demo retrieval and answer engine.
 *
 * A faithful structural simulation of the strict evidence pipeline:
 * lexical + dense candidate retrieval, reciprocal-rank fusion, optional
 * reranking, scope enforcement, and extractive answer synthesis. The
 * generator is extractive by construction — every claim is an exact
 * sentence from a retrieved, authorized chunk — so no citation can be
 * fabricated. Outcomes are classified honestly, including calibrated
 * abstention when the corpus cannot answer.
 */

import { CONFLICT_GROUPS, DEMO_EXPECTATIONS } from './corpus'
import { seededRandom } from './store'
import type {
  AnswerClaim,
  EvidenceRecord,
  RetrievalCandidateView,
  RetrievalDetailsView,
  SearchScope,
  SourceConflict,
} from '../types'
import type { DemoBuild, DemoDocument, DemoState, DemoStoredVersion } from './store'

/* ------------------------------------------------------------------ */
/* Tokenization and term matching                                      */
/* ------------------------------------------------------------------ */

const STOPWORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'if', 'then', 'else', 'for', 'to',
  'of', 'in', 'on', 'at', 'by', 'with', 'from', 'as', 'is', 'are', 'was',
  'were', 'be', 'been', 'being', 'am', 'do', 'does', 'did', 'done', 'have',
  'has', 'had', 'will', 'would', 'shall', 'should', 'can', 'could', 'may',
  'might', 'must', 'i', 'you', 'he', 'she', 'we', 'they', 'me', 'him', 'her',
  'us', 'them', 'my', 'your', 'his', 'its', 'our', 'their', 'this', 'that',
  'these', 'those', 'there', 'here', 'what', 'which', 'who', 'whom', 'whose',
  'when', 'where', 'why', 'how', 'all', 'any', 'both', 'each', 'few', 'more',
  'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same',
  'so', 'than', 'too', 'very', 'just', 'about', 'into', 'over', 'under',
  'again', 'also', 'get', 'got', 'let', 'like', 'make', 'made', 'want',
  'long', 'much', 'many', 'often', 'take', 'takes', 'using', 'use', 'used',
  'please', 'tell', 'show', 'give', 'find', 'see', 'say', 'said',
])

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length >= 2 && !STOPWORDS.has(t))
}

function trigrams(term: string): Set<string> {
  const padded = `_${term}_`
  const grams = new Set<string>()
  for (let i = 0; i + 3 <= padded.length; i++) {
    grams.add(padded.slice(i, i + 3))
  }
  return grams
}

/** Terms match exactly or by trigram similarity (light stemming effect). */
function termsMatch(a: string, b: string): boolean {
  if (a === b) return true
  if (a.length < 4 || b.length < 4) return false
  const ga = trigrams(a)
  const gb = trigrams(b)
  let shared = 0
  for (const g of ga) if (gb.has(g)) shared++
  return shared / (ga.size + gb.size - shared) >= 0.45
}

/* ------------------------------------------------------------------ */
/* Scope resolution                                                    */
/* ------------------------------------------------------------------ */

interface ScopedChunk {
  document: DemoDocument
  version: DemoStoredVersion
  build: DemoBuild
  chunkIndex: number
  page: number
  text: string
}

export function resolveScopedChunks(
  state: DemoState,
  scope: SearchScope
): { chunks: ScopedChunk[]; missingDocumentIds: string[] } {
  const missing: string[] = []
  const chunks: ScopedChunk[] = []

  const eligible = state.documents.filter((doc) => {
    if (doc.lifecycle !== 'active' || !doc.activeBuildId || !doc.activeVersionId) {
      return false
    }
    if (scope.type === 'all_current') return true
    if (!scope.documentIds.includes(doc.id)) return false
    return true
  })

  if (scope.type === 'selected_documents') {
    const eligibleIds = new Set(eligible.map((d) => d.id))
    for (const id of scope.documentIds) {
      if (!eligibleIds.has(id)) missing.push(id)
    }
  }

  for (const document of eligible) {
    const build = document.builds.find((b) => b.id === document.activeBuildId)
    const version = document.versions.find((v) => v.id === document.activeVersionId)
    if (!build || !version) continue
    build.chunks.forEach((chunk, index) => {
      chunks.push({
        document,
        version,
        build,
        chunkIndex: index,
        page: chunk.page,
        text: chunk.text,
      })
    })
  }

  return { chunks, missingDocumentIds: missing }
}

/* ------------------------------------------------------------------ */
/* Term weighting                                                       */
/* ------------------------------------------------------------------ */

/**
 * Idf-like weight per query term over a set of chunks: rare,
 * distinctive terms count more than terms appearing everywhere
 * (e.g. polysemous words). Shared by retrieval and claim synthesis.
 */
export function termIdfWeights(
  queryTerms: string[],
  texts: string[]
): (term: string) => number {
  const sets = new Map<string, Set<number>>()
  texts.forEach((text, index) => {
    const textTerms = tokenize(text)
    for (const qt of queryTerms) {
      if (textTerms.some((ct) => termsMatch(qt, ct))) {
        const set = sets.get(qt) ?? new Set<number>()
        set.add(index)
        sets.set(qt, set)
      }
    }
  })
  return (term: string) => Math.log(1 + texts.length / (1 + (sets.get(term)?.size ?? 0)))
}

/* ------------------------------------------------------------------ */
/* Retrieval: lexical, dense, fusion, rerank                           */
/* ------------------------------------------------------------------ */

export interface RetrievalResult {
  details: RetrievalDetailsView
  selected: ScopedChunk[]
}

export function retrieve(
  state: DemoState,
  scope: SearchScope,
  question: string,
  opts: { reranker: boolean }
): RetrievalResult {
  const { chunks } = resolveScopedChunks(state, scope)
  const queryTerms = [...new Set(tokenize(question))]
  const idf = termIdfWeights(
    queryTerms,
    chunks.map((c) => c.text)
  )

  // Lexical scores: idf-weighted matched-term mass.
  const lexicalScores = chunks.map((chunk) => {
    const chunkTerms = tokenize(chunk.text)
    let score = 0
    for (const qt of queryTerms) {
      if (chunkTerms.some((ct) => termsMatch(qt, ct))) score += idf(qt)
    }
    return score
  })

  // Dense scores: deterministic variation around the lexical signal —
  // produces a plausible, stable ranking that differs from lexical.
  // Crucially, a chunk with zero term relevance stays at zero so that
  // irrelevant passages never enter the candidate set.
  const denseScores = chunks.map((chunk, i) => {
    const jitter = seededRandom(`${chunk.build.id}:${chunk.chunkIndex}:${question}`)
    return lexicalScores[i] > 0 ? lexicalScores[i] * (0.7 + jitter * 0.6) + jitter * 0.15 : 0
  })

  const lexicalRanks = rankIndices(lexicalScores)
  const denseRanks = rankIndices(denseScores)

  // Reciprocal-rank fusion.
  const RRF_CONSTANT = 60
  const fused = chunks.map((_, i) => {
    let score = 0
    if (lexicalScores[i] > 0) score += 1 / (RRF_CONSTANT + lexicalRanks[i])
    if (denseScores[i] > 0) score += 1 / (RRF_CONSTANT + denseRanks[i])
    return score
  })

  // Reranker (simulated): reorders admitted candidates by matched-term
  // count with deterministic tie-breaking on chunk identity.
  let order = rankIndices(fused).filter((i) => fused[i] > 0)
  const rerankRanks = new Map<number, number>()
  if (opts.reranker) {
    const rerankScores = new Map(order.map((i) => [i, lexicalScores[i] + fused[i] * 2]))
    order = [...order].sort((a, b) => {
      const d = (rerankScores.get(b) ?? 0) - (rerankScores.get(a) ?? 0)
      if (d !== 0) return d
      return chunks[a].build.chunks[chunks[a].chunkIndex].id.localeCompare(
        chunks[b].build.chunks[chunks[b].chunkIndex].id
      )
    })
    order.forEach((chunkIdx, rank) => rerankRanks.set(chunkIdx, rank + 1))
  }

  const maxEvidenceChunks = 8
  const selectedIndices = order.slice(0, maxEvidenceChunks)

  const candidates: RetrievalCandidateView[] = order.slice(0, 20).map((i) => ({
    chunkId: chunks[i].build.chunks[chunks[i].chunkIndex].id,
    documentId: chunks[i].document.id,
    documentName: chunks[i].document.title,
    denseRank: denseScores[i] > 0 ? denseRanks[i] : null,
    lexicalRank: lexicalScores[i] > 0 ? lexicalRanks[i] : null,
    fusionScore: Number(fused[i].toFixed(6)),
    rerankRank: rerankRanks.get(i) ?? null,
    selected: selectedIndices.includes(i),
  }))

  const timings = {
    lexicalMs: Math.round(40 + seededRandom(`lex:${question}`) * 120),
    denseMs: Math.round(80 + seededRandom(`dense:${question}`) * 160),
    fusionMs: Math.round(2 + seededRandom(`fuse:${question}`) * 6),
    rerankMs: opts.reranker ? Math.round(150 + seededRandom(`rr:${question}`) * 250) : 0,
  }

  return {
    details: {
      normalizedQuery: question.trim().replace(/\s+/g, ' '),
      candidates,
      timings,
      config: {
        denseTopK: 30,
        lexicalTopK: 30,
        rrfConstant: RRF_CONSTANT,
        reranker: opts.reranker ? 'acme-rerank-v1 (simulated)' : null,
      },
    },
    selected: selectedIndices.map((i) => chunks[i]),
  }
}

function rankIndices(scores: number[]): number[] {
  return scores
    .map((score, index) => ({ score, index }))
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map((entry) => entry.index)
}

/* ------------------------------------------------------------------ */
/* Conversational resolution                                           */
/* ------------------------------------------------------------------ */

const PRONOUNS = /\b(it|they|them|their|this|that|these|those)\b/i

export function resolveQuestion(
  question: string,
  priorQuestions: string[]
): { resolved: string | null; needsClarification: boolean } {
  const hasPronoun = PRONOUNS.test(question)
  if (!hasPronoun) {
    return { resolved: null, needsClarification: false }
  }
  if (priorQuestions.length === 0) {
    return {
      resolved: null,
      needsClarification: true,
    }
  }
  // Resolve against the most recent question's distinctive terms,
  // preserving exact identifiers and version labels.
  const last = priorQuestions[priorQuestions.length - 1]
  const subjectTerms = tokenize(last).slice(0, 3)
  if (subjectTerms.length === 0) {
    return { resolved: null, needsClarification: true }
  }
  const resolved = question.replace(PRONOUNS, subjectTerms.join(' '))
  return { resolved, needsClarification: false }
}

/* ------------------------------------------------------------------ */
/* Answer synthesis                                                    */
/* ------------------------------------------------------------------ */

function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+(?=[A-Z0-9"“(])/)
    .map((s) => s.trim())
    .filter(Boolean)
}

export interface AnswerPlan {
  outcome:
    | 'answered'
    | 'partial'
    | 'conflicting_sources'
    | 'insufficient_evidence'
    | 'clarification_required'
  claims: AnswerClaim[]
  limitations: string[]
  conflicts: SourceConflict[]
  evidence: EvidenceRecord[]
  unmatchedTerms: string[]
  effectiveQuestion: string
}

export function synthesizeAnswer(
  state: DemoState,
  scope: SearchScope,
  question: string,
  effectiveQuestion: string,
  selected: ScopedChunk[]
): AnswerPlan {
  const queryTerms = [...new Set(tokenize(effectiveQuestion))]

  // Track which question terms matched anywhere in the selected evidence.
  const matched = new Set<string>()
  const unmatched: string[] = []
  for (const term of queryTerms) {
    const hit = selected.some((chunk) =>
      tokenize(chunk.text).some((ct) => termsMatch(term, ct))
    )
    if (hit) {
      matched.add(term)
    } else {
      unmatched.push(term)
    }
  }

  // Build stable evidence records for every selected chunk.
  const evidence: EvidenceRecord[] = selected.map((chunk, index) => {
    const pageMeta = chunk.version.pages.find((p) => p.page === chunk.page)
    const paragraphIndex = Math.max(
      0,
      (pageMeta?.paragraphs.indexOf(chunk.text) ?? -1)
    )
    const before = pageMeta && paragraphIndex > 0 ? pageMeta.paragraphs[paragraphIndex - 1] : null
    const after =
      pageMeta && paragraphIndex < pageMeta.paragraphs.length - 1
        ? pageMeta.paragraphs[paragraphIndex + 1]
        : null
    return {
      evidenceId: `E${index + 1}`,
      documentId: chunk.document.id,
      documentName: chunk.document.title,
      versionId: chunk.version.id,
      revisionNumber: chunk.version.revisionNumber,
      buildId: chunk.build.id,
      chunkId: chunk.build.chunks[chunk.chunkIndex].id,
      quote: chunk.text,
      physicalPage: chunk.page,
      pageLabel: pageMeta?.label ?? null,
      adjacentContext: { before, after },
      // Demo extraction is page-aware, not layout-aware.
      locationPrecision: 'page' as const,
    }
  })

  // Conflict detection: strong evidence from two distinct documents in
  // the same corpus conflict group.
  const conflicts: SourceConflict[] = []
  const conflictClaims: AnswerClaim[] = []
  for (const [groupId, refs] of Object.entries(CONFLICT_GROUPS)) {
    const involved = refs
      .map((ref) => evidence.find((e) => e.documentId === ref.documentId))
      .filter((e): e is EvidenceRecord => Boolean(e))
    const distinctDocs = new Set(involved.map((e) => e.documentId))
    if (distinctDocs.size >= 2) {
      conflicts.push({
        description:
          groupId === 'rollback_owner'
            ? 'The Deployment Runbook (rev 2) and the Operating Procedures disagree about who initiates a rollback and from where. Both statements are shown; the documents do not resolve the disagreement.'
            : 'Selected sources contain conflicting statements.',
        evidenceIds: involved.map((e) => e.evidenceId),
      })
      for (const ev of involved) {
        conflictClaims.push({
          ordinal: conflictClaims.length + 1,
          text: ev.quote,
          evidenceIds: [ev.evidenceId],
          checkStatus: 'supported',
          checkNote: 'Statement supported by its source; conflicts with the other cited document.',
        })
      }
    }
  }

  if (conflicts.length > 0) {
    return {
      outcome: 'conflicting_sources',
      claims: conflictClaims,
      limitations: [
        'The selected documents disagree. Compare the cited revisions before acting on either statement.',
      ],
      conflicts,
      evidence,
      unmatchedTerms: unmatched,
      effectiveQuestion,
    }
  }

  // No evidence matched any distinctive term: calibrated abstention.
  if (matched.size === 0 || selected.length === 0) {
    return {
      outcome: 'insufficient_evidence',
      claims: [],
      limitations: [
        'Insufficient evidence in the selected documents to answer this question.',
        ...(scope.type === 'selected_documents'
          ? ['Try widening the search scope to all current documents.']
          : []),
      ],
      conflicts: [],
      evidence,
      unmatchedTerms: unmatched,
      effectiveQuestion,
    }
  }

  // Extractive claims: best-matching sentence per chunk, deduplicated,
  // scored with idf weights. Weakly-related sentences (matching only a
  // common, polysemous term) are dropped by a relative cutoff.
  const sentenceIdf = termIdfWeights(
    queryTerms,
    selected.map((c) => c.text)
  )
  const scoredClaims: { claim: AnswerClaim; score: number }[] = []
  for (const chunk of selected) {
    const sentences = splitSentences(chunk.text)
    let best: { sentence: string; score: number } | null = null
    for (const sentence of sentences) {
      const sentenceTerms = tokenize(sentence)
      let score = 0
      for (const term of queryTerms) {
        if (sentenceTerms.some((st) => termsMatch(term, st))) score += sentenceIdf(term)
      }
      if (score > 0 && (!best || score > best.score)) {
        best = { sentence, score }
      }
    }
    if (best && !scoredClaims.some((c) => c.claim.text === best!.sentence)) {
      const evidenceIndex = selected.indexOf(chunk)
      scoredClaims.push({
        score: best.score,
        claim: {
          ordinal: 0,
          text: best.sentence,
          evidenceIds: [evidence[evidenceIndex].evidenceId],
          checkStatus: 'supported',
          // Claims are exact source sentences; the "check" verifies the
          // quote resolves to canonical text.
          checkNote: 'Exact source sentence; quote verified against the indexed passage.',
        },
      })
    }
    if (scoredClaims.length >= 5) break
  }
  const bestScore = scoredClaims.reduce((m, c) => Math.max(m, c.score), 0)
  const claims = scoredClaims
    .filter((c) => c.score >= bestScore * 0.35)
    .map((c, i) => ({ ...c.claim, ordinal: i + 1 }))

  if (claims.length === 0) {
    return {
      outcome: 'insufficient_evidence',
      claims: [],
      limitations: [
        'Insufficient evidence in the selected documents to answer this question.',
      ],
      conflicts: [],
      evidence,
      unmatchedTerms: unmatched,
      effectiveQuestion,
    }
  }

  // Partial: some aspects of the question had no matching evidence.
  if (unmatched.length > 0) {
    const shown = unmatched.slice(0, 2).map((t) => `"${t}"`)
    return {
      outcome: 'partial',
      claims,
      limitations: [
        `The selected documents do not cover ${shown.join(' and ')}, so part of the question is unanswered.`,
      ],
      conflicts: [],
      evidence,
      unmatchedTerms: unmatched,
      effectiveQuestion,
    }
  }

  // Curated expectations for demo questions whose honest gap cannot be
  // detected by term coverage alone (e.g. an unasked duration).
  const expectation = DEMO_EXPECTATIONS.find((e) => e.question === question.trim())
  if (expectation?.limitation) {
    return {
      outcome: 'partial',
      claims,
      limitations: [expectation.limitation],
      conflicts: [],
      evidence,
      unmatchedTerms: [],
      effectiveQuestion,
    }
  }

  return {
    outcome: 'answered',
    claims,
    limitations: [],
    conflicts: [],
    evidence,
    unmatchedTerms: [],
    effectiveQuestion,
  }
}

export function estimateTokens(text: string): number {
  return Math.max(1, Math.ceil(text.split(/\s+/).length * 1.3))
}
