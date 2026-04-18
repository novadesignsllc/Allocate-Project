export type CreditPlanType = 'lump' | 'monthly' | 'minimum'
export interface CreditPlan {
  type: CreditPlanType
  amount?: number
  dueDate?: string
}

export interface DebtPayoffCard {
  categoryId: string
  name: string
  accountBalance: number
  available: number
  debtPayoffDate: string
}

const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Math.abs(n))

const MONTH_ABBR = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function PayoffGraph({ balance, debtPayoffDate }: { balance: number; debtPayoffDate: string }) {
  const today = new Date()
  const payoff = new Date(debtPayoffDate + 'T00:00:00')
  const totalMonths = Math.max(1,
    (payoff.getFullYear() - today.getFullYear()) * 12 + (payoff.getMonth() - today.getMonth())
  )
  const monthlyPayment = balance / totalMonths

  // Generate projected balance points (month 0 = now, month N = payoff)
  const points = Array.from({ length: totalMonths + 1 }, (_, i) => ({
    x: i,
    y: Math.max(0, balance - i * monthlyPayment),
  }))

  const W = 400
  const H = 90
  const PAD = { top: 8, right: 8, bottom: 20, left: 4 }
  const innerW = W - PAD.left - PAD.right
  const innerH = H - PAD.top - PAD.bottom

  const toSvg = (x: number, y: number) => ({
    sx: PAD.left + (x / totalMonths) * innerW,
    sy: PAD.top + (1 - y / balance) * innerH,
  })

  // Build polyline string
  const linePoints = points.map(p => {
    const { sx, sy } = toSvg(p.x, p.y)
    return `${sx},${sy}`
  }).join(' ')

  // Area path: line + close to bottom
  const { sx: x0, sy: y0 } = toSvg(0, balance)
  const { sx: xN } = toSvg(totalMonths, 0)
  const areaPath = `M ${x0},${y0} L ${linePoints.split(' ').slice(1).join(' L ')} L ${xN},${PAD.top + innerH} L ${x0},${PAD.top + innerH} Z`

  // X-axis labels: show up to 5 evenly spaced month labels
  const labelCount = Math.min(5, totalMonths + 1)
  const labelIndices = Array.from({ length: labelCount }, (_, i) =>
    Math.round(i * totalMonths / (labelCount - 1))
  )

  const getMonthLabel = (offset: number) => {
    const d = new Date(today.getFullYear(), today.getMonth() + offset, 1)
    return MONTH_ABBR[d.getMonth()] + (d.getFullYear() !== today.getFullYear() ? ` '${String(d.getFullYear()).slice(2)}` : '')
  }

  return (
    <div style={{ position: 'relative' }}>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ display: 'block' }}>
        <defs>
          <linearGradient id="debtGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#7c3aed" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#7c3aed" stopOpacity="0.03" />
          </linearGradient>
        </defs>
        {/* Grid line at 50% */}
        <line
          x1={PAD.left} y1={PAD.top + innerH / 2}
          x2={PAD.left + innerW} y2={PAD.top + innerH / 2}
          stroke="rgba(255,255,255,0.05)" strokeWidth="1"
        />
        {/* Area fill */}
        <path d={areaPath} fill="url(#debtGrad)" />
        {/* Line */}
        <polyline
          points={linePoints}
          fill="none"
          stroke="#7c3aed"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Start dot */}
        <circle cx={toSvg(0, balance).sx} cy={toSvg(0, balance).sy} r="3" fill="#a78bfa" />
        {/* End dot */}
        <circle cx={toSvg(totalMonths, 0).sx} cy={toSvg(totalMonths, 0).sy} r="3" fill="#34d399" />
      </svg>
      {/* X-axis labels */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2px', paddingLeft: `${(PAD.left / W) * 100}%`, paddingRight: `${(PAD.right / W) * 100}%` }}>
        {labelIndices.map((idx, i) => (
          <span key={i} style={{ fontSize: '10px', color: 'var(--text-faint)', textAlign: i === 0 ? 'left' : i === labelIndices.length - 1 ? 'right' : 'center' }}>
            {getMonthLabel(idx)}
          </span>
        ))}
      </div>
    </div>
  )
}

function DebtCard({ card }: { card: DebtPayoffCard }) {
  const today = new Date()
  const payoff = new Date(card.debtPayoffDate + 'T00:00:00')
  const totalMonths = Math.max(1,
    (payoff.getFullYear() - today.getFullYear()) * 12 + (payoff.getMonth() - today.getMonth())
  )
  const monthlyNeeded = card.accountBalance / totalMonths
  const paidOff = card.accountBalance <= 0

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ background: 'var(--bg-surface)', border: '1px solid var(--color-border)' }}
    >
      {/* Header */}
      <div className="px-5 pt-4 pb-3 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <svg width="14" height="10" viewBox="0 0 14 10" fill="none" style={{ flexShrink: 0, color: 'var(--text-faint)' }}>
              <rect x="0.75" y="0.75" width="12.5" height="8.5" rx="1.5" stroke="currentColor" strokeWidth="1.1"/>
              <rect x="0.75" y="3" width="12.5" height="2" fill="currentColor" fillOpacity="0.35"/>
              <rect x="1.75" y="6.25" width="3" height="1.5" rx="0.5" fill="currentColor" fillOpacity="0.75"/>
            </svg>
            <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{card.name}</span>
          </div>
          <p className="text-xs" style={{ color: 'var(--text-faint)' }}>
            Target: {payoff.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })} · {totalMonths} month{totalMonths !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xl font-bold" style={{ color: paidOff ? '#34d399' : '#f87171', letterSpacing: '-0.02em' }}>
            {paidOff ? 'Paid off!' : `-${fmt(card.accountBalance)}`}
          </p>
          {!paidOff && (
            <p className="text-xs" style={{ color: 'var(--text-faint)' }}>{fmt(monthlyNeeded)}/mo needed</p>
          )}
        </div>
      </div>

      {/* Stats row */}
      {!paidOff && (
        <div className="px-5 pb-3 flex gap-4">
          <div>
            <p className="text-xs" style={{ color: 'var(--text-faint)' }}>Available to pay</p>
            <p className="text-sm font-medium" style={{ color: card.available >= card.accountBalance ? '#34d399' : card.available > 0 ? '#eab308' : '#f87171' }}>
              {fmt(card.available)}
            </p>
          </div>
          <div>
            <p className="text-xs" style={{ color: 'var(--text-faint)' }}>Still needed</p>
            <p className="text-sm font-medium" style={{ color: card.available >= card.accountBalance ? '#34d399' : '#f87171' }}>
              {card.available >= card.accountBalance ? 'Covered ✓' : fmt(card.accountBalance - card.available)}
            </p>
          </div>
        </div>
      )}

      {/* Graph */}
      {!paidOff && (
        <div className="px-4 pb-4">
          <PayoffGraph balance={card.accountBalance} debtPayoffDate={card.debtPayoffDate} />
        </div>
      )}
    </div>
  )
}

export default function CreditView({ debtPayoffCards = [] }: { debtPayoffCards?: DebtPayoffCard[] }) {
  if (debtPayoffCards.length === 0) {
    return (
      <div className="flex flex-col h-full items-center justify-center gap-2" style={{ background: 'var(--bg-main)' }}>
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(109,40,217,0.1)', border: '1px solid rgba(139,92,246,0.2)' }}>
          <svg width="22" height="16" viewBox="0 0 22 16" fill="none" style={{ color: '#a78bfa' }}>
            <rect x="1" y="1" width="20" height="14" rx="3" stroke="currentColor" strokeWidth="1.5"/>
            <rect x="1" y="5" width="20" height="3.5" fill="currentColor" fillOpacity="0.3"/>
            <rect x="2.5" y="10.5" width="5" height="2" rx="0.75" fill="currentColor" fillOpacity="0.7"/>
          </svg>
        </div>
        <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>No debt payoff plans</p>
        <p className="text-xs text-center" style={{ color: 'var(--text-faint)', maxWidth: '220px' }}>
          Select a credit card category in the Budget tab and set a payoff goal in the inspector panel.
        </p>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto p-6" style={{ background: 'var(--bg-main)' }}>
      <div className="mb-5">
        <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>Debt Payoff</h2>
        <p className="text-xs mt-0.5" style={{ color: 'var(--text-faint)' }}>
          {debtPayoffCards.length} active plan{debtPayoffCards.length !== 1 ? 's' : ''} · monthly amounts recalculate automatically as balances change
        </p>
      </div>
      <div className="space-y-4">
        {debtPayoffCards.map(card => <DebtCard key={card.categoryId} card={card} />)}
      </div>
    </div>
  )
}
