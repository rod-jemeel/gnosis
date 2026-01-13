'use client'

import Link from 'next/link'
import { ArrowRight, Cube, FileText, ChatCircle, Target, Key, Database, Lock, Flask } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'

export default function HomePage() {
  return (
    <div className="flex flex-col min-h-screen">
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
      <section className="flex-1 flex items-center justify-center px-4 py-20 md:py-28 relative">
        {/* Subtle glow effect */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-primary/5 rounded-full blur-3xl" />

        <div className="max-w-2xl text-center relative">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 mb-6 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-medium rounded-full border border-amber-500/20 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <Flask size={14} weight="fill" />
            <span>Proof of Concept</span>
          </div>

          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight mb-4 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100">
            RAG over PDFs with{' '}
            <span className="text-primary relative inline-block">
              citations
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

          <p className="text-muted-foreground mb-8 max-w-lg mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200">
            Upload documents, ask questions, get answers with page-level citations.
            A minimal implementation of retrieval-augmented generation.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300">
            <Link href="/documents">
              <Button size="lg" className="gap-2 w-full sm:w-auto group">
                Try it out
                <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
              </Button>
            </Link>
            <Link href="/login">
              <Button variant="outline" size="lg" className="w-full sm:w-auto">
                Sign in
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-t border-border/50 bg-muted/30 px-4 py-16">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-xl font-semibold mb-8 text-center animate-in fade-in slide-in-from-bottom-4 duration-700">How it works</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="flex flex-col items-center text-center p-4 group animate-in fade-in slide-in-from-bottom-4 duration-700" style={{ animationDelay: '100ms' }}>
              <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-3 transition-all group-hover:scale-110 group-hover:bg-primary/20">
                <FileText size={22} />
              </div>
              <h3 className="font-medium mb-1">1. Upload</h3>
              <p className="text-sm text-muted-foreground">
                Drop your PDFs. They get chunked and embedded into vectors.
              </p>
            </div>
            <div className="flex flex-col items-center text-center p-4 group animate-in fade-in slide-in-from-bottom-4 duration-700" style={{ animationDelay: '200ms' }}>
              <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-3 transition-all group-hover:scale-110 group-hover:bg-primary/20">
                <ChatCircle size={22} />
              </div>
              <h3 className="font-medium mb-1">2. Ask</h3>
              <p className="text-sm text-muted-foreground">
                Query your documents in natural language via chat.
              </p>
            </div>
            <div className="flex flex-col items-center text-center p-4 group animate-in fade-in slide-in-from-bottom-4 duration-700" style={{ animationDelay: '300ms' }}>
              <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-3 transition-all group-hover:scale-110 group-hover:bg-primary/20">
                <Target size={22} />
              </div>
              <h3 className="font-medium mb-1">3. Cite</h3>
              <p className="text-sm text-muted-foreground">
                Get answers with citations that jump to the exact PDF page.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Data Ownership */}
      <section className="border-t border-border/50 px-4 py-16">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-xl font-semibold mb-2 text-center animate-in fade-in slide-in-from-bottom-4 duration-700">Own your data</h2>
          <p className="text-sm text-muted-foreground text-center mb-8 max-w-md mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100">
            Bring your own API keys. Your documents and embeddings stay under your control.
          </p>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="p-5 rounded-xl border border-border/50 bg-card/50 hover:bg-card hover:border-border transition-all duration-300 group animate-in fade-in slide-in-from-bottom-4 duration-700" style={{ animationDelay: '100ms' }}>
              <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-3 transition-all group-hover:scale-110">
                <Key size={20} weight="duotone" />
              </div>
              <h3 className="font-medium text-sm mb-1">Your API Keys</h3>
              <p className="text-xs text-muted-foreground">
                Use your own OpenAI, Anthropic, or other LLM provider keys. We never store them unencrypted.
              </p>
            </div>
            <div className="p-5 rounded-xl border border-border/50 bg-card/50 hover:bg-card hover:border-border transition-all duration-300 group animate-in fade-in slide-in-from-bottom-4 duration-700" style={{ animationDelay: '175ms' }}>
              <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-3 transition-all group-hover:scale-110">
                <Database size={20} weight="duotone" />
              </div>
              <h3 className="font-medium text-sm mb-1">Your Vector Store</h3>
              <p className="text-xs text-muted-foreground">
                Optionally bring your own Pinecone index. Embeddings live in your namespace.
              </p>
            </div>
            <div className="p-5 rounded-xl border border-border/50 bg-card/50 hover:bg-card hover:border-border transition-all duration-300 group animate-in fade-in slide-in-from-bottom-4 duration-700" style={{ animationDelay: '250ms' }}>
              <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-3 transition-all group-hover:scale-110">
                <Lock size={20} weight="duotone" />
              </div>
              <h3 className="font-medium text-sm mb-1">Tenant Isolated</h3>
              <p className="text-xs text-muted-foreground">
                All queries are scoped to your workspace. No cross-tenant data leakage.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Technical Details */}
      <section className="border-t border-border/50 bg-muted/30 px-4 py-16">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-xl font-semibold mb-2 text-center animate-in fade-in slide-in-from-bottom-4 duration-700">Under the hood</h2>
          <p className="text-sm text-muted-foreground text-center mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100">
            A straightforward RAG pipeline with no magic.
          </p>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="p-5 rounded-xl border border-border/50 bg-card/50 hover:bg-card hover:border-border transition-all duration-300 animate-in fade-in slide-in-from-bottom-4 duration-700" style={{ animationDelay: '150ms' }}>
              <h3 className="font-medium text-sm mb-3">Ingestion</h3>
              <ul className="text-xs text-muted-foreground space-y-1.5">
                <li>PDF text extraction per page</li>
                <li>Chunking with overlap</li>
                <li>Embeddings via OpenAI or compatible</li>
                <li>Vectors stored in Pinecone (namespaced)</li>
              </ul>
            </div>
            <div className="p-5 rounded-xl border border-border/50 bg-card/50 hover:bg-card hover:border-border transition-all duration-300 animate-in fade-in slide-in-from-bottom-4 duration-700" style={{ animationDelay: '225ms' }}>
              <h3 className="font-medium text-sm mb-3">Retrieval</h3>
              <ul className="text-xs text-muted-foreground space-y-1.5">
                <li>Query embedding + similarity search</li>
                <li>Top-k chunks with metadata</li>
                <li>LLM generates answer with citations</li>
                <li>Citations link to page numbers in viewer</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* POC Notice */}
      <section className="border-t border-border/50 px-4 py-12 relative overflow-hidden">
        {/* Decorative gradient */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[200px] bg-primary/5 rounded-full blur-3xl" />
        <div className="max-w-2xl mx-auto text-center relative">
          <div className="inline-flex items-center gap-2 mb-3 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <Flask size={18} className="text-amber-500" />
            <span className="text-sm font-medium">Proof of Concept</span>
          </div>
          <p className="text-sm text-muted-foreground mb-6 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100">
            This is a demonstration of RAG with citations over PDFs.
            Built to explore the architecture, not for production use.
            Expect rough edges.
          </p>
          <Link href="/documents" className="animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200 inline-block">
            <Button variant="outline" size="sm" className="gap-2 group">
              Explore the demo
              <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 py-6 mt-auto">
        <div className="max-w-3xl mx-auto px-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Cube size={16} weight="fill" className="text-primary" />
            <span className="text-sm font-medium">Gnosis</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Proof of concept
          </p>
        </div>
      </footer>
    </div>
  )
}
