'use client'

import Link from 'next/link'
import {
  ArrowRight,
  Cube,
  FileText,
  ChatCircle,
  MagnifyingGlass,
  Quotes,
  CheckCircle,
  Warning,
  ArrowsCounterClockwise,
  Prohibit,
  Clock,
  ShieldCheck,
  Flask,
  GitBranch,
} from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Dotted Background Pattern */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.15] dark:opacity-[0.08]"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)`,
            backgroundSize: '24px 24px',
          }}
        />
      </div>

      {/* Hero */}
      <section className="relative flex flex-1 items-center justify-center px-4 py-20 md:py-28">
        <div className="absolute left-1/2 top-1/2 h-[400px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/5 blur-3xl" />

        <div className="relative max-w-2xl text-center">
          <div className="mb-6 inline-flex animate-in fade-in slide-in-from-bottom-4 duration-700 items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary">
            <ShieldCheck size={14} weight="fill" />
            <span>Evidence-first document Q&amp;A</span>
          </div>

          <h1 className="mb-4 animate-in fade-in slide-in-from-bottom-4 text-3xl font-bold tracking-tight delay-100 md:text-4xl lg:text-5xl">
            Answers you can{' '}
            <span className="relative inline-block text-primary">
              verify
              <svg className="absolute -bottom-1 left-0 w-full" viewBox="0 0 200 8" fill="none">
                <path
                  d="M1 5.5C47 2.5 153 2.5 199 5.5"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  className="text-primary/40"
                />
              </svg>
            </span>
          </h1>

          <p className="mx-auto mb-8 max-w-lg animate-in fade-in slide-in-from-bottom-4 text-muted-foreground delay-200">
            Gnosis answers questions from an authorized document collection — and shows the
            exact passage, revision, and physical page behind every claim. When the documents
            don&apos;t answer, it says so.
          </p>

          <div className="flex animate-in fade-in slide-in-from-bottom-4 flex-col justify-center gap-3 delay-300 sm:flex-row">
            <Link href="/chat">
              <Button size="lg" className="group w-full gap-2 sm:w-auto">
                Try the curated demo
                <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
              </Button>
            </Link>
            <Link href="/login">
              <Button variant="outline" size="lg" className="w-full sm:w-auto">
                Sign in
              </Button>
            </Link>
          </div>

          <p className="mt-4 animate-in fade-in slide-in-from-bottom-4 text-xs text-muted-foreground delay-500">
            The demo runs on a curated corpus in your browser — no account needed.
          </p>
        </div>
      </section>

      {/* The evidence workflow */}
      <section className="border-t border-border/50 bg-muted/30 px-4 py-16">
        <div className="mx-auto max-w-3xl">
          <h2 className="mb-2 animate-in fade-in slide-in-from-bottom-4 text-center text-xl font-semibold duration-700">
            The evidence workflow
          </h2>
          <p className="mx-auto mb-8 max-w-md animate-in fade-in slide-in-from-bottom-4 text-center text-sm text-muted-foreground delay-100">
            Ask with an explicit scope; inspect what actually supports the answer.
          </p>
          <div className="grid gap-6 md:grid-cols-4">
            {[
              {
                icon: <ChatCircle size={22} />,
                title: '1. Ask with scope',
                body: 'Choose all current documents or an explicit selection. An empty selection never silently means everything.',
              },
              {
                icon: <MagnifyingGlass size={22} />,
                title: '2. Retrieve and fuse',
                body: 'Lexical and semantic candidates are rank-fused, optionally reranked, and budgeted — with every candidate recorded.',
              },
              {
                icon: <Quotes size={22} />,
                title: '3. Validate claims',
                body: 'Strict mode checks each material claim against the retrieved passages before anything is shown.',
              },
              {
                icon: <FileText size={22} />,
                title: '4. Inspect the source',
                body: 'Citations open the exact stored passage with document revision and physical PDF page — never a paraphrase.',
              },
            ].map((step, i) => (
              <div
                key={step.title}
                className="group flex animate-in fade-in slide-in-from-bottom-4 flex-col items-center p-4 text-center duration-700"
                style={{ animationDelay: `${(i + 1) * 100}ms` }}
              >
                <div className="mb-3 flex h-12 w-12 items-center justify-center bg-primary/10 text-primary transition-all group-hover:scale-110 group-hover:bg-primary/20">
                  {step.icon}
                </div>
                <h3 className="mb-1 font-medium">{step.title}</h3>
                <p className="text-sm text-muted-foreground">{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Honest outcomes */}
      <section className="border-t border-border/50 px-4 py-16">
        <div className="mx-auto max-w-3xl">
          <h2 className="mb-2 animate-in fade-in slide-in-from-bottom-4 text-center text-xl font-semibold duration-700">
            Honest outcomes, not confident guesses
          </h2>
          <p className="mx-auto mb-8 max-w-lg animate-in fade-in slide-in-from-bottom-4 text-center text-sm text-muted-foreground delay-100">
            Missing evidence is reported as missing evidence — never as &quot;the fact is
            false.&quot;
          </p>
          <div className="grid gap-3 md:grid-cols-2">
            <OutcomeCard
              icon={<CheckCircle size={18} weight="fill" className="text-emerald-500" />}
              title="Answered"
              body="Every material claim carries a valid reference to authorized evidence, or it is qualified or removed."
            />
            <OutcomeCard
              icon={<Clock size={18} weight="fill" className="text-amber-500" />}
              title="Partially answered"
              body="When documents cover only part of the question, the answer says exactly which part is missing."
            />
            <OutcomeCard
              icon={<ArrowsCounterClockwise size={18} weight="bold" className="text-rose-500" />}
              title="Conflicting sources"
              body="When revisions disagree, both statements are shown with their revisions — no invented resolution."
            />
            <OutcomeCard
              icon={<Prohibit size={18} weight="fill" className="text-slate-500" />}
              title="Insufficient evidence"
              body="If nothing in scope answers the question, the result says so — even when retrieval returned passages."
            />
          </div>
        </div>
      </section>

      {/* Version awareness */}
      <section className="border-t border-border/50 bg-muted/30 px-4 py-16">
        <div className="mx-auto max-w-3xl">
          <h2 className="mb-2 animate-in fade-in slide-in-from-bottom-4 text-center text-xl font-semibold duration-700">
            Version-aware, by design
          </h2>
          <p className="mx-auto mb-8 max-w-lg animate-in fade-in slide-in-from-bottom-4 text-center text-sm text-muted-foreground delay-100">
            Source revisions are immutable; answers remember the snapshot they used.
          </p>
          <div className="grid gap-4 md:grid-cols-3">
            <DetailCard
              icon={<GitBranch size={20} weight="duotone" />}
              title="Immutable revisions"
              body="Uploading a replacement never overwrites the bytes or evidence of the previous revision. A failed replacement never breaks the working one."
            />
            <DetailCard
              icon={<ShieldCheck size={20} weight="duotone" />}
              title="Safe activation"
              body="A new index build becomes searchable only after its checks pass — until then, queries keep using the active build snapshot."
            />
            <DetailCard
              icon={<Warning size={20} weight="duotone" />}
              title="Observable execution"
              body="Every run records stages, timings, candidates, and outcomes. Diagnostics show what happened without exposing private content."
            />
          </div>
        </div>
      </section>

      {/* Scope notice */}
      <section className="relative overflow-hidden border-t border-border/50 px-4 py-12">
        <div className="absolute left-1/2 top-0 h-[200px] w-[800px] -translate-x-1/2 rounded-full bg-primary/5 blur-3xl" />
        <div className="relative mx-auto max-w-2xl text-center">
          <div className="mb-3 inline-flex animate-in fade-in slide-in-from-bottom-4 items-center gap-2 duration-700">
            <Flask size={18} className="text-amber-500" />
            <span className="text-sm font-medium">Portfolio project — scope and limits</span>
          </div>
          <p className="mx-auto mb-6 max-w-xl animate-in fade-in slide-in-from-bottom-4 text-sm leading-relaxed text-muted-foreground delay-100">
            Gnosis is built for small technical teams consulting documentation and runbooks:
            text-bearing PDFs, English retrieval, workspace-scoped access. It is not an
            autonomous research agent and does not guarantee that every answer is true — it
            guarantees that you can inspect the evidence behind each claim.
          </p>
          <Link
            href="/chat"
            className="inline-block animate-in fade-in slide-in-from-bottom-4 delay-200"
          >
            <Button variant="outline" size="sm" className="group gap-2">
              Explore the demo
              <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-border/50 py-6">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <Cube size={16} weight="fill" className="text-primary" />
            <span className="text-sm font-medium">Gnosis</span>
          </div>
          <p className="text-xs text-muted-foreground">Evidence-first document Q&amp;A</p>
        </div>
      </footer>
    </div>
  )
}

function OutcomeCard({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode
  title: string
  body: string
}) {
  return (
    <div className="border border-border/50 bg-card/50 p-5 transition-all duration-300 hover:border-border hover:bg-card">
      <div className="mb-2 flex items-center gap-2">
        {icon}
        <h3 className="text-sm font-medium">{title}</h3>
      </div>
      <p className="text-xs leading-relaxed text-muted-foreground">{body}</p>
    </div>
  )
}

function DetailCard({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode
  title: string
  body: string
}) {
  return (
    <div className="group border border-border/50 bg-card/50 p-5 transition-all duration-300 hover:border-border hover:bg-card">
      <div className="mb-3 flex h-10 w-10 items-center justify-center bg-primary/10 text-primary transition-all group-hover:scale-110">
        {icon}
      </div>
      <h3 className="mb-1 text-sm font-medium">{title}</h3>
      <p className="text-xs leading-relaxed text-muted-foreground">{body}</p>
    </div>
  )
}
