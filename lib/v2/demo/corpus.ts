/**
 * Curated demo corpus.
 *
 * Fully synthetic documentation for a fictional "Acme Platform" — safe
 * to redistribute and stable for demonstration. The corpus is designed
 * to exercise the honest-outcome behaviors of the evidence pipeline:
 *
 *  - a revision-2 replacement of the runbook (revision awareness),
 *  - a deliberate cross-document conflict about rollback ownership
 *    (conflicting_sources outcome),
 *  - exact identifiers in the API reference (identifier retrieval),
 *  - questions the corpus cannot answer (insufficient_evidence,
 *    partial answers with explicit gaps).
 */

export interface DemoCorpusPage {
  page: number
  label: string | null
  paragraphs: string[]
}

export interface DemoCorpusVersion {
  revisionNumber: number
  createdAtOffsetDays: number
  sourceLabel: string | null
  pages: DemoCorpusPage[]
}

export interface DemoCorpusDocument {
  id: string
  title: string
  tags: string[]
  fileName: string
  versions: DemoCorpusVersion[]
}

export const DEMO_WORKSPACE_ID = '11111111-1111-4111-8111-111111111001'
export const DEMO_WORKSPACE_NAME = 'Platform Docs'

export const DEMO_CORPUS: DemoCorpusDocument[] = [
  {
    id: '11111111-1111-4111-8111-111111111101',
    title: 'Deployment Runbook',
    tags: ['deployment', 'runbook'],
    fileName: 'acme-deployment-runbook-v2.pdf',
    versions: [
      {
        revisionNumber: 1,
        createdAtOffsetDays: -64,
        sourceLabel: 'v1.4 (superseded)',
        pages: [
          {
            page: 1,
            label: '1',
            paragraphs: [
              'Acme Platform Deployment Runbook, revision 1.4. This revision is superseded by revision 2.',
              'This runbook covers standard deployments, canary releases, and rollback procedures for the Acme Platform.',
              'All deployments are executed through the deployment CLI or the admin console.',
            ],
          },
          {
            page: 2,
            label: '2',
            paragraphs: [
              'Rollbacks are initiated by the on-call operator from the admin console under the Deployments tab.',
              'A rollback restores the previous deployment revision and requires a second operator to acknowledge the change.',
            ],
          },
        ],
      },
      {
        revisionNumber: 2,
        createdAtOffsetDays: -9,
        sourceLabel: 'v2.0 (current)',
        pages: [
          {
            page: 1,
            label: '1',
            paragraphs: [
              'Acme Platform Deployment Runbook, revision 2.0.',
              'This runbook covers standard deployments, canary releases, and rollback procedures for the Acme Platform.',
              'Deployment windows are Tuesday and Thursday, 09:00-11:00 UTC. Emergency changes may proceed outside the window with release-manager approval.',
            ],
          },
          {
            page: 2,
            label: '2',
            paragraphs: [
              'Canary releases route 5% of traffic to the new version for 30 minutes before promotion.',
              'Promotion from canary requires an error rate below 0.5% and p99 latency within 10% of the current baseline.',
              'If canary metrics fail, the canary is aborted automatically and traffic returns to the stable version.',
            ],
          },
          {
            page: 3,
            label: '3',
            paragraphs: [
              'Rollbacks are initiated by the release manager from the deployment CLI using `acme rollback --deployment <deployment-id>`.',
              'Only the release manager or a platform owner may authorize a rollback; operators request one through the #deploy channel.',
              'After a rollback completes, the incident channel is notified and a post-mortem is scheduled within two business days.',
            ],
          },
          {
            page: 4,
            label: '4',
            paragraphs: [
              'The environment matrix lists staging, canary, and production. Staging deploys are continuous; production deploys follow the deployment window.',
              'Feature flags decouple deploy from release. A feature is enabled per workspace with `acme flags enable <name> --workspace <id>`.',
            ],
          },
        ],
      },
    ],
  },
  {
    id: '11111111-1111-4111-8111-111111111102',
    title: 'API Reference',
    tags: ['api', 'reference'],
    fileName: 'acme-api-reference.pdf',
    versions: [
      {
        revisionNumber: 1,
        createdAtOffsetDays: -30,
        sourceLabel: null,
        pages: [
          {
            page: 1,
            label: '1',
            paragraphs: [
              'The Acme Platform API is served over HTTPS at api.acme.example.',
              'All requests authenticate with a bearer token issued from the workspace settings page under API tokens.',
              'Every response includes an `X-Request-Id` header. Include this identifier in support requests.',
            ],
          },
          {
            page: 2,
            label: '2',
            paragraphs: [
              'Authenticated requests are limited to 600 requests per minute per workspace.',
              'When the limit is exceeded the API returns HTTP 429 with error code `ERR-4292` and a `Retry-After` header in seconds.',
              'Burst capacity of 60 requests is shared across all tokens in a workspace.',
            ],
          },
          {
            page: 3,
            label: '3',
            paragraphs: [
              'The metrics endpoint listens on port 9102 and is scraped by the internal collector.',
              'Logs are queryable for 30 days through the observability console; older logs must be requested from platform operations.',
              'Health checks are exposed at `/healthz` and return 200 while the service is accepting traffic.',
            ],
          },
          {
            page: 4,
            label: '4',
            paragraphs: [
              'Pagination uses opaque cursors. Pass the `nextCursor` value from a response as the `cursor` query parameter.',
              'Page sizes default to 25 items with a maximum of 100.',
              'Deleting a resource returns 202 with a task reference; poll the task endpoint for completion state.',
            ],
          },
        ],
      },
    ],
  },
  {
    id: '11111111-1111-4111-8111-111111111103',
    title: 'Operating Procedures',
    tags: ['operations', 'on-call'],
    fileName: 'acme-operating-procedures.pdf',
    versions: [
      {
        revisionNumber: 1,
        createdAtOffsetDays: -21,
        sourceLabel: null,
        pages: [
          {
            page: 1,
            label: '1',
            paragraphs: [
              'Acme Platform Operating Procedures for on-call rotations and incident response.',
              'The on-call rotation changes weekly every Monday at 10:00 UTC.',
              'Severity-1 incidents require acknowledgment within 5 minutes and a customer-visible status update within 30 minutes.',
            ],
          },
          {
            page: 2,
            label: '2',
            paragraphs: [
              'Rollbacks are initiated by the on-call operator from the admin console under Incidents, then selecting the affected deployment.',
              'During a Severity-1 incident the on-call operator has temporary authority to roll back without release-manager approval.',
              'All rollback actions are recorded in the incident timeline automatically.',
            ],
          },
          {
            page: 3,
            label: '3',
            paragraphs: [
              'Escalation follows the chain: on-call operator, release manager, platform owner.',
              'Escalate to the release manager if an incident is not mitigated within 45 minutes.',
              'The maintenance window for platform work is Sunday 02:00-06:00 UTC.',
            ],
          },
        ],
      },
    ],
  },
  {
    id: '11111111-1111-4111-8111-111111111104',
    title: 'Security and Compliance Notes',
    tags: ['security', 'compliance'],
    fileName: 'acme-security-notes.pdf',
    versions: [
      {
        revisionNumber: 1,
        createdAtOffsetDays: -14,
        sourceLabel: null,
        pages: [
          {
            page: 1,
            label: '1',
            paragraphs: [
              'Security and compliance notes for the Acme Platform.',
              'Access reviews are performed quarterly by workspace owners.',
              'Service signing keys are rotated every 90 days using `acme keys rotate --service <name>`.',
            ],
          },
          {
            page: 2,
            label: '2',
            paragraphs: [
              'Audit logs are retained for 400 days and are exportable by workspace owners on request.',
              'Data at rest is encrypted with per-workspace keys managed by the platform key service.',
              'Deletion requests remove source files and derived content within 24 hours; immutable backups expire on their own retention schedule.',
            ],
          },
          {
            page: 3,
            label: '3',
            paragraphs: [
              'Workspace members hold the viewer, editor, or owner role.',
              'Only workspace owners may manage membership, quotas, and provider configuration.',
              'Sessions are private to their creator; workspace owners can see aggregate usage without reading private conversations.',
            ],
          },
        ],
      },
    ],
  },
]

/**
 * Conflict groups: paragraphs whose text appears in a document indexed
 * by document id. When a run selects strong evidence from two distinct
 * documents inside the same conflict group, the honest outcome is
 * `conflicting_sources`, presenting both statements with revisions
 * instead of inventing a resolution.
 */
export const CONFLICT_GROUPS: Record<string, { documentId: string; paragraphIndex: number }[]> = {
  rollback_owner: [
    { documentId: '11111111-1111-4111-8111-111111111101', paragraphIndex: 4 }, // runbook r2, page 3, ¶0
    { documentId: '11111111-1111-4111-8111-111111111103', paragraphIndex: 3 }, // procedures, page 2, ¶0
  ],
}

/** Curated first-question suggestions shown in the empty chat state. */
export const DEMO_SUGGESTIONS: { question: string; hint: string }[] = [
  {
    question: 'Where do operators initiate a rollback?',
    hint: 'Two documents disagree — see how conflicts are surfaced',
  },
  {
    question: 'What is the API rate limit?',
    hint: 'Direct factual question with exact identifiers',
  },
  {
    question: 'How long are audit logs retained?',
    hint: 'Answered from a single cited passage',
  },
  {
    question: 'How do I rotate signing keys and how long does a rotation take?',
    hint: 'Partially covered — see the honest gap',
  },
  {
    question: 'What is the capital of France?',
    hint: 'Not in the corpus — see the calibrated refusal',
  },
]

/**
 * Curated answer expectations for demo questions. Term-coverage analysis
 * cannot detect every honest gap (a question can ask for something the
 * corpus simply never states without using an unmatched word), so the
 * designed demo questions carry their known limitation explicitly.
 */
export const DEMO_EXPECTATIONS: { question: string; limitation?: string }[] = [
  {
    question: 'How do I rotate signing keys and how long does a rotation take?',
    limitation:
      'The documents describe how to rotate signing keys, but they do not state how long a rotation takes.',
  },
]

export function demoMemberSeed() {
  return [
    {
      userId: '00000000-0000-4000-8000-0000000000d0',
      email: 'demo@gnosis.local',
      role: 'owner' as const,
      status: 'active' as const,
      joinedAt: new Date(Date.now() - 90 * 86400000).toISOString(),
    },
    {
      userId: '22222222-2222-4222-8222-222222222201',
      email: 'priya@acme.example',
      role: 'editor' as const,
      status: 'active' as const,
      joinedAt: new Date(Date.now() - 45 * 86400000).toISOString(),
    },
    {
      userId: '22222222-2222-4222-8222-222222222202',
      email: 'sam@acme.example',
      role: 'viewer' as const,
      status: 'active' as const,
      joinedAt: new Date(Date.now() - 12 * 86400000).toISOString(),
    },
  ]
}
