import { NextRequest, NextResponse } from 'next/server'
import { getRoom, setRoom } from '@/lib/redis'
import { pusherServer, roomChannel } from '@/lib/pusher'

export async function POST(req: NextRequest) {
  const { code, playerId, targetPlayerId } = await req.json()
  if (!code || !playerId || !targetPlayerId)
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  const room = await getRoom(code.toUpperCase())
  if (!room) return NextResponse.json({ error: 'Room not found' }, { status: 404 })
  if (room.hostId !== playerId)
    return NextResponse.json({ error: 'Only the host can remove players' }, { status: 403 })
  if (room.status !== 'lobby')
    return NextResponse.json({ error: 'Players can only be removed before the game starts' }, { status: 400 })
  if (targetPlayerId === room.hostId)
    return NextResponse.json({ error: 'The host cannot be removed' }, { status: 400 })
  if (!room.players.some((p) => p.id === targetPlayerId))
    return NextResponse.json({ error: 'Player not in room' }, { status: 404 })

  room.players = room.players.filter((p) => p.id !== targetPlayerId)

  await setRoom(room)
  await pusherServer.trigger(roomChannel(room.code), 'room-updated', room)

  return NextResponse.json({ ok: true })
}
