import { NextRequest, NextResponse } from 'next/server'
import { getRoom, setRoom } from '@/lib/redis'
import { pusherServer, roomChannel } from '@/lib/pusher'
import { nextTeamTurnIndex } from '@/lib/game-logic'
import { TurnEndReason } from '@/types/game'

export async function POST(req: NextRequest) {
  const { code, playerId, reason } = await req.json() as { code: string; playerId: string; reason: TurnEndReason }

  const room = await getRoom(code)
  if (!room) return NextResponse.json({ error: 'Room not found' }, { status: 404 })
  if (room.activePlayerId !== playerId) return NextResponse.json({ error: 'Not your turn' }, { status: 403 })
  if (room.status !== 'playing') return NextResponse.json({ error: 'Not playing' }, { status: 400 })

  if (reason === 'timeout') {
    // Validate that enough time has elapsed
    if (room.turnStartedAt) {
      const elapsed = (Date.now() - room.turnStartedAt) / 1000
      if (elapsed < 58) return NextResponse.json({ error: 'Timer not expired' }, { status: 400 })
    }
  }

  // Advance turn to next team
  const prevTeam = room.currentTeamIndex
  room.teamTurnIndices[prevTeam] = nextTeamTurnIndex(room, prevTeam)
  room.currentTeamIndex = 1 - prevTeam
  room.activePlayerId = null
  room.turnStartedAt = null
  room.skippedWordId = null

  await setRoom(room)
  await pusherServer.trigger(roomChannel(code), 'turn-ended', { reason })
  await pusherServer.trigger(roomChannel(code), 'room-updated', room)

  return NextResponse.json({ ok: true })
}
