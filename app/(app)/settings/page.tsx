'use client'

/**
 * Settings Page
 *
 * Configuration for API keys and preferences.
 */

import { useState, useEffect } from 'react'
import { useTheme } from 'next-themes'
import { Key, Brain, Database, Check, Sun, Moon, Desktop, Lightning } from '@phosphor-icons/react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Field, FieldLabel } from '@/components/ui/field'

/**
 * Popular OpenRouter models for the dropdown hint
 */
const POPULAR_MODELS = [
  'google/gemini-3-flash-preview',
  'google/gemini-2.5-pro-preview-03-25',
  'anthropic/claude-sonnet-4',
  'openai/gpt-4o',
  'openai/gpt-4o-mini',
  'meta-llama/llama-3.3-70b-instruct',
]

export default function SettingsPage() {
  const [saved, setSaved] = useState(false)
  const { theme, setTheme } = useTheme()

  // OpenRouter settings
  const [openrouterKey, setOpenrouterKey] = useState('')
  const [openrouterModel, setOpenrouterModel] = useState('')

  // OpenAI settings
  const [openaiKey, setOpenaiKey] = useState('')

  // Load settings from localStorage on mount
  useEffect(() => {
    const savedOpenrouterKey = localStorage.getItem('aethercore_openrouter_key') || ''
    const savedOpenrouterModel = localStorage.getItem('aethercore_openrouter_model') || ''
    const savedOpenaiKey = localStorage.getItem('aethercore_openai_key') || ''

    setOpenrouterKey(savedOpenrouterKey)
    setOpenrouterModel(savedOpenrouterModel)
    setOpenaiKey(savedOpenaiKey)
  }, [])

  const handleSave = () => {
    // Save to localStorage
    localStorage.setItem('aethercore_openrouter_key', openrouterKey)
    localStorage.setItem('aethercore_openrouter_model', openrouterModel)
    localStorage.setItem('aethercore_openai_key', openaiKey)

    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="container max-w-3xl mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Settings</h1>
        <p className="text-muted-foreground">
          Configure your API keys and preferences.
        </p>
      </div>

      <div className="space-y-6">
        {/* OpenRouter (Default) */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Lightning size={24} className="text-primary" />
              <CardTitle>OpenRouter (Default)</CardTitle>
            </div>
            <CardDescription>
              Use your own OpenRouter API key to access 100+ models including Gemini, Claude, GPT-4, and Llama.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Field>
              <FieldLabel>OpenRouter API Key (Optional)</FieldLabel>
              <Input
                type="password"
                placeholder="sk-or-v1-..."
                autoComplete="off"
                value={openrouterKey}
                onChange={(e) => setOpenrouterKey(e.target.value)}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Get your API key from{' '}
                <a
                  href="https://openrouter.ai/keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  openrouter.ai/keys
                </a>
              </p>
            </Field>
            <Field>
              <FieldLabel>Model (Optional)</FieldLabel>
              <Input
                type="text"
                placeholder="google/gemini-3-flash-preview"
                value={openrouterModel}
                onChange={(e) => setOpenrouterModel(e.target.value)}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Popular models: {POPULAR_MODELS.slice(0, 3).join(', ')}
              </p>
            </Field>
          </CardContent>
        </Card>

        {/* OpenAI (Alternative) */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Brain size={24} className="text-primary" />
              <CardTitle>OpenAI (Alternative)</CardTitle>
            </div>
            <CardDescription>
              Use your own OpenAI API key directly for GPT models.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Field>
              <FieldLabel>OpenAI API Key (Optional)</FieldLabel>
              <Input
                type="password"
                placeholder="sk-..."
                autoComplete="off"
                value={openaiKey}
                onChange={(e) => setOpenaiKey(e.target.value)}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Used for chat completions and text embeddings.
              </p>
            </Field>
          </CardContent>
        </Card>

        {/* Vector Store */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Database size={24} className="text-primary" />
              <CardTitle>Vector Store</CardTitle>
            </div>
            <CardDescription>
              Optionally bring your own Pinecone index.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Field>
              <FieldLabel>Pinecone API Key (Optional)</FieldLabel>
              <Input
                type="password"
                placeholder="Your Pinecone API key"
                autoComplete="off"
              />
            </Field>
            <Field>
              <FieldLabel>Pinecone Index Name (Optional)</FieldLabel>
              <Input
                placeholder="my-index"
              />
            </Field>
            <p className="text-xs text-muted-foreground">
              Leave empty to use the default shared vector store.
            </p>
          </CardContent>
        </Card>

        {/* Appearance */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Sun size={24} className="text-primary" />
              <CardTitle>Appearance</CardTitle>
            </div>
            <CardDescription>
              Customize the look and feel of the application.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Field>
              <FieldLabel>Theme</FieldLabel>
              <div className="flex gap-2 mt-2">
                <Button
                  variant={theme === 'light' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTheme('light')}
                  className="flex-1"
                >
                  <Sun size={16} className="mr-2" />
                  Light
                </Button>
                <Button
                  variant={theme === 'dark' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTheme('dark')}
                  className="flex-1"
                >
                  <Moon size={16} className="mr-2" />
                  Dark
                </Button>
                <Button
                  variant={theme === 'system' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTheme('system')}
                  className="flex-1"
                >
                  <Desktop size={16} className="mr-2" />
                  System
                </Button>
              </div>
            </Field>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saved}>
            {saved ? (
              <>
                <Check size={16} className="mr-2" />
                Saved
              </>
            ) : (
              'Save Settings'
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
