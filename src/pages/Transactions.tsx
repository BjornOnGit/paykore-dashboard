import { useState } from 'react'
import { useInfiniteQuery } from '@tanstack/react-query'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'

// ── Types ────────────────────────────────────────────────────

interface FeeBreakdown {
  customerFee: number
  merchantFee: number
  platformFee: number
  mfbCost: number
  netAmount: number
}

interface Transaction {
  id: string
  reference: string
  type: string
  amount: number
  status: string
  currency: string
  fee_breakdown: FeeBreakdown
  description: string
  created_at: string
  completed_at: string | null
  failed_reason: string | null
}

interface PageData {
  data: Transaction[]
  next_cursor: string | null
}

// ── Helpers ──────────────────────────────────────────────────

function formatNaira(kobo: number): string {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
  }).format(kobo / 100)
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('en-NG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  completed: 'default',
  processing: 'secondary',
  pending: 'outline',
  failed: 'destructive',
  reversed: 'destructive',
  expired: 'outline',
}

const TX_TYPES = [
  'wallet_funding',
  'wallet_credit',
  'wallet_debit',
  'p2p_transfer',
  'bank_transfer',
  'ussd_payment',
  'qr_payment',
  'split_payment',
  'fee_deduction',
  'reversal',
  'settlement_payout',
]

const TX_STATUSES = ['pending', 'processing', 'completed', 'failed', 'reversed', 'expired']

// ── Fee Breakdown Detail ─────────────────────────────────────

function FeeBreakdownDetail({ fee }: { fee: FeeBreakdown }) {
  return (
    <div className="space-y-2 text-sm">
      {[
        ['Customer Fee', fee.customerFee],
        ['Merchant Fee', fee.merchantFee],
        ['Platform Fee', fee.platformFee],
        ['MFB Cost', fee.mfbCost],
        ['Net Amount', fee.netAmount],
      ].map(([label, value]) => (
        <div key={label as string} className="flex justify-between">
          <span className="text-muted-foreground">{label}</span>
          <span className="font-mono">{formatNaira(value as number)}</span>
        </div>
      ))}
    </div>
  )
}

// ── Page ─────────────────────────────────────────────────────

export default function Transactions() {
  const [status, setStatus] = useState('')
  const [type, setType] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [selected, setSelected] = useState<Transaction | null>(null)

  const {
    data,
    isLoading,
    isError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery<PageData>({
    queryKey: ['transactions', status, type, from, to],
    queryFn: async ({ pageParam }) => {
      const params = new URLSearchParams()
      if (status) params.set('status', status)
      if (type) params.set('type', type)
      if (from) params.set('from', from)
      if (to) params.set('to', to)
      if (pageParam) params.set('cursor', pageParam as string)
      params.set('limit', '20')
      const res = await api.get(`/dashboard/transactions?${params.toString()}`)
      return res.data
    },
    initialPageParam: null,
    getNextPageParam: (lastPage) => lastPage.next_cursor ?? undefined,
  })

  const transactions = data?.pages.flatMap((p) => p.data) ?? []

  function clearFilters() {
    setStatus('')
    setType('')
    setFrom('')
    setTo('')
  }

  const hasFilters = status || type || from || to

  return (
    <div className="p-8 space-y-6">
      <h1 className="text-2xl font-semibold">Transactions</h1>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3 items-end">
            <div className="w-40">
              <label className="text-xs text-muted-foreground mb-1 block">Status</label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  {TX_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="w-48">
              <label className="text-xs text-muted-foreground mb-1 block">Type</label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger>
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  {TX_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t.replace(/_/g, ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs text-muted-foreground mb-1 block">From</label>
              <Input
                type="date"
                value={from}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFrom(e.target.value)}
                className="w-36"
              />
            </div>

            <div>
              <label className="text-xs text-muted-foreground mb-1 block">To</label>
              <Input
                type="date"
                value={to}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTo(e.target.value)}
                className="w-36"
              />
            </div>

            {hasFilters && (
              <Button variant="outline" size="sm" onClick={clearFilters}>
                Clear
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      {isError ? (
        <p className="text-destructive text-sm">Failed to load transactions. Please refresh.</p>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Reference</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 5 }).map((_, j) => (
                      <TableCell key={j}>
                        <div className="h-4 bg-muted animate-pulse rounded" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : transactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-12">
                    No transactions found
                  </TableCell>
                </TableRow>
              ) : (
                transactions.map((tx) => (
                  <TableRow
                    key={tx.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => setSelected(tx)}
                  >
                    <TableCell className="font-mono text-sm">{tx.reference}</TableCell>
                    <TableCell className="capitalize">{tx.type.replace(/_/g, ' ')}</TableCell>
                    <TableCell>{formatNaira(tx.amount)}</TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANT[tx.status] ?? 'outline'}>
                        {tx.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(tx.created_at)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Load More */}
      {hasNextPage && (
        <div className="flex justify-center">
          <Button
            variant="outline"
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
          >
            {isFetchingNextPage ? 'Loading…' : 'Load More'}
          </Button>
        </div>
      )}

      {/* Detail Modal */}
      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Transaction Detail</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4 text-sm">
              <div className="space-y-2">
                {[
                  ['Reference', selected.reference],
                  ['Type', selected.type.replace(/_/g, ' ')],
                  ['Amount', formatNaira(selected.amount)],
                  ['Status', selected.status],
                  ['Date', formatDate(selected.created_at)],
                  ...(selected.description ? [['Description', selected.description]] : []),
                  ...(selected.failed_reason ? [['Failure Reason', selected.failed_reason]] : []),
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between gap-4">
                    <span className="text-muted-foreground shrink-0">{label}</span>
                    <span className="text-right capitalize">{value}</span>
                  </div>
                ))}
              </div>

              <div>
                <p className="font-medium mb-2">Fee Breakdown</p>
                <FeeBreakdownDetail fee={selected.fee_breakdown} />
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}