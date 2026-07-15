import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
  partner_id: string
  status: string
  period_start: string
  period_end: string
  gross_amount: number
  fee_amount: number
  net_amount: number
  transaction_count: number
  dest_account_id: string
  psp_reference: string
  completed_at: string | null
  created_at: string
}

interface SettlementItem {
  id: string
  run_id: string
  transaction_id: string
  amount: number
  fee: number
  created_at: string
}

interface Bank {
  code: string
  name: string
}

interface BankAccount {
  id: string
  partner_id: string
  bank_code: string
  account_number: string
  account_name: string
  is_primary: boolean
  verified_at: string | null
  created_at: string
}

interface ResolvedAccount {
  account_number: string
  account_name: string
  bank_code: string
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
      const res = await api.get(`/v1/settlements/${runId}/items`)
      return res.data.data ?? []
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
  const [downloading, setDownloading] = useState(false)

  async function downloadCSV() {
    setDownloading(true)
    try {
      const res = await api.get(`/v1/settlements/${run.id}/csv`, { responseType: 'blob' })
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const link = document.createElement('a')
      link.href = url
      link.download = `settlement-${run.id}.csv`
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch {
      // Silently ignore — a toast/error surface can be wired in later if this
      // turns out to fail often enough to warrant one.
    } finally {
      setDownloading(false)
    }
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
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-4">
          <Button variant="outline" size="sm" onClick={downloadCSV} disabled={downloading}>
            {downloading ? 'Preparing…' : 'CSV'}
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

  const { data: banks = [] } = useQuery<Bank[]>({
    queryKey: ['banks'],
    queryFn: async () => {
      const res = await api.get('/v1/banks')
      return res.data.data ?? []
    },
  })

  const { data: accounts = [], isLoading } = useQuery<BankAccount[]>({
    queryKey: ['bank-accounts'],
    queryFn: async () => {
      const res = await api.get('/v1/partner/bank-accounts')
      return res.data.data ?? []
    },
  })

  const [bankCode, setBankCode] = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  const [resolvedName, setResolvedName] = useState('')
  const [lookupError, setLookupError] = useState('')
  const [lookupLoading, setLookupLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleLookup() {
    if (!bankCode || accountNumber.length !== 10) {
      setLookupError('Select a bank and enter a 10-digit account number.')
      return
    }
    setLookupError('')
    setResolvedName('')
    setLookupLoading(true)
    try {
      const res = await api.get<{ data: ResolvedAccount }>('/v1/partner/bank-accounts/resolve', {
        params: { bank_code: bankCode, account_number: accountNumber },
      })
      setResolvedName(res.data.data.account_name)
    } catch {
      setLookupError('Could not resolve account. Check the details and try again.')
    } finally {
      setLookupLoading(false)
    }
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      await api.post('/v1/partner/bank-accounts', {
        bank_code: bankCode,
        account_number: accountNumber,
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

  function bankName(code: string): string {
    return banks.find((b) => b.code === code)?.name ?? code
  }

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
                    {bankName(a.bank_code)} · {a.account_number}
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
            <div className="space-y-1 w-56">
              <label className="text-xs font-medium">Bank</label>
              <Select
                value={bankCode}
                onValueChange={(v) => {
                  setBankCode(v)
                  setResolvedName('')
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select your bank" />
                </SelectTrigger>
                <SelectContent>
                  {banks.map((b) => (
                    <SelectItem key={b.code} value={b.code}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1 flex-1">
              <label className="text-xs font-medium">Account Number</label>
              <Input
                placeholder="0123456789"
                maxLength={10}
                value={accountNumber}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  setAccountNumber(e.target.value.replace(/\D/g, '').slice(0, 10))
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
      const res = await api.get('/v1/settlements')
      return res.data.data ?? []
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