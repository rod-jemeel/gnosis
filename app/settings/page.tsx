'use client'

/**
 * Settings Page
 *
 * Configuration for API keys and preferences.
 */

import { useState } from 'react'
import { useTheme } from 'next-themes'
import { Key, Brain, Database, Check, Sun, Moon, Desktop } from '@phosphor-icons/react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Field, FieldLabel } from '@/components/ui/field'

export default function SettingsPage() {
  const [saved, setSaved] = useState(false)
  const { theme, setTheme } = useTheme()

  const handleSave = () => {
    // TODO: Implement settings save
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
        {/* LLM API Keys */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Brain size={24} className="text-primary" />
              <CardTitle>LLM Provider</CardTitle>
            </div>
            <CardDescription>
              Configure your OpenAI API key for chat and embeddings.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Field>
              <FieldLabel>OpenAI API Key</FieldLabel>
              <Input
                type="password"
                placeholder="sk-..."
                autoComplete="off"
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
