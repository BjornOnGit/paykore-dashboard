import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

// ── Types ────────────────────────────────────────────────────

interface APIKey {
  id: string
  key_prefix: string
  label: string
  environment: 'live' | 'sandbox'
  last_used_at: string | null
  expires_at: string | null
  created_at: string
}

interface ComplianceStatus {
  overall_status: string
}

// ── Helpers ──────────────────────────────────────────────────

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-NG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

// ── Page ─────────────────────────────────────────────────────

export default function APIKeys() {
  const queryClient = useQueryClient()

  // Dialog state
  const [createOpen, setCreateOpen] = useState(false)
  const [revokeTarget, setRevokeTarget] = useState<APIKey | null>(null)
  const [newKeyLabel, setNewKeyLabel] = useState('')
  const [newKeyEnv, setNewKeyEnv] = useState<'live' | 'sandbox'>('sandbox')
  const [createdKey, setCreatedKey] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  // Fetch keys
  const { data: keys = [], isLoading } = useQuery<APIKey[]>({
    queryKey: ['api-keys'],
    queryFn: async () => {
    const res = await api.get('/v1/api-keys')
      return res.data.data ?? []
    },
  })

  // Fetch compliance status
  const { data: compliance } = useQuery<ComplianceStatus>({
    queryKey: ['compliance-status'],
    queryFn: async () => {
      const res = await api.get('/v1/partner/compliance/status')
      return res.data.data ?? []
    },
  })

  const isApproved = compliance?.overall_status === 'approved'

  // Create key mutation
  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/v1/api-keys', {
      label: newKeyLabel,
      environment: newKeyEnv,
    })
      return res.data.data ?? []
    },
    onSuccess: (data) => {
      setCreatedKey(data.full_key)
      queryClient.invalidateQueries({ queryKey: ['api-keys'] })
    },
  })

  // Revoke key mutation
  const revokeMutation = useMutation({
    mutationFn: async (keyId: string) => {
      await api.delete(`/v1/api-keys/${keyId}`)
    },
    onSuccess: () => {
      setRevokeTarget(null)
      queryClient.invalidateQueries({ queryKey: ['api-keys'] })
    },
  })

  function handleCreateOpen(env: 'live' | 'sandbox') {
    setNewKeyEnv(env)
    setNewKeyLabel('')
    setCreatedKey(null)
    setCopied(false)
    setCreateOpen(true)
  }

  function handleCopy() {
    if (!createdKey) return
    navigator.clipboard.writeText(createdKey)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handleCreateClose() {
    setCreateOpen(false)
    setCreatedKey(null)
    setNewKeyLabel('')
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">API Keys</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => handleCreateOpen('sandbox')}>
            New Sandbox Key
          </Button>
          <Button
            onClick={() => handleCreateOpen('live')}
            disabled={!isApproved}
            title={!isApproved ? 'Live keys require compliance approval' : undefined}
          >
            New Live Key
          </Button>
        </div>
      </div>

      {/* Live key blocked callout */}
      {!isApproved && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="pt-4">
            <p className="text-sm text-amber-800">
              <strong>Live keys require compliance approval.</strong> Complete your KYB
              checklist first.{' '}
              <a href="/compliance" className="underline font-medium">
                Go to Compliance →
              </a>
            </p>
          </CardContent>
        </Card>
      )}

      {/* Keys table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Your API Keys</CardTitle>
        </CardHeader>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Key</TableHead>
              <TableHead>Label</TableHead>
              <TableHead>Environment</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Last Used</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 6 }).map((_, j) => (
                    <TableCell key={j}>
                      <div className="h-4 bg-muted animate-pulse rounded" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : keys.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-12">
                  No API keys yet. Create one to get started.
                </TableCell>
              </TableRow>
            ) : (
              keys.map((key) => (
                <TableRow key={key.id}>
                  <TableCell className="font-mono text-sm">{key.key_prefix}</TableCell>
                  <TableCell>{key.label || '—'}</TableCell>
                  <TableCell>
                    <Badge variant={key.environment === 'live' ? 'default' : 'secondary'}>
                      {key.environment}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(key.created_at)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(key.last_used_at)}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setRevokeTarget(key)}
                    >
                      Revoke
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Create key dialog */}
      <Dialog open={createOpen} onOpenChange={(open) => !open && handleCreateClose()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              Create {newKeyEnv === 'live' ? 'Live' : 'Sandbox'} API Key
            </DialogTitle>
          </DialogHeader>

          {createdKey ? (
            // One-time key display
            <div className="space-y-4">
              <div className="rounded-md bg-muted p-3 space-y-2">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                  Your new API key
                </p>
                <p className="font-mono text-sm break-all">{createdKey}</p>
              </div>
              <p className="text-sm text-destructive font-medium">
                ⚠ Copy this key now. It will not be shown again.
              </p>
              <Button className="w-full" onClick={handleCopy}>
                {copied ? '✓ Copied!' : 'Copy to clipboard'}
              </Button>
            </div>
          ) : (
            // Creation form
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-sm font-medium" htmlFor="key-label">
                  Label <span className="text-muted-foreground">(optional)</span>
                </label>
                <Input
                  id="key-label"
                  placeholder="e.g. Production server"
                  value={newKeyLabel}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setNewKeyLabel(e.target.value)
                  }
                />
              </div>
              {createMutation.isError && (
                <p className="text-sm text-destructive">Failed to create key. Try again.</p>
              )}
              <DialogFooter>
                <Button variant="outline" onClick={handleCreateClose}>
                  Cancel
                </Button>
                <Button
                  onClick={() => createMutation.mutate()}
                  disabled={createMutation.isPending}
                >
                  {createMutation.isPending ? 'Creating…' : 'Create key'}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Revoke confirmation */}
      <AlertDialog open={!!revokeTarget} onOpenChange={(open) => !open && setRevokeTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke API key?</AlertDialogTitle>
            <AlertDialogDescription>
              The key <span className="font-mono">{revokeTarget?.key_prefix}</span> will be
              permanently revoked. Any applications using it will stop working immediately.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => revokeTarget && revokeMutation.mutate(revokeTarget.id)}
              disabled={revokeMutation.isPending}
            >
              {revokeMutation.isPending ? 'Revoking…' : 'Revoke'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}