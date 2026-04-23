import { NextRequest, NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { getRoom, setRoom } from '@/lib/redis'
import { pusherServer, roomChannel } from '@/lib/pusher'
import { assignTeam } from '@/lib/game-logic'

export async function POST(req: NextRequest) {
  const { code, name } = await req.json()
  if (!code?.trim() || !name?.trim())
    return NextResponse.json({ error: 'Code and name required' }, { status: 400 })

  const room = await getRoom(code.toUpperCase())
  if (!room) return NextResponse.json({ error: 'Room not found' }, { status: 404 })
  if (room.status !== 'lobby') return NextResponse.json({ error: 'Game already started' }, { status: 400 })

  const playerId = uuidv4()
  const player = { id: playerId, name: name.trim(), teamIndex: assignTeam(room.players) }
  room.players.push(player)

  await setRoom(room)
  await pusherServer.trigger(roomChannel(code), 'room-updated', room)

  return NextResponse.json({ code: room.code, playerId })
}
