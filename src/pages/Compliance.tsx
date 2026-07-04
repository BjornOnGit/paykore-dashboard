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

// ── Types ────────────────────────────────────────────────────

interface ComplianceStatus {
  overall_status: string
  cac_number: string
  business_type: string
  terms_version: string
  rejection_reason: string | null
  use_case_description: string
  directors_submitted_at: string | null
  terms_accepted_at: string | null
  aml_policy_accepted_at: string | null
  dpa_accepted_at: string | null
  steps: {
    business_info: boolean
    directors: boolean
    agreements: boolean
    use_case: boolean
  }
}

interface Director {
  full_name: string
  role: string
  bvn: string
  nin: string
}

// ── Helpers ──────────────────────────────────────────────────

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  approved: 'default',
  submitted: 'secondary',
  under_review: 'secondary',
  incomplete: 'outline',
  rejected: 'destructive',
  suspended: 'destructive',
}

function StepIndicator({ done, label }: { done: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span
        className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
          done
            ? 'bg-primary text-primary-foreground'
            : 'bg-muted text-muted-foreground border border-border'
        }`}
      >
        {done ? '✓' : '○'}
      </span>
      <span className={done ? 'text-foreground' : 'text-muted-foreground'}>{label}</span>
    </div>
  )
}

// ── Section: Business Info ───────────────────────────────────

function BusinessInfoSection({
  compliance,
  onSaved,
}: {
  compliance: ComplianceStatus
  onSaved: () => void
}) {
  const [cacNumber, setCacNumber] = useState(compliance.cac_number ?? '')
  const [businessType, setBusinessType] = useState(compliance.business_type ?? '')
  const [error, setError] = useState('')

  const mutation = useMutation({
    mutationFn: async () => {
      await api.post('/v1/partner/compliance/business', {
        cac_number: cacNumber,
        business_type: businessType,
      })
    },
    onSuccess: () => {
      setError('')
      onSaved()
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setError(msg ?? 'Failed to save. Please try again.')
    },
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Business Information</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1">
          <label className="text-sm font-medium" htmlFor="cac">
            CAC Number
          </label>
          <Input
            id="cac"
            placeholder="e.g. RC123456"
            value={cacNumber}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCacNumber(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium">Business Type</label>
          <Select value={businessType} onValueChange={setBusinessType}>
            <SelectTrigger>
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              {['llc', 'sole_prop', 'ngo', 'partnership'].map((t) => (
                <SelectItem key={t} value={t}>
                  {t.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending || !cacNumber || !businessType}
        >
          {mutation.isPending ? 'Saving…' : 'Save'}
        </Button>
      </CardContent>
    </Card>
  )
}

// ── Section: Directors ───────────────────────────────────────

function DirectorsSection({ onSaved }: { onSaved: () => void }) {
  const [directors, setDirectors] = useState<Director[]>([
    { full_name: '', role: '', bvn: '', nin: '' },
  ])
  const [error, setError] = useState('')

  function updateDirector(index: number, field: keyof Director, value: string) {
    setDirectors((prev) =>
      prev.map((d, i) => (i === index ? { ...d, [field]: value } : d))
    )
  }

  function addDirector() {
    setDirectors((prev) => [...prev, { full_name: '', role: '', bvn: '', nin: '' }])
  }

  function removeDirector(index: number) {
    setDirectors((prev) => prev.filter((_, i) => i !== index))
  }

  const mutation = useMutation({
    mutationFn: async () => {
      await api.post('/v1/partner/compliance/directors', { directors })
    },
    onSuccess: () => {
      setError('')
      onSaved()
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setError(msg ?? 'Failed to save directors.')
    },
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Directors / Beneficial Owners</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {directors.map((d, i) => (
          <div key={i} className="space-y-3 pb-4 border-b last:border-0 last:pb-0">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">
                Director {i + 1}
              </span>
              {directors.length > 1 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive h-auto p-0"
                  onClick={() => removeDirector(i)}
                >
                  Remove
                </Button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium">Full Name</label>
                <Input
                  placeholder="Ada Okafor"
                  value={d.full_name}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    updateDirector(i, 'full_name', e.target.value)
                  }
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium">Role</label>
                <Input
                  placeholder="CEO"
                  value={d.role}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    updateDirector(i, 'role', e.target.value)
                  }
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium">
                  BVN <span className="text-muted-foreground">(optional)</span>
                </label>
                <Input
                  placeholder="12345678901"
                  maxLength={11}
                  value={d.bvn}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    updateDirector(i, 'bvn', e.target.value)
                  }
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium">
                  NIN <span className="text-muted-foreground">(optional)</span>
                </label>
                <Input
                  placeholder="12345678901"
                  maxLength={11}
                  value={d.nin}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    updateDirector(i, 'nin', e.target.value)
                  }
                />
              </div>
            </div>
          </div>
        ))}

        <Button variant="outline" size="sm" onClick={addDirector}>
          + Add Director
        </Button>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending || directors.some((d) => !d.full_name)}
        >
          {mutation.isPending ? 'Saving…' : 'Save Directors'}
        </Button>
      </CardContent>
    </Card>
  )
}

// ── Section: Agreements ──────────────────────────────────────

function AgreementsSection({
  compliance,
  onSaved,
}: {
  compliance: ComplianceStatus
  onSaved: () => void
}) {
  const [terms, setTerms] = useState(false)
  const [aml, setAml] = useState(false)
  const [dpa, setDpa] = useState(false)
  const [error, setError] = useState('')

  const alreadyAccepted = !!compliance.terms_accepted_at

  const mutation = useMutation({
    mutationFn: async () => {
      await api.post('/v1/partner/compliance/agreements', {
        terms,
        aml_policy: aml,
        dpa,
      })
    },
    onSuccess: () => {
      setError('')
      onSaved()
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setError(msg ?? 'Failed to save agreements.')
    },
  })

  if (alreadyAccepted) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Legal Agreements</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            All agreements accepted on{' '}
            {new Date(compliance.terms_accepted_at!).toLocaleDateString('en-NG', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
            {compliance.terms_version && ` (v${compliance.terms_version})`}.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Legal Agreements</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {[
          { label: 'Terms of Service', state: terms, set: setTerms },
          { label: 'AML Policy', state: aml, set: setAml },
          { label: 'Data Processing Agreement (DPA)', state: dpa, set: setDpa },
        ].map(({ label, state, set }) => (
          <label key={label} className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              className="w-4 h-4 rounded border-border"
              checked={state}
              onChange={(e) => set(e.target.checked)}
            />
            <span className="text-sm">
              I agree to the <strong>{label}</strong>
            </span>
          </label>
        ))}

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending || !terms || !aml || !dpa}
        >
          {mutation.isPending ? 'Saving…' : 'Accept All Agreements'}
        </Button>
      </CardContent>
    </Card>
  )
}

// ── Section: Use Case ────────────────────────────────────────

function UseCaseSection({
  compliance,
  onSaved,
}: {
  compliance: ComplianceStatus
  onSaved: () => void
}) {
  const [description, setDescription] = useState(compliance.use_case_description ?? '')
  const [error, setError] = useState('')

  const mutation = useMutation({
    mutationFn: async () => {
      await api.post('/v1/partner/compliance/use-case', { description })
    },
    onSuccess: () => {
      setError('')
      onSaved()
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setError(msg ?? 'Failed to save use case.')
    },
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Use Case</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1">
          <label className="text-sm font-medium" htmlFor="use-case">
            Describe how you intend to use PayKore
          </label>
          <textarea
            id="use-case"
            rows={4}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
            placeholder="e.g. We are building a payment solution for e-commerce merchants in Nigeria..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">{description.length} / 20 chars minimum</p>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending || description.length < 20}
        >
          {mutation.isPending ? 'Saving…' : 'Save'}
        </Button>
      </CardContent>
    </Card>
  )
}

// ── Main Page ────────────────────────────────────────────────

export default function Compliance() {
  const queryClient = useQueryClient()

  const { data: compliance, isLoading, isError } = useQuery<ComplianceStatus>({
    queryKey: ['compliance-status'],
    queryFn: async () => {
      const res = await api.get('/v1/partner/compliance/status')
      return res.data.data
    },
  })

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['compliance-status'] })
  }

  if (isLoading) {
    return (
      <div className="p-8 space-y-4">
        <div className="h-8 w-48 bg-muted animate-pulse rounded" />
        <div className="h-40 bg-muted animate-pulse rounded" />
        <div className="h-40 bg-muted animate-pulse rounded" />
      </div>
    )
  }

  if (isError || !compliance) {
    return (
      <div className="p-8">
        <p className="text-destructive text-sm">Failed to load compliance status.</p>
      </div>
    )
  }

  const allStepsDone = Object.values(compliance.steps).every(Boolean)

  return (
    <div className="p-8 space-y-6 max-w-2xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Compliance</h1>
        <Badge variant={STATUS_VARIANT[compliance.overall_status] ?? 'outline'}>
          {compliance.overall_status.replace(/_/g, ' ')}
        </Badge>
      </div>

      {/* Rejection reason */}
      {compliance.overall_status === 'rejected' && compliance.rejection_reason && (
        <Card className="border-destructive bg-destructive/5">
          <CardContent className="pt-4">
            <p className="text-sm text-destructive">
              <strong>Rejected:</strong> {compliance.rejection_reason}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Under review notice */}
      {(compliance.overall_status === 'submitted' ||
        compliance.overall_status === 'under_review') && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="pt-4">
            <p className="text-sm text-amber-800">
              Your application is under review. We'll notify you once it's complete.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Approved notice */}
      {compliance.overall_status === 'approved' && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-4">
            <p className="text-sm text-green-800">
              ✓ Your account is approved. You can now issue live API keys.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Progress */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Checklist</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <StepIndicator done={compliance.steps.business_info} label="Business information" />
          <StepIndicator done={compliance.steps.directors} label="Directors & beneficial owners" />
          <StepIndicator done={compliance.steps.agreements} label="Legal agreements" />
          <StepIndicator done={compliance.steps.use_case} label="Use case description" />
          {allStepsDone && compliance.overall_status === 'incomplete' && (
            <p className="text-sm text-muted-foreground pt-2">
              All steps complete — your application will be submitted for review shortly.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Step forms — hidden once approved */}
      {compliance.overall_status !== 'approved' && (
        <>
          <BusinessInfoSection compliance={compliance} onSaved={invalidate} />
          <DirectorsSection onSaved={invalidate} />
          <AgreementsSection compliance={compliance} onSaved={invalidate} />
          <UseCaseSection compliance={compliance} onSaved={invalidate} />
        </>
      )}
    </div>
  )
}