'use client'

import Link from 'next/link'
import { ArrowRight, Cube, FileText, ChatCircle, Target, Lightning, ShieldCheck, MagnifyingGlass, Stack } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'

const steps = [
  {
    number: '01',
    icon: FileText,
    title: 'Upload',
    description: 'Drop your PDFs and we handle the rest',
  },
  {
    number: '02',
    icon: ChatCircle,
    title: 'Ask',
    description: 'Question your documents naturally',
  },
  {
    number: '03',
    icon: Target,
    title: 'Cite',
    description: 'Get answers linked to exact pages',
  },
]

const features = [
  {
    icon: Lightning,
    title: 'Instant Answers',
    description: 'Get accurate responses in seconds, not hours of manual searching.',
  },
  {
    icon: ShieldCheck,
    title: 'Source Verified',
    description: 'Every answer comes with citations linking to the exact page.',
  },
  {
    icon: MagnifyingGlass,
    title: 'Smart Search',
    description: 'Natural language queries across all your uploaded documents.',
  },
  {
    icon: Stack,
    title: 'Multi-Document',
    description: 'Query across multiple PDFs simultaneously for comprehensive answers.',
  },
]

export default function HomePage() {
  return (
    <div className="flex flex-col">
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
      <section className="flex-1 flex items-center justify-center px-4 py-24 md:py-32 relative">
        {/* Subtle glow effect */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-primary/5 rounded-full blur-3xl" />

        <div className="max-w-2xl text-center relative">
          <div
            className="inline-flex items-center gap-2 px-3 py-1.5 mb-8 bg-primary/10 text-primary text-xs font-medium rounded-full animate-in fade-in slide-in-from-bottom-4 duration-700"
          >
            <Cube size={14} weight="fill" />
            <span>Document Intelligence</span>
          </div>

          <h1
            className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100"
          >
            Your PDFs,{' '}
            <span className="text-primary relative">
              answered
              <svg className="absolute -bottom-2 left-0 w-full" viewBox="0 0 200 8" fill="none">
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

          <p
            className="text-lg text-muted-foreground mb-10 max-w-lg mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200"
          >
            Upload documents. Ask questions. Get cited answers that link directly to the source page.
          </p>

          <div
            className="flex flex-col sm:flex-row gap-3 justify-center animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300"
          >
            <Link href="/documents">
              <Button size="lg" className="gap-2 w-full sm:w-auto group">
                Get Started
                <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
              </Button>
            </Link>
            <Link href="/chat">
              <Button variant="outline" size="lg" className="w-full sm:w-auto">
                Try Chat
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-t border-border/50 bg-muted/30 relative">
        <div
          className="absolute inset-0 opacity-[0.08] dark:opacity-[0.05]"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)`,
            backgroundSize: '20px 20px',
          }}
        />
        <div className="max-w-4xl mx-auto px-4 py-20 relative">
          <div className="text-center mb-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <h2 className="text-2xl md:text-3xl font-bold mb-3">How it works</h2>
            <p className="text-muted-foreground">Three simple steps to document intelligence</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {steps.map((step, index) => {
              const Icon = step.icon
              return (
                <div
                  key={step.number}
                  className="text-center group animate-in fade-in slide-in-from-bottom-4 duration-700"
                  style={{ animationDelay: `${(index + 1) * 100}ms` }}
                >
                  <div className="inline-flex items-center justify-center w-14 h-14 mb-4 bg-primary/10 text-primary rounded-xl transition-all group-hover:scale-110 group-hover:bg-primary/20">
                    <Icon size={26} />
                  </div>
                  <div className="text-xs text-muted-foreground font-medium mb-2 font-mono">
                    {step.number}
                  </div>
                  <h3 className="font-semibold mb-1 text-lg">{step.title}</h3>
                  <p className="text-sm text-muted-foreground">{step.description}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-border/50 relative">
        <div className="max-w-5xl mx-auto px-4 py-20">
          <div className="text-center mb-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <h2 className="text-2xl md:text-3xl font-bold mb-3">Built for productivity</h2>
            <p className="text-muted-foreground">Everything you need to extract insights from your documents</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => {
              const Icon = feature.icon
              return (
                <div
                  key={feature.title}
                  className="p-5 rounded-xl border border-border/50 bg-card/50 hover:bg-card hover:border-border transition-all duration-300 group animate-in fade-in slide-in-from-bottom-4"
                  style={{ animationDelay: `${(index + 1) * 75}ms` }}
                >
                  <div className="w-10 h-10 mb-4 rounded-lg bg-primary/10 text-primary flex items-center justify-center transition-all group-hover:scale-110">
                    <Icon size={20} weight="duotone" />
                  </div>
                  <h3 className="font-semibold mb-1">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="border-t border-border/50 bg-muted/30 relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.08] dark:opacity-[0.05]"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)`,
            backgroundSize: '16px 16px',
          }}
        />
        {/* Decorative gradient */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[200px] bg-primary/5 rounded-full blur-3xl" />

        <div className="max-w-2xl mx-auto px-4 py-20 text-center relative">
          <h2 className="text-2xl md:text-3xl font-bold mb-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
            Ready to unlock your documents?
          </h2>
          <p className="text-muted-foreground mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100">
            Start asking questions and get answers with accurate citations in seconds.
          </p>
          <Link href="/documents" className="animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200 inline-block">
            <Button size="lg" className="gap-2 group">
              Get Started Free
              <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 py-6">
        <div className="max-w-4xl mx-auto px-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Cube size={16} weight="fill" className="text-primary" />
            <span className="text-sm font-medium">AetherCore</span>
          </div>
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} AetherCore. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  )
}
