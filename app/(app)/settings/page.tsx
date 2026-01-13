'use client'

/**
 * Settings Page
 *
 * Configuration for account, API keys, and preferences.
 */

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { useTheme } from 'next-themes'
import {
  Key,
  Brain,
  Database,
  Check,
  Sun,
  Moon,
  Desktop,
  Lightning,
  User,
  EnvelopeSimple,
  Lock,
  Spinner,
  Warning,
  SignOut,
  Eye,
  EyeSlash,
} from '@phosphor-icons/react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Field, FieldLabel } from '@/components/ui/field'
import { useAuth } from '@/lib/auth'
import { createClient } from '@/lib/supabase/client'

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
  const searchParams = useSearchParams()
  const { user, signOut } = useAuth()
  const { theme, setTheme } = useTheme()
  const supabase = createClient()

  // Success message from URL (e.g., after email change)
  const successMessage = searchParams.get('message')

  // API settings state
  const [saved, setSaved] = useState(false)
  const [openrouterKey, setOpenrouterKey] = useState('')
  const [openrouterModel, setOpenrouterModel] = useState('')
  const [openaiKey, setOpenaiKey] = useState('')

  // Account settings state
  const [newEmail, setNewEmail] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPasswords, setShowPasswords] = useState(false)
  const [emailLoading, setEmailLoading] = useState(false)
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [accountError, setAccountError] = useState<string | null>(null)
  const [accountSuccess, setAccountSuccess] = useState<string | null>(null)

  // Load settings from localStorage on mount
  useEffect(() => {
    const savedOpenrouterKey = localStorage.getItem('gnosis_openrouter_key') || ''
    const savedOpenrouterModel = localStorage.getItem('gnosis_openrouter_model') || ''
    const savedOpenaiKey = localStorage.getItem('gnosis_openai_key') || ''

    setOpenrouterKey(savedOpenrouterKey)
    setOpenrouterModel(savedOpenrouterModel)
    setOpenaiKey(savedOpenaiKey)
  }, [])

  // Show success message from URL
  useEffect(() => {
    if (successMessage) {
      setAccountSuccess(successMessage)
      // Clear after 5 seconds
      const timer = setTimeout(() => setAccountSuccess(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [successMessage])

  const handleSaveApiSettings = () => {
    localStorage.setItem('gnosis_openrouter_key', openrouterKey)
    localStorage.setItem('gnosis_openrouter_model', openrouterModel)
    localStorage.setItem('gnosis_openai_key', openaiKey)

    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleEmailChange = async (e: React.FormEvent) => {
    e.preventDefault()
    setAccountError(null)
    setAccountSuccess(null)

    if (!newEmail || newEmail === user?.email) {
      setAccountError('Please enter a new email address')
      return
    }

    setEmailLoading(true)

    const { error } = await supabase.auth.updateUser(
      { email: newEmail },
      { emailRedirectTo: `${window.location.origin}/auth/callback?type=email_change` }
    )

    if (error) {
      setAccountError(error.message)
      setEmailLoading(false)
      return
    }

    setAccountSuccess('Check your new email for a confirmation link')
    setNewEmail('')
    setEmailLoading(false)
  }

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    setAccountError(null)
    setAccountSuccess(null)

    if (newPassword !== confirmPassword) {
      setAccountError('New passwords do not match')
      return
    }

    if (newPassword.length < 6) {
      setAccountError('Password must be at least 6 characters')
      return
    }

    setPasswordLoading(true)

    // First verify current password by signing in
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user?.email || '',
      password: currentPassword,
    })

    if (signInError) {
      setAccountError('Current password is incorrect')
      setPasswordLoading(false)
      return
    }

    // Update to new password
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    })

    if (error) {
      setAccountError(error.message)
      setPasswordLoading(false)
      return
    }

    setAccountSuccess('Password updated successfully')
    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
    setPasswordLoading(false)
  }

  const handleSignOut = async () => {
    await signOut()
  }

  return (
    <div className="container max-w-3xl mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account, API keys, and preferences.
        </p>
      </div>

      <div className="space-y-6">
        {/* Account Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <User size={24} className="text-primary" />
              <CardTitle>Account</CardTitle>
            </div>
            <CardDescription>
              Manage your email, password, and account settings.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Success/Error Messages */}
            {accountSuccess && (
              <div className="p-4 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-2">
                <Check size={18} className="text-emerald-500" />
                {accountSuccess}
              </div>
            )}
            {accountError && (
              <div className="p-4 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg flex items-center gap-2">
                <Warning size={18} />
                {accountError}
              </div>
            )}

            {/* Current Email Display */}
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Signed in as</p>
              <p className="font-medium">{user?.email}</p>
            </div>

            {/* Change Email */}
            <form onSubmit={handleEmailChange} className="space-y-4">
              <Field>
                <FieldLabel>Change email</FieldLabel>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <EnvelopeSimple
                      size={18}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                    />
                    <Input
                      type="email"
                      placeholder="New email address"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      className="pl-10"
                      disabled={emailLoading}
                    />
                  </div>
                  <Button type="submit" variant="outline" disabled={emailLoading || !newEmail}>
                    {emailLoading ? (
                      <Spinner className="animate-spin" size={16} />
                    ) : (
                      'Update'
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  You'll receive a confirmation link at your new email.
                </p>
              </Field>
            </form>

            {/* Change Password */}
            <form onSubmit={handlePasswordChange} className="space-y-4 pt-4 border-t border-border">
              <div className="flex items-center justify-between">
                <FieldLabel className="mb-0">Change password</FieldLabel>
                <button
                  type="button"
                  onClick={() => setShowPasswords(!showPasswords)}
                  className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                >
                  {showPasswords ? <EyeSlash size={14} /> : <Eye size={14} />}
                  {showPasswords ? 'Hide' : 'Show'}
                </button>
              </div>

              <Field>
                <div className="relative">
                  <Lock
                    size={18}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  />
                  <Input
                    type={showPasswords ? 'text' : 'password'}
                    placeholder="Current password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="pl-10"
                    disabled={passwordLoading}
                  />
                </div>
              </Field>

              <Field>
                <div className="relative">
                  <Lock
                    size={18}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  />
                  <Input
                    type={showPasswords ? 'text' : 'password'}
                    placeholder="New password (min 6 characters)"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="pl-10"
                    minLength={6}
                    disabled={passwordLoading}
                  />
                </div>
              </Field>

              <Field>
                <div className="relative">
                  <Lock
                    size={18}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  />
                  <Input
                    type={showPasswords ? 'text' : 'password'}
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pl-10"
                    minLength={6}
                    disabled={passwordLoading}
                  />
                </div>
              </Field>

              <Button
                type="submit"
                variant="outline"
                disabled={passwordLoading || !currentPassword || !newPassword || !confirmPassword}
              >
                {passwordLoading ? (
                  <>
                    <Spinner className="animate-spin mr-2" size={16} />
                    Updating...
                  </>
                ) : (
                  'Update password'
                )}
              </Button>
            </form>

            {/* Sign Out */}
            <div className="pt-4 border-t border-border">
              <Button variant="outline" onClick={handleSignOut} className="text-muted-foreground">
                <SignOut size={16} className="mr-2" />
                Sign out
              </Button>
            </div>
          </CardContent>
        </Card>

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

        {/* Save Button for API Settings */}
        <div className="flex justify-end">
          <Button onClick={handleSaveApiSettings} disabled={saved}>
            {saved ? (
              <>
                <Check size={16} className="mr-2" />
                Saved
              </>
            ) : (
              'Save API Settings'
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
