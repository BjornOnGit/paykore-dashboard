import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

// ── Types ────────────────────────────────────────────────────

interface SettlementRun {
  id: string
  period_start: string
  period_end: string
  gross_amount: number
  fee_amount: number
  net_amount: number
  transaction_count: number
  status: string
  bank_account: BankAccount | null
  created_at: string
}

interface SettlementItem {
  id: string
  transaction_id: string
  amount: number
  fee: number
  created_at: string
}

interface BankAccount {
  id: string
  bank_code: string
  account_number: string
  account_name: string
  is_primary: boolean
}

// ── Helpers ──────────────────────────────────────────────────

function formatNaira(kobo: number): string {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
  }).format(kobo / 100)
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-NG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  completed: 'default',
  processing: 'secondary',
  pending: 'outline',
  failed: 'destructive',
}

// ── Settlement Items (expandable) ────────────────────────────

function SettlementItems({ runId }: { runId: string }) {
  const { data: items = [], isLoading } = useQuery<SettlementItem[]>({
    queryKey: ['settlement-items', runId],
    queryFn: async () => {
      const res = await api.get(`/dashboard/settlements/${runId}/items`)
      return res.data.data
    },
  })

  if (isLoading) {
    return (
      <div className="p-4 space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-4 bg-muted animate-pulse rounded" />
        ))}
      </div>
    )
  }

  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground p-4">No items found.</p>
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Transaction ID</TableHead>
          <TableHead>Amount</TableHead>
          <TableHead>Fee</TableHead>
          <TableHead>Net</TableHead>
          <TableHead>Date</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((item) => (
          <TableRow key={item.id}>
            <TableCell className="font-mono text-xs">{item.transaction_id}</TableCell>
            <TableCell>{formatNaira(item.amount)}</TableCell>
            <TableCell>{formatNaira(item.fee)}</TableCell>
            <TableCell>{formatNaira(item.amount - item.fee)}</TableCell>
            <TableCell className="text-muted-foreground">{formatDate(item.created_at)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

// ── Settlement Row ────────────────────────────────────────────

function SettlementRow({ run }: { run: SettlementRun }) {
  const [expanded, setExpanded] = useState(false)

  function downloadCSV() {
    window.open(`/api/dashboard/settlements/${run.id}/csv`, '_blank')
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="flex items-center justify-between p-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">
              {formatDate(run.period_start)} – {formatDate(run.period_end)}
            </span>
            <Badge variant={STATUS_VARIANT[run.status] ?? 'outline'}>{run.status}</Badge>
          </div>
          <div className="flex gap-4 text-sm text-muted-foreground">
            <span>Gross: {formatNaira(run.gross_amount)}</span>
            <span>Fee: {formatNaira(run.fee_amount)}</span>
            <span className="font-medium text-foreground">
              Net: {formatNaira(run.net_amount)}
            </span>
            <span>{run.transaction_count} txns</span>
          </div>
          {run.bank_account && (
            <p className="text-xs text-muted-foreground">
              → {run.bank_account.account_name} ({run.bank_account.bank_code}{' '}
              {run.bank_account.account_number})
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-4">
          <Button variant="outline" size="sm" onClick={downloadCSV}>
            CSV
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpanded((v) => !v)}
          >
            {expanded ? 'Hide items' : 'Show items'}
          </Button>
        </div>
      </div>

      {expanded && (
        <div className="border-t bg-muted/30">
          <SettlementItems runId={run.id} />
        </div>
      )}
    </div>
  )
}

// ── Bank Account Section ──────────────────────────────────────

function BankAccountSection() {
  const queryClient = useQueryClient()

  const { data: accounts = [], isLoading } = useQuery<BankAccount[]>({
    queryKey: ['bank-accounts'],
    queryFn: async () => {
      const res = await api.get('/dashboard/bank-accounts')
      return res.data.data
    },
  })

  const [bankCode, setBankCode] = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  const [resolvedName, setResolvedName] = useState('')
  const [lookupError, setLookupError] = useState('')
  const [lookupLoading, setLookupLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleLookup() {
    if (bankCode.length < 3 || accountNumber.length !== 10) {
      setLookupError('Enter a valid bank code and 10-digit account number.')
      return
    }
    setLookupError('')
    setResolvedName('')
    setLookupLoading(true)
    try {
      const res = await api.get(
        `/dashboard/bank-accounts/lookup?bank_code=${bankCode}&account_number=${accountNumber}`
      )
      setResolvedName(res.data.data.account_name)
    } catch {
      setLookupError('Could not resolve account. Check the details and try again.')
    } finally {
      setLookupLoading(false)
    }
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      await api.post('/dashboard/bank-accounts', {
        bank_code: bankCode,
        account_number: accountNumber,
        account_name: resolvedName,
      })
    },
    onSuccess: () => {
      setBankCode('')
      setAccountNumber('')
      setResolvedName('')
      setError('')
      queryClient.invalidateQueries({ queryKey: ['bank-accounts'] })
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setError(msg ?? 'Failed to save bank account.')
    },
  })

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Bank Accounts</h2>

      {/* Existing accounts */}
      {isLoading ? (
        <div className="h-16 bg-muted animate-pulse rounded" />
      ) : accounts.length === 0 ? (
        <p className="text-sm text-muted-foreground">No bank accounts registered yet.</p>
      ) : (
        <div className="space-y-2">
          {accounts.map((a) => (
            <Card key={a.id}>
              <CardContent className="py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{a.account_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {a.bank_code} · {a.account_number}
                  </p>
                </div>
                {a.is_primary && (
                  <Badge variant="secondary">Primary</Badge>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add new account */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Add Bank Account</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-3">
            <div className="space-y-1 w-32">
              <label className="text-xs font-medium">Bank Code</label>
              <Input
                placeholder="044"
                value={bankCode}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  setBankCode(e.target.value)
                  setResolvedName('')
                }}
              />
            </div>
            <div className="space-y-1 flex-1">
              <label className="text-xs font-medium">Account Number</label>
              <Input
                placeholder="0123456789"
                maxLength={10}
                value={accountNumber}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  setAccountNumber(e.target.value)
                  setResolvedName('')
                }}
              />
            </div>
            <div className="flex items-end">
              <Button
                variant="outline"
                onClick={handleLookup}
                disabled={lookupLoading}
              >
                {lookupLoading ? 'Looking up…' : 'Verify'}
              </Button>
            </div>
          </div>

          {lookupError && <p className="text-xs text-destructive">{lookupError}</p>}

          {resolvedName && (
            <div className="rounded-md bg-muted px-3 py-2 text-sm">
              <span className="text-muted-foreground">Account name: </span>
              <span className="font-medium">{resolvedName}</span>
            </div>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending || !resolvedName}
          >
            {saveMutation.isPending ? 'Saving…' : 'Save Account'}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

// ── Page ─────────────────────────────────────────────────────

export default function Settlements() {
  const { data: runs = [], isLoading, isError } = useQuery<SettlementRun[]>({
    queryKey: ['settlements'],
    queryFn: async () => {
      const res = await api.get('/dashboard/settlements')
      return res.data.data
    },
  })

  return (
    <div className="p-8 space-y-8">
      <h1 className="text-2xl font-semibold">Settlements</h1>

      {/* Runs list */}
      <div className="space-y-3">
        {isError && (
          <p className="text-sm text-destructive">Failed to load settlements. Please refresh.</p>
        )}
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-20 bg-muted animate-pulse rounded-lg" />
          ))
        ) : runs.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground text-sm">
                No settlement runs yet. Settlements run automatically each night.
              </p>
            </CardContent>
          </Card>
        ) : (
          runs.map((run) => <SettlementRow key={run.id} run={run} />)
        )}
      </div>

      {/* Bank accounts */}
      <BankAccountSection />
    </div>
  )
}