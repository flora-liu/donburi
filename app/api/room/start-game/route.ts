import { NextRequest, NextResponse } from 'next/server'
import { getRoom, setRoom } from '@/lib/redis'
import { pusherServer, roomChannel } from '@/lib/pusher'

export async function POST(req: NextRequest) {
  const { code } = await req.json()

  const room = await getRoom(code)
  if (!room) return NextResponse.json({ error: 'Room not found' }, { status: 404 })
  if (room.status !== 'ready') return NextResponse.json({ error: 'Not ready' }, { status: 400 })

  room.status = 'playing'
  room.currentRoundIndex = 0
  room.currentTeamIndex = 0
  room.teamTurnIndices = [0, 0]
  room.activePlayerId = null
  room.turnStartedAt = null

  await setRoom(room)
  await pusherServer.trigger(roomChannel(code), 'room-updated', room)

  return NextResponse.json({ ok: true })
}
