import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import { Card, CardContent } from '@/components/ui/card'
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

interface WebhookEndpoint {
  id: string
  url: string
  events: string[]
  is_active: boolean
  last_success_at: string | null
  created_at: string
}

interface WebhookDelivery {
  id: string
  event_type: string
  status: string
  attempts: number
  response_code: number | null
  created_at: string
}

// ── Constants ────────────────────────────────────────────────

const ALL_EVENTS = [
  'transaction.completed',
  'transaction.failed',
  'wallet.activated',
  'wallet.activation_failed',
  'kyc.verified',
  'kyc.failed',
  'settlement.paid',
  'compliance.approved',
  'compliance.rejected',
]

// ── Helpers ──────────────────────────────────────────────────

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-NG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const DELIVERY_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  delivered: 'default',
  pending: 'outline',
  failed: 'destructive',
  abandoned: 'destructive',
}

// ── Delivery Log (expandable) ────────────────────────────────

function DeliveryLog({ endpointId }: { endpointId: string }) {
  const { data: deliveries = [], isLoading } = useQuery<WebhookDelivery[]>({
    queryKey: ['webhook-deliveries', endpointId],
    queryFn: async () => {
      const res = await api.get(`/dashboard/webhooks/${endpointId}/deliveries?limit=10`)
      return res.data.data
    },
  })

  if (isLoading) {
    return (
      <div className="space-y-2 p-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-4 bg-muted animate-pulse rounded" />
        ))}
      </div>
    )
  }

  if (deliveries.length === 0) {
    return (
      <p className="text-sm text-muted-foreground p-4">No deliveries yet.</p>
    )
  }

  return (
    <div className="divide-y">
      {deliveries.map((d) => (
        <div key={d.id} className="flex items-center justify-between px-4 py-2 text-sm">
          <div className="flex items-center gap-3">
            <Badge variant={DELIVERY_VARIANT[d.status] ?? 'outline'} className="text-xs">
              {d.status}
            </Badge>
            <span className="font-mono text-xs text-muted-foreground">{d.event_type}</span>
          </div>
          <div className="flex items-center gap-4 text-muted-foreground text-xs">
            {d.response_code && <span>HTTP {d.response_code}</span>}
            <span>{d.attempts} attempt{d.attempts !== 1 ? 's' : ''}</span>
            <span>{formatDate(d.created_at)}</span>
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Endpoint Row ─────────────────────────────────────────────

function EndpointRow({
  endpoint,
  onDelete,
}: {
  endpoint: WebhookEndpoint
  onDelete: (id: string) => void
}) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className={`border rounded-lg overflow-hidden ${!endpoint.is_active ? 'opacity-50' : ''}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4">
        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm truncate">{endpoint.url}</span>
            {!endpoint.is_active && (
              <Badge variant="outline" className="text-xs shrink-0">Inactive</Badge>
            )}
          </div>
          <div className="flex flex-wrap gap-1">
            {endpoint.events.map((e) => (
              <span
                key={e}
                className="text-xs bg-muted text-muted-foreground rounded px-1.5 py-0.5"
              >
                {e}
              </span>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Last success: {formatDate(endpoint.last_success_at)}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpanded((v) => !v)}
          >
            {expanded ? 'Hide log' : 'Show log'}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive"
            onClick={() => onDelete(endpoint.id)}
          >
            Delete
          </Button>
        </div>
      </div>

      {/* Delivery log */}
      {expanded && (
        <div className="border-t bg-muted/30">
          <DeliveryLog endpointId={endpoint.id} />
        </div>
      )}
    </div>
  )
}

// ── Register Dialog ──────────────────────────────────────────

function RegisterDialog({
  open,
  onClose,
  onSuccess,
}: {
  open: boolean
  onClose: () => void
  onSuccess: () => void
}) {
  const [url, setUrl] = useState('')
  const [selectedEvents, setSelectedEvents] = useState<string[]>([])
  const [urlError, setUrlError] = useState('')
  const [error, setError] = useState('')

  function toggleEvent(event: string) {
    setSelectedEvents((prev) =>
      prev.includes(event) ? prev.filter((e) => e !== event) : [...prev, event]
    )
  }

  function validateUrl(value: string): boolean {
    if (!value.startsWith('https://')) {
      setUrlError('URL must start with https://')
      return false
    }
    setUrlError('')
    return true
  }

  const mutation = useMutation({
    mutationFn: async () => {
      await api.post('/v1/webhooks', { url, events: selectedEvents })
    },
    onSuccess: () => {
      onSuccess()
      onClose()
      setUrl('')
      setSelectedEvents([])
      setError('')
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setError(msg ?? 'Failed to register endpoint.')
    },
  })

  function handleSubmit() {
    if (!validateUrl(url)) return
    if (selectedEvents.length === 0) {
      setError('Select at least one event.')
      return
    }
    mutation.mutate()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Register Webhook Endpoint</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-medium" htmlFor="webhook-url">
              URL
            </label>
            <Input
              id="webhook-url"
              type="url"
              placeholder="https://yourapp.com/webhooks/paykore"
              value={url}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                setUrl(e.target.value)
                if (urlError) validateUrl(e.target.value)
              }}
            />
            {urlError && <p className="text-xs text-destructive">{urlError}</p>}
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Events</p>
            <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto pr-1">
              {ALL_EVENTS.map((event) => (
                <label key={event} className="flex items-center gap-2 cursor-pointer text-sm">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded border-border"
                    checked={selectedEvents.includes(event)}
                    onChange={() => toggleEvent(event)}
                  />
                  <span className="font-mono text-xs">{event}</span>
                </label>
              ))}
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-auto p-0 text-xs text-muted-foreground"
              onClick={() =>
                setSelectedEvents(
                  selectedEvents.length === ALL_EVENTS.length ? [] : [...ALL_EVENTS]
                )
              }
            >
              {selectedEvents.length === ALL_EVENTS.length ? 'Deselect all' : 'Select all'}
            </Button>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={handleSubmit}
            disabled={mutation.isPending || !url || selectedEvents.length === 0}
          >
            {mutation.isPending ? 'Registering…' : 'Register'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Page ─────────────────────────────────────────────────────

export default function Webhooks() {
  const queryClient = useQueryClient()
  const [registerOpen, setRegisterOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)

  const { data: endpoints = [], isLoading, isError } = useQuery<WebhookEndpoint[]>({
    queryKey: ['webhooks'],
    queryFn: async () => {
      const res = await api.get('/v1/webhooks')
      return res.data.data
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/v1/webhooks/${id}`)
    },
    onSuccess: () => {
      setDeleteTarget(null)
      queryClient.invalidateQueries({ queryKey: ['webhooks'] })
    },
  })

  function handleSuccess() {
    queryClient.invalidateQueries({ queryKey: ['webhooks'] })
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Webhooks</h1>
        <Button onClick={() => setRegisterOpen(true)}>Register Endpoint</Button>
      </div>

      {isError && (
        <p className="text-sm text-destructive">Failed to load webhooks. Please refresh.</p>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="h-24 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      ) : endpoints.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground text-sm">No webhook endpoints registered yet.</p>
            <Button className="mt-4" onClick={() => setRegisterOpen(true)}>
              Register your first endpoint
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {endpoints.map((ep) => (
            <EndpointRow
              key={ep.id}
              endpoint={ep}
              onDelete={setDeleteTarget}
            />
          ))}
        </div>
      )}

      <RegisterDialog
        open={registerOpen}
        onClose={() => setRegisterOpen(false)}
        onSuccess={handleSuccess}
      />

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete webhook endpoint?</AlertDialogTitle>
            <AlertDialogDescription>
              This endpoint will stop receiving events immediately. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Deleting…' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}