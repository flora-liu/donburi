'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

function TulipIcon() {
  return (
    <svg width="24" height="32" viewBox="0 0 24 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 32 Q11 24 12 18" stroke="var(--brown-mid)" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M8 20 Q10 16 12 18 Q14 16 16 20 Q14 26 12 24 Q10 26 8 20Z" fill="var(--linen)" stroke="var(--brown-mid)" strokeWidth="1"/>
      <path d="M6 22 Q9 18 12 18" stroke="var(--linen)" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M18 22 Q15 18 12 18" stroke="var(--linen)" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  )
}

function Divider() {
  return (
    <div className="divider">
      <span className="divider-line" />
      <TulipIcon />
      <span className="divider-line" />
    </div>
  )
}

export default function Home() {
  const router = useRouter()
  const [view, setView] = useState<'home' | 'create' | 'join'>('home')
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleCreate() {
    if (!name.trim()) { setError('Enter your name'); return }
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/room/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error); return }
      localStorage.setItem(`player:${data.code}`, data.playerId)
      router.push(`/room/${data.code}`)
    } catch {
      setError('Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  async function handleJoin() {
    if (!name.trim() || !code.trim()) { setError('Enter your name and room code'); return }
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/room/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, code: code.toUpperCase() }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error); return }
      localStorage.setItem(`player:${data.code}`, data.playerId)
      router.push(`/room/${data.code}`)
    } catch {
      setError('Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  if (view === 'home') {
    return (
      <main
        className="flex flex-col items-center justify-center h-full px-6 fade-in"
        style={{ minHeight: '100dvh' }}
      >
        <div className="text-center mb-10">
          <h1
            style={{
              fontFamily: "'Pinyon Script', cursive",
              fontSize: 'clamp(4rem, 14vw, 6rem)',
              color: 'var(--brown-dark)',
              lineHeight: 1.1,
              marginBottom: '0.5rem',
            }}
          >
            Fishbowl
          </h1>
          <div className="flex justify-center mb-4">
            <TulipIcon />
          </div>
          <p style={{ fontFamily: "'Courier Prime', monospace", color: 'var(--brown-mid)', fontSize: '0.85rem', letterSpacing: '0.05em' }}>
            the ultimate party word game
          </p>
        </div>

        <div className="flex gap-3 w-full max-w-xs">
          <button className="btn-primary flex-1" onClick={() => { setView('create'); setError('') }}>
            Create
          </button>
          <button className="btn-ghost flex-1" onClick={() => { setView('join'); setError('') }}>
            Join
          </button>
        </div>

        <Divider />

        <p style={{ fontFamily: "'Courier Prime', monospace", color: 'var(--kraft)', fontSize: '0.75rem', textAlign: 'center' }}>
          4+ players · 4 rounds · no phones needed
        </p>
      </main>
    )
  }

  return (
    <main
      className="flex flex-col h-full px-6 py-8 fade-in"
      style={{ minHeight: '100dvh' }}
    >
      <button
        style={{ fontFamily: "'Courier Prime', monospace", color: 'var(--brown-mid)', fontSize: '0.85rem' }}
        className="self-start mb-8 flex items-center gap-2"
        onClick={() => { setView('home'); setError('') }}
      >
        ← back
      </button>

      <div className="flex flex-col items-center justify-center flex-1 gap-8">
        <div className="text-center">
          <h2
            style={{
              fontFamily: "'BigBird', serif",
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              fontSize: '1.3rem',
              color: 'var(--brown-dark)',
            }}
          >
            {view === 'create' ? 'New Game' : 'Join Game'}
          </h2>
        </div>

        <div className="card w-full max-w-sm flex flex-col gap-6">
          {view === 'join' && (
            <div>
              <label
                style={{ fontFamily: "'Courier Prime', monospace", fontSize: '0.7rem', color: 'var(--kraft)', textTransform: 'uppercase', letterSpacing: '0.1em' }}
              >
                Room Code
              </label>
              <input
                placeholder="XXXXX"
                value={code}
                onChange={e => setCode(e.target.value.toUpperCase())}
                maxLength={5}
                autoCapitalize="characters"
                style={{
                  textAlign: 'center',
                  fontSize: '1.8rem',
                  letterSpacing: '0.3em',
                  fontFamily: "'BigBird', serif",
                  color: 'var(--red)',
                  textTransform: 'uppercase',
                }}
              />
            </div>
          )}

          <div>
            <label
              style={{ fontFamily: "'Courier Prime', monospace", fontSize: '0.7rem', color: 'var(--kraft)', textTransform: 'uppercase', letterSpacing: '0.1em' }}
            >
              Your Name
            </label>
            <input
              placeholder="e.g. Margaret"
              value={name}
              onChange={e => setName(e.target.value)}
              maxLength={20}
              onKeyDown={e => e.key === 'Enter' && (view === 'create' ? handleCreate() : handleJoin())}
              autoFocus
            />
          </div>

          {error && (
            <p style={{ fontFamily: "'Courier Prime', monospace", color: 'var(--red)', fontSize: '0.85rem', textAlign: 'center' }}>
              {error}
            </p>
          )}

          <button
            className="btn-primary"
            onClick={view === 'create' ? handleCreate : handleJoin}
            disabled={loading}
          >
            {loading ? '...' : view === 'create' ? 'Create Room' : 'Enter Room'}
          </button>
        </div>
      </div>
    </main>
  )
}
