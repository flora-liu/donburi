import { NextRequest, NextResponse } from 'next/server'
import { getRoom, setRoom } from '@/lib/redis'
import { pusherServer, roomChannel } from '@/lib/pusher'
import { createInitialScores } from '@/lib/game-logic'
import { RoundType } from '@/types/game'

const VALID_ROUND_TYPES: RoundType[] = ['describe', 'charades', 'oneWord']

export async function POST(req: NextRequest) {
  const { code, playerId, wordsPerPerson, enabledRoundTypes } = await req.json()

  const room = await getRoom(code)
  if (!room) return NextResponse.json({ error: 'Room not found' }, { status: 404 })
  if (room.hostId !== playerId) return NextResponse.json({ error: 'Not host' }, { status: 403 })
  if (room.status !== 'lobby') return NextResponse.json({ error: 'Invalid state' }, { status: 400 })
  if (room.players.length < 4) return NextResponse.json({ error: 'Need at least 4 players' }, { status: 400 })

  // Validate round types
  const filtered: RoundType[] = Array.isArray(enabledRoundTypes)
    ? enabledRoundTypes.filter((t: string): t is RoundType => (VALID_ROUND_TYPES as string[]).includes(t))
    : []
  if (filtered.length === 0) return NextResponse.json({ error: 'Pick at least one round type' }, { status: 400 })

  room.wordsPerPerson = Math.max(3, Math.min(10, wordsPerPerson || 5))
  room.enabledRoundTypes = filtered
  room.scores = createInitialScores(2, filtered.length)
  room.status = 'submitting'

  await setRoom(room)
  await pusherServer.trigger(roomChannel(code), 'room-updated', room)

  return NextResponse.json({ ok: true })
}
