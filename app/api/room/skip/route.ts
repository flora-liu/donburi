import { NextRequest, NextResponse } from 'next/server'
import { getRoom, setRoom } from '@/lib/redis'
import { pusherServer, privatePlayerChannel } from '@/lib/pusher'
import { drawWord } from '@/lib/game-logic'

export async function POST(req: NextRequest) {
  const { code, playerId, wordId } = await req.json()

  const room = await getRoom(code)
  if (!room) return NextResponse.json({ error: 'Room not found' }, { status: 404 })
  if (room.activePlayerId !== playerId) return NextResponse.json({ error: 'Not your turn' }, { status: 403 })

  if (room.skippedWordId) return NextResponse.json({ error: 'Already skipped' }, { status: 400 })
  if (room.bowl.length <= 1) return NextResponse.json({ error: 'Cannot skip last word' }, { status: 400 })

  room.skippedWordId = wordId

  const next = drawWord(room.bowl, room.skippedWordId)
  await setRoom(room)

  if (next) {
    await pusherServer.trigger(privatePlayerChannel(playerId), 'word-drawn', { word: next })
  }

  return NextResponse.json({ ok: true })
}
