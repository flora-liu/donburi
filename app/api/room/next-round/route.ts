import { NextRequest, NextResponse } from 'next/server'
import { getRoom, setRoom, redis } from '@/lib/redis'
import { pusherServer, roomChannel } from '@/lib/pusher'
import { shuffleArray } from '@/lib/game-logic'
import { Room } from '@/types/game'

export async function POST(req: NextRequest) {
  const { code } = await req.json()

  const room = await getRoom(code)
  if (!room) return NextResponse.json({ error: 'Room not found' }, { status: 404 })
  if (room.status !== 'roundEnd') return NextResponse.json({ error: 'Not in roundEnd state' }, { status: 400 })

  const nextIndex = room.currentRoundIndex + 1

  if (nextIndex >= room.enabledRoundTypes.length) {
    room.status = 'gameOver'
    await setRoom(room)
    await pusherServer.trigger(roomChannel(code), 'game-over', { finalScores: room.scores })
    await pusherServer.trigger(roomChannel(code), 'room-updated', room)
    return NextResponse.json({ gameOver: true })
  }

  const originalWords = await redis.get<Room['bowl']>(`room:${room.code}:originalBowl`)

  room.currentRoundIndex = nextIndex
  room.bowl = shuffleArray(originalWords || [])
  room.status = 'playing'
  room.activePlayerId = null
  room.turnStartedAt = null
  room.skippedWordId = null
  room.currentTeamIndex = 1 - room.currentTeamIndex

  await setRoom(room)
  await pusherServer.trigger(roomChannel(code), 'room-updated', room)

  return NextResponse.json({ ok: true, roundIndex: nextIndex })
}
