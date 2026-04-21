import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { supabase } from '../lib/supabase'

interface Props {
  displayName: string
  onDisplayNameChange: (name: string) => void
  onResetAccount: () => Promise<void>
  onClose: () => void
  isDark: boolean
}

export default function AccountSettingsModal({ displayName, onDisplayNameChange, onResetAccount, onClose, isDark }: Props) {
  const [email, setEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordMsg, setPasswordMsg] = useState<{ text: string; ok: boolean } | null>(null)
  const [passwordBusy, setPasswordBusy] = useState(false)
  const [resetPhase, setResetPhase] = useState<0 | 1 | 2>(0)
  const [resetText, setResetText] = useState('')
  const [resetBusy, setResetBusy] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.email) setEmail(user.email)
    })
  }, [])

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  const handlePasswordUpdate = async () => {
    if (newPassword.length < 6) {
      setPasswordMsg({ text: 'Password must be at least 6 characters', ok: false })
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordMsg({ text: "Passwords don't match", ok: false })
      return
    }
    setPasswordBusy(true)
    setPasswordMsg(null)
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    setPasswordBusy(false)
    if (error) {
      setPasswordMsg({ text: error.message, ok: false })
    } else {
      setPasswordMsg({ text: 'Password updated', ok: true })
      setNewPassword('')
      setConfirmPassword('')
      setTimeout(() => setPasswordMsg(null), 3000)
    }
  }

  const inputStyle: React.CSSProperties = {
    background: 'var(--bg-hover)',
    border: '1px solid var(--color-border)',
    color: 'var(--text-primary)',
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)' }}
      onClick={onClose}
    >
      <div
        className="rounded-2xl w-full mx-4 flex flex-col"
        style={{
          maxWidth: 400,
          maxHeight: 'calc(100vh - 80px)',
          background: isDark ? '#0f0d1a' : '#ffffff',
          border: '1px solid rgba(109,40,217,0.3)',
          boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 flex-shrink-0"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}
        >
          <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>Account Settings</h2>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-sm transition-all"
            style={{ color: 'var(--text-faint)' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover-strong)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >✕</button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto px-5 py-5 space-y-6">

          {/* ── Profile ── */}
          <section>
            <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-faint)' }}>
              Profile
            </p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs mb-1.5" style={{ color: 'var(--text-faint)' }}>Display Name</label>
                <input
                  value={displayName}
                  onChange={e => onDisplayNameChange(e.target.value)}
                  placeholder="Your name"
                  className="w-full px-3 py-2 text-sm rounded-xl outline-none"
                  style={inputStyle}
                  onFocus={e => (e.currentTarget.style.border = '1px solid rgba(109,40,217,0.5)')}
                  onBlur={e => (e.currentTarget.style.border = '1px solid var(--color-border)')}
                />
              </div>
              <div>
                <label className="block text-xs mb-1.5" style={{ color: 'var(--text-faint)' }}>Email</label>
                <input
                  value={email}
                  readOnly
                  className="w-full px-3 py-2 text-sm rounded-xl outline-none select-all"
                  style={{ ...inputStyle, color: 'var(--text-faint)', cursor: 'default' }}
                />
              </div>
            </div>
          </section>

          {/* ── Security ── */}
          <section style={{ borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: '1.25rem' }}>
            <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-faint)' }}>
              Security
            </p>
            <div className="space-y-2">
              <div>
                <label className="block text-xs mb-1.5" style={{ color: 'var(--text-faint)' }}>New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={e => { setNewPassword(e.target.value); setPasswordMsg(null) }}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 text-sm rounded-xl outline-none"
                  style={inputStyle}
                  onFocus={e => (e.currentTarget.style.border = '1px solid rgba(109,40,217,0.5)')}
                  onBlur={e => (e.currentTarget.style.border = '1px solid var(--color-border)')}
                />
              </div>
              <div>
                <label className="block text-xs mb-1.5" style={{ color: 'var(--text-faint)' }}>Confirm Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={e => { setConfirmPassword(e.target.value); setPasswordMsg(null) }}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 text-sm rounded-xl outline-none"
                  style={inputStyle}
                  onFocus={e => (e.currentTarget.style.border = '1px solid rgba(109,40,217,0.5)')}
                  onBlur={e => (e.currentTarget.style.border = '1px solid var(--color-border)')}
                />
              </div>

              {passwordMsg && (
                <p className="text-xs" style={{ color: passwordMsg.ok ? '#4ade80' : '#f87171' }}>
                  {passwordMsg.text}
                </p>
              )}

              <button
                onClick={handlePasswordUpdate}
                disabled={!newPassword || !confirmPassword || passwordBusy}
                className="w-full py-2 text-sm font-semibold rounded-xl transition-all mt-1"
                style={{
                  background: newPassword && confirmPassword
                    ? 'linear-gradient(135deg, #6d28d9, #3b82f6)'
                    : 'var(--bg-hover)',
                  color: newPassword && confirmPassword ? 'white' : 'var(--text-faint)',
                  cursor: newPassword && confirmPassword ? 'pointer' : 'not-allowed',
                  boxShadow: newPassword && confirmPassword ? '0 4px 14px rgba(109,40,217,0.3)' : undefined,
                }}
              >
                {passwordBusy ? 'Updating…' : 'Update Password'}
              </button>
            </div>
          </section>

          {/* ── Danger Zone ── */}
          <section style={{ borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: '1.25rem' }}>
            <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-faint)' }}>
              Danger Zone
            </p>

            {resetPhase === 0 && (
              <button
                onClick={() => setResetPhase(1)}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-all"
                style={{ color: 'rgba(251,191,36,0.8)' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(251,191,36,0.08)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <span>⚠</span>
                <span className="font-medium">Reset Account Data</span>
              </button>
            )}

            {resetPhase === 1 && (
              <div className="rounded-xl p-3" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
                <p className="text-xs font-semibold mb-1" style={{ color: '#f87171' }}>Reset all account data?</p>
                <p className="text-xs mb-3" style={{ color: 'var(--text-faint)' }}>
                  Permanently deletes all accounts, transactions, budget categories, and bills. Your login is kept. Cannot be undone.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setResetPhase(0)}
                    className="flex-1 py-1.5 rounded-lg text-xs font-medium transition-all"
                    style={{ background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.6)' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.12)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.07)')}
                  >Cancel</button>
                  <button
                    onClick={() => setResetPhase(2)}
                    className="flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all"
                    style={{ background: 'rgba(239,68,68,0.2)', color: '#f87171' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.3)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.2)')}
                  >Yes, continue</button>
                </div>
              </div>
            )}

            {resetPhase === 2 && (
              <div className="rounded-xl p-3" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
                <p className="text-xs mb-2" style={{ color: 'rgba(255,255,255,0.55)' }}>
                  Type <span style={{ color: '#f87171', fontFamily: 'monospace' }}>RESET</span> to confirm
                </p>
                <input
                  type="text"
                  value={resetText}
                  onChange={e => setResetText(e.target.value)}
                  placeholder="RESET"
                  autoFocus
                  className="w-full rounded-lg px-3 py-1.5 text-xs outline-none mb-2"
                  style={{
                    background: 'rgba(255,255,255,0.07)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    color: 'rgba(255,255,255,0.85)',
                    fontFamily: 'monospace',
                  }}
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => { setResetPhase(0); setResetText('') }}
                    className="flex-1 py-1.5 rounded-lg text-xs font-medium transition-all"
                    style={{ background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.6)' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.12)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.07)')}
                  >Cancel</button>
                  <button
                    disabled={resetText !== 'RESET' || resetBusy}
                    onClick={async () => {
                      setResetBusy(true)
                      await onResetAccount()
                      setResetPhase(0)
                      setResetText('')
                      setResetBusy(false)
                    }}
                    className="flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all"
                    style={{
                      background: resetText === 'RESET' ? 'rgba(239,68,68,0.75)' : 'rgba(239,68,68,0.15)',
                      color: resetText === 'RESET' ? 'white' : 'rgba(239,68,68,0.35)',
                      cursor: resetText === 'RESET' ? 'pointer' : 'not-allowed',
                    }}
                  >
                    {resetBusy ? 'Resetting…' : 'Reset Everything'}
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>,
    document.body
  )
}
