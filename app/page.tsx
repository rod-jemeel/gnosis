import Link from 'next/link'
import { ArrowRight, Files, Chat, Lightning } from '@phosphor-icons/react/dist/ssr'
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { buttonVariants } from '@/components/ui/button-variants'
import { cn } from '@/lib/utils'

export default function HomePage() {
  return (
    <div className="container max-w-5xl mx-auto py-16 px-4">
      {/* Hero */}
      <div className="text-center mb-16">
        <h1 className="text-4xl md:text-5xl font-bold mb-4">
          Ask Questions About Your PDFs
        </h1>
        <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
          Upload documents, ask questions in natural language, and get answers
          with precise citations that link directly to the source pages.
        </p>
        <div className="flex gap-4 justify-center">
          <Link
            href="/documents"
            className={cn(buttonVariants({ size: 'lg' }), 'gap-2')}
          >
            Get Started
            <ArrowRight size={20} />
          </Link>
          <Link
            href="/chat"
            className={cn(buttonVariants({ variant: 'outline', size: 'lg' }))}
          >
            Try Chat
          </Link>
        </div>
      </div>

      {/* Features */}
      <div className="grid md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <Files size={32} className="text-primary mb-2" weight="duotone" />
            <CardTitle>Upload PDFs</CardTitle>
            <CardDescription>
              Drag and drop your PDF documents. We extract and index all content
              automatically.
            </CardDescription>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <Chat size={32} className="text-primary mb-2" weight="duotone" />
            <CardTitle>Ask Questions</CardTitle>
            <CardDescription>
              Ask anything about your documents in natural language. Get accurate,
              contextual answers.
            </CardDescription>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <Lightning size={32} className="text-primary mb-2" weight="duotone" />
            <CardTitle>Page Citations</CardTitle>
            <CardDescription>
              Every answer includes citations. Click to jump directly to the
              exact page in the PDF.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    </div>
  )
}
