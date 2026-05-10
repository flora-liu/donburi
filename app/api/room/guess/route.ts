import { NextRequest, NextResponse } from 'next/server'
import { getRoom, setRoom } from '@/lib/redis'
import { pusherServer, roomChannel, privatePlayerChannel } from '@/lib/pusher'
import { drawWord, nextTeamTurnIndex } from '@/lib/game-logic'

const TURN_DURATION = 60
const CARRY_THRESHOLD = 1

export async function POST(req: NextRequest) {
  const { code, playerId, wordId } = await req.json()

  const room = await getRoom(code)
  if (!room) return NextResponse.json({ error: 'Room not found' }, { status: 404 })
  if (room.activePlayerId !== playerId) return NextResponse.json({ error: 'Not your turn' }, { status: 403 })

  const wordIndex = room.bowl.findIndex(w => w.id === wordId)
  if (wordIndex === -1) return NextResponse.json({ error: 'Word not found' }, { status: 404 })

  room.bowl.splice(wordIndex, 1)
  room.scores[room.currentTeamIndex][room.currentRoundIndex]++

  if (room.skippedWordId === wordId) room.skippedWordId = null

  await pusherServer.trigger(roomChannel(code), 'score-updated', {
    scores: room.scores,
    bowlCount: room.bowl.length,
  })

  if (room.bowl.length === 0) {
    const elapsed = room.turnStartedAt ? (Date.now() - room.turnStartedAt) / 1000 : TURN_DURATION
    const remaining = Math.max(0, TURN_DURATION - elapsed)

    if (remaining > CARRY_THRESHOLD) {
      // Same team & player continue into the next round with leftover time
      room.carryOverTime = remaining
    } else {
      // At the buzzer: behave like a timeout — advance player so next-round can flip teams cleanly
      room.teamTurnIndices[room.currentTeamIndex] = nextTeamTurnIndex(room, room.currentTeamIndex)
      room.carryOverTime = null
    }

    room.status = 'roundEnd'
    room.activePlayerId = null
    room.turnStartedAt = null

    await setRoom(room)
    await pusherServer.trigger(roomChannel(code), 'turn-ended', { reason: 'bowlEmpty' })
    await pusherServer.trigger(roomChannel(code), 'room-updated', room)
    return NextResponse.json({ bowlEmpty: true })
  }

  const next = drawWord(room.bowl, room.skippedWordId)
  await setRoom(room)

  if (next) {
    await pusherServer.trigger(privatePlayerChannel(playerId), 'word-drawn', { word: next })
  }

  return NextResponse.json({ ok: true, bowlCount: room.bowl.length })
}
