import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import type { Account } from './Sidebar'
import type { Transaction } from '../data/mockData'

export type CreditPlanType = 'lump' | 'monthly' | 'minimum'
export interface CreditPlan {
  type: CreditPlanType
  amount?: number
  dueDate?: string // 'YYYY-MM-DD'
}

interface CreditViewProps {
  accounts: Account[]
  closedAccountIds: Set<string>
  transactions: Transaction[]
  creditPlans: Record<string, CreditPlan>
  onCreditPlanChange: (accountId: string, plan: CreditPlan) => void
  gradientColors: string[]
}

const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Math.abs(n))

function workingBalance(accountId: string, transactions: Transaction[]): number {
  return transactions
    .filter(t => t.accountId === accountId)
    .reduce((s, t) => s + (t.inflow ?? 0) - (t.outflow ?? 0), 0)
}

function buildGradient(colors: string[]): string {
  if (colors.length === 1) return colors[0]
  const stops = colors.map((c, i) => `${c} ${Math.round(i / (colors.length - 1) * 100)}%`)
  return `linear-gradient(135deg, ${stops.join(', ')})`
}

const PLAN_OPTIONS: { type: CreditPlanType; label: string; desc: string }[] = [
  { type: 'lump',    label: 'Pay Off Now',   desc: 'Pay the full balance this month' },
  { type: 'monthly', label: 'Fixed Monthly', desc: 'Pay a set amount each month'     },
  { type: 'minimum', label: 'Minimum',       desc: '~2% of balance (min $25)'        },
]

const POPUP_W = 320
const POPUP_GAP = 10

export default function CreditView({
  accounts,
  closedAccountIds,
  transactions,
  creditPlans,
  onCreditPlanChange,
  gradientColors,
}: CreditViewProps) {
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null)
  const [draftPlan, setDraftPlan] = useState<CreditPlan | null>(null)
  const [popupPos, setPopupPos] = useState<{ top: number; left: number } | null>(null)
  const popupRef = useRef<HTMLDivElement>(null)

  const openCards = accounts.filter(a => a.type === 'credit' && !closedAccountIds.has(a.id))

  const openDetail = (id: string, cardEl: HTMLButtonElement) => {
    const rect = cardEl.getBoundingClientRect()
    const vw = window.innerWidth
    const vh = window.innerHeight

    // Prefer right of card, fall back to left
    let left = rect.right + POPUP_GAP
    if (left + POPUP_W > vw - 12) left = rect.left - POPUP_W - POPUP_GAP

    // Align top to card, nudge up if it would overflow
    let top = rect.top
    const estimatedH = 420
    if (top + estimatedH > vh - 12) top = vh - estimatedH - 12
    top = Math.max(12, top)

    setPopupPos({ top, left })
    setSelectedAccountId(id)
    setDraftPlan(creditPlans[id] ?? { type: 'lump' })
  }

  const closeDetail = () => {
    setSelectedAccountId(null)
    setDraftPlan(null)
    setPopupPos(null)
  }

  const saveDetail = () => {
    if (selectedAccountId && draftPlan) {
      onCreditPlanChange(selectedAccountId, draftPlan)
    }
    closeDetail()
  }

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) closeDetail()
    }
    if (selectedAccountId) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [selectedAccountId])

  const selectedAccount = openCards.find(a => a.id === selectedAccountId)
  const selectedBalance = selectedAccountId ? workingBalance(selectedAccountId, transactions) : 0
  const estimatedMin = (bal: number) => Math.max(25, Math.abs(bal) * 0.02)
  const gradient = buildGradient(gradientColors)

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: 'var(--bg-main)' }}>

      {/* Header */}
      <div
        className="flex-shrink-0 px-6 py-4"
        style={{ borderBottom: '1px solid var(--color-border)', background: 'var(--bg-surface)' }}
      >
        <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>Credit Cards</h2>
        <p className="text-xs mt-0.5" style={{ color: 'var(--text-faint)' }}>
          {openCards.length} card{openCards.length !== 1 ? 's' : ''} · click a card to manage its payment plan
        </p>
      </div>

      {/* Card grid */}
      <div className="flex-1 overflow-y-auto p-6">
        {openCards.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2">
            <span className="text-3xl">💳</span>
            <p className="text-sm" style={{ color: 'var(--text-faint)' }}>No credit card accounts added yet.</p>
          </div>
        ) : (
          <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}>
            {openCards.map(account => {
              const balance = workingBalance(account.id, transactions)
              const plan = creditPlans[account.id]
              const hasDebt = balance < 0
              const isOpen = selectedAccountId === account.id

              return (
                <button
                  key={account.id}
                  onClick={e => openDetail(account.id, e.currentTarget)}
                  className="relative text-left overflow-hidden transition-all active:scale-[0.98]"
                  style={{
                    borderRadius: '16px',
                    background: gradient,
                    padding: '1px',
                    boxShadow: isOpen
                      ? '0 0 0 2px rgba(255,255,255,0.4), 0 8px 32px rgba(0,0,0,0.4)'
                      : '0 4px 20px rgba(0,0,0,0.25)',
                    transition: 'box-shadow 0.15s ease',
                  }}
                  onMouseEnter={e => { if (!isOpen) e.currentTarget.style.boxShadow = '0 8px 32px rgba(0,0,0,0.4)' }}
                  onMouseLeave={e => { if (!isOpen) e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.25)' }}
                >
                  <div
                    className="relative flex flex-col h-full p-5"
                    style={{
                      borderRadius: '15px',
                      background: 'linear-gradient(135deg, rgba(15,13,26,0.92) 0%, rgba(20,18,35,0.88) 100%)',
                      minHeight: '148px',
                    }}
                  >
                    <div className="flex items-start justify-between mb-auto">
                      <div className="w-8 h-6 rounded-md" style={{ background: 'linear-gradient(135deg, #d4af37, #f5e06e)', opacity: 0.85 }} />
                      {plan && (
                        <span
                          className="text-xs px-2 py-0.5 rounded-full font-medium"
                          style={{ background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.15)' }}
                        >
                          {plan.type === 'lump' ? 'Pay Off' : plan.type === 'monthly' ? `$${plan.amount ?? 0}/mo` : 'Min'}
                        </span>
                      )}
                    </div>

                    <div className="mt-4">
                      <p className="text-xs mb-1" style={{ color: 'rgba(255,255,255,0.4)' }}>Current Balance</p>
                      <p className="text-2xl font-bold" style={{ color: hasDebt ? '#f87171' : '#34d399', letterSpacing: '-0.02em' }}>
                        {hasDebt ? `-${fmt(balance)}` : fmt(balance)}
                      </p>
                    </div>

                    <div className="flex items-end justify-between mt-3">
                      <p className="text-sm font-medium" style={{ color: 'rgba(255,255,255,0.75)' }}>{account.name}</p>
                      {plan?.dueDate && (
                        <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>
                          Due {new Date(plan.dueDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </p>
                      )}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Popover — rendered via portal, positioned near the card */}
      {selectedAccount && draftPlan && popupPos && createPortal(
        <div
          ref={popupRef}
          className="z-[9999] rounded-2xl overflow-hidden"
          style={{
            position: 'fixed',
            top: popupPos.top,
            left: popupPos.left,
            width: POPUP_W,
            background: 'var(--bg-surface)',
            border: '1px solid rgba(109,40,217,0.3)',
            boxShadow: '0 16px 48px rgba(0,0,0,0.5)',
          }}
        >
          {/* Gradient header */}
          <div className="px-5 py-4" style={{ background: gradient }}>
            <p className="text-xs font-medium mb-0.5" style={{ color: 'rgba(255,255,255,0.55)' }}>Payment Plan</p>
            <p className="text-base font-bold text-white">{selectedAccount.name}</p>
            <p className="text-xl font-bold mt-1" style={{ color: selectedBalance < 0 ? '#fca5a5' : '#6ee7b7' }}>
              {selectedBalance < 0 ? `-${fmt(selectedBalance)}` : fmt(selectedBalance)}
            </p>
          </div>

          <div className="p-4 flex flex-col gap-3">

            {/* Plan options */}
            <div className="flex flex-col gap-1.5">
              {PLAN_OPTIONS.map(opt => {
                const active = draftPlan.type === opt.type
                return (
                  <button
                    key={opt.type}
                    onClick={() => setDraftPlan(d => ({ ...d!, type: opt.type }))}
                    className="flex items-center gap-3 px-3 py-2.5 text-left transition-all"
                    style={{
                      borderRadius: '10px',
                      background: active ? 'rgba(109,40,217,0.15)' : 'var(--bg-hover)',
                      border: active ? '1px solid rgba(139,92,246,0.4)' : '1px solid transparent',
                    }}
                  >
                    <div
                      className="w-3.5 h-3.5 rounded-full flex-shrink-0 flex items-center justify-center"
                      style={{
                        background: active ? gradient : 'transparent',
                        border: active ? 'none' : '2px solid var(--color-border)',
                      }}
                    >
                      {active && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium" style={{ color: active ? '#c4b5fd' : 'var(--text-primary)' }}>
                        {opt.label}
                      </p>
                      <p className="text-xs" style={{ color: 'var(--text-faint)' }}>
                        {opt.type === 'lump'
                          ? `Full balance: ${fmt(Math.abs(selectedBalance))}`
                          : opt.type === 'minimum'
                          ? `Est. minimum: ${fmt(estimatedMin(selectedBalance))}`
                          : opt.desc}
                      </p>
                    </div>
                  </button>
                )
              })}
            </div>

            {/* Monthly amount */}
            {draftPlan.type === 'monthly' && (
              <div
                className="flex items-center gap-2 px-3 py-2"
                style={{ borderRadius: '10px', background: 'var(--bg-hover)', border: '1px solid var(--color-border)' }}
              >
                <span className="text-sm" style={{ color: 'var(--text-faint)' }}>$</span>
                <input
                  autoFocus
                  type="number"
                  min="0"
                  step="1"
                  placeholder="0"
                  value={draftPlan.amount ?? ''}
                  onChange={e => {
                    const v = parseFloat(e.target.value)
                    setDraftPlan(d => ({ ...d!, amount: isNaN(v) ? undefined : v }))
                  }}
                  className="flex-1 bg-transparent text-sm outline-none"
                  style={{ color: 'var(--text-primary)' }}
                />
                <span className="text-xs" style={{ color: 'var(--text-faint)' }}>/mo</span>
              </div>
            )}

            {/* Due date */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-faint)' }}>
                Payment due date
              </p>
              <input
                type="date"
                value={draftPlan.dueDate ?? ''}
                onChange={e => setDraftPlan(d => ({ ...d!, dueDate: e.target.value || undefined }))}
                className="w-full px-3 py-2 text-sm rounded-xl outline-none"
                style={{
                  background: 'var(--bg-hover)',
                  border: '1px solid var(--color-border)',
                  color: draftPlan.dueDate ? 'var(--text-primary)' : 'var(--text-faint)',
                  colorScheme: 'dark',
                }}
              />
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={closeDetail}
                className="flex-1 py-2 text-sm font-medium rounded-xl transition-all"
                style={{ background: 'var(--bg-hover)', color: 'var(--text-secondary)' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover-strong)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
              >
                Cancel
              </button>
              <button
                onClick={saveDetail}
                className="flex-1 py-2 text-sm font-semibold rounded-xl"
                style={{ background: gradient, color: 'white' }}
              >
                Save
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
