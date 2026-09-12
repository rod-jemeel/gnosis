'use client'

/**
 * Settings (spec §6.1).
 *
 * Workspace metadata and quotas, membership roster under the explicit
 * privacy policy, provider/privacy disclosure, and appearance. The
 * Supabase account section appears only when real authentication is
 * configured; demo mode shows the demo identity instead. Capability
 * UI that does not exist yet (invitations, BYOK) is not presented as
 * functioning product options.
 */

import { useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import { useSearchParams } from 'next/navigation'
import { useTheme } from 'next-themes'
import {
  ArrowsClockwise,
  Check,
  Database,
  Desktop,
  Eye,
  EyeSlash,
  Lock,
  Moon,
  ShieldCheck,
  SignOut,
  Spinner,
  Sun,
  Trash,
  Users,
  Warning,
  Stack as WorkspaceIcon,
  EnvelopeSimple,
  User,
} from '@phosphor-icons/react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Field, FieldLabel } from '@/components/ui/field'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { useAuth } from '@/lib/auth'
import { isSupabaseConfigured, createClient } from '@/lib/supabase/client'
import { useWorkspace } from '@/lib/workspace'
import { demoStore } from '@/lib/v2'
import type { WorkspaceMember } from '@/lib/v2'
import { formatBytes, formatNumber } from '@/lib/format'

export default function SettingsPage() {
  const searchParams = useSearchParams()
  const { user } = useAuth()
  const { theme, setTheme } = useTheme()
  const { workspace, isDemo, loading: wsLoading, client, refresh } = useWorkspace()

  const [members, setMembers] = useState<WorkspaceMember[]>([])
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  )

  const successMessage = searchParams.get('message')

  useEffect(() => {
    let cancelled = false
    const loadMembers = async () => {
      if (!workspace) return
      try {
        const roster = await client.listMembers(workspace.id)
        if (!cancelled) setMembers(roster)
      } catch {
        if (!cancelled) setMembers([])
      }
    }
    void loadMembers()
    return () => {
      cancelled = true
    }
  }, [workspace, client])

  const usagePct = useMemo(() => {
    if (!workspace) return null
    const q = workspace.quota
    const u = workspace.usage
    return {
      documents: Math.min(100, (u.documentCount / Math.max(1, q.maxDocuments)) * 100),
      storage: Math.min(100, (u.sourceBytes / Math.max(1, q.maxSourceBytes)) * 100),
      chunks: Math.min(100, (u.activeChunks / Math.max(1, q.maxChunks)) * 100),
    }
  }, [workspace])

  return (
    <div className="h-full overflow-y-auto">
      <div className="container max-w-3xl mx-auto space-y-6 px-4 py-8">
        <div className="mb-2">
          <h1 className="mb-1 text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground">
            Workspace, membership, privacy, and preferences.
          </p>
        </div>

        {successMessage && (
          <div className="flex items-center gap-2 border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-700 dark:text-emerald-400">
            <Check size={18} />
            {successMessage}
          </div>
        )}

        {/* Workspace */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <WorkspaceIcon size={24} className="text-primary" />
                <CardTitle>Workspace</CardTitle>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => void refresh()}
                disabled={wsLoading}
                title="Refresh"
              >
                <ArrowsClockwise size={16} className={wsLoading ? 'animate-spin' : ''} />
              </Button>
            </div>
            <CardDescription>
              Documents are workspace-visible; chat sessions stay private to their creator.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex flex-wrap items-center gap-2 bg-muted/50 p-4">
              <span className="text-sm font-medium">{workspace?.name ?? '—'}</span>
              <Badge variant="outline">{workspace?.role ?? '—'}</Badge>
              <span className="ml-auto text-xs text-muted-foreground">
                Corpus generation {workspace?.corpusGeneration ?? '—'}
              </span>
            </div>

            {usagePct && workspace && (
              <>
                <QuotaRow
                  label="Documents"
                  used={formatNumber(workspace.usage.documentCount)}
                  total={formatNumber(workspace.quota.maxDocuments)}
                  pct={usagePct.documents}
                />
                <QuotaRow
                  label="Stored source bytes"
                  used={formatBytes(workspace.usage.sourceBytes)}
                  total={formatBytes(workspace.quota.maxSourceBytes)}
                  pct={usagePct.storage}
                />
                <QuotaRow
                  label="Active indexed chunks"
                  used={formatNumber(workspace.usage.activeChunks)}
                  total={formatNumber(workspace.quota.maxChunks)}
                  pct={usagePct.chunks}
                />
                <p className="text-xs text-muted-foreground">
                  {formatNumber(workspace.usage.runsThisMonth)} answer runs this month. Uploads
                  are capped at {formatBytes(workspace.quota.maxUploadBytes)} / 200 pages, and
                  each question may select up to {workspace.quota.maxSelectedDocuments}{' '}
                  documents.
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Members */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Users size={24} className="text-primary" />
              <CardTitle>Members</CardTitle>
            </div>
            <CardDescription>
              Viewer, editor, and owner roles are enforced server-side. The roster is only
              visible to members of this workspace — there is no user directory search.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {members.map((member) => (
              <div
                key={member.userId}
                className="flex items-center gap-3 border px-3 py-2 text-sm"
              >
                <span className="flex size-7 items-center justify-center bg-primary/10 text-xs font-medium text-primary">
                  {member.email.slice(0, 2).toUpperCase()}
                </span>
                <span className="min-w-0 flex-1 truncate">{member.email}</span>
                <Badge variant="outline">{member.role}</Badge>
                {member.userId === user?.id && (
                  <span className="text-[10px] text-muted-foreground">you</span>
                )}
              </div>
            ))}
            <p className="text-xs text-muted-foreground">
              Email invitations are not enabled in this release. Owners add already-verified
              members through controlled provisioning.
            </p>
          </CardContent>
        </Card>

        {/* Privacy & providers */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <ShieldCheck size={24} className="text-primary" />
              <CardTitle>Privacy &amp; providers</CardTitle>
            </div>
            <CardDescription>
              What leaves the workspace, and what is logged.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {isDemo ? (
              <>
                <Disclosure
                  icon={<Database size={16} />}
                  title="Demo mode runs entirely in your browser"
                  body="Documents, questions, answers, and simulated provider calls never leave this device. Nothing is uploaded anywhere."
                />
                <Disclosure
                  icon={<Lock size={16} />}
                  title="Simulated providers"
                  body="Embedding, reranking, and answer generation are simulated locally by an extractive engine. Timings and usage numbers are representative, not measured provider behavior."
                />
              </>
            ) : (
              <>
                <Disclosure
                  icon={<Database size={16} />}
                  title="Deployment-managed providers"
                  body="Embedding, retrieval, reranking, and generation run with server-side credentials from an approved allowlist. Workspace approval for one provider does not extend to another."
                />
                <Disclosure
                  icon={<Lock size={16} />}
                  title="Content logging is off by default"
                  body="Logs carry IDs, stage names, counts, latency, and safe error codes — not prompts, document text, or answers. Provider egress covers only the text each role requires."
                />
              </>
            )}
            <Disclosure
              icon={<Trash size={16} />}
              title="Deletion policy"
              body="Deleting a document revokes access immediately; stored files, extracted text, vectors, and dependent answers are purged by a durable task with a 24-hour objective. Immutable backups expire on their own schedule."
            />
            <Disclosure
              icon={<Eye size={16} />}
              title="Private sessions"
              body="Chat sessions are private to their creator. Workspace owners see aggregate usage and ingestion diagnostics without reading private conversations."
            />
          </CardContent>
        </Card>

        {/* Appearance */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Sun size={24} className="text-primary" />
              <CardTitle>Appearance</CardTitle>
            </div>
            <CardDescription>Theme preference for this device.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <ThemeButton
                active={mounted && theme === 'light'}
                onClick={() => setTheme('light')}
                icon={<Sun size={16} />}
                label="Light"
              />
              <ThemeButton
                active={mounted && theme === 'dark'}
                onClick={() => setTheme('dark')}
                icon={<Moon size={16} />}
                label="Dark"
              />
              <ThemeButton
                active={mounted && theme === 'system'}
                onClick={() => setTheme('system')}
                icon={<Desktop size={16} />}
                label="System"
              />
            </div>
          </CardContent>
        </Card>

        {/* Account (real auth only) */}
        {isSupabaseConfigured() ? (
          <AccountCard />
        ) : (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <User size={24} className="text-primary" />
                <CardTitle>Account</CardTitle>
              </div>
              <CardDescription>Demo mode uses a local identity.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p className="bg-muted/50 p-4">
                Signed in as <span className="font-medium">{user?.email}</span> (demo identity).
              </p>
              <p className="text-xs text-muted-foreground">
                Configure Supabase authentication to enable real accounts — see{' '}
                <code>.env.example</code>.
              </p>
              <Button
                variant="outline"
                onClick={() => {
                  demoStore.reset()
                  window.location.href = window.location.origin + '/'
                }}
              >
                <ArrowsClockwise size={16} className="mr-2" />
                Reset demo data
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

function QuotaRow({
  label,
  used,
  total,
  pct,
}: {
  label: string
  used: string
  total: string
  pct: number
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">
          {used} / {total}
        </span>
      </div>
      <Progress value={pct} className="h-2" />
    </div>
  )
}

function Disclosure({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode
  title: string
  body: string
}) {
  return (
    <div className="flex gap-3 border px-3 py-2.5">
      <span className="mt-0.5 shrink-0 text-primary">{icon}</span>
      <div>
        <p className="text-sm font-medium">{title}</p>
        <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{body}</p>
      </div>
    </div>
  )
}

function ThemeButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  label: string
}) {
  return (
    <Button variant={active ? 'default' : 'outline'} size="sm" className="flex-1" onClick={onClick}>
      {icon}
      <span className="ml-2">{label}</span>
    </Button>
  )
}

/* ------------------------------------------------------------------ */
/* Supabase account management (rendered only when configured)         */
/* ------------------------------------------------------------------ */

function AccountCard() {
  const { user, signOut } = useAuth()
  const supabase = useMemo(() => createClient(), [])
  const [newEmail, setNewEmail] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPasswords, setShowPasswords] = useState(false)
  const [emailLoading, setEmailLoading] = useState(false)
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [deleteConfirmation, setDeleteConfirmation] = useState('')
  const [deleteLoading, setDeleteLoading] = useState(false)

  if (!supabase) return null

  const handleEmailChange = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    if (!newEmail || newEmail === user?.email) {
      setError('Please enter a new email address')
      return
    }
    setEmailLoading(true)
    const { error } = await supabase.auth.updateUser(
      { email: newEmail },
      { emailRedirectTo: `${window.location.origin}/auth/callback?type=email_change` }
    )
    if (error) {
      setError(error.message)
    } else {
      setSuccess('Check your new email for a confirmation link')
      setNewEmail('')
    }
    setEmailLoading(false)
  }

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match')
      return
    }
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }
    setPasswordLoading(true)
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user?.email || '',
      password: currentPassword,
    })
    if (signInError) {
      setError('Current password is incorrect')
      setPasswordLoading(false)
      return
    }
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) {
      setError(error.message)
    } else {
      setSuccess('Password updated successfully')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    }
    setPasswordLoading(false)
  }

  const handleDeleteAccount = async () => {
    if (deleteConfirmation !== 'DELETE') return
    setDeleteLoading(true)
    setError(null)
    const { error } = await supabase.rpc('delete_user_account')
    if (error) {
      if (error.message.includes('function') || error.code === '42883') {
        setError('Account deletion requires server setup. Please contact support.')
      } else {
        setError(error.message)
      }
      setDeleteLoading(false)
      return
    }
    await signOut()
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <User size={24} className="text-primary" />
            <CardTitle>Account</CardTitle>
          </div>
          <CardDescription>Manage your email, password, and session.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {success && (
            <div className="flex items-center gap-2 border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-700 dark:text-emerald-400">
              <Check size={18} />
              {success}
            </div>
          )}
          {error && (
            <div className="flex items-center gap-2 border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
              <Warning size={18} />
              {error}
            </div>
          )}

          <div className="bg-muted/50 p-4">
            <p className="mb-1 text-sm text-muted-foreground">Signed in as</p>
            <p className="font-medium">{user?.email}</p>
          </div>

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
                  {emailLoading ? <Spinner className="animate-spin" size={16} /> : 'Update'}
                </Button>
              </div>
            </Field>
          </form>

          <form
            onSubmit={handlePasswordChange}
            className="space-y-4 border-t border-border pt-4"
          >
            <div className="flex items-center justify-between">
              <FieldLabel className="mb-0">Change password</FieldLabel>
              <button
                type="button"
                onClick={() => setShowPasswords(!showPasswords)}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
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
                  <Spinner className="mr-2 animate-spin" size={16} />
                  Updating…
                </>
              ) : (
                'Update password'
              )}
            </Button>
          </form>

          <div className="border-t border-border pt-4">
            <Button variant="outline" onClick={() => void signOut()} className="text-muted-foreground">
              <SignOut size={16} className="mr-2" />
              Sign out
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-destructive/50">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Trash size={24} className="text-destructive" />
            <CardTitle className="text-destructive">Danger Zone</CardTitle>
          </div>
          <CardDescription>Irreversible and destructive actions.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between border border-destructive/20 bg-destructive/5 p-4">
            <div>
              <h4 className="text-sm font-medium">Delete account</h4>
              <p className="mt-1 text-xs text-muted-foreground">
                Permanently delete your account and all associated data.
              </p>
            </div>
            <AlertDialog>
              <AlertDialogTrigger variant="destructive" size="sm">
                Delete Account
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription className="space-y-3">
                    <p>
                      This action cannot be undone. This will permanently delete your account
                      and remove all your data including:
                    </p>
                    <ul className="list-inside list-disc space-y-1 text-sm">
                      <li>All uploaded documents</li>
                      <li>Chat history and sessions</li>
                      <li>Saved settings and preferences</li>
                      <li>API usage history</li>
                    </ul>
                    <div className="pt-2">
                      <p className="mb-2 text-sm font-medium text-foreground">
                        Type <span className="bg-muted px-1 font-mono">DELETE</span> to confirm:
                      </p>
                      <Input
                        value={deleteConfirmation}
                        onChange={(e) => setDeleteConfirmation(e.target.value)}
                        placeholder="Type DELETE"
                        className="font-mono"
                      />
                    </div>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel onClick={() => setDeleteConfirmation('')}>
                    Cancel
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => void handleDeleteAccount()}
                    disabled={deleteConfirmation !== 'DELETE' || deleteLoading}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {deleteLoading ? (
                      <>
                        <Spinner className="mr-2 animate-spin" size={16} />
                        Deleting…
                      </>
                    ) : (
                      'Delete my account'
                    )}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>
    </>
  )
}
