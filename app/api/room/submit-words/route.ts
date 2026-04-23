import { NextRequest, NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { getRoom, setRoom, redis, ROOM_TTL } from '@/lib/redis'
import { pusherServer, roomChannel } from '@/lib/pusher'
import { shuffleArray } from '@/lib/game-logic'
import { Word } from '@/types/game'

export async function POST(req: NextRequest) {
  const { code, playerId, words } = await req.json()

  const room = await getRoom(code)
  if (!room) return NextResponse.json({ error: 'Room not found' }, { status: 404 })
  if (room.status !== 'submitting') return NextResponse.json({ error: 'Not in submission phase' }, { status: 400 })
  if (room.submittedPlayerIds.includes(playerId))
    return NextResponse.json({ error: 'Already submitted' }, { status: 400 })

  const player = room.players.find(p => p.id === playerId)
  if (!player) return NextResponse.json({ error: 'Player not found' }, { status: 404 })

  if (!Array.isArray(words) || words.length !== room.wordsPerPerson)
    return NextResponse.json({ error: 'Wrong number of words' }, { status: 400 })

  const newWords: Word[] = words
    .filter((w: string) => w?.trim())
    .map((w: string) => ({ id: uuidv4(), text: w.trim(), authorId: playerId }))

  if (newWords.length !== room.wordsPerPerson)
    return NextResponse.json({ error: 'All words must be non-empty' }, { status: 400 })

  room.bowl.push(...newWords)
  room.submittedPlayerIds.push(playerId)

  if (room.submittedPlayerIds.length === room.players.length) {
    room.bowl = shuffleArray(room.bowl)
    room.status = 'ready'
    // Save original bowl for round resets
    await redis.set(`room:${room.code}:originalBowl`, room.bowl, { ex: ROOM_TTL })
  }

  await setRoom(room)
  await pusherServer.trigger(roomChannel(code), 'room-updated', room)

  return NextResponse.json({ ok: true })
}
