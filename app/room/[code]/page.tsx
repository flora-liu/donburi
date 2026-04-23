'use client'

import { use, useEffect, useRef, useState } from 'react'
import Pusher from 'pusher-js'
import { Room, RoundType, Word } from '@/types/game'
import { getRoundName, getRoundRule, getRoundEmoji, getTotalScore } from '@/lib/game-logic'
import confetti from 'canvas-confetti'

const TURN_DURATION = 60
const TEAM_LABELS = ['Team I', 'Team II']

function normalizeRoom(r: Room): Room {
  return {
    ...r,
    enabledRoundTypes: r.enabledRoundTypes?.length ? r.enabledRoundTypes : ['describe', 'charades', 'oneWord'],
    currentRoundIndex: r.currentRoundIndex ?? 0,
    scores: r.scores ?? [[0,0,0],[0,0,0]],
  }
}

function teamBadgeStyle(teamIndex: number) {
  return teamIndex === 0
    ? { background: 'var(--parchment)', color: 'var(--red)', border: '1.5px solid var(--red)' }
    : { background: 'var(--red)', color: 'var(--cream)', border: '1.5px solid var(--red)' }
}

function TulipIcon({ size = 24 }: { size?: number }) {
  return (
    <svg width={size * 0.75} height={size} viewBox="0 0 24 32" fill="none" xmlns="http://www.w3.org/2000/svg">
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
      <TulipIcon size={20} />
      <span className="divider-line" />
    </div>
  )
}

export default function RoomPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params)
  const [room, setRoom] = useState<Room | null>(null)
  const [playerId, setPlayerId] = useState<string | null>(null)
  const [currentWord, setCurrentWord] = useState<Word | null>(null)
  const [timeLeft, setTimeLeft] = useState(TURN_DURATION)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const pusherRef = useRef<Pusher | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const timerEndedRef = useRef(false)

  useEffect(() => {
    const id = localStorage.getItem(`player:${code}`)
    setPlayerId(id)
  }, [code])

  useEffect(() => {
    fetch(`/api/room/${code}`)
      .then(r => r.json())
      .then(data => { if (data && !data.error) setRoom(normalizeRoom(data)) })
      .catch(() => {})
  }, [code])

  useEffect(() => {
    if (!playerId) return

    const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
      authEndpoint: '/api/pusher/auth',
      auth: { params: { user_id: playerId, user_name: '' } },
    })
    pusherRef.current = pusher

    const channel = pusher.subscribe(`presence-room-${code}`)
    channel.bind('room-updated', (data: Room) => setRoom(normalizeRoom(data)))
    channel.bind('turn-started', () => {
      timerEndedRef.current = false
      setCurrentWord(null)
    })
    channel.bind('score-updated', (data: { scores: number[][]; bowlCount: number }) => {
      setRoom(prev => prev ? { ...prev, scores: data.scores, bowl: Array(data.bowlCount).fill(null) } : prev)
    })
    channel.bind('turn-ended', () => {
      setCurrentWord(null)
      if (timerRef.current) clearInterval(timerRef.current)
    })
    channel.bind('game-over', () => {
      confetti({ particleCount: 200, spread: 80, origin: { y: 0.6 }, colors: ['#8B3A2A', '#F2EDE3', '#E8E0CC', '#D9CFC0'] })
    })

    const privateChannel = pusher.subscribe(`private-player-${playerId}`)
    privateChannel.bind('word-drawn', (data: { word: Word }) => {
      setCurrentWord(data.word)
    })

    return () => {
      pusher.unsubscribe(`presence-room-${code}`)
      pusher.unsubscribe(`private-player-${playerId}`)
      pusher.disconnect()
    }
  }, [playerId, code])

  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current)
    if (!room?.turnStartedAt || !room.activePlayerId) return

    const startAt = room.turnStartedAt

    const tick = () => {
      const elapsed = (Date.now() - startAt) / 1000
      const left = Math.max(0, TURN_DURATION - elapsed)
      setTimeLeft(Math.ceil(left))

      if (left <= 0 && !timerEndedRef.current && room.activePlayerId === playerId) {
        timerEndedRef.current = true
        clearInterval(timerRef.current!)
        handleEndTurn('timeout')
      }
    }
    tick()
    timerRef.current = setInterval(tick, 250)
    return () => clearInterval(timerRef.current!)
  }, [room?.turnStartedAt, room?.activePlayerId])

  async function post(path: string, body: object) {
    setError('')
    const res = await fetch(`/api/room/${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, playerId, ...body }),
    })
    const data = await res.json()
    if (!res.ok) setError(data.error || 'Error')
    return data
  }

  async function handleStartSubmission(wordsPerPerson: number, enabledRoundTypes: RoundType[]) {
    setLoading(true)
    await post('start-submission', { wordsPerPerson, enabledRoundTypes })
    setLoading(false)
  }

  async function handleStartGame() {
    setLoading(true)
    await post('start-game', {})
    setLoading(false)
  }

  async function handleStartTurn() {
    setLoading(true)
    await post('start-turn', {})
    setLoading(false)
  }

  async function handleGuess() {
    if (!currentWord) return
    await post('guess', { wordId: currentWord.id })
  }

  async function handleSkip() {
    if (!currentWord) return
    await post('skip', { wordId: currentWord.id })
  }

  async function handleEndTurn(reason: 'timeout' | 'bowlEmpty' = 'timeout') {
    await post('end-turn', { reason })
  }

  async function handleNextRound() {
    setLoading(true)
    await fetch('/api/room/next-round', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    })
    setLoading(false)
  }

  async function handlePlayAgain() {
    setLoading(true)
    await fetch('/api/room/play-again', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    })
    setLoading(false)
  }

  if (!room) {
    return (
      <div className="flex items-center justify-center fade-in" style={{ height: '100dvh' }}>
        <p style={{ fontFamily: "'Pinyon Script', cursive", fontSize: '3rem', color: 'var(--brown-mid)' }}>
          Loading...
        </p>
      </div>
    )
  }

  if (!playerId || !room.players.find(p => p.id === playerId)) {
    return (
      <div className="flex flex-col items-center justify-center px-6" style={{ height: '100dvh' }}>
        <p style={{ fontFamily: "'Courier Prime', monospace", color: 'var(--brown-mid)', textAlign: 'center' }}>
          You are not in this room. Please join from the home screen.
        </p>
      </div>
    )
  }

  const me = room.players.find(p => p.id === playerId)!
  const isHost = room.hostId === playerId
  const isActivePlayer = room.activePlayerId === playerId
  const totalRounds = room.enabledRoundTypes?.length ?? 3
  const currentRoundNumber = (room.currentRoundIndex ?? 0) + 1

  return (
    <div className="flex flex-col" style={{ height: '100dvh', overflow: 'hidden' }}>
      {/* Top status strip */}
      <div
        style={{
          background: 'var(--parchment)',
          borderBottom: '1px solid var(--linen)',
          padding: '6px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
        }}
      >
        <span
          style={{
            fontFamily: "'BigBird', serif",
            letterSpacing: '0.15em',
            fontSize: '0.65rem',
            textTransform: 'uppercase',
            ...teamBadgeStyle(me.teamIndex),
            padding: '3px 8px',
            borderRadius: '2px',
          }}
        >
          {TEAM_LABELS[me.teamIndex]}
        </span>
        <span style={{ fontFamily: "'Courier Prime', monospace", color: 'var(--kraft)', fontSize: '0.75rem', letterSpacing: '0.1em' }}>
          {code}
        </span>
        {room.status === 'playing' ? (
          <span style={{ fontFamily: "'BigBird', serif", letterSpacing: '0.1em', fontSize: '0.65rem', textTransform: 'uppercase', color: 'var(--brown-mid)' }}>
            R{currentRoundNumber}/{totalRounds}
          </span>
        ) : (
          <span />
        )}
      </div>

      <div className="flex-1 overflow-hidden flex flex-col px-5 py-4 max-w-lg mx-auto w-full">
        {error && (
          <div style={{ background: 'var(--parchment)', border: '1px solid var(--red)', borderRadius: '2px', padding: '8px 12px', marginBottom: '12px' }}>
            <p style={{ fontFamily: "'Courier Prime', monospace", color: 'var(--red)', fontSize: '0.85rem' }}>{error}</p>
          </div>
        )}

        {room.status === 'lobby' && (
          <LobbyPhase room={room} isHost={isHost} loading={loading} onStart={handleStartSubmission} />
        )}
        {room.status === 'submitting' && (
          <SubmitPhase room={room} playerId={playerId} onSubmit={async (words) => {
            setLoading(true)
            await post('submit-words', { words })
            setLoading(false)
          }} />
        )}
        {room.status === 'ready' && (
          <ReadyPhase room={room} loading={loading} onStart={handleStartGame} />
        )}
        {room.status === 'playing' && (
          <PlayingPhase
            room={room}
            playerId={playerId}
            isActivePlayer={isActivePlayer}
            currentWord={currentWord}
            timeLeft={timeLeft}
            loading={loading}
            onStartTurn={handleStartTurn}
            onGuess={handleGuess}
            onSkip={handleSkip}
          />
        )}
        {room.status === 'roundEnd' && (
          <RoundEndPhase room={room} loading={loading} onNext={handleNextRound} />
        )}
        {room.status === 'gameOver' && (
          <GameOverPhase room={room} loading={loading} onPlayAgain={handlePlayAgain} />
        )}
      </div>
    </div>
  )
}

// ─── Lobby ────────────────────────────────────────────────────────────────────

const ROUND_TYPE_OPTIONS: RoundType[] = ['describe', 'charades', 'oneWord']

function LobbyPhase({
  room, isHost, loading, onStart
}: {
  room: Room
  isHost: boolean
  loading: boolean
  onStart: (wordsPerPerson: number, enabledRoundTypes: RoundType[]) => void
}) {
  const [copied, setCopied] = useState(false)
  const [wordsPerPerson, setWordsPerPerson] = useState(room.wordsPerPerson)
  const [enabled, setEnabled] = useState<Set<RoundType>>(new Set(room.enabledRoundTypes))

  function copyCode() {
    navigator.clipboard.writeText(room.code).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  function toggle(t: RoundType) {
    setEnabled(prev => {
      const next = new Set(prev)
      if (next.has(t)) next.delete(t); else next.add(t)
      return next
    })
  }

  const enabledList = ROUND_TYPE_OPTIONS.filter(t => enabled.has(t))

  return (
    <div className="flex flex-col gap-5 fade-in overflow-y-auto flex-1">
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', paddingTop: '8px' }}>
        <p style={{ fontFamily: "'Courier Prime', monospace", color: 'var(--kraft)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          Share this code
        </p>
        <button onClick={copyCode} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
          <div className="room-code">{room.code}</div>
        </button>
        <p style={{ fontFamily: "'Courier Prime', monospace", color: 'var(--kraft)', fontSize: '0.7rem', fontStyle: 'italic' }}>
          {copied ? '✓ copied to clipboard' : 'tap to copy'}
        </p>
      </div>

      <Divider />

      <div className="card">
        <p style={{ fontFamily: "'BigBird', serif", letterSpacing: '0.2em', textTransform: 'uppercase', fontSize: '0.65rem', color: 'var(--brown-mid)', marginBottom: '12px' }}>
          Players — {room.players.length}
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {room.players.map(p => (
            <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span
                style={{
                  fontFamily: "'BigBird', serif",
                  letterSpacing: '0.1em',
                  fontSize: '0.6rem',
                  textTransform: 'uppercase',
                  padding: '3px 8px',
                  borderRadius: '2px',
                  flexShrink: 0,
                  ...teamBadgeStyle(p.teamIndex),
                }}
              >
                {TEAM_LABELS[p.teamIndex]}
              </span>
              <span style={{ fontFamily: "'Courier Prime', monospace", color: 'var(--brown-dark)' }}>{p.name}</span>
              {p.id === room.hostId && (
                <span style={{ fontFamily: "'Courier Prime', monospace", color: 'var(--kraft)', fontSize: '0.7rem', fontStyle: 'italic' }}>host</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {isHost && (
        <>
          <div className="card">
            <p style={{ fontFamily: "'BigBird', serif", letterSpacing: '0.15em', textTransform: 'uppercase', fontSize: '0.65rem', color: 'var(--brown-mid)', marginBottom: '10px' }}>
              Words per person — {wordsPerPerson}
            </p>
            <input
              type="range"
              min={3}
              max={10}
              value={wordsPerPerson}
              onChange={e => setWordsPerPerson(Number(e.target.value))}
              style={{ accentColor: 'var(--red)', width: '100%', borderBottom: 'none', padding: 0 }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: "'Courier Prime', monospace", fontSize: '0.7rem', color: 'var(--kraft)', marginTop: '4px' }}>
              <span>3</span><span>10</span>
            </div>
          </div>

          <div className="card">
            <p style={{ fontFamily: "'BigBird', serif", letterSpacing: '0.15em', textTransform: 'uppercase', fontSize: '0.65rem', color: 'var(--brown-mid)', marginBottom: '12px' }}>
              Rounds
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {ROUND_TYPE_OPTIONS.map(t => (
                <label
                  key={t}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 12px',
                    borderRadius: '2px',
                    border: '1.5px solid',
                    borderColor: enabled.has(t) ? 'var(--red)' : 'var(--linen)',
                    background: enabled.has(t) ? 'var(--parchment)' : 'transparent',
                    cursor: 'pointer',
                    minHeight: '52px',
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '1.2rem' }}>{getRoundEmoji(t)}</span>
                    <span style={{ fontFamily: "'Courier Prime', monospace", color: 'var(--brown-dark)', fontSize: '0.9rem' }}>
                      {getRoundName(t)}
                    </span>
                  </span>
                  <input
                    type="checkbox"
                    checked={enabled.has(t)}
                    onChange={() => toggle(t)}
                    style={{
                      width: 'auto',
                      borderBottom: 'none',
                      padding: 0,
                      accentColor: 'var(--red)',
                      cursor: 'pointer',
                    }}
                  />
                </label>
              ))}
            </div>
          </div>
        </>
      )}

      {!isHost && (
        <p style={{ fontFamily: "'Courier Prime', monospace", color: 'var(--brown-mid)', fontStyle: 'italic', textAlign: 'center', fontSize: '0.9rem' }}>
          Waiting for host to start...
        </p>
      )}

      {isHost && (
        <button
          className="btn-primary"
          onClick={() => onStart(wordsPerPerson, enabledList)}
          disabled={loading || room.players.length < 4 || enabledList.length === 0}
        >
          {room.players.length < 4
            ? `Need ${4 - room.players.length} more`
            : enabledList.length === 0
              ? 'Pick at least 1 round'
              : loading ? '...' : "Everyone's In"}
        </button>
      )}
    </div>
  )
}

// ─── Word Submission ───────────────────────────────────────────────────────────

function SubmitPhase({
  room, playerId, onSubmit
}: {
  room: Room
  playerId: string
  onSubmit: (words: string[]) => Promise<void>
}) {
  const alreadySubmitted = room.submittedPlayerIds.includes(playerId)
  const [words, setWords] = useState<string[]>(Array(room.wordsPerPerson).fill(''))
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit() {
    if (words.some(w => !w.trim())) { setError('Fill in all words'); return }
    setSubmitting(true)
    await onSubmit(words)
    setSubmitting(false)
  }

  const submitted = room.submittedPlayerIds.length
  const total = room.players.length

  if (alreadySubmitted) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 gap-6 fade-in">
        <p style={{ fontFamily: "'Pinyon Script', cursive", fontSize: '3rem', color: 'var(--brown-dark)' }}>
          Submitted!
        </p>
        <div className="card w-full text-center">
          <p style={{ fontFamily: "'BigBird', serif", letterSpacing: '0.15em', textTransform: 'uppercase', fontSize: '0.7rem', color: 'var(--brown-mid)', marginBottom: '10px' }}>
            {submitted} of {total} submitted
          </p>
          <div className="timer-bar">
            <div className="timer-fill" style={{ width: `${(submitted / total) * 100}%`, transition: 'width 0.5s ease' }} />
          </div>
        </div>
        <p style={{ fontFamily: "'Courier Prime', monospace", color: 'var(--kraft)', fontStyle: 'italic', fontSize: '0.85rem' }}>
          Waiting for everyone...
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5 fade-in overflow-y-auto flex-1">
      <div className="text-center">
        <h2 style={{ fontFamily: "'BigBird', serif", letterSpacing: '0.2em', textTransform: 'uppercase', fontSize: '1rem', color: 'var(--brown-dark)' }}>
          Your Words
        </h2>
        <p style={{ fontFamily: "'Courier Prime', monospace", color: 'var(--kraft)', fontSize: '0.8rem', marginTop: '4px', fontStyle: 'italic' }}>
          people, places, things, movies...
        </p>
      </div>

      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
        {words.map((w, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'flex-end', gap: '12px', borderBottom: i < words.length - 1 ? '1px solid var(--linen)' : 'none', paddingBottom: '4px', paddingTop: i === 0 ? 0 : '4px' }}>
            <span className="stamp-num" style={{ paddingBottom: '8px' }}>
              {String(i + 1).padStart(2, '0')}
            </span>
            <input
              placeholder={`word ${i + 1}`}
              value={w}
              onChange={e => {
                const next = [...words]
                next[i] = e.target.value
                setWords(next)
              }}
              maxLength={40}
            />
          </div>
        ))}
      </div>

      {error && (
        <p style={{ fontFamily: "'Courier Prime', monospace", color: 'var(--red)', fontSize: '0.85rem', textAlign: 'center' }}>
          {error}
        </p>
      )}

      <div style={{ fontFamily: "'Courier Prime', monospace", color: 'var(--kraft)', fontSize: '0.75rem', textAlign: 'center' }}>
        {submitted} / {total} submitted
      </div>

      <button className="btn-primary" onClick={handleSubmit} disabled={submitting}>
        {submitting ? '...' : 'Submit Words'}
      </button>
    </div>
  )
}

// ─── Ready ────────────────────────────────────────────────────────────────────

function ReadyPhase({ room, loading, onStart }: { room: Room; loading: boolean; onStart: () => void }) {
  const firstRoundType = room.enabledRoundTypes[0]
  return (
    <div className="flex flex-col items-center justify-center flex-1 gap-6 fade-in">
      <div style={{ textAlign: 'center' }}>
        <p style={{ fontFamily: "'BigBird', serif", letterSpacing: '0.3em', textTransform: 'uppercase', fontSize: '0.65rem', color: 'var(--kraft)' }}>
          Round 1 of {room.enabledRoundTypes.length}
        </p>
        <p style={{ fontFamily: "'Pinyon Script', cursive", fontSize: '3rem', color: 'var(--brown-dark)', lineHeight: 1.1 }}>
          {getRoundName(firstRoundType)}
        </p>
      </div>

      <div className="card w-full">
        <p style={{ fontFamily: "'Courier Prime', monospace", color: 'var(--brown-mid)', fontSize: '0.9rem', lineHeight: 1.6 }}>
          {getRoundRule(firstRoundType)}
        </p>
      </div>

      <div style={{ fontFamily: "'Courier Prime', monospace", color: 'var(--kraft)', fontSize: '0.85rem', textAlign: 'center' }}>
        {room.bowl.length} words in the bowl
      </div>

      <button className="btn-primary" onClick={onStart} disabled={loading}>
        {loading ? '...' : 'Start Game'}
      </button>
    </div>
  )
}

// ─── Playing ─────────────────────────────────────────────────────────────────

function PlayingPhase({
  room, playerId, isActivePlayer, currentWord, timeLeft, loading, onStartTurn, onGuess, onSkip
}: {
  room: Room
  playerId: string
  isActivePlayer: boolean
  currentWord: Word | null
  timeLeft: number
  loading: boolean
  onStartTurn: () => void
  onGuess: () => void
  onSkip: () => void
}) {
  const bowlCount = room.bowl.length
  const roundType = room.enabledRoundTypes[room.currentRoundIndex]
  const canSkip = !room.skippedWordId && bowlCount > 1
  const timerPercent = (timeLeft / TURN_DURATION) * 100
  const isLow = timeLeft <= 10

  const activePlayer = room.players.find(p => p.id === room.activePlayerId)
  const activeTeam = room.currentTeamIndex

  if (!room.activePlayerId) {
    const team0 = room.players.filter(p => p.teamIndex === 0)
    const team1 = room.players.filter(p => p.teamIndex === 1)
    const currentTeam = room.currentTeamIndex === 0 ? team0 : team1
    const currentActivePlayer = currentTeam[room.teamTurnIndices[room.currentTeamIndex]]
    const isMyTurn = currentActivePlayer?.id === playerId

    return (
      <div className="flex flex-col items-center justify-center flex-1 gap-5 fade-in">
        <RoundBanner type={roundType} />

        <ScoreDisplay room={room} />

        <div className="card w-full text-center">
          <p
            style={{
              fontFamily: "'BigBird', serif",
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              fontSize: '0.65rem',
              marginBottom: '6px',
              ...teamBadgeStyle(activeTeam),
              display: 'inline-block',
              padding: '3px 8px',
              borderRadius: '2px',
            }}
          >
            {TEAM_LABELS[activeTeam]}
          </p>
          <p style={{ fontFamily: "'Courier Prime', monospace", fontSize: '1.1rem', color: 'var(--brown-dark)', fontWeight: 700 }}>
            {currentActivePlayer?.name ?? '?'}
          </p>
          <p style={{ fontFamily: "'Courier Prime', monospace", color: 'var(--kraft)', fontSize: '0.8rem', fontStyle: 'italic', marginTop: '4px' }}>
            is up next · {bowlCount} word{bowlCount !== 1 ? 's' : ''} left
          </p>
        </div>

        {isMyTurn ? (
          <button className="btn-primary" onClick={onStartTurn} disabled={loading}>
            {loading ? '...' : "It's My Turn"}
          </button>
        ) : (
          <p style={{ fontFamily: "'Courier Prime', monospace", color: 'var(--brown-mid)', fontStyle: 'italic', fontSize: '0.9rem', textAlign: 'center' }}>
            Waiting for {currentActivePlayer?.name}...
          </p>
        )}
      </div>
    )
  }

  // Active player giving clues
  if (isActivePlayer) {
    return (
      <div className="flex flex-col h-full fade-in" style={{ gap: 0 }}>
        <div className="timer-bar" style={{ flexShrink: 0 }}>
          <div className={`timer-fill ${isLow ? 'urgent' : ''}`} style={{ width: `${timerPercent}%` }} />
        </div>

        <div className="round-banner" style={{ flexShrink: 0 }}>
          {getRoundName(roundType)}
        </div>

        <div
          className="flex-1 flex flex-col items-center justify-center"
          style={{
            background: 'var(--parchment)',
            border: '1.5px solid var(--linen)',
            borderRadius: '3px',
            margin: '16px 0',
            boxShadow: '2px 3px 0px var(--linen), 4px 6px 12px rgba(46,26,20,0.08)',
            padding: '2rem',
          }}
        >
          {currentWord ? (
            <p className="active-word">{currentWord.text}</p>
          ) : (
            <p style={{ fontFamily: "'Courier Prime', monospace", color: 'var(--kraft)', fontStyle: 'italic' }}>
              Loading...
            </p>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: "'Courier Prime', monospace", fontSize: '0.75rem', color: isLow ? 'var(--red)' : 'var(--kraft)', marginBottom: '8px', flexShrink: 0 }}>
          <span style={{ fontWeight: isLow ? 700 : 400 }}>{timeLeft}s</span>
          <span>{bowlCount} left</span>
        </div>

        <div style={{ display: 'flex', gap: '12px', flexShrink: 0 }}>
          <button
            className="btn-primary"
            style={{ flex: 2 }}
            onClick={onGuess}
            disabled={!currentWord}
          >
            Got It ✓
          </button>
          <button
            className="btn-ghost"
            style={{ flex: 1 }}
            onClick={onSkip}
            disabled={!currentWord || !canSkip}
          >
            Skip ⟳
          </button>
        </div>
      </div>
    )
  }

  // Spectator view
  return (
    <div className="flex flex-col items-center justify-center flex-1 gap-5 fade-in">
      <div className="timer-bar w-full" style={{ flexShrink: 0 }}>
        <div className={`timer-fill ${isLow ? 'urgent' : ''}`} style={{ width: `${timerPercent}%` }} />
      </div>

      <RoundBanner type={roundType} />

      <div className="card w-full text-center">
        <p
          style={{
            fontFamily: "'BigBird', serif",
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            fontSize: '0.6rem',
            ...teamBadgeStyle(activeTeam),
            display: 'inline-block',
            padding: '3px 8px',
            borderRadius: '2px',
            marginBottom: '8px',
          }}
        >
          {TEAM_LABELS[activeTeam]}
        </p>
        <p style={{ fontFamily: "'Courier Prime', monospace", fontSize: '1.2rem', fontWeight: 700, color: 'var(--brown-dark)' }}>
          {activePlayer?.name}
        </p>
        <p style={{ fontFamily: "'Courier Prime', monospace", color: 'var(--kraft)', fontSize: '0.8rem', fontStyle: 'italic', marginTop: '4px' }}>
          is giving clues...
        </p>
        <div style={{ fontFamily: "'Courier Prime', monospace", color: isLow ? 'var(--red)' : 'var(--brown-mid)', fontSize: '0.85rem', fontWeight: isLow ? 700 : 400, marginTop: '8px' }}>
          {timeLeft}s
        </div>
      </div>

      <ScoreDisplay room={room} />

      <p style={{ fontFamily: "'Courier Prime', monospace", color: 'var(--kraft)', fontSize: '0.8rem' }}>
        {bowlCount} word{bowlCount !== 1 ? 's' : ''} remaining in bowl
      </p>
    </div>
  )
}

// ─── Round End ────────────────────────────────────────────────────────────────

function RoundEndPhase({ room, loading, onNext }: { room: Room; loading: boolean; onNext: () => void }) {
  const totalRounds = room.enabledRoundTypes.length
  const currentRoundNumber = room.currentRoundIndex + 1
  const nextIndex = room.currentRoundIndex + 1
  const nextType = room.enabledRoundTypes[nextIndex]
  const currentType = room.enabledRoundTypes[room.currentRoundIndex]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, gap: '20px' }} className="fade-in">
      <div style={{ background: 'var(--red)', padding: '24px 32px', borderRadius: '3px', textAlign: 'center', width: '100%', marginBottom: '4px' }}>
        <p style={{ fontFamily: "'BigBird', serif", letterSpacing: '0.3em', textTransform: 'uppercase', fontSize: '0.65rem', color: 'var(--cream)', opacity: 0.7 }}>
          End of
        </p>
        <p style={{ fontFamily: "'BigBird', serif", letterSpacing: '0.25em', textTransform: 'uppercase', fontSize: '2rem', color: 'var(--cream)', lineHeight: 1 }}>
          Round {currentRoundNumber}
        </p>
        <p style={{ fontFamily: "'Pinyon Script', cursive", fontSize: '1.8rem', color: 'var(--parchment)', marginTop: '4px' }}>
          {getRoundName(currentType)}
        </p>
      </div>

      <div className="card w-full">
        <p style={{ fontFamily: "'BigBird', serif", letterSpacing: '0.2em', textTransform: 'uppercase', fontSize: '0.65rem', color: 'var(--brown-mid)', marginBottom: '14px' }}>
          Scores
        </p>
        {[0, 1].map(t => (
          <div key={t} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
            <span
              style={{
                fontFamily: "'BigBird', serif",
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                fontSize: '0.65rem',
                padding: '3px 8px',
                borderRadius: '2px',
                ...teamBadgeStyle(t),
              }}
            >
              {TEAM_LABELS[t]}
            </span>
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              {room.scores[t].map((s, r) => (
                <span
                  key={r}
                  style={{
                    fontFamily: "'Courier Prime', monospace",
                    fontSize: '0.8rem',
                    padding: '2px 6px',
                    background: r <= room.currentRoundIndex ? 'var(--linen)' : 'transparent',
                    color: r <= room.currentRoundIndex ? 'var(--brown-dark)' : 'var(--kraft)',
                    borderRadius: '2px',
                  }}
                >
                  {r <= room.currentRoundIndex ? s : '—'}
                </span>
              ))}
              <span style={{ fontFamily: "'BigBird', serif", fontSize: '1.1rem', color: 'var(--brown-dark)', marginLeft: '6px', letterSpacing: '0.05em' }}>
                {room.scores[t].slice(0, room.currentRoundIndex + 1).reduce((a, b) => a + b, 0)}
              </span>
            </div>
          </div>
        ))}
      </div>

      {nextType && (
        <div className="card w-full">
          <p style={{ fontFamily: "'BigBird', serif", letterSpacing: '0.2em', textTransform: 'uppercase', fontSize: '0.65rem', color: 'var(--red)', marginBottom: '4px' }}>
            Round {nextIndex + 1} of {totalRounds}
          </p>
          <p style={{ fontFamily: "'Pinyon Script', cursive", fontSize: '1.8rem', color: 'var(--brown-dark)', lineHeight: 1.1 }}>
            {getRoundName(nextType)}
          </p>
          <p style={{ fontFamily: "'Courier Prime', monospace", color: 'var(--brown-mid)', fontSize: '0.85rem', marginTop: '6px' }}>
            {getRoundRule(nextType)}
          </p>
        </div>
      )}

      <button className="btn-primary" onClick={onNext} disabled={loading}>
        {loading ? '...' : nextType ? `Start Round ${nextIndex + 1}` : 'Final Results'}
      </button>
    </div>
  )
}

// ─── Game Over ────────────────────────────────────────────────────────────────

function GameOverPhase({ room, loading, onPlayAgain }: { room: Room; loading: boolean; onPlayAgain: () => void }) {
  const totals = [getTotalScore(room.scores, 0), getTotalScore(room.scores, 1)]
  const winner = totals[0] > totals[1] ? 0 : totals[1] > totals[0] ? 1 : -1
  const roundCount = room.enabledRoundTypes.length
  const colWidth = `${Math.max(28, 80 / roundCount)}px`

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, gap: '20px' }} className="fade-in">
      <div style={{ textAlign: 'center' }}>
        <p style={{ fontFamily: "'BigBird', serif", letterSpacing: '0.3em', textTransform: 'uppercase', fontSize: '0.65rem', color: 'var(--kraft)' }}>
          Final Results
        </p>
        <p style={{ fontFamily: "'Pinyon Script', cursive", fontSize: '3.5rem', color: 'var(--brown-dark)', lineHeight: 1.1 }}>
          {winner >= 0 ? `${TEAM_LABELS[winner]} wins!` : "It's a tie!"}
        </p>
      </div>

      <div className="card w-full">
        <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
          <div style={{ flex: 1 }} />
          {room.enabledRoundTypes.map((_, r) => (
            <div key={r} style={{ width: colWidth, textAlign: 'center', fontFamily: "'BigBird', serif", letterSpacing: '0.1em', fontSize: '0.6rem', textTransform: 'uppercase', color: 'var(--kraft)' }}>
              R{r + 1}
            </div>
          ))}
          <div style={{ width: '40px', textAlign: 'right', fontFamily: "'BigBird', serif", letterSpacing: '0.1em', fontSize: '0.6rem', textTransform: 'uppercase', color: 'var(--brown-mid)' }}>
            Total
          </div>
        </div>

        <div style={{ height: '1px', background: 'var(--linen)', marginBottom: '10px' }} />

        {[0, 1].map(t => (
          <div key={t} style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '10px' }}>
            <div style={{ flex: 1 }}>
              <span
                style={{
                  fontFamily: "'BigBird', serif",
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  fontSize: '0.6rem',
                  padding: '2px 6px',
                  borderRadius: '2px',
                  ...teamBadgeStyle(t),
                }}
              >
                {TEAM_LABELS[t]}
              </span>
            </div>
            {room.scores[t].map((s, r) => (
              <div key={r} style={{ width: colWidth, textAlign: 'center', fontFamily: "'Courier Prime', monospace", fontSize: '0.9rem', color: 'var(--brown-dark)' }}>
                {s}
              </div>
            ))}
            <div style={{ width: '40px', textAlign: 'right', fontFamily: "'BigBird', serif", fontSize: '1.1rem', color: winner === t ? 'var(--red)' : 'var(--brown-dark)', letterSpacing: '0.05em' }}>
              {totals[t]}
            </div>
          </div>
        ))}

        <div style={{ height: '1px', background: 'var(--linen)', margin: '4px 0' }} />
      </div>

      <button className="btn-primary" onClick={onPlayAgain} disabled={loading}>
        {loading ? '...' : 'Play Again'}
      </button>
    </div>
  )
}

// ─── Shared ───────────────────────────────────────────────────────────────────

function RoundBanner({ type }: { type: RoundType }) {
  return (
    <div className="round-banner w-full" style={{ flexShrink: 0 }}>
      {getRoundName(type)}
    </div>
  )
}

function ScoreDisplay({ room }: { room: Room }) {
  return (
    <div style={{ display: 'flex', gap: '10px', width: '100%' }}>
      {[0, 1].map(t => (
        <div
          key={t}
          style={{
            flex: 1,
            borderRadius: '3px',
            padding: '10px',
            textAlign: 'center',
            border: '1.5px solid',
            ...(t === 0
              ? { background: 'var(--parchment)', borderColor: 'var(--red)', color: 'var(--red)' }
              : { background: 'var(--red)', borderColor: 'var(--red)', color: 'var(--cream)' }),
          }}
        >
          <p style={{ fontFamily: "'BigBird', serif", letterSpacing: '0.1em', textTransform: 'uppercase', fontSize: '0.55rem', opacity: 0.7 }}>
            {TEAM_LABELS[t]}
          </p>
          <p style={{ fontFamily: "'BigBird', serif", fontSize: '1.8rem', letterSpacing: '0.05em', lineHeight: 1.1 }}>
            {getTotalScore(room.scores, t)}
          </p>
          <p style={{ fontFamily: "'Courier Prime', monospace", fontSize: '0.65rem', opacity: 0.6 }}>
            r{room.currentRoundIndex + 1}: {room.scores[t][room.currentRoundIndex] ?? 0}
          </p>
        </div>
      ))}
    </div>
  )
}
