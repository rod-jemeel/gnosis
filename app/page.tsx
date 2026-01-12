import Link from 'next/link'
import { ArrowRight, Files, Chat, Lightning, Sparkle, Shield, Cpu } from '@phosphor-icons/react/dist/ssr'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { buttonVariants } from '@/components/ui/button-variants'
import { cn } from '@/lib/utils'

const features = [
  {
    icon: Files,
    title: 'Upload PDFs',
    description: 'Drag and drop your PDF documents. We extract and index all content automatically with intelligent chunking.',
    gradient: 'from-blue-500/10 to-cyan-500/10',
    iconColor: 'text-blue-500',
  },
  {
    icon: Chat,
    title: 'Ask Questions',
    description: 'Ask anything about your documents in natural language. Get accurate, contextual answers powered by AI.',
    gradient: 'from-purple-500/10 to-pink-500/10',
    iconColor: 'text-purple-500',
  },
  {
    icon: Lightning,
    title: 'Page Citations',
    description: 'Every answer includes precise citations. Click to jump directly to the exact page in the PDF.',
    gradient: 'from-amber-500/10 to-orange-500/10',
    iconColor: 'text-amber-500',
  },
]

const stats = [
  { label: 'Documents Processed', value: '10K+' },
  { label: 'Questions Answered', value: '50K+' },
  { label: 'Accuracy Rate', value: '99%' },
]

export default function HomePage() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Background decorations */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse-subtle" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse-subtle" style={{ animationDelay: '1.5s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-br from-primary/5 via-transparent to-purple-500/5 rounded-full blur-3xl" />
      </div>

      <div className="container max-w-6xl mx-auto py-16 px-4 md:py-24">
        {/* Hero Section */}
        <div className="text-center mb-20 md:mb-28">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-8 border border-primary/20">
            <Sparkle size={16} weight="fill" className="animate-pulse" />
            <span>AI-Powered Document Intelligence</span>
          </div>

          {/* Main heading */}
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 tracking-tight">
            <span className="block">Ask Questions About</span>
            <span className="block mt-2 bg-gradient-to-r from-primary via-purple-500 to-primary bg-clip-text text-transparent animate-gradient">
              Your PDFs
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">
            Upload documents, ask questions in natural language, and get answers
            with precise citations that link directly to the source pages.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Link
              href="/documents"
              className={cn(
                buttonVariants({ size: 'lg' }),
                'gap-2 shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all duration-300 group'
              )}
            >
              Get Started Free
              <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              href="/chat"
              className={cn(
                buttonVariants({ variant: 'outline', size: 'lg' }),
                'gap-2 hover:bg-muted/50 transition-all duration-300'
              )}
            >
              <Chat size={20} />
              Try the Chat
            </Link>
          </div>

          {/* Trust indicators */}
          <div className="flex flex-wrap items-center justify-center gap-6 md:gap-10 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Shield size={18} className="text-green-500" />
              <span>Enterprise-grade security</span>
            </div>
            <div className="flex items-center gap-2">
              <Cpu size={18} className="text-blue-500" />
              <span>Latest AI models</span>
            </div>
            <div className="flex items-center gap-2">
              <Lightning size={18} className="text-amber-500" />
              <span>Lightning fast</span>
            </div>
          </div>
        </div>

        {/* Features Section */}
        <div className="mb-20">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold mb-4">How It Works</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Three simple steps to unlock insights from your documents
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon
              return (
                <Card
                  key={feature.title}
                  className={cn(
                    'relative overflow-hidden border-0 bg-gradient-to-br',
                    feature.gradient,
                    'card-hover group'
                  )}
                >
                  {/* Step number */}
                  <div className="absolute top-4 right-4 w-8 h-8 rounded-full bg-background/80 flex items-center justify-center text-sm font-bold text-muted-foreground">
                    {index + 1}
                  </div>

                  <CardHeader className="pb-2">
                    <div className={cn(
                      'w-14 h-14 rounded-xl flex items-center justify-center mb-4',
                      'bg-background/80 backdrop-blur-sm shadow-sm',
                      'group-hover:scale-110 transition-transform duration-300'
                    )}>
                      <Icon size={28} className={feature.iconColor} weight="duotone" />
                    </div>
                    <CardTitle className="text-xl">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-base leading-relaxed">
                      {feature.description}
                    </CardDescription>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>

        {/* Stats Section */}
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-purple-500/5 to-primary/5 rounded-2xl" />
          <div className="relative grid grid-cols-3 gap-4 md:gap-8 p-8 md:p-12 rounded-2xl border border-border/50">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-3xl md:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-primary to-purple-500 bg-clip-text text-transparent mb-2">
                  {stat.value}
                </div>
                <div className="text-sm md:text-base text-muted-foreground">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="text-center mt-20">
          <p className="text-muted-foreground mb-6">
            Ready to transform how you interact with documents?
          </p>
          <Link
            href="/documents"
            className={cn(
              buttonVariants({ size: 'lg' }),
              'gap-2 shadow-lg shadow-primary/25'
            )}
          >
            Start Now - It&apos;s Free
            <ArrowRight size={20} />
          </Link>
        </div>
      </div>
    </div>
  )
}
