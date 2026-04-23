import { NextRequest, NextResponse } from 'next/server'
import { getRoom, setRoom, redis } from '@/lib/redis'
import { pusherServer, roomChannel } from '@/lib/pusher'
import { createInitialScores, shuffleArray } from '@/lib/game-logic'

export async function POST(req: NextRequest) {
  const { code } = await req.json()

  const room = await getRoom(code)
  if (!room) return NextResponse.json({ error: 'Room not found' }, { status: 404 })
  if (room.status !== 'gameOver') return NextResponse.json({ error: 'Game not over' }, { status: 400 })

  const originalWords = await redis.get<typeof room.bowl>(`room:${room.code}:originalBowl`)

  room.status = 'playing'
  room.scores = createInitialScores(2, room.enabledRoundTypes.length)
  room.currentRoundIndex = 0
  room.currentTeamIndex = 0
  room.teamTurnIndices = [0, 0]
  room.activePlayerId = null
  room.turnStartedAt = null
  room.skippedWordId = null
  room.bowl = shuffleArray(originalWords || [])

  await setRoom(room)
  await pusherServer.trigger(roomChannel(code), 'room-updated', room)

  return NextResponse.json({ ok: true })
}
