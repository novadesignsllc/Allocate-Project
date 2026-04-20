import { useMemo } from 'react'
import type { Account } from './Sidebar'
import type { Transaction } from '../data/mockData'

interface IncomeViewProps {
  transactions: Transaction[]
  accounts: Account[]
  gradientColors: string[]
}

const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)

const MONTH_LABELS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function parseTxDate(date: string): { year: number; month: number } | null {
  const parts = date.split('/')
  if (parts.length !== 3) return null
  return { year: parseInt(parts[2]), month: parseInt(parts[0]) }
}

export default function IncomeView({ transactions, accounts, gradientColors }: IncomeViewProps) {
  const gradient = gradientColors.length === 1
    ? gradientColors[0]
    : `linear-gradient(135deg, ${gradientColors.join(', ')})`

  // Income = inflow transactions explicitly categorised as 'Income'
  const incomeTxs = useMemo(() =>
    transactions.filter(t => t.category === 'Income' && (t.inflow ?? 0) > 0),
    [transactions]
  )

  const totalIncome = incomeTxs.reduce((s, t) => s + (t.inflow ?? 0), 0)

  // ── Payee breakdown ──────────────────────────────────────────────
  const payeeBreakdown = useMemo(() => {
    const map = new Map<string, number>()
    for (const tx of incomeTxs) {
      const p = tx.payee?.trim() || 'Unknown'
      map.set(p, (map.get(p) ?? 0) + (tx.inflow ?? 0))
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1])
  }, [incomeTxs])

  // ── Monthly chart data — always 12 months from first income month ─
  const monthlyData = useMemo(() => {
    const incomeDates = transactions
      .filter(t => t.category === 'Income' && (t.inflow ?? 0) > 0)
      .map(t => parseTxDate(t.date))
      .filter((d): d is { year: number; month: number } => d !== null)

    if (incomeDates.length === 0) return []

    const earliest = incomeDates.reduce(
      (min, d) => d.year < min.year || (d.year === min.year && d.month < min.month) ? d : min,
      incomeDates[0]
    )

    const result: { label: string; year: number; month: number; income: number; spending: number }[] = []
    let y = earliest.year, m = earliest.month

    // Fixed 12-month window starting from the first income month.
    // Future months will simply have 0 income/spending until data arrives.
    for (let i = 0; i < 12; i++) {
      const income = transactions
        .filter(t => {
          if (t.category !== 'Income' || (t.inflow ?? 0) <= 0) return false
          const p = parseTxDate(t.date)
          return p?.year === y && p?.month === m
        })
        .reduce((s, t) => s + (t.inflow ?? 0), 0)

      const spending = transactions
        .filter(t => {
          if (t.payee === 'Starting Balance' || (t.outflow ?? 0) <= 0) return false
          const p = parseTxDate(t.date)
          return p?.year === y && p?.month === m
        })
        .reduce((s, t) => s + (t.outflow ?? 0), 0)

      result.push({ label: MONTH_LABELS[m - 1], year: y, month: m, income, spending })
      m++
      if (m > 12) { m = 1; y++ }
    }
    return result
  }, [transactions])

  const maxValue = Math.max(...monthlyData.map(m => Math.max(m.income, m.spending)), 1)

  // ── Sorted recent income ─────────────────────────────────────────
  const recentIncome = useMemo(() =>
    [...incomeTxs].sort((a, b) => {
      const pa = parseTxDate(a.date), pb = parseTxDate(b.date)
      if (!pa || !pb) return 0
      return (pb.year * 100 + pb.month) - (pa.year * 100 + pa.month) || 0
    }).slice(0, 25),
    [incomeTxs]
  )

  // Chart constants — bars live in a viewBox of "0 0 N 100"
  // (1 unit wide per month, 100 units tall). preserveAspectRatio="none"
  // lets it fill the container freely; height is fixed via CSS.
  const CHART_H = 168  // px
  const N = Math.max(monthlyData.length, 1)
  const MIN_COL_PX = 40  // minimum px per month before scrolling kicks in
  const chartMinWidth = N * MIN_COL_PX

  // Short label for Y axis
  const fmtShort = (n: number) =>
    n >= 1000 ? `$${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k` : `$${Math.round(n)}`

  return (
    <div className="flex flex-col h-full min-h-0" style={{ background: 'var(--bg-main)' }}>

      {/* Header */}
      <div
        className="flex-shrink-0 flex items-center px-6 gap-4"
        style={{ height: '56px', borderBottom: '1px solid var(--color-border)', background: 'var(--bg-surface)' }}
      >
        <h1 className="text-base font-bold flex-shrink-0" style={{ color: 'var(--text-primary)' }}>Income</h1>

        <div className="flex-1 flex justify-center">
          <div className="text-center">
            <div className="text-xl font-bold" style={{ color: '#34d399' }}>{fmt(totalIncome)}</div>
            <div className="text-xs font-medium" style={{ color: '#34d399', opacity: 0.75 }}>Total income recorded</div>
          </div>
        </div>

        <div className="flex-shrink-0" style={{ minWidth: '80px' }} />
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto">
        {incomeTxs.length === 0 ? (

          /* ── Empty state ── */
          <div className="flex flex-col items-center justify-center gap-4 py-24">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center"
              style={{ background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.2)' }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" stroke="#34d399" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>No income recorded yet</p>
              <p className="text-xs mt-1.5 max-w-xs" style={{ color: 'var(--text-faint)' }}>
                When entering a transaction, set the category to{' '}
                <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Income</span>{' '}
                to track it here.
              </p>
            </div>
          </div>

        ) : (
          <div className="px-6 py-6 space-y-6">

            {/* ── Bar chart ── */}
            <div
              className="rounded-2xl p-5"
              style={{ background: 'var(--bg-surface)', border: '1px solid var(--color-border)' }}
            >
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Monthly Overview</h2>
                <div className="flex items-center gap-5">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-sm" style={{ background: '#34d399' }} />
                    <span className="text-xs font-medium" style={{ color: 'var(--text-faint)' }}>Income</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-sm" style={{ background: '#f87171' }} />
                    <span className="text-xs font-medium" style={{ color: 'var(--text-faint)' }}>Spending</span>
                  </div>
                </div>
              </div>

              {/* Chart: Y labels + scrollable bars side by side */}
              <div className="flex gap-2">
                {/* Y-axis labels — HTML, never clipped */}
                <div className="flex-shrink-0 flex flex-col justify-between pb-6" style={{ width: 38, height: CHART_H + 24 }}>
                  {[1, 0.75, 0.5, 0.25, 0].map(frac => (
                    <span key={frac} style={{ fontSize: 9, color: 'var(--text-faint)', lineHeight: 1, textAlign: 'right', display: 'block' }}>
                      {fmtShort(maxValue * frac)}
                    </span>
                  ))}
                </div>

                {/* Scrollable bar area */}
                <div className="flex-1 overflow-x-auto">
                  <div style={{ minWidth: chartMinWidth }}>
                    {/* Bars + grid lines */}
                    <div style={{ position: 'relative', height: CHART_H }}>
                      {/* Dashed grid lines at 25 / 50 / 75 % */}
                      {[0.25, 0.5, 0.75].map(frac => (
                        <div
                          key={frac}
                          style={{
                            position: 'absolute', left: 0, right: 0,
                            top: `${(1 - frac) * 100}%`,
                            borderTop: '1px dashed var(--color-border)',
                            pointerEvents: 'none',
                          }}
                        />
                      ))}
                      {/* Baseline */}
                      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, borderTop: '1px solid var(--color-border)' }} />

                      {/* SVG bars — viewBox "0 0 N 100", preserveAspectRatio="none" so height is fully CSS-controlled */}
                      <svg
                        viewBox={`0 0 ${N} 100`}
                        preserveAspectRatio="none"
                        width="100%"
                        height="100%"
                        style={{ display: 'block' }}
                      >
                        {monthlyData.map((m, i) => {
                          const incomeH = (m.income / maxValue) * 100
                          const spendH  = (m.spending / maxValue) * 100
                          return (
                            <g key={`${m.year}-${m.month}`}>
                              {incomeH > 0
                                ? <rect x={i + 0.12} y={100 - incomeH} width={0.34} height={incomeH} rx={0.15} fill="#34d399" fillOpacity={0.85} />
                                : <rect x={i + 0.12} y={99} width={0.34} height={1} rx={0.1} fill="#34d399" fillOpacity={0.2} />
                              }
                              {spendH > 0
                                ? <rect x={i + 0.54} y={100 - spendH} width={0.34} height={spendH} rx={0.15} fill="#f87171" fillOpacity={0.75} />
                                : <rect x={i + 0.54} y={99} width={0.34} height={1} rx={0.1} fill="#f87171" fillOpacity={0.2} />
                              }
                            </g>
                          )
                        })}
                      </svg>
                    </div>

                    {/* Month labels — one flex child per month */}
                    <div className="flex mt-1">
                      {monthlyData.map(m => {
                        const isCurrentMonth = m.year === new Date().getFullYear() && m.month === new Date().getMonth() + 1
                        return (
                          <div
                            key={`${m.year}-${m.month}`}
                            style={{
                              flex: 1,
                              textAlign: 'center',
                              fontSize: 10,
                              fontFamily: 'system-ui',
                              fontWeight: isCurrentMonth ? 600 : 400,
                              color: isCurrentMonth ? 'var(--text-secondary)' : 'var(--text-faint)',
                            }}
                          >
                            {m.label}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Two-column layout: sources + recent ── */}
            <div className="grid grid-cols-2 gap-6" style={{ alignItems: 'start' }}>

              {/* Income sources */}
              <div
                className="rounded-2xl p-5"
                style={{ background: 'var(--bg-surface)', border: '1px solid var(--color-border)' }}
              >
                <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Income Sources</h2>
                <div className="space-y-4">
                  {payeeBreakdown.map(([payee, amount]) => {
                    const pct = totalIncome > 0 ? (amount / totalIncome) * 100 : 0
                    return (
                      <div key={payee}>
                        <div className="flex items-baseline justify-between mb-1.5">
                          <span className="text-sm font-medium truncate mr-3" style={{ color: 'var(--text-primary)' }}>{payee}</span>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className="text-xs" style={{ color: 'var(--text-faint)' }}>{pct.toFixed(0)}%</span>
                            <span className="text-sm font-semibold" style={{ color: '#34d399' }}>{fmt(amount)}</span>
                          </div>
                        </div>
                        <div
                          className="h-1.5 rounded-full overflow-hidden"
                          style={{ background: 'var(--bg-hover-strong)' }}
                        >
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${pct}%`,
                              background: gradient,
                            }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Recent income list */}
              <div
                className="rounded-2xl overflow-hidden"
                style={{ background: 'var(--bg-surface)', border: '1px solid var(--color-border)' }}
              >
                <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Recent Income</h2>
                </div>
                <div>
                  {recentIncome.map(tx => {
                    const account = accounts.find(a => a.id === tx.accountId)
                    return (
                      <div
                        key={tx.id}
                        className="flex items-center gap-3 px-5 py-3 transition-all"
                        style={{ borderBottom: '1px solid var(--color-border)' }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                        onMouseLeave={e => (e.currentTarget.style.background = '')}
                      >
                        {/* Dot */}
                        <div className="flex-shrink-0 w-2 h-2 rounded-full" style={{ background: '#34d399', opacity: 0.7 }} />

                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                            {tx.payee || '—'}
                          </p>
                          <p className="text-xs mt-0.5" style={{ color: 'var(--text-faint)' }}>
                            {account?.name ?? '—'} · {tx.date}
                          </p>
                        </div>

                        <span className="text-sm font-semibold flex-shrink-0" style={{ color: '#34d399' }}>
                          +{fmt(tx.inflow ?? 0)}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  )
}
